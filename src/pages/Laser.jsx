import { useState, useEffect } from 'react'
import { Zap, X, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import emailjs from '@emailjs/browser'

const EMAILJS_SERVICE = 'service_b110i99'
const EMAILJS_TEMPLATE = 'template_1gm1y15'
const EMAILJS_KEY = 'TrKMj1WLgqrejytoU'
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const VICTOR_WHATSAPP = '5519987556217'

const PLANTAS = [
  { key: 'todas', label: '🏭 Todas' },
  { key: '100', label: '📍 Limeira' },
  { key: '200', label: '📍 Palmeira' },
]

function nomeTurno(t) {
  if (t === '1') return '1º Turno'
  if (t === '2') return '2º Turno'
  if (t === '3') return '3º Turno'
  return t || '—'
}

async function enviarWhatsApp(numero, mensagem) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/enviar-whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ numero, mensagem })
    })
  } catch (err) { console.error('Erro WhatsApp:', err) }
}

// Modal de reporte reutilizável
function ModalReporte({ item, onClose, usuario }) {
  const [descricao, setDescricao] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [toast, setToast] = useState(null)
  const [responsaveis, setResponsaveis] = useState([])
  const [selectedResps, setSelectedResps] = useState([])
  const [buscaResp, setBuscaResp] = useState('')
  const [respFiltrados, setRespFiltrados] = useState([])

  useEffect(() => {
    supabase.from('responsaveis').select('*').eq('auto_copia', false).order('nome')
      .then(({ data }) => { setResponsaveis(data || []); setRespFiltrados(data || []) })
  }, [])

  function showToast(msg, cor = 'var(--green)') {
    setToast({ msg, cor })
    setTimeout(() => setToast(null), 2500)
  }

  function onBuscaResp(val) {
    setBuscaResp(val)
    if (!val) { setRespFiltrados(responsaveis); return }
    setRespFiltrados(responsaveis.filter(r => r.nome.toLowerCase().includes(val.toLowerCase())))
  }

  function toggleResp(r) {
    setSelectedResps(prev => {
      const existe = prev.find(p => p.id === r.id)
      if (existe) return prev.filter(p => p.id !== r.id)
      return [...prev, r]
    })
  }

  async function reportar() {
    if (!descricao) { showToast('Descreva o problema!', 'var(--red)'); return }
    if (selectedResps.length === 0) { showToast('Selecione pelo menos um destinatário!', 'var(--red)'); return }
    setEnviando(true)

    try {
      const msgWpp = `⚠️ *Reporte Laser - CCS Tec*\n\n*Reportado por:* ${usuario?.nome}\n*Job:* ${item.job || '—'}\n*Máquina:* ${item.maquina || '—'}\n*Problema:* ${descricao}\n\n*Enviado para:* ${selectedResps.map(r => r.nome).join(', ')}\n*Horário:* ${new Date().toLocaleString('pt-BR')}`

      const { data: supervisores } = await supabase.from('responsaveis').select('*').eq('auto_copia', true)
      const participantes = [
        usuario?.email,
        ...selectedResps.map(r => r.email),
        ...(supervisores || []).map(s => s.email)
      ].filter(Boolean)

      for (const resp of selectedResps) {
        await supabase.from('apontamentos').insert({
          ordem: item.job || '—',
          item: item.maquina || '—',
          motivo: descricao,
          responsavel: resp.nome,
          responsavel_email: resp.email,
          participantes
        })
        try {
          await emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
            ordem: item.job || '—',
            item: item.maquina || '—',
            cliente: '—', operacao: 'LASER',
            saldo: 0, descricao,
            horario: new Date().toLocaleString('pt-BR'),
            to_email: resp.email
          }, EMAILJS_KEY)
        } catch (e) { console.warn(e) }
        if (resp.telefone) await enviarWhatsApp(resp.telefone, msgWpp)
      }

      for (const sup of supervisores || []) {
        try {
          await emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
            ordem: item.job || '—',
            item: item.maquina || '—',
            cliente: '—', operacao: 'LASER',
            saldo: 0, descricao,
            horario: new Date().toLocaleString('pt-BR'),
            to_email: sup.email
          }, EMAILJS_KEY)
        } catch (e) { console.warn(e) }
        if (sup.telefone) await enviarWhatsApp(sup.telefone, msgWpp)
      }

      await enviarWhatsApp(VICTOR_WHATSAPP, msgWpp)
      showToast(`✅ Enviado para ${selectedResps.map(r => r.nome.split(' ')[0]).join(', ')}!`)
      setTimeout(() => onClose(), 1500)
    } catch (err) {
      console.error(err)
      showToast('Erro ao enviar!', 'var(--red)')
    }
    setEnviando(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: 24, width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <AlertTriangle size={20} color="#ff6b35" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Reportar problema</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              {item.job ? `Job ${item.job}` : ''}{item.maquina ? ` · ${item.maquina}` : ''}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
            <X size={20} />
          </button>
        </div>

        {selectedResps.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {selectedResps.map(r => (
              <div key={r.id} style={{
                background: 'rgba(0,229,255,.1)', border: '1px solid rgba(0,229,255,.3)',
                borderRadius: 20, padding: '4px 10px', fontSize: 12, fontWeight: 700,
                color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 6
              }}>
                {r.nome.split(' ')[0]}
                <button onClick={() => toggleResp(r)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 0 }}>×</button>
              </div>
            ))}
          </div>
        )}

        <div className="field">
          <label>Enviar para <span style={{ fontSize: 11, color: 'var(--muted)' }}>(selecione um ou mais)</span></label>
          <input className="input" value={buscaResp}
            onChange={e => onBuscaResp(e.target.value)}
            placeholder="Filtrar por nome..." />
        </div>

        <div style={{ background: 'var(--surface2)', borderRadius: 10, overflow: 'hidden', marginBottom: 14, border: '1px solid var(--border)' }}>
          {respFiltrados.map(r => {
            const selecionado = selectedResps.some(p => p.id === r.id)
            return (
              <div key={r.id} onClick={() => toggleResp(r)} style={{
                padding: '10px 14px', cursor: 'pointer',
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 10,
                background: selecionado ? 'rgba(0,229,255,.08)' : 'transparent'
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                  border: `2px solid ${selecionado ? 'var(--accent)' : 'var(--border)'}`,
                  background: selecionado ? 'var(--accent)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {selecionado && <span style={{ fontSize: 12, color: '#000', fontWeight: 700 }}>✓</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{r.nome}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{r.setor} · {r.telefone ? '📱 WhatsApp' : '📧 Email'}</div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="field">
          <label>Descreva o problema</label>
          <textarea className="input" value={descricao} onChange={e => setDescricao(e.target.value)}
            placeholder="Ex: chapa com defeito, máquina travada..."
            style={{ minHeight: 100, resize: 'vertical', fontSize: 14 }} />
        </div>

        <button className="btn-primary" onClick={reportar} disabled={enviando}>
          {enviando ? 'Enviando...' : `⚠️ Enviar${selectedResps.length > 0 ? ` para ${selectedResps.length} pessoa(s)` : ''}`}
        </button>

        {toast && <div className="toast" style={{ background: toast.cor }}>{toast.msg}</div>}
      </div>
    </div>
  )
}

export default function Laser({ usuario }) {
  const [aba, setAba] = useState('sequencia')
  const [planta, setPlanta] = useState('todas')

  return (
    <div>
      <div className="page-header">
        <div className="page-icon"><Zap size={22} color="#000" /></div>
        <div>
          <h1>LASER</h1>
          <p>Planejamentos e sequência de corte</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {PLANTAS.map(({ key, label }) => (
          <button key={key} onClick={() => setPlanta(key)} style={{
            flex: 1, padding: '9px 6px', border: '1px solid',
            borderColor: planta === key ? 'var(--yellow)' : 'var(--border)',
            background: planta === key ? 'rgba(255,214,10,.1)' : 'var(--surface)',
            color: planta === key ? 'var(--yellow)' : 'var(--muted)',
            borderRadius: 10, fontWeight: 700, fontSize: 12, cursor: 'pointer'
          }}>{label}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { key: 'sequencia', label: '📋 Sequência' },
          { key: 'planejamentos', label: '🗂️ Planejamentos' },
          { key: 'relatorio', label: '📊 Relatório' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setAba(key)} style={{
            flex: 1, padding: '10px 4px', border: '1px solid',
            borderColor: aba === key ? 'var(--accent)' : 'var(--border)',
            background: aba === key ? 'rgba(0,229,255,.1)' : 'var(--surface)',
            color: aba === key ? 'var(--accent)' : 'var(--muted)',
            borderRadius: 10, fontWeight: 700, fontSize: 11, cursor: 'pointer'
          }}>{label}</button>
        ))}
      </div>

      {aba === 'sequencia' && <Sequencia planta={planta} usuario={usuario} />}
      {aba === 'planejamentos' && <Planejamentos planta={planta} usuario={usuario} />}
      {aba === 'relatorio' && <Relatorio planta={planta} usuario={usuario} />}
    </div>
  )
}

function Sequencia({ planta, usuario }) {
  const [dados, setDados] = useState([])
  const [loading, setLoading] = useState(true)
  const [reportando, setReportando] = useState(null)

  useEffect(() => { carregarSequencia() }, [planta])

  async function carregarSequencia() {
    setLoading(true)
    let q = supabase.from('laser_planejamento').select('*')
      .order('turno', { ascending: true })
      .order('criado_em', { ascending: true })
    if (planta && planta !== 'todas') q = q.eq('estab', planta)
    const { data } = await q
    setDados(data || [])
    setLoading(false)
  }

  const porMaquina = {}
  dados.forEach(p => {
    const maq = p.maquina || '—'
    if (!porMaquina[maq]) porMaquina[maq] = []
    porMaquina[maq].push(p)
  })

  const maquinasOrdenadas = Object.entries(porMaquina).sort((a, b) => {
    const ta = a[1][0]?.turno || '9'
    const tb = b[1][0]?.turno || '9'
    return ta.localeCompare(tb)
  })

  function formatarHora(dataStr) {
    if (!dataStr) return ''
    return new Date(dataStr).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  if (loading) return <div className="empty"><div className="emoji">⏳</div><p>Carregando...</p></div>
  if (maquinasOrdenadas.length === 0) return (
    <div className="empty">
      <div className="emoji">⚡</div>
      <h3>Nenhum planejamento</h3>
      <p>Lance um corte no formulário Laser</p>
    </div>
  )

  return (
    <div>
      {maquinasOrdenadas.map(([maquina, jobs]) => (
        <div key={maquina} className="card" style={{ marginBottom: 14, padding: 0, overflow: 'hidden' }}>
          <div style={{ background: 'var(--surface2)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--yellow)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 700, color: 'var(--yellow)' }}>{maquina.toUpperCase()}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{jobs.length} job(s) planejado(s)</div>
            </div>
            <div style={{ background: 'rgba(255,214,10,.15)', border: '1px solid rgba(255,214,10,.3)', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700, color: 'var(--yellow)' }}>
              {nomeTurno(jobs[0]?.turno)}
            </div>
          </div>

          {jobs.map((job, idx) => (
            <div key={job.id} style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: idx === 0 ? 'var(--accent)' : 'var(--surface2)',
                border: `2px solid ${idx === 0 ? 'var(--accent)' : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'monospace', fontSize: 13, fontWeight: 700,
                color: idx === 0 ? '#000' : 'var(--muted)'
              }}>{idx + 1}</div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700 }}>{job.job}</div>
                  <span style={{
                    background: job.tipo === 'parcial' ? 'rgba(255,107,53,.2)' : 'rgba(0,255,136,.2)',
                    color: job.tipo === 'parcial' ? '#ff6b35' : 'var(--green)',
                    fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4
                  }}>{job.tipo === 'parcial' ? `⚡ ${job.chapas_cortar}/${job.total_chapas} chapas` : `✅ ${job.total_chapas} chapas`}</span>
                  {job.estab && (
                    <span style={{
                      background: job.estab === '100' ? 'rgba(0,229,255,.15)' : 'rgba(0,255,136,.15)',
                      color: job.estab === '100' ? 'var(--accent)' : 'var(--green)',
                      fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4
                    }}>{job.estab === '100' ? 'Limeira' : 'Palmeira'}</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  👤 {job.usuario_nome} · {formatarHora(job.criado_em)}
                </div>
                {job.turno && job.turno !== jobs[0]?.turno && (
                  <div style={{ fontSize: 11, color: 'var(--yellow)', marginTop: 2 }}>🕐 {nomeTurno(job.turno)}</div>
                )}
              </div>

              <button onClick={() => setReportando({ job: job.job, maquina: job.maquina })} style={{
                background: 'rgba(255,107,53,.15)', border: '1px solid rgba(255,107,53,.4)',
                borderRadius: 8, padding: '6px 8px', cursor: 'pointer',
                color: '#ff6b35', display: 'flex', alignItems: 'center'
              }}>
                <AlertTriangle size={14} />
              </button>
            </div>
          ))}
        </div>
      ))}

      {reportando && <ModalReporte item={reportando} onClose={() => setReportando(null)} usuario={usuario} />}
    </div>
  )
}

function Planejamentos({ planta, usuario }) {
  const [planejamentos, setPlanejamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [detalhe, setDetalhe] = useState(null)
  const [ordens, setOrdens] = useState([])
  const [loadingOrdens, setLoadingOrdens] = useState(false)
  const [reportando, setReportando] = useState(null)

  useEffect(() => { carregarPlanejamentos() }, [planta])

  async function carregarPlanejamentos() {
    setLoading(true)
    let q = supabase.from('laser_planejamento').select('*').order('criado_em', { ascending: false })
    if (planta && planta !== 'todas') q = q.eq('estab', planta)
    const { data } = await q
    setPlanejamentos(data || [])
    setLoading(false)
  }

  async function abrirDetalhe(plan) {
    setDetalhe(plan)
    setLoadingOrdens(true)
    const { data } = await supabase
      .from('ordens')
      .select('ordem, item_ccs, cliente, qtde_ordem, saldo, estab')
      .ilike('tarefa', `%${plan.job}%`)
      .order('item_ccs')
    setOrdens(data || [])
    setLoadingOrdens(false)
  }

  function formatarData(dataStr) {
    if (!dataStr) return '—'
    return new Date(dataStr).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  if (loading) return <div className="empty"><div className="emoji">⏳</div><p>Carregando...</p></div>
  if (planejamentos.length === 0) return (
    <div className="empty">
      <div className="emoji">📋</div>
      <h3>Nenhum planejamento</h3>
      <p>Lance um corte no formulário Laser</p>
    </div>
  )

  return (
    <>
      {planejamentos.map(p => (
        <div key={p.id} className="card" style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => abrirDetalhe(p)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700 }}>{p.job}</div>
                <span style={{
                  background: p.tipo === 'parcial' ? 'rgba(255,107,53,.2)' : 'rgba(0,255,136,.2)',
                  color: p.tipo === 'parcial' ? '#ff6b35' : 'var(--green)',
                  fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4
                }}>{p.tipo === 'parcial' ? `⚡ Parcial ${p.chapas_cortar}/${p.total_chapas}` : '✅ Total'}</span>
                {p.estab && (
                  <span style={{
                    background: p.estab === '100' ? 'rgba(0,229,255,.15)' : 'rgba(0,255,136,.15)',
                    color: p.estab === '100' ? 'var(--accent)' : 'var(--green)',
                    fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4
                  }}>{p.estab === '100' ? 'Limeira' : 'Palmeira'}</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>🖨️ {p.maquina} · {p.total_chapas} chapa(s) · {nomeTurno(p.turno)}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>👤 {p.usuario_nome} · {formatarData(p.criado_em)}</div>
            </div>
            <button onClick={() => setReportando({ job: p.job, maquina: p.maquina })} style={{
              background: 'rgba(255,107,53,.15)', border: '1px solid rgba(255,107,53,.4)',
              borderRadius: 8, padding: '6px 8px', cursor: 'pointer',
              color: '#ff6b35', display: 'flex', alignItems: 'center'
            }}>
              <AlertTriangle size={14} />
            </button>
          </div>
        </div>
      ))}

      {detalhe && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: 24, width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Job {detalhe.job}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {detalhe.maquina} · {detalhe.total_chapas} chapas · {nomeTurno(detalhe.turno)} ·
                  {detalhe.tipo === 'parcial' ? ` Parcial: ${detalhe.chapas_cortar} chapas` : ' Total'}
                </div>
              </div>
              <button onClick={() => { setDetalhe(null); setOrdens([]) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ background: 'rgba(255,214,10,.08)', border: '1px solid rgba(255,214,10,.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>👤 {detalhe.usuario_nome} · {new Date(detalhe.criado_em).toLocaleString('pt-BR')}</div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Ordens do job</div>
            {loadingOrdens ? (
              <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 20 }}>Carregando...</div>
            ) : ordens.map((o, i) => (
              <div key={i} style={{ padding: '10px 12px', marginBottom: 8, background: 'var(--surface2)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>{o.item_ccs}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>OP {o.ordem} · {o.cliente || '—'}</div>
                  {o.estab && (
                    <span style={{
                      background: o.estab === '100' ? 'rgba(0,229,255,.15)' : 'rgba(0,255,136,.15)',
                      color: o.estab === '100' ? 'var(--accent)' : 'var(--green)',
                      fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, display: 'inline-block', marginTop: 4
                    }}>{o.estab === '100' ? 'Limeira' : 'Palmeira'}</span>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--yellow)' }}>{o.qtde_ordem} pç</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>saldo: {o.saldo}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {reportando && <ModalReporte item={reportando} onClose={() => setReportando(null)} usuario={usuario} />}
    </>
  )
}

function Relatorio({ planta, usuario }) {
  const [apontamentos, setApontamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [detalhe, setDetalhe] = useState(null)
  const [sfccData, setSfccData] = useState({})
  const [reportando, setReportando] = useState(null)

  useEffect(() => { carregarApontamentos() }, [planta])

  async function carregarApontamentos() {
    setLoading(true)
    const { data } = await supabase.from('laser_apontamento').select('*').order('criado_em', { ascending: false })
    setApontamentos(data || [])
    setLoading(false)
  }

  async function abrirDetalhe(job, itens, maquina, usuarioNome, data) {
    setDetalhe({ job, itens, maquina, usuario: usuarioNome, data })
    const ordens = itens.map(i => i.ordem).filter(Boolean)
    const { data: sfcc } = await supabase.from('apontamentos_prod').select('ordem, qtd_aprov').in('ordem', ordens)
    const porOrdem = {}
    sfcc?.forEach(s => {
      if (!porOrdem[s.ordem]) porOrdem[s.ordem] = 0
      porOrdem[s.ordem] += (s.qtd_aprov || 0)
    })
    setSfccData(porOrdem)
  }

  function formatarData(dataStr) {
    if (!dataStr) return '—'
    return new Date(dataStr).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  const porJob = {}
  apontamentos.forEach(a => {
    if (!porJob[a.job]) porJob[a.job] = []
    porJob[a.job].push(a)
  })

  const jobs = Object.entries(porJob)

  if (loading) return <div className="empty"><div className="emoji">⏳</div><p>Carregando...</p></div>
  if (jobs.length === 0) return (
    <div className="empty">
      <div className="emoji">📊</div>
      <h3>Nenhum apontamento</h3>
      <p>Apontar produção no formulário Laser</p>
    </div>
  )

  return (
    <>
      {jobs.map(([job, itens]) => {
        const maquina = itens[0]?.maquina || '—'
        const usuarioNome = itens[0]?.usuario_nome || '—'
        const data = itens[0]?.criado_em
        const isAberto = detalhe?.job === job

        return (
          <div key={job} className="card" style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => isAberto ? setDetalhe(null) : abrirDetalhe(job, itens, maquina, usuarioNome, data)}>
                <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{job}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>🖨️ {maquina} · {itens.length} item(s)</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>👤 {usuarioNome} · {formatarData(data)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => setReportando({ job, maquina })} style={{
                  background: 'rgba(255,107,53,.15)', border: '1px solid rgba(255,107,53,.4)',
                  borderRadius: 8, padding: '6px 8px', cursor: 'pointer',
                  color: '#ff6b35', display: 'flex', alignItems: 'center'
                }}>
                  <AlertTriangle size={14} />
                </button>
                <div style={{ fontSize: 20, color: 'var(--muted)' }}>{isAberto ? '▲' : '▼'}</div>
              </div>
            </div>

            {isAberto && (
              <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                {itens.map((a, i) => {
                  const sfcc = sfccData[a.ordem] || 0
                  const planejado = a.qtd_planejada || 0
                  const apontado = a.qtd_real || 0
                  const diffApp = apontado - planejado
                  const diffSfcc = sfcc - planejado

                  return (
                    <div key={i} style={{ marginBottom: 14, padding: '12px', background: 'var(--surface2)', borderRadius: 10 }}>
                      <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, marginBottom: 10 }}>{a.item_ccs}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>OP {a.ordem}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                        <div style={{ background: 'rgba(107,114,128,.15)', borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>📋 PLANEJADO</div>
                          <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700 }}>{planejado}</div>
                          <div style={{ fontSize: 10, color: 'var(--muted)' }}>peças</div>
                        </div>
                        <div style={{
                          background: apontado >= planejado ? 'rgba(0,255,136,.1)' : 'rgba(255,61,90,.1)',
                          border: `1px solid ${apontado >= planejado ? 'rgba(0,255,136,.3)' : 'rgba(255,61,90,.3)'}`,
                          borderRadius: 8, padding: '10px 8px', textAlign: 'center'
                        }}>
                          <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>✅ NO APP</div>
                          <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: apontado >= planejado ? 'var(--green)' : 'var(--red)' }}>{apontado}</div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: apontado >= planejado ? 'var(--green)' : 'var(--red)' }}>
                            {diffApp >= 0 ? `+${diffApp}` : diffApp}
                          </div>
                        </div>
                        <div style={{
                          background: sfcc >= planejado ? 'rgba(0,229,255,.1)' : 'rgba(255,214,10,.1)',
                          border: `1px solid ${sfcc >= planejado ? 'rgba(0,229,255,.3)' : 'rgba(255,214,10,.3)'}`,
                          borderRadius: 8, padding: '10px 8px', textAlign: 'center'
                        }}>
                          <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>🖥️ SISTEMA</div>
                          <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: sfcc >= planejado ? 'var(--accent)' : 'var(--yellow)' }}>{sfcc}</div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: sfcc >= planejado ? 'var(--accent)' : 'var(--yellow)' }}>
                            {diffSfcc >= 0 ? `+${diffSfcc}` : diffSfcc}
                          </div>
                        </div>
                      </div>
                      {apontado !== sfcc && (
                        <div style={{
                          marginTop: 10, background: 'rgba(255,214,10,.08)',
                          border: '1px solid rgba(255,214,10,.3)',
                          borderRadius: 8, padding: '6px 10px',
                          fontSize: 12, color: 'var(--yellow)',
                          display: 'flex', alignItems: 'center', gap: 6
                        }}>
                          ⚠️ Divergência: app {apontado} pç · sistema {sfcc} pç
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {reportando && <ModalReporte item={reportando} onClose={() => setReportando(null)} usuario={usuario} />}
    </>
  )
}