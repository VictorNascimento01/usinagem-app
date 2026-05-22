import { useState } from 'react'
import { Package, AlertTriangle, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import emailjs from '@emailjs/browser'

const EMAILJS_SERVICE = 'service_b110i99'
const EMAILJS_TEMPLATE = 'template_1gm1y15'
const EMAILJS_KEY = 'TrKMj1WLgqrejytoU'
const EMAIL_LIDER = 'victor_nascimento@ccstec.com.br'

export default function Ordens() {
  const [query, setQuery] = useState('')
  const [tipoBusca, setTipoBusca] = useState('item')
  const [resultado, setResultado] = useState(null)
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(null)
  const [descricao, setDescricao] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [toast, setToast] = useState(null)

  function showToast(msg, cor = 'var(--green)') {
    setToast({ msg, cor })
    setTimeout(() => setToast(null), 2500)
  }

  async function buscar() {
    if (!query) return
    setLoading(true)

    let q = supabase.from('ordens').select('*')

    if (tipoBusca === 'item') {
      q = q.ilike('item_ccs', `%${query}%`)
    } else if (tipoBusca === 'ordem') {
      q = q.ilike('ordem', `%${query}%`)
    } else if (tipoBusca === 'tarefa') {
      q = q.ilike('tarefa', `%${query}%`)
    }

    const { data, error } = await q.order('saldo', { ascending: false })

    setLoading(false)
    if (error) { console.error(error); return }

    const porOper = {}
    data.forEach(r => {
      const op = r.prox_oper || 'Sem operação'
      if (!porOper[op]) porOper[op] = []
      porOper[op].push(r)
    })

    setResultado({ found: data, porOper })
  }

  async function reportar() {
    if (!descricao) {
      showToast('Descreva o problema!', 'var(--red)')
      return
    }
    setEnviando(true)

    try {
      // Salva no banco
      await supabase.from('apontamentos').insert({
        ordem: modal.ordem,
        item: modal.item_ccs,
        motivo: descricao,
        responsavel: 'Operador'
      })

      // Envia email
      await emailjs.send(
        EMAILJS_SERVICE,
        EMAILJS_TEMPLATE,
        {
          ordem: modal.ordem,
          item: modal.item_ccs,
          cliente: modal.cliente || '—',
          operacao: modal.prox_oper || '—',
          saldo: modal.saldo,
          descricao,
          horario: new Date().toLocaleString('pt-BR'),
          to_email: EMAIL_LIDER
        },
        EMAILJS_KEY
      )

      setModal(null)
      setDescricao('')
      showToast('✅ Reporte enviado ao líder!')
    } catch (err) {
      console.error(err)
      showToast('Erro ao enviar!', 'var(--red)')
    }

    setEnviando(false)
  }

  const totalSaldo = resultado?.found.reduce((s, r) => s + (r.saldo || 0), 0) || 0
  const totalProd = resultado?.found.reduce((s, r) => s + (r.qtde_prod || 0), 0) || 0
  const totalOrdem = resultado?.found.reduce((s, r) => s + (r.qtde_ordem || 0), 0) || 0

  const placeholders = {
    item: 'Ex: 8.0124.05635.01',
    ordem: 'Ex: 9715787',
    tarefa: 'Ex: digite a tarefa...'
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-icon">
          <Package size={22} color="#000" />
        </div>
        <div>
          <h1>ORDENS</h1>
          <p>Localizar item na produção</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[
          { key: 'item', label: '🔧 Item' },
          { key: 'ordem', label: '📋 Ordem' },
          { key: 'tarefa', label: '🎯 Tarefa' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setTipoBusca(key); setResultado(null); setQuery('') }}
            style={{
              flex: 1, padding: '10px 8px', border: '1px solid',
              borderColor: tipoBusca === key ? 'var(--accent)' : 'var(--border)',
              background: tipoBusca === key ? 'rgba(0,229,255,.1)' : 'var(--surface)',
              color: tipoBusca === key ? 'var(--accent)' : 'var(--muted)',
              borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer'
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="search-box">
        <input
          className="input"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && buscar()}
          placeholder={placeholders[tipoBusca]}
        />
        <button className="btn-search" onClick={buscar}>
          {loading ? '...' : 'Buscar'}
        </button>
      </div>

      {resultado && (
        <>
          {resultado.found.length === 0 ? (
            <div className="empty">
              <div className="emoji">❌</div>
              <h3>Nenhuma ordem encontrada</h3>
              <p>Nenhum resultado para "{query}"</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                {[
                  ['Ordens', resultado.found.length, 'var(--accent)'],
                  ['Planejado', totalOrdem + ' pç', 'var(--text)'],
                  ['Produzido', totalProd + ' pç', 'var(--green)'],
                  ['Saldo', totalSaldo + ' pç', totalSaldo > 0 ? 'var(--yellow)' : 'var(--green)'],
                ].map(([l, v, c]) => (
                  <div key={l} className="card" style={{ padding: 10, textAlign: 'center', marginBottom: 0 }}>
                    <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{l}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: c }}>{v}</div>
                  </div>
                ))}
              </div>

              {Object.entries(resultado.porOper).map(([op, rows]) => (
                <div key={op} className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 12 }}>
                  <div style={{
                    background: 'var(--surface2)', padding: '10px 14px',
                    display: 'flex', alignItems: 'center', gap: 10
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--yellow)', flexShrink: 0 }} />
                    <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: 'var(--yellow)', flex: 1 }}>
                      {op}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {rows.length} ordem(s) · {rows.reduce((s, r) => s + (r.saldo || 0), 0)} pç
                    </div>
                  </div>

                  {rows.map((r, i) => (
                    <div key={i} style={{ padding: '12px 14px', borderTop: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>
                            OP {r.ordem}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                            {r.item_ccs} · {r.cliente || '—'}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                            {r.operacoes || '—'}
                          </div>
                          {r.tarefa && (
                            <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 1 }}>
                              🎯 {r.tarefa}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--yellow)' }}>
                              {r.saldo} pç
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                              {r.qtde_prod}/{r.qtde_ordem} prod.
                            </div>
                          </div>
                          <button
                            onClick={() => { setModal(r); setDescricao('') }}
                            style={{
                              background: 'rgba(255,107,53,.15)',
                              border: '1px solid rgba(255,107,53,.4)',
                              borderRadius: 8, padding: '5px 10px',
                              cursor: 'pointer', display: 'flex',
                              alignItems: 'center', gap: 4,
                              color: '#ff6b35', fontSize: 11, fontWeight: 700
                            }}
                          >
                            <AlertTriangle size={12} />
                            Reportar
                          </button>
                        </div>
                      </div>

                      {r.saldo > 0 && r.qtde_prod > 0 && (
                        <div style={{
                          marginTop: 8, background: 'rgba(255,214,10,.08)',
                          border: '1px solid rgba(255,214,10,.25)', borderRadius: 6,
                          padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12
                        }}>
                          <span>⚠️</span>
                          <span style={{ color: 'var(--yellow)' }}>
                            <strong>{r.saldo} pç</strong> sem apontamento de {r.qtde_ordem} planejadas
                          </span>
                        </div>
                      )}

                      {r.qtde_prod === 0 && (
                        <div style={{
                          marginTop: 8, background: 'rgba(255,61,90,.08)',
                          border: '1px solid rgba(255,61,90,.25)', borderRadius: 6,
                          padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12
                        }}>
                          <span>🔴</span>
                          <span style={{ color: 'var(--red)' }}>
                            Ordem não iniciada — {r.qtde_ordem} pç planejadas
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}
        </>
      )}

      {/* Modal */}
      {modal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: '20px 20px 0 0',
            padding: 24, width: '100%', maxWidth: 480
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <AlertTriangle size={20} color="#ff6b35" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Reportar problema</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>OP {modal.ordem} · {modal.item_ccs}</div>
              </div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div className="field">
              <label>Descreva o problema</label>
              <textarea
                className="input"
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                placeholder="Ex: peça com defeito, falta de material, máquina parada..."
                style={{ minHeight: 100, resize: 'vertical', fontSize: 14 }}
              />
            </div>

            <button className="btn-primary" onClick={reportar} disabled={enviando}>
              {enviando ? 'Enviando...' : '⚠️ Enviar para o líder'}
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast" style={{ background: toast.cor }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}