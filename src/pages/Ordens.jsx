import { useState } from 'react'
import { Package, AlertTriangle, X, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import emailjs from '@emailjs/browser'

const EMAILJS_SERVICE = 'service_b110i99'
const EMAILJS_TEMPLATE = 'template_1gm1y15'
const EMAILJS_KEY = 'TrKMj1WLgqrejytoU'

const ULTRAMSG_INSTANCE = 'instance177408'
const ULTRAMSG_TOKEN = '7etqzwfh3gsrxzu0'
const VICTOR_WHATSAPP = '5519987556217'

const PLANTAS = [
  { key: 'todas', label: '🏭 Todas' },
  { key: '100', label: '📍 Limeira' },
  { key: '200', label: '📍 Palmeira' },
]

const OPERACOES = {
  '2AC': 'ACABAMENTO', '2AP': 'APONTAMENTO FINAL', '2BN': 'BNF',
  '2CA': 'CALANDRA', '2CH': 'CHANFRADEIRA', '2DO': 'DOBRADEIRA',
  '2EN': 'ENDIREITADEIRA', '2FO': 'FOSFATO', '2FR': 'FRESA',
  '2FU': 'FURADEIRA', '2IN': 'INSPEÇÃO FINAL', '2JA': 'JATEAMENTO',
  '2LA': 'LASER', '2LI': 'LIXADEIRA', '2MA': 'MANDRILHADORA',
  '2ME': 'METROLOGIA', '2MI': 'SOLDA MIG', '2MO': 'MONTAGEM',
  '2OL': 'DECAPAGEM', '2PA': 'PAGAMENTO', '2PI': 'PINTURA',
  '2PL': 'PLASMA', '2PO': 'PORTAL', '2PR': 'PROGRAMAÇÃO',
  '2RE': 'SOLDA RESISTÊNCIA', '2RO': 'SOLDA ROBÔ', '2SE': 'SERRA',
  '2TO': 'TORNO', '2US': 'USINAGEM',
  '300': 'PROGRAMAÇÃO', '3AP': 'APONTAMENTO FINAL', '3CU': 'CORTE',
  '3EN': 'ENDIREITADEIRA', '3FU': 'FURADEIRA', '3GE': 'GERENCIAMENTO',
  '3IN': 'INSPEÇÃO FINAL', '3LI': 'LIXADEIRA', '3MI': 'SOLDA MIG',
  '3PA': 'PAGAMENTO', '3PR': 'PROGRAMAÇÃO', '3SE': 'SERRA',
  'ACA': 'ACABAMENTO', 'APT': 'APONTAMENTO FINAL', 'BNF': 'BNF',
  'CAL': 'CALANDRA', 'CHA': 'CHANFRADEIRA', 'DEC': 'DECAPAGEM',
  'DOB': 'DOBRADEIRA', 'EMB': 'EMBARQUE CONTROLADO', 'END': 'ENDIREITADEIRA',
  'FOS': 'FOSFATO', 'FRE': 'FRESA', 'FUR': 'FURADEIRA',
  'INS': 'INSPEÇÃO FINAL', 'JAT': 'JATEAMENTO DE CHAPA', 'LAS': 'LASER',
  'LIX': 'LIXADEIRA', 'MAN': 'MANDRILHADORA', 'MET': 'METROLOGIA',
  'MIG': 'SOLDA MIG', 'MON': 'MONTAGEM', 'OLE': 'DECAPAGEM',
  'OXI': 'OXICORTE', 'PAG': 'PAGAMENTO', 'PIN': 'PINTURA',
  'PIS': 'GRAVAÇÃO', 'PLA': 'PLASMA', 'POR': 'PORTAL',
  'PRE': 'PRENSA', 'PRO': 'PROGRAMAÇÃO', 'PUN': 'PUNCIONADEIRA',
  'RES': 'SOLDA RESISTÊNCIA', 'ROB': 'SOLDA ROBÔ', 'ROS': 'ROSQUEADEIRA',
  'SER': 'SERRA', 'SOL': 'SOLDA', 'TIG': 'SOLDA TIG',
  'TOR': 'TORNO', 'USI': 'USINAGEM',
}

function nomeOp(cod) {
  return OPERACOES[cod?.trim()] || cod
}

function diasParado(dataStr) {
  if (!dataStr) return null
  try {
    const partes = dataStr.split('/')
    if (partes.length !== 3) return null
    const ano = partes[2].length === 2 ? '20' + partes[2] : partes[2]
    const data = new Date(`${ano}-${partes[1]}-${partes[0]}`)
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    return Math.floor((hoje - data) / (1000 * 60 * 60 * 24))
  } catch { return null }
}

function corParado(dias) {
  if (dias === null) return 'var(--red)'
  if (dias === 0) return 'var(--green)'
  if (dias <= 3) return 'var(--yellow)'
  return 'var(--red)'
}

function textoParado(dias) {
  if (dias === null) return 'Sem apontamento'
  if (dias === 0) return 'Apontado hoje'
  if (dias === 1) return 'Parada há 1 dia'
  return `Parada há ${dias} dias`
}

function parseData(dataStr) {
  if (!dataStr) return new Date(0)
  try {
    const partes = dataStr.split('/')
    if (partes.length !== 3) return new Date(0)
    const ano = partes[2].length === 2 ? '20' + partes[2] : partes[2]
    return new Date(`${ano}-${partes[1]}-${partes[0]}`)
  } catch { return new Date(0) }
}

async function enviarWhatsApp(numero, mensagem) {
  try {
    await fetch(`https://api.ultramsg.com/${ULTRAMSG_INSTANCE}/messages/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        token: ULTRAMSG_TOKEN,
        to: numero,
        body: mensagem
      })
    })
  } catch (err) {
    console.error('Erro WhatsApp:', err)
  }
}

export default function Ordens({ usuario }) {
  const [query, setQuery] = useState('')
  const [tipoBusca, setTipoBusca] = useState('item')
  const [planta, setPlanta] = useState('todas')
  const [resultado, setResultado] = useState(null)
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(null)
  const [detalhe, setDetalhe] = useState(null)
  const [loadingDetalhe, setLoadingDetalhe] = useState(false)
  const [descricao, setDescricao] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [toast, setToast] = useState(null)
  const [responsaveis, setResponsaveis] = useState([])
  const [selectedResp, setSelectedResp] = useState(null)
  const [buscaResp, setBuscaResp] = useState('')
  const [respFiltrados, setRespFiltrados] = useState([])

  function showToast(msg, cor = 'var(--green)') {
    setToast({ msg, cor })
    setTimeout(() => setToast(null), 2500)
  }

  async function buscar() {
    if (!query) return
    setLoading(true)

    let q = supabase.from('ordens').select('*')
    if (tipoBusca === 'item') q = q.ilike('item_ccs', `%${query}%`)
    else if (tipoBusca === 'ordem') q = q.ilike('ordem', `%${query}%`)
    else if (tipoBusca === 'tarefa') q = q.ilike('tarefa', `%${query}%`)
    if (planta !== 'todas') q = q.eq('estab', planta)

    const { data, error } = await q.order('saldo', { ascending: false })
    setLoading(false)
    if (error) { console.error(error); return }

    const ordens = data.map(r => r.ordem).filter(Boolean)
    let apontamentos = {}
    if (ordens.length > 0) {
      const { data: apont } = await supabase
        .from('apontamentos_prod')
        .select('ordem, data_apontamento, hora, operador, operacao, qtd_aprov, maquina')
        .in('ordem', ordens)
        .order('data_apontamento', { ascending: false })

      if (apont) {
        apont.forEach(a => {
          if (!apontamentos[a.ordem]) apontamentos[a.ordem] = a
        })
      }
    }

    const porOper = {}
    data.forEach(r => {
      const op = r.prox_oper || 'Sem operação'
      if (!porOper[op]) porOper[op] = []
      porOper[op].push({ ...r, ultimoApont: apontamentos[r.ordem] || null })
    })

    setResultado({ found: data, porOper })
  }

  async function abrirDetalhe(r) {
    setLoadingDetalhe(true)
    setDetalhe({ ordem: r.ordem, item: r.item_ccs, roteiro: r.operacoes, apont: [] })
    const { data } = await supabase
      .from('apontamentos_prod')
      .select('*')
      .eq('ordem', r.ordem)
      .order('data_apontamento', { ascending: true })
      .limit(200)
    setDetalhe({ ordem: r.ordem, item: r.item_ccs, roteiro: r.operacoes, apont: data || [] })
    setLoadingDetalhe(false)
  }

  async function abrirModal(r) {
    if (usuario?.estab && usuario.estab !== 'todas' && r.estab !== usuario.estab) {
      const planta = r.estab === '100' ? 'Limeira' : 'Palmeira'
      showToast(`❌ Esta ordem é de ${planta}! Você não pode reportar.`, 'var(--red)')
      return
    }
    setModal(r)
    setDescricao('')
    setSelectedResp(null)
    setBuscaResp('')
    setRespFiltrados([])
    const { data } = await supabase
      .from('responsaveis')
      .select('*')
      .eq('auto_copia', false)
      .order('nome')
    setResponsaveis(data || [])
    setRespFiltrados(data || [])
  }

  function onBuscaResp(val) {
    setBuscaResp(val)
    if (!val) { setRespFiltrados(responsaveis); return }
    const q = val.toLowerCase()
    setRespFiltrados(responsaveis.filter(r => r.nome.toLowerCase().includes(q)))
  }

  async function reportar() {
    if (!descricao) { showToast('Descreva o problema!', 'var(--red)'); return }
    if (!selectedResp) { showToast('Selecione o destinatário!', 'var(--red)'); return }
    setEnviando(true)
    try {
      await supabase.from('apontamentos').insert({
        ordem: modal.ordem, item: modal.item_ccs,
        motivo: descricao, responsavel: selectedResp.nome,
        responsavel_email: selectedResp.email
      })

      await emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
        ordem: modal.ordem, item: modal.item_ccs,
        cliente: modal.cliente || '—', operacao: modal.prox_oper || '—',
        saldo: modal.saldo, descricao,
        horario: new Date().toLocaleString('pt-BR'),
        to_email: selectedResp.email
      }, EMAILJS_KEY)

      const { data: supervisores } = await supabase
        .from('responsaveis').select('*').eq('auto_copia', true)
      for (const sup of supervisores || []) {
        await emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
          ordem: modal.ordem, item: modal.item_ccs,
          cliente: modal.cliente || '—', operacao: modal.prox_oper || '—',
          saldo: modal.saldo, descricao,
          horario: new Date().toLocaleString('pt-BR'),
          to_email: sup.email
        }, EMAILJS_KEY)
      }

      // WhatsApp para Victor
      const msgWpp = `⚠️ *Novo reporte - CCS Tec*\n\n*OP:* ${modal.ordem}\n*Item:* ${modal.item_ccs}\n*Cliente:* ${modal.cliente || '—'}\n*Operação:* ${nomeOp(modal.prox_oper) || '—'}\n*Saldo:* ${modal.saldo} pç\n\n*Problema:* ${descricao}\n\n*Enviado para:* ${selectedResp.nome}\n*Horário:* ${new Date().toLocaleString('pt-BR')}`
      await enviarWhatsApp(VICTOR_WHATSAPP, msgWpp)

      setModal(null); setDescricao('')
      showToast(`✅ Enviado para ${selectedResp.nome.split(' ')[0]}!`)
    } catch (err) {
      console.error(err)
      showToast('Erro ao enviar!', 'var(--red)')
    }
    setEnviando(false)
  }

  const totalSaldo = resultado?.found.reduce((s, r) => s + (r.saldo || 0), 0) || 0
  const totalProd = resultado?.found.reduce((s, r) => s + (r.qtde_prod || 0), 0) || 0
  const totalOrdem = resultado?.found.reduce((s, r) => s + (r.qtde_ordem || 0), 0) || 0

  return (
    <div>
      <div className="page-header">
        <div className="page-icon"><Package size={22} color="#000" /></div>
        <div><h1>ORDENS</h1><p>Localizar item na produção</p></div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {PLANTAS.map(({ key, label }) => (
          <button key={key} onClick={() => { setPlanta(key); setResultado(null) }} style={{
            flex: 1, padding: '9px 6px', border: '1px solid',
            borderColor: planta === key ? 'var(--green)' : 'var(--border)',
            background: planta === key ? 'rgba(0,255,136,.1)' : 'var(--surface)',
            color: planta === key ? 'var(--green)' : 'var(--muted)',
            borderRadius: 10, fontWeight: 700, fontSize: 12, cursor: 'pointer'
          }}>{label}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[
          { key: 'item', label: '🔧 Item' },
          { key: 'ordem', label: '📋 Ordem' },
          { key: 'tarefa', label: '🎯 Tarefa' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => { setTipoBusca(key); setResultado(null); setQuery('') }} style={{
            flex: 1, padding: '10px 8px', border: '1px solid',
            borderColor: tipoBusca === key ? 'var(--accent)' : 'var(--border)',
            background: tipoBusca === key ? 'rgba(0,229,255,.1)' : 'var(--surface)',
            color: tipoBusca === key ? 'var(--accent)' : 'var(--muted)',
            borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer'
          }}>{label}</button>
        ))}
      </div>

      <div className="search-box">
        <input className="input" value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && buscar()}
          placeholder={tipoBusca === 'item' ? 'Ex: 8.0124.05635.01' : tipoBusca === 'ordem' ? 'Ex: 9715787' : 'Ex: digite a tarefa...'}
        />
        <button className="btn-search" onClick={buscar}>{loading ? '...' : 'Buscar'}</button>
      </div>

      {resultado && (
        <>
          {resultado.found.length === 0 ? (
            <div className="empty"><div className="emoji">❌</div><h3>Nenhuma ordem encontrada</h3></div>
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
                  <div style={{ background: 'var(--surface2)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--yellow)', flexShrink: 0 }} />
                    <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: 'var(--yellow)', flex: 1 }}>
                      {nomeOp(op)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{rows.length} ordem(s) · {rows.reduce((s, r) => s + (r.saldo || 0), 0)} pç</div>
                  </div>

                  {rows.map((r, i) => {
                    const ap = r.ultimoApont
                    const dias = ap ? diasParado(ap.data_apontamento) : null
                    const cor = corParado(dias)
                    const texto = textoParado(dias)
                    const podeInteragir = !usuario?.estab || usuario.estab === 'todas' || r.estab === usuario.estab

                    return (
                      <div key={i} style={{ padding: '12px 14px', borderTop: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>OP {r.ordem}</div>
                              {r.estab && (
                                <span style={{
                                  background: r.estab === '100' ? 'rgba(0,229,255,.15)' : 'rgba(0,255,136,.15)',
                                  color: r.estab === '100' ? 'var(--accent)' : 'var(--green)',
                                  fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4
                                }}>{r.estab === '100' ? 'Limeira' : 'Palmeira'}</span>
                              )}
                              {!podeInteragir && (
                                <span style={{
                                  background: 'rgba(107,114,128,.15)', color: 'var(--muted)',
                                  fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4
                                }}>🔒 Somente leitura</span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{r.item_ccs} · {r.cliente || '—'}</div>
                            {r.tarefa && <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 1 }}>🎯 {r.tarefa}</div>}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
                              <div style={{ width: 7, height: 7, borderRadius: '50%', background: cor, flexShrink: 0 }} />
                              <span style={{ fontSize: 11, color: cor, fontWeight: 600 }}>{texto}</span>
                              {ap && <span style={{ fontSize: 11, color: 'var(--muted)' }}>· {ap.data_apontamento}</span>}
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--yellow)' }}>{r.saldo} pç</div>
                              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{r.qtde_prod}/{r.qtde_ordem}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => abrirDetalhe(r)} style={{
                                background: 'rgba(0,229,255,.1)', border: '1px solid rgba(0,229,255,.3)',
                                borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
                                color: 'var(--accent)', fontSize: 11, fontWeight: 700,
                                display: 'flex', alignItems: 'center', gap: 4
                              }}>
                                <ChevronRight size={12} /> Detalhar
                              </button>
                              {podeInteragir && (
                                <button onClick={() => abrirModal(r)} style={{
                                  background: 'rgba(255,107,53,.15)', border: '1px solid rgba(255,107,53,.4)',
                                  borderRadius: 8, padding: '5px 8px', cursor: 'pointer',
                                  color: '#ff6b35', display: 'flex', alignItems: 'center'
                                }}>
                                  <AlertTriangle size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </>
          )}
        </>
      )}

      {/* Modal detalhe */}
      {detalhe && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: 24, width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Roteiro de apontamentos</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>OP {detalhe.ordem} · {detalhe.item}</div>
              </div>
              <button onClick={() => setDetalhe(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                <X size={20} />
              </button>
            </div>

            {detalhe.roteiro && (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 16, fontFamily: 'monospace' }}>
                {detalhe.roteiro}
              </div>
            )}

            {loadingDetalhe ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>Carregando...</div>
            ) : detalhe.apont.length === 0 ? (
              <div className="empty" style={{ padding: 20 }}>
                <div className="emoji">📭</div>
                <p>Nenhum apontamento encontrado</p>
              </div>
            ) : (() => {
              const grupos = {}
              detalhe.apont.forEach(a => {
                const chave = a.desc_operacao || nomeOp(a.operacao) || a.operacao || 'Outros'
                if (!grupos[chave]) {
                  grupos[chave] = { nome: chave, items: [], primeiraData: a.data_apontamento }
                }
                grupos[chave].items.push(a)
              })

              const gruposOrdenados = Object.values(grupos).sort((a, b) =>
                parseData(a.primeiraData) - parseData(b.primeiraData)
              )

              let qtdAnterior = null

              return gruposOrdenados.map((grupo) => {
                const totalOK = grupo.items.reduce((s, a) => s + (a.qtd_aprov || 0), 0)
                const totalRef = grupo.items.reduce((s, a) => s + (a.qtd_refug || 0), 0)
                const ultimo = [...grupo.items].sort((a, b) =>
                  parseData(b.data_apontamento) - parseData(a.data_apontamento)
                )[0]
                const dias = diasParado(ultimo?.data_apontamento)

                let icone, corBorda
                if (qtdAnterior !== null && totalOK < qtdAnterior) {
                  icone = '⚠️'; corBorda = 'var(--yellow)'
                } else {
                  icone = '✅'; corBorda = 'var(--green)'
                }
                qtdAnterior = totalOK

                return (
                  <div key={grupo.nome} style={{ marginBottom: 10 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 8,
                      background: 'var(--surface2)',
                      border: `1px solid ${corBorda}33`
                    }}>
                      <div style={{ fontSize: 16, flexShrink: 0 }}>{icone}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{grupo.nome}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                          {ultimo?.data_apontamento} · {ultimo?.operador}
                          {dias !== null ? ` · ${dias === 0 ? 'hoje' : dias + 'd atrás'}` : ''}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>{totalOK} pç</div>
                        {totalRef > 0 && <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--red)' }}>{totalRef} ref.</div>}
                      </div>
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        </div>
      )}

      {/* Modal reportar */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: 24, width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto' }}>
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
              <label>Enviar para</label>
              <input className="input"
                value={selectedResp ? selectedResp.nome : buscaResp}
                onChange={e => { setSelectedResp(null); onBuscaResp(e.target.value) }}
                placeholder="Digite o nome..."
                style={{ marginBottom: 8 }}
              />
              {!selectedResp && buscaResp.length > 0 && respFiltrados.length > 0 && (
                <div style={{
                  background: 'var(--surface2)', border: '1px solid var(--accent)',
                  borderRadius: 10, overflow: 'hidden', marginBottom: 8
                }}>
                  {respFiltrados.map(r => (
                    <div key={r.id} onClick={() => { setSelectedResp(r); setBuscaResp('') }}
                      style={{
                        padding: '10px 14px', cursor: 'pointer',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', gap: 10
                      }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{r.nome}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{r.setor}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {selectedResp && (
                <div style={{
                  background: 'rgba(0,229,255,.1)', border: '1px solid rgba(0,229,255,.3)',
                  borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{selectedResp.nome}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{selectedResp.setor}</div>
                  </div>
                  <button onClick={() => { setSelectedResp(null); setBuscaResp('') }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            <div className="field">
              <label>Descreva o problema</label>
              <textarea className="input" value={descricao} onChange={e => setDescricao(e.target.value)}
                placeholder="Ex: peça com defeito, falta material, máquina parada..."
                style={{ minHeight: 100, resize: 'vertical', fontSize: 14 }} />
            </div>

            <button className="btn-primary" onClick={reportar} disabled={enviando}>
              {enviando ? 'Enviando...' : `⚠️ Enviar${selectedResp ? ' para ' + selectedResp.nome.split(' ')[0] : ''}`}
            </button>
          </div>
        </div>
      )}

      {toast && <div className="toast" style={{ background: toast.cor }}>{toast.msg}</div>}
    </div>
  )
}