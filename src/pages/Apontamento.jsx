import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { BASE_ITENS } from '../lib/baseItens'
import { ClipboardCheck } from 'lucide-react'

const TURNOS = [
  { key: '1', label: '1º Turno', horario: '07:00 - 16:48' },
  { key: '2', label: '2º Turno', horario: '16:48 - 02:09' },
  { key: '3', label: '3º Turno', horario: '02:09 - 07:00' },
]

function detectarTurnoHora(horaStr) {
  if (!horaStr) return '1'
  const [h, m] = horaStr.split(':').map(Number)
  const totalMin = h * 60 + (m || 0)
  if (totalMin >= 7 * 60 && totalMin < 16 * 60 + 48) return '1'
  if (totalMin >= 16 * 60 + 48) return '2'
  return '3'
}

export default function Apontamento({ usuario }) {
  const [codigo, setCodigo] = useState('')
  const [sugestoes, setSugestoes] = useState([])
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState(null)

  function onCodigoInput(val) {
    setCodigo(val)
    if (val.length < 2) { setSugestoes([]); return }
    const q = val.toLowerCase()
    setSugestoes(BASE_ITENS.filter(i => i.codigo.toLowerCase().includes(q)).slice(0, 6))
  }

  function selecionarItem(item) {
    setCodigo(item.codigo)
    setSugestoes([])
    buscar(item.codigo)
  }

  async function buscar(cod) {
    const codigo_busca = cod || codigo
    if (!codigo_busca) return
    setLoading(true)
    setResultado(null)

    // Busca ordens do item em Limeira
    const { data: ordens } = await supabase
      .from('ordens')
      .select('ordem, item_ccs, cliente, qtde_ordem, saldo, estab, prox_oper')
      .ilike('item_ccs', `%${codigo_busca}%`)
      .eq('estab', '100')
      .order('saldo', { ascending: false })

    if (!ordens?.length) {
      setResultado({ found: false })
      setLoading(false)
      return
    }

    const ordensList = ordens.map(o => o.ordem).filter(Boolean)

    // Busca apontamentos SFCC por ordem
    const { data: sfccOrdens } = await supabase
      .from('apontamentos_prod')
      .select('ordem, operador, qtd_aprov, qtd_refug, data_apontamento, hora, desc_operacao, operacao')
      .in('ordem', ordensList)
      .order('data_apontamento', { ascending: false })

    // Busca na Sequor pelo produto (item)
    const { data: sequorItem } = await supabase
      .from('sequor')
      .select('*')
      .ilike('produto', `%${codigo_busca}%`)

    // Agrupa SFCC por turno
    const porTurno = { '1': [], '2': [], '3': [] }
    sfccOrdens?.forEach(a => {
      const turno = detectarTurnoHora(a.hora)
      porTurno[turno].push(a)
    })

    const totalSequor = sequorItem?.reduce((s, r) => s + (r.qtd_ok || 0), 0) || 0
    const totalSfcc = sfccOrdens?.reduce((s, a) => s + (a.qtd_aprov || 0), 0) || 0
    const saldoApontar = totalSequor - totalSfcc

    setResultado({
      found: true,
      ordens,
      sequorItem: sequorItem || [],
      totalSequor,
      totalSfcc,
      saldoApontar,
      porTurno,
      sfccOrdens: sfccOrdens || []
    })

    setLoading(false)
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-icon"><ClipboardCheck size={22} color="#000" /></div>
        <div>
          <h1>APONTAMENTO</h1>
          <p>Conferência Sequor vs SFCC — Limeira</p>
        </div>
      </div>

      <div className="card">
        <div className="field" style={{ position: 'relative', marginBottom: 0 }}>
          <label>Código do item</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" value={codigo}
              onChange={e => onCodigoInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && buscar()}
              placeholder="Ex: 8.0124.05635.01"
              autoComplete="off" style={{ flex: 1 }} />
            <button className="btn-search" onClick={() => buscar()}>
              {loading ? '...' : 'Buscar'}
            </button>
          </div>
          {sugestoes.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              background: 'var(--surface2)', border: '1px solid var(--accent)',
              borderTop: 'none', borderRadius: '0 0 10px 10px',
              maxHeight: 200, overflowY: 'auto', zIndex: 100
            }}>
              {sugestoes.map((item, i) => (
                <div key={i} onClick={() => selecionarItem(item)} style={{
                  padding: '11px 15px', cursor: 'pointer',
                  fontFamily: 'monospace', fontSize: 13,
                  borderBottom: '1px solid var(--border)'
                }}>
                  {item.codigo}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {resultado && !resultado.found && (
        <div className="empty">
          <div className="emoji">❌</div>
          <h3>Item não encontrado em Limeira</h3>
        </div>
      )}

      {resultado?.found && (
        <>
          {/* Resumo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
            {[
              ['📡 Sequor', resultado.totalSequor, 'var(--accent)'],
              ['🖥️ SFCC', resultado.totalSfcc, 'var(--green)'],
              ['⚠️ Falta', resultado.saldoApontar > 0 ? resultado.saldoApontar : 0, resultado.saldoApontar > 0 ? 'var(--yellow)' : 'var(--green)'],
            ].map(([l, v, c]) => (
              <div key={l} className="card" style={{ padding: 12, textAlign: 'center', marginBottom: 0 }}>
                <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{l}</div>
                <div style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700, color: c }}>{v}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>pç</div>
              </div>
            ))}
          </div>

          {/* Ordens */}
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            Ordens em Limeira ({resultado.ordens.length})
          </div>
          {resultado.ordens.map((o, i) => (
            <div key={i} className="card" style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>OP {o.ordem}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{o.cliente || '—'}</div>
                  {o.prox_oper && (
                    <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 2 }}>
                      📍 Próx. op: {o.prox_oper}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700 }}>{o.qtde_ordem} pç</div>
                  <div style={{ fontSize: 11, color: 'var(--yellow)' }}>saldo: {o.saldo}</div>
                </div>
              </div>
            </div>
          ))}

          {/* Por turno SFCC */}
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginTop: 16 }}>
            Apontamentos SFCC por turno
          </div>

          {TURNOS.map(({ key, label, horario }) => {
            const apont = resultado.porTurno[key] || []
            const total = apont.reduce((s, a) => s + (a.qtd_aprov || 0), 0)
            const totalRefug = apont.reduce((s, a) => s + (a.qtd_refug || 0), 0)

            return (
              <div key={key} className="card" style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: apont.length > 0 ? 12 : 0 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                    background: total > 0 ? 'var(--green)' : 'var(--border)'
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{label}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{horario}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {total > 0 ? (
                      <>
                        <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: 'var(--green)' }}>{total} pç</div>
                        {totalRefug > 0 && (
                          <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--red)' }}>{totalRefug} ref.</div>
                        )}
                      </>
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>Não apontado</div>
                    )}
                  </div>
                </div>

                {apont.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                    {apont.slice(0, 5).map((a, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '6px 0',
                        borderBottom: i < Math.min(apont.length, 5) - 1 ? '1px solid var(--border)' : 'none'
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 700 }}>{a.operador || '—'}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                            {a.desc_operacao || a.operacao || '—'} · {a.data_apontamento}
                          </div>
                        </div>
                        <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>
                          {a.qtd_aprov} pç
                        </div>
                      </div>
                    ))}
                    {apont.length > 5 && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', paddingTop: 8 }}>
                        + {apont.length - 5} apontamento(s)
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {/* Sequor */}
          {resultado.sequorItem.length > 0 && (
            <>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginTop: 16 }}>
                📡 Dados Sequor
              </div>
              {resultado.sequorItem.map((s, i) => (
                <div key={i} className="card" style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>{s.produto || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                        Estação: {s.estacao || '—'} · Etapa: {s.etapa || '—'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                        OP: {s.ordem || '—'}
                      </div>
                      {s.data_inicial && (
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                          🕐 {new Date(s.data_inicial).toLocaleString('pt-BR')}
                          {s.data_final ? ` → ${new Date(s.data_final).toLocaleString('pt-BR')}` : ' → em andamento'}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>
                        {s.qtd_ok || 0} pç
                      </div>
                      {(s.qtd_nok || 0) > 0 && (
                        <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--red)' }}>
                          {s.qtd_nok} NOK
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {resultado.sequorItem.length === 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: 10 }}>
                📡 Nenhum dado na Sequor para este item
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}