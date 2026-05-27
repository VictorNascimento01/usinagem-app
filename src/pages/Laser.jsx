import { useState, useEffect } from 'react'
import { Zap, X, AlertTriangle, Pencil, Check, Plus, Trash2 } from 'lucide-react'
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

function nomeTurnoLongo(t) {
  if (t === '1') return '1º Turno (07:00 - 16:48)'
  if (t === '2') return '2º Turno (16:48 - 02:09)'
  if (t === '3') return '3º Turno (02:09 - 07:00)'
  return t
}

function detectarTurno() {
  const agora = new Date()
  const hora = agora.getHours()
  const min = agora.getMinutes()
  const diaSemana = agora.getDay()
  const totalMin = hora * 60 + min
  const t1inicio = 7 * 60
  const t1fim = 16 * 60 + 48
  const t3fimSexta = 10 * 60 + 9
  const t3fimNormal = 7 * 60
  if (totalMin >= t1inicio && totalMin < t1fim) return '1'
  if (totalMin >= t1fim) return '2'
  const ehSabado = diaSemana === 6
  const fimT3 = ehSabado ? t3fimSexta : t3fimNormal
  if (totalMin < fimT3) return '3'
  return '1'
}

function formatarTempo(minutos) {
  if (!minutos || minutos <= 0) return '—'
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${m}min`
}

function previsaoTermino(minutosRestantes) {
  if (!minutosRestantes || minutosRestantes <= 0) return null
  const agora = new Date()
  agora.setMinutes(agora.getMinutes() + minutosRestantes)
  return agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
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

async function notificarSupervisores(mensagem) {
  try {
    const { data: supervisores } = await supabase.from('responsaveis').select('*').eq('auto_copia', true)
    for (const sup of supervisores || []) {
      if (sup.telefone) await enviarWhatsApp(sup.telefone, mensagem)
    }
    await enviarWhatsApp(VICTOR_WHATSAPP, mensagem)
  } catch (err) { console.error('Erro notificação:', err) }
}

function BarraProgresso({ feitas, total, cor = 'var(--accent)' }) {
  const pct = total > 0 ? Math.min(100, Math.round((feitas / total) * 100)) : 0
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
        <span>{feitas}/{total} chapas</span>
        <span style={{ color: pct === 100 ? 'var(--green)' : cor, fontWeight: 700 }}>{pct}%</span>
      </div>
      <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? 'var(--green)' : cor, borderRadius: 99, transition: 'width .3s' }} />
      </div>
    </div>
  )
}

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
      const participantes = [usuario?.email, ...selectedResps.map(r => r.email), ...(supervisores || []).map(s => s.email)].filter(Boolean)
      for (const resp of selectedResps) {
        await supabase.from('apontamentos').insert({
          ordem: item.job || '—', item: item.maquina || '—',
          motivo: descricao, responsavel: resp.nome,
          responsavel_email: resp.email, participantes
        })
        try {
          await emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
            ordem: item.job || '—', item: item.maquina || '—',
            cliente: '—', operacao: 'LASER', saldo: 0, descricao,
            horario: new Date().toLocaleString('pt-BR'), to_email: resp.email
          }, EMAILJS_KEY)
        } catch (e) { console.warn(e) }
        if (resp.telefone) await enviarWhatsApp(resp.telefone, msgWpp)
      }
      for (const sup of supervisores || []) {
        try {
          await emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
            ordem: item.job || '—', item: item.maquina || '—',
            cliente: '—', operacao: 'LASER', saldo: 0, descricao,
            horario: new Date().toLocaleString('pt-BR'), to_email: sup.email
          }, EMAILJS_KEY)
        } catch (e) { console.warn(e) }
        if (sup.telefone) await enviarWhatsApp(sup.telefone, msgWpp)
      }
      await enviarWhatsApp(VICTOR_WHATSAPP, msgWpp)
      showToast(`✅ Enviado!`)
      setTimeout(() => onClose(), 1500)
    } catch (err) { console.error(err); showToast('Erro ao enviar!', 'var(--red)') }
    setEnviando(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: 24, width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <AlertTriangle size={20} color="#ff6b35" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Reportar problema</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{item.job ? `Job ${item.job}` : ''}{item.maquina ? ` · ${item.maquina}` : ''}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={20} /></button>
        </div>
        {selectedResps.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {selectedResps.map(r => (
              <div key={r.id} style={{ background: 'rgba(0,229,255,.1)', border: '1px solid rgba(0,229,255,.3)', borderRadius: 20, padding: '4px 10px', fontSize: 12, fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 6 }}>
                {r.nome.split(' ')[0]}
                <button onClick={() => toggleResp(r)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 0 }}>×</button>
              </div>
            ))}
          </div>
        )}
        <div className="field">
          <label>Enviar para</label>
          <input className="input" value={buscaResp} onChange={e => onBuscaResp(e.target.value)} placeholder="Filtrar por nome..." />
        </div>
        <div style={{ background: 'var(--surface2)', borderRadius: 10, overflow: 'hidden', marginBottom: 14, border: '1px solid var(--border)' }}>
          {respFiltrados.map(r => {
            const selecionado = selectedResps.some(p => p.id === r.id)
            return (
              <div key={r.id} onClick={() => toggleResp(r)} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, background: selecionado ? 'rgba(0,229,255,.08)' : 'transparent' }}>
                <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, border: `2px solid ${selecionado ? 'var(--accent)' : 'var(--border)'}`, background: selecionado ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
          <textarea className="input" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: chapa com defeito, máquina travada..." style={{ minHeight: 100, resize: 'vertical', fontSize: 14 }} />
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

  const abas = [
    { key: 'planejar', label: '📋 Planejar' },
    { key: 'apontar', label: '✅ Apontar' },
    { key: 'sequencia', label: '🔢 Sequência' },
    { key: 'planejamentos', label: '🗂️ Planos' },
    { key: 'relatorio', label: '📊 Relatório' },
  ]

  return (
    <div>
      <div className="page-header">
        <div className="page-icon"><Zap size={22} color="#000" /></div>
        <div><h1>LASER</h1><p>Corte, planejamento e sequência</p></div>
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

      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        {abas.slice(0, 3).map(({ key, label }) => (
          <button key={key} onClick={() => setAba(key)} style={{
            flex: 1, padding: '10px 4px', border: '1px solid',
            borderColor: aba === key ? 'var(--accent)' : 'var(--border)',
            background: aba === key ? 'rgba(0,229,255,.1)' : 'var(--surface)',
            color: aba === key ? 'var(--accent)' : 'var(--muted)',
            borderRadius: 10, fontWeight: 700, fontSize: 10, cursor: 'pointer'
          }}>{label}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {abas.slice(3).map(({ key, label }) => (
          <button key={key} onClick={() => setAba(key)} style={{
            flex: 1, padding: '10px 4px', border: '1px solid',
            borderColor: aba === key ? 'var(--accent)' : 'var(--border)',
            background: aba === key ? 'rgba(0,229,255,.1)' : 'var(--surface)',
            color: aba === key ? 'var(--accent)' : 'var(--muted)',
            borderRadius: 10, fontWeight: 700, fontSize: 10, cursor: 'pointer'
          }}>{label}</button>
        ))}
      </div>

      {aba === 'planejar' && <PlanejarCorte planta={planta} usuario={usuario} />}
      {aba === 'apontar' && <ApontarProducao planta={planta} usuario={usuario} />}
      {aba === 'sequencia' && <Sequencia planta={planta} usuario={usuario} />}
      {aba === 'planejamentos' && <Planejamentos planta={planta} usuario={usuario} />}
      {aba === 'relatorio' && <Relatorio planta={planta} usuario={usuario} />}
    </div>
  )
}

function PlanejarCorte({ planta, usuario }) {
  const isLiderOuMais = ['lider', 'supervisor', 'super'].includes(usuario?.nivel)
  const [maquina, setMaquina] = useState('')
  const [job, setJob] = useState('')
  const [turno, setTurno] = useState(detectarTurno())
  const [ordens, setOrdens] = useState([])
  const [totalChapas, setTotalChapas] = useState('')
  const [tipoCort, setTipoCort] = useState('total')
  const [chapasParcial, setChapasParcial] = useState('')
  const [cncs, setCncs] = useState([])
  const [nestingEncontrado, setNestingEncontrado] = useState(false)
  const [itensPorCNCNesting, setItensPorCNCNesting] = useState({})
  const [cncExpandido, setCncExpandido] = useState(null)
  const [loading, setLoading] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [toast, setToast] = useState(null)
  const [maquinasSalvas, setMaquinasSalvas] = useState([])
  const [showMaquinas, setShowMaquinas] = useState(false)

  useEffect(() => {
    const salvas = JSON.parse(localStorage.getItem('maquinas_laser') || '[]')
    setMaquinasSalvas(salvas)
  }, [])

  function showToast(msg, cor = 'var(--green)') {
    setToast({ msg, cor })
    setTimeout(() => setToast(null), 3000)
  }

  function salvarMaquina(nome) {
    const salvas = JSON.parse(localStorage.getItem('maquinas_laser') || '[]')
    if (!salvas.includes(nome)) {
      salvas.push(nome)
      localStorage.setItem('maquinas_laser', JSON.stringify(salvas))
      setMaquinasSalvas(salvas)
    }
  }

  function adicionarCNC() { setCncs(prev => [...prev, { codigo: '', chapas: '', tempoH: '', tempoM: '' }]) }
  function removerCNC(idx) { setCncs(prev => prev.filter((_, i) => i !== idx)) }
  function atualizarCNC(idx, campo, valor) { setCncs(prev => prev.map((c, i) => i === idx ? { ...c, [campo]: valor } : c)) }

  function tempoTotalCNC(cnc) {
    const chapas = parseInt(cnc.chapas) || 1
    const minPorChapa = (parseInt(cnc.tempoH) || 0) * 60 + (parseInt(cnc.tempoM) || 0)
    return chapas * minPorChapa
  }

  const tempoTotalJob = cncs.reduce((s, c) => s + tempoTotalCNC(c), 0)
  const totalChapasCNCs = cncs.reduce((s, c) => s + (parseInt(c.chapas) || 0), 0)

  async function buscarOrdens() {
    if (!maquina || !job) { showToast('Informe a máquina e o job!', 'var(--red)'); return }
    setLoading(true)
    setNestingEncontrado(false)

    const { data } = await supabase.from('ordens').select('ordem, item_ccs, cliente, qtde_ordem, saldo, estab').ilike('tarefa', `%${job}%`).order('item_ccs')

    if (usuario?.estab && usuario.estab !== 'todas' && data?.length > 0) {
      const estabOrdem = data[0].estab
      if (estabOrdem !== usuario.estab) {
        showToast(`❌ Este job é de ${estabOrdem === '100' ? 'Limeira' : 'Palmeira'}!`, 'var(--red)')
        setLoading(false)
        return
      }
    }

    const { data: nestingRows } = await supabase.from('nesting').select('programa, qtd_chapa, tempo_corte_total, ordem, item, qtd_nesting').ilike('tarefa', `%${job}%`).order('programa')

    if (nestingRows && nestingRows.length > 0) {
      const programasVistos = {}
      nestingRows.forEach(row => { if (!programasVistos[row.programa]) programasVistos[row.programa] = row })
      const cncsDoNesting = Object.values(programasVistos).map(row => {
        const tempoTotalMin = Math.round((parseFloat(String(row.tempo_corte_total).replace(',', '.')) || 0) * 60)
        const chapas = parseInt(row.qtd_chapa) || 1
        const tempoPorChapa = chapas > 0 ? Math.round(tempoTotalMin / chapas) : 0
        return {
          codigo: String(row.programa), chapas: String(chapas),
          tempoH: Math.floor(tempoPorChapa / 60) > 0 ? String(Math.floor(tempoPorChapa / 60)) : '',
          tempoM: tempoPorChapa % 60 > 0 ? String(tempoPorChapa % 60) : '',
        }
      })
      setCncs(cncsDoNesting)
      setNestingEncontrado(true)

      // Agrupa itens por CNC
      const itensPorProg = {}
      nestingRows.forEach(row => {
        if (!itensPorProg[row.programa]) itensPorProg[row.programa] = []
        if (row.item) itensPorProg[row.programa].push({ item: row.item, ordem: row.ordem, qtd: row.qtd_nesting })
      })
      setItensPorCNCNesting(itensPorProg)

      const totalChapasNesting = Object.values(programasVistos).reduce((s, r) => s + (parseInt(r.qtd_chapa) || 0), 0)
      setTotalChapas(String(totalChapasNesting))
      showToast(`✅ ${cncsDoNesting.length} CNC(s) importados do nesting!`)
    } else {
      setCncs([]); setNestingEncontrado(false); setItensPorCNCNesting({})
    }

    setOrdens(data || [])
    salvarMaquina(maquina)
    setLoading(false)
    if (!data?.length) showToast('Nenhuma ordem encontrada!', 'var(--red)')
  }

  async function confirmar() {
    if (!totalChapas) { showToast('Informe o total de chapas!', 'var(--red)'); return }
    if (tipoCort === 'parcial' && !chapasParcial) { showToast('Informe quantas chapas vai cortar!', 'var(--red)'); return }
    if (ordens.length === 0) { showToast('Busque as ordens primeiro!', 'var(--red)'); return }
    setSalvando(true)
    const estab = ordens[0]?.estab || ''
    const chapasCortar = tipoCort === 'parcial' ? parseInt(chapasParcial) : parseInt(totalChapas)
    const cncsFormatados = cncs.map((c, i) => ({
      numero: i + 1, codigo: c.codigo, chapas: parseInt(c.chapas) || 1,
      tempoPorChapa: (parseInt(c.tempoH) || 0) * 60 + (parseInt(c.tempoM) || 0),
      tempoTotal: tempoTotalCNC(c)
    }))
    const { error } = await supabase.from('laser_planejamento').insert({
      job, maquina, turno,
      total_chapas: parseInt(totalChapas), tipo: tipoCort, chapas_cortar: chapasCortar,
      tempo_chapa: cncsFormatados.length > 0 && chapasCortar > 0 ? Math.round(tempoTotalJob / chapasCortar) : null,
      cncs: cncsFormatados, cnc_ativo: 0, chapas_feitas: 0, finalizado: false, pausas: [],
      estab, usuario_nome: usuario?.nome, usuario_email: usuario?.email
    })
    setSalvando(false)
    if (error) { showToast('Erro ao salvar!', 'var(--red)') }
    else {
      showToast('✅ Planejamento salvo!')
      setJob(''); setTotalChapas(''); setChapasParcial(''); setTipoCort('total')
      setOrdens([]); setCncs([]); setNestingEncontrado(false); setItensPorCNCNesting({})
      setCncExpandido(null); setTurno(detectarTurno())
    }
  }

  const maquinasFiltradas = maquinasSalvas.filter(m => m.toLowerCase().includes(maquina.toLowerCase()))

  return (
    <>
      <div className="card">
        <div className="card-title">📋 Planejar corte</div>
        <div className="field" style={{ position: 'relative' }}>
          <label>Máquina</label>
          <input className="input" value={maquina}
            onChange={e => { setMaquina(e.target.value); setShowMaquinas(true) }}
            onFocus={() => setShowMaquinas(true)}
            onBlur={() => setTimeout(() => setShowMaquinas(false), 200)}
            placeholder="Ex: ML42, ML35..." autoComplete="off" />
          {showMaquinas && maquinasFiltradas.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface2)', border: '1px solid var(--accent)', borderTop: 'none', borderRadius: '0 0 10px 10px', zIndex: 100 }}>
              {maquinasFiltradas.map((m, i) => (
                <div key={i} onClick={() => { setMaquina(m); setShowMaquinas(false) }} style={{ padding: '10px 14px', cursor: 'pointer', fontFamily: 'monospace', fontSize: 13, borderBottom: '1px solid var(--border)' }}>{m}</div>
              ))}
            </div>
          )}
        </div>
        <div className="field">
          <label>Job / Tarefa</label>
          <input className="input" value={job} onChange={e => setJob(e.target.value)} onKeyDown={e => e.key === 'Enter' && buscarOrdens()} placeholder="Ex: J092362" />
        </div>
        <div className="field">
          <label>Turno</label>
          {isLiderOuMais ? (
            <select className="input" value={turno} onChange={e => setTurno(e.target.value)}>
              <option value="1">1º Turno (07:00 - 16:48)</option>
              <option value="2">2º Turno (16:48 - 02:09)</option>
              <option value="3">3º Turno (02:09 - 07:00)</option>
            </select>
          ) : (
            <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>🕐</span>
              <span style={{ fontWeight: 700 }}>{nomeTurnoLongo(turno)}</span>
              <span style={{ fontSize: 11, color: 'var(--green)', marginLeft: 'auto' }}>automático</span>
            </div>
          )}
        </div>
        <button className="btn-primary" onClick={buscarOrdens} disabled={loading} style={{ background: 'var(--yellow)', color: '#000', marginBottom: 0 }}>
          {loading ? 'Buscando...' : '🔍 Buscar ordens'}
        </button>
      </div>

      {ordens.length > 0 && (
        <div className="card">
          <div className="card-title">Ordens do job {job}</div>
          <div className="field">
            <label>Total de chapas do job</label>
            <input className="input" type="number" value={totalChapas} onChange={e => setTotalChapas(e.target.value)} placeholder="Ex: 10" min="1" />
          </div>
          <div className="field">
            <label>Vai cortar</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['total', 'parcial'].map(opt => (
                <button key={opt} onClick={() => setTipoCort(opt)} style={{
                  flex: 1, padding: '10px', border: '1px solid',
                  borderColor: tipoCort === opt ? 'var(--yellow)' : 'var(--border)',
                  background: tipoCort === opt ? 'rgba(255,214,10,.1)' : 'var(--surface2)',
                  color: tipoCort === opt ? 'var(--yellow)' : 'var(--muted)',
                  borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer'
                }}>{opt === 'total' ? '✅ Total' : '⚡ Parcial'}</button>
              ))}
            </div>
          </div>
          {tipoCort === 'parcial' && (
            <div className="field">
              <label>Quantas chapas vai cortar agora?</label>
              <input className="input" type="number" value={chapasParcial} onChange={e => setChapasParcial(e.target.value)} placeholder={`de ${totalChapas || '?'} chapas`} min="1" />
            </div>
          )}
          <div className="field">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <label style={{ marginBottom: 0 }}>
                CNCs do nesting
                {nestingEncontrado && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, background: 'rgba(0,255,136,.2)', color: 'var(--green)', padding: '2px 7px', borderRadius: 10 }}>✅ Auto</span>}
              </label>
              <button onClick={adicionarCNC} style={{ background: 'rgba(0,229,255,.1)', border: '1px solid rgba(0,229,255,.3)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700 }}>
                <Plus size={13} /> Adicionar CNC
              </button>
            </div>
            {nestingEncontrado && (
              <div style={{ background: 'rgba(0,255,136,.08)', border: '1px solid rgba(0,255,136,.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: 'var(--green)' }}>
                🎉 CNCs importados automaticamente do nesting!
              </div>
            )}
            {cncs.length === 0 && (
              <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '14px', textAlign: 'center', fontSize: 12, color: 'var(--muted)', border: '1px dashed var(--border)' }}>
                Toque em "Adicionar CNC" para informar os programas
              </div>
            )}
            {cncs.map((cnc, idx) => {
              const tempoTotal = tempoTotalCNC(cnc)
              const itensDosCNC = itensPorCNCNesting[cnc.codigo] || []
              return (
                <div key={idx} style={{ background: 'var(--surface2)', borderRadius: 10, padding: '12px', marginBottom: 8, border: nestingEncontrado ? '1px solid rgba(0,255,136,.2)' : '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#000' }}>{idx + 1}</div>
                    <div style={{ flex: 1, fontWeight: 700, fontSize: 13 }}>CNC {idx + 1}{cnc.codigo ? ` — ${cnc.codigo}` : ''}</div>
                    {tempoTotal > 0 && <div style={{ background: 'rgba(0,229,255,.1)', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>⏱️ {formatarTempo(tempoTotal)}</div>}
                    <button onClick={() => removerCNC(idx)} style={{ background: 'rgba(255,61,90,.1)', border: '1px solid rgba(255,61,90,.3)', borderRadius: 6, padding: '4px 6px', cursor: 'pointer', color: 'var(--red)' }}><Trash2 size={12} /></button>
                  </div>
                  <div className="field" style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 11 }}>Código do programa</label>
                    <input className="input" value={cnc.codigo} onChange={e => atualizarCNC(idx, 'codigo', e.target.value)} placeholder="Ex: 248382..." />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: 11 }}>Nº chapas</label>
                      <input className="input" type="number" value={cnc.chapas} onChange={e => atualizarCNC(idx, 'chapas', e.target.value)} placeholder="1" min="1" />
                    </div>
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: 11 }}>Tempo por chapa</label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <div style={{ flex: 1 }}>
                          <input className="input" type="number" value={cnc.tempoH} onChange={e => atualizarCNC(idx, 'tempoH', e.target.value)} placeholder="0" min="0" />
                          <div style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'center', marginTop: 2 }}>h</div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <input className="input" type="number" value={cnc.tempoM} onChange={e => atualizarCNC(idx, 'tempoM', e.target.value)} placeholder="0" min="0" max="59" />
                          <div style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'center', marginTop: 2 }}>min</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Itens do nesting para este CNC */}
                  {itensDosCNC.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <button onClick={() => setCncExpandido(cncExpandido === idx ? null : idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 11, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {cncExpandido === idx ? '▼' : '▶'} {itensDosCNC.length} item(s) neste CNC
                      </button>
                      {cncExpandido === idx && (
                        <div style={{ marginTop: 6, background: 'rgba(0,229,255,.04)', borderRadius: 6, padding: '6px 10px' }}>
                          {itensDosCNC.map((it, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, padding: '4px 0', borderBottom: i < itensDosCNC.length - 1 ? '1px solid var(--border)' : 'none' }}>
                              <span style={{ fontFamily: 'monospace', color: 'var(--text)' }}>{it.item}</span>
                              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{it.qtd} pç</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            {cncs.length > 0 && tempoTotalJob > 0 && (
              <div style={{ background: 'rgba(255,214,10,.08)', border: '1px solid rgba(255,214,10,.3)', borderRadius: 10, padding: '12px 16px', marginTop: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 24 }}>⏱️</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>Tempo total ({cncs.length} CNC{cncs.length > 1 ? 's' : ''} · {totalChapasCNCs} chapas)</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 700, color: 'var(--yellow)' }}>{formatarTempo(tempoTotalJob)}</div>
                </div>
              </div>
            )}
          </div>
          <div style={{ height: 1, background: 'var(--border)', margin: '8px 0 16px' }} />
          {ordens.map((o, i) => (
            <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>{o.item_ccs}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>OP {o.ordem} · {o.cliente || '—'} · {o.qtde_ordem} pç</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ background: o.estab === '100' ? 'rgba(0,229,255,.15)' : 'rgba(0,255,136,.15)', color: o.estab === '100' ? 'var(--accent)' : 'var(--green)', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4 }}>{o.estab === '100' ? 'Limeira' : 'Palmeira'}</span>
                <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--yellow)', fontWeight: 700, marginTop: 4 }}>{o.saldo} pç</div>
              </div>
            </div>
          ))}
          <button className="btn-primary" onClick={confirmar} disabled={salvando} style={{ background: 'var(--yellow)', color: '#000', marginTop: 16 }}>
            {salvando ? 'Salvando...' : '✅ Confirmar planejamento'}
          </button>
        </div>
      )}
      {toast && <div className="toast" style={{ background: toast.cor }}>{toast.msg}</div>}
    </>
  )
}

function ApontarProducao({ planta, usuario }) {
  const [job, setJob] = useState('')
  const [busca, setBusca] = useState('')
  const [ordens, setOrdens] = useState([])
  const [ordensFiltradas, setOrdensFiltradas] = useState([])
  const [quantidades, setQuantidades] = useState({})
  const [loading, setLoading] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [toast, setToast] = useState(null)
  const [planejamento, setPlanejamento] = useState(null)
  const [cncAtivo, setCncAtivo] = useState(0)
  const [itensPorCNC, setItensPorCNC] = useState({})

  function showToast(msg, cor = 'var(--green)') {
    setToast({ msg, cor })
    setTimeout(() => setToast(null), 2500)
  }

  async function buscarOrdens() {
    if (!job) { showToast('Informe o job!', 'var(--red)'); return }
    setLoading(true)
    const { data: ords } = await supabase.from('ordens').select('ordem, item_ccs, cliente, qtde_ordem, saldo, estab').ilike('tarefa', `%${job}%`).order('item_ccs')

    if (usuario?.estab && usuario.estab !== 'todas' && ords?.length > 0) {
      const estabOrdem = ords[0].estab
      if (estabOrdem !== usuario.estab) {
        showToast(`❌ Este job é de ${estabOrdem === '100' ? 'Limeira' : 'Palmeira'}!`, 'var(--red)')
        setLoading(false); return
      }
    }

    const { data: plan } = await supabase.from('laser_planejamento').select('*').ilike('job', `%${job}%`).order('criado_em', { ascending: false }).limit(1)
    const { data: nestingRows } = await supabase.from('nesting').select('programa, ordem, item, qtd_nesting').ilike('tarefa', `%${job}%`).order('programa')

    const itensPorCNCTemp = {}
    nestingRows?.forEach(row => {
      if (!itensPorCNCTemp[row.programa]) itensPorCNCTemp[row.programa] = []
      itensPorCNCTemp[row.programa].push(row)
    })

    setOrdens(ords || [])
    setOrdensFiltradas(ords || [])
    setPlanejamento(plan?.[0] || null)
    setCncAtivo(plan?.[0]?.cnc_ativo || 0)
    setItensPorCNC(itensPorCNCTemp)
    const qtds = {}
    ords?.forEach(o => { qtds[o.ordem] = '' })
    setQuantidades(qtds)
    setLoading(false); setBusca('')
    if (!ords?.length) showToast('Nenhuma ordem encontrada!', 'var(--red)')
  }

  async function selecionarCNC(idx) {
    setCncAtivo(idx)
    if (planejamento) await supabase.from('laser_planejamento').update({ cnc_ativo: idx }).eq('id', planejamento.id)
    const cnc = cncs[idx]
    if (cnc && itensPorCNC[cnc.codigo]) {
      const ordensDosCNC = itensPorCNC[cnc.codigo].map(i => String(i.ordem))
      setOrdensFiltradas(ordens.filter(o => ordensDosCNC.includes(String(o.ordem))))
    } else {
      setOrdensFiltradas(ordens)
    }
  }

  function filtrarOrdens(val) {
    setBusca(val)
    if (!val) { setOrdensFiltradas(ordens); return }
    const q = val.toLowerCase()
    setOrdensFiltradas(ordens.filter(o => o.item_ccs.toLowerCase().includes(q) || o.ordem.toLowerCase().includes(q) || (o.cliente || '').toLowerCase().includes(q)))
  }

  async function confirmar() {
    const temQtd = Object.values(quantidades).some(q => q !== '' && parseInt(q) >= 0)
    if (!temQtd) { showToast('Preencha pelo menos uma quantidade!', 'var(--red)'); return }
    setSalvando(true)
    for (const ordem of ordens) {
      const qtd = quantidades[ordem.ordem]
      if (qtd === '') continue
      await supabase.from('laser_apontamento').insert({
        job, ordem: ordem.ordem, item_ccs: ordem.item_ccs,
        qtd_planejada: ordem.qtde_ordem, qtd_real: parseInt(qtd),
        maquina: planejamento?.maquina || '',
        usuario_nome: usuario?.nome, usuario_email: usuario?.email
      })
    }
    if (planejamento && planejamento.tipo === 'total') {
      await supabase.from('laser_planejamento').update({ finalizado: true }).eq('id', planejamento.id)
    }
    setSalvando(false)
    showToast('✅ Apontamentos salvos!')
    setOrdens([]); setOrdensFiltradas([]); setJob('')
    setQuantidades({}); setPlanejamento(null); setBusca(''); setCncAtivo(0); setItensPorCNC({})
  }

  const cncs = planejamento?.cncs || []

  return (
    <>
      <div className="card">
        <div className="card-title">✅ Apontar produção laser</div>
        <div className="field">
          <label>Job / Tarefa</label>
          <input className="input" value={job} onChange={e => setJob(e.target.value)} onKeyDown={e => e.key === 'Enter' && buscarOrdens()} placeholder="Ex: J092362" />
        </div>
        <button className="btn-primary" onClick={buscarOrdens} disabled={loading} style={{ marginBottom: 0 }}>
          {loading ? 'Buscando...' : '🔍 Buscar ordens'}
        </button>
      </div>

      {planejamento && (
        <div style={{ background: 'rgba(255,214,10,.08)', border: '1px solid rgba(255,214,10,.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
          <div style={{ fontWeight: 700, color: 'var(--yellow)', marginBottom: 4 }}>📋 Planejamento encontrado</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            Máquina: {planejamento.maquina} · {planejamento.total_chapas} chapas
            {planejamento.turno ? ` · ${nomeTurnoLongo(planejamento.turno)}` : ''}
            {planejamento.tipo === 'parcial' ? ` · Parcial: ${planejamento.chapas_cortar} chapas` : ' · Total'}
          </div>
        </div>
      )}

      {cncs.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-title">🎯 Qual CNC está cortando agora?</div>
          {cncs.map((cnc, idx) => (
            <div key={idx} style={{ marginBottom: 8 }}>
              <div onClick={() => selecionarCNC(idx)} style={{
                padding: '12px',
                background: cncAtivo === idx ? 'rgba(0,229,255,.08)' : 'var(--surface2)',
                border: `2px solid ${cncAtivo === idx ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12
              }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: cncAtivo === idx ? 'var(--accent)' : 'var(--surface)', border: `2px solid ${cncAtivo === idx ? 'var(--accent)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: cncAtivo === idx ? '#000' : 'var(--muted)' }}>{cnc.numero}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: cncAtivo === idx ? 'var(--accent)' : 'var(--text)' }}>CNC {cnc.numero}{cnc.codigo ? ` — ${cnc.codigo}` : ''}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    {cnc.chapas || 1} chapa{(cnc.chapas || 1) > 1 ? 's' : ''}
                    {cnc.tempoPorChapa > 0 ? ` · ${formatarTempo(cnc.tempoPorChapa)}/chapa` : ''}
                    {itensPorCNC[cnc.codigo] ? ` · ${itensPorCNC[cnc.codigo].length} item(s)` : ''}
                  </div>
                </div>
                {cncAtivo === idx && <div style={{ background: 'var(--accent)', color: '#000', borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 700 }}>▶ Ativo</div>}
              </div>
              {/* Itens do CNC quando ativo */}
              {cncAtivo === idx && itensPorCNC[cnc.codigo] && (
                <div style={{ background: 'rgba(0,229,255,.04)', border: '1px solid rgba(0,229,255,.15)', borderRadius: '0 0 8px 8px', padding: '8px 12px', marginTop: -4 }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Itens deste CNC</div>
                  {itensPorCNC[cnc.codigo].map((it, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, padding: '3px 0', borderBottom: i < itensPorCNC[cnc.codigo].length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <span style={{ fontFamily: 'monospace', color: 'var(--text)' }}>{it.item}</span>
                      <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{it.qtd_nesting} pç</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {ordens.length > 0 && (
        <>
          <div className="field">
            <input className="input" value={busca} onChange={e => filtrarOrdens(e.target.value)} placeholder="Filtrar por item, ordem ou cliente..." />
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            {ordensFiltradas.length} de {ordens.length} ordem(s)
          </div>
          {ordensFiltradas.map(o => (
            <div key={o.ordem} className="card" style={{ marginBottom: 10, padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700 }}>{o.item_ccs}</div>
                <span style={{ background: o.estab === '100' ? 'rgba(0,229,255,.15)' : 'rgba(0,255,136,.15)', color: o.estab === '100' ? 'var(--accent)' : 'var(--green)', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4 }}>{o.estab === '100' ? 'Limeira' : 'Palmeira'}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>OP {o.ordem} · {o.cliente || '—'} · Planejado: {o.qtde_ordem} pç</div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Quantidade real</label>
                <input className="input" type="number" value={quantidades[o.ordem] || ''} onChange={e => setQuantidades(p => ({ ...p, [o.ordem]: e.target.value }))} placeholder={`Planejado: ${o.qtde_ordem} pç`} min="0" />
              </div>
            </div>
          ))}
          <button className="btn-primary" onClick={confirmar} disabled={salvando}>
            {salvando ? 'Salvando...' : '✅ Confirmar apontamentos'}
          </button>
        </>
      )}
      {toast && <div className="toast" style={{ background: toast.cor }}>{toast.msg}</div>}
    </>
  )
}

function Sequencia({ planta, usuario }) {
  const [dados, setDados] = useState([])
  const [loading, setLoading] = useState(true)
  const [reportando, setReportando] = useState(null)
  const [agora, setAgora] = useState(new Date())
  const alertasEnviados = useState(new Set())[0]

  useEffect(() => { carregarSequencia() }, [planta])
  useEffect(() => {
    const interval = setInterval(() => setAgora(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  async function carregarSequencia() {
    setLoading(true)
    let q = supabase.from('laser_planejamento').select('*')
      .eq('finalizado', false)
      .order('turno', { ascending: true })
      .order('criado_em', { ascending: true })
    if (planta && planta !== 'todas') q = q.eq('estab', planta)
    const { data } = await q
    setDados(data || [])
    setLoading(false)
  }

  async function iniciar(job) {
    const now = new Date().toISOString()
    await supabase.from('laser_planejamento').update({ iniciado_em: now }).eq('id', job.id)
    setDados(prev => prev.map(d => d.id === job.id ? { ...d, iniciado_em: now } : d))
    await notificarSupervisores(`▶️ *Laser iniciado - CCS Tec*\n\n*Job:* ${job.job}\n*Máquina:* ${job.maquina}\n*Operador:* ${usuario?.nome}\n*Horário:* ${new Date().toLocaleString('pt-BR')}`)
  }

  async function pausar(job, motivo) {
    const pausas = job.pausas || []
    const novasPausas = [...pausas, { inicio: new Date().toISOString(), fim: null, motivo }]
    await supabase.from('laser_planejamento').update({ pausas: novasPausas }).eq('id', job.id)
    setDados(prev => prev.map(d => d.id === job.id ? { ...d, pausas: novasPausas } : d))
    await notificarSupervisores(`⏸️ *Laser pausado - CCS Tec*\n\n*Job:* ${job.job}\n*Máquina:* ${job.maquina}\n*Motivo:* ${motivo}\n*Operador:* ${usuario?.nome}\n*Horário:* ${new Date().toLocaleString('pt-BR')}`)
  }

  async function retomar(job) {
    const pausas = job.pausas || []
    const novasPausas = pausas.map((p, i) =>
      i === pausas.length - 1 && !p.fim ? { ...p, fim: new Date().toISOString() } : p
    )
    await supabase.from('laser_planejamento').update({ pausas: novasPausas }).eq('id', job.id)
    setDados(prev => prev.map(d => d.id === job.id ? { ...d, pausas: novasPausas } : d))
    await notificarSupervisores(`▶️ *Laser retomado - CCS Tec*\n\n*Job:* ${job.job}\n*Máquina:* ${job.maquina}\n*Operador:* ${usuario?.nome}\n*Horário:* ${new Date().toLocaleString('pt-BR')}`)
  }

  async function marcarChapa(job) {
    const novas = (job.chapas_feitas || 0) + 1
    const finalizado = novas >= (job.chapas_cortar || job.total_chapas)
    const update = { chapas_feitas: novas, finalizado }
    if (finalizado) {
      update.finalizado_em = new Date().toISOString()
      await notificarSupervisores(`✅ *Laser finalizado - CCS Tec*\n\n*Job:* ${job.job}\n*Máquina:* ${job.maquina}\n*Chapas:* ${novas}\n*Operador:* ${usuario?.nome}\n*Horário:* ${new Date().toLocaleString('pt-BR')}`)
    }
    await supabase.from('laser_planejamento').update(update).eq('id', job.id)
    setDados(prev => prev.map(d => d.id === job.id ? { ...d, ...update } : d).filter(d => !d.finalizado))
  }

  function estaPausado(job) {
    const pausas = job.pausas || []
    return pausas.length > 0 && !pausas[pausas.length - 1].fim
  }

  function tempoTotalPausado(job) {
    const pausas = job.pausas || []
    return pausas.reduce((s, p) => {
      if (!p.fim) return s
      return s + Math.floor((new Date(p.fim) - new Date(p.inicio)) / 60000)
    }, 0)
  }

  function formatarCronometro(job) {
    if (!job.iniciado_em) return null
    const inicio = new Date(job.iniciado_em)
    const pausado = estaPausado(job)
    const pausas = job.pausas || []
    const ultimaPausa = pausas[pausas.length - 1]
    const referencia = pausado && ultimaPausa ? new Date(ultimaPausa.inicio) : agora
    const totalPausadoSeg = tempoTotalPausado(job) * 60
    const diff = Math.max(0, Math.floor((referencia - inicio) / 1000) - totalPausadoSeg)
    const h = Math.floor(diff / 3600)
    const m = Math.floor((diff % 3600) / 60)
    const s = diff % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  function calcularPerformance(job) {
    if (!job.iniciado_em || !job.tempo_chapa) return null
    const inicio = new Date(job.iniciado_em)
    const totalDecorrido = Math.floor((agora - inicio) / 60000)
    const pausado = tempoTotalPausado(job)
    const decorrido = totalDecorrido - pausado
    if (decorrido <= 0) return null
    const previsto = (job.chapas_cortar || job.total_chapas || 0) * job.tempo_chapa
    const perf = Math.round((previsto / decorrido) * 100)
    return { decorrido, previsto, perf: Math.min(perf, 999) }
  }

  function calcularAlerta(job) {
    if (!job.iniciado_em || !job.tempo_chapa || estaPausado(job)) return null
    const inicio = new Date(job.iniciado_em)
    const decorridoMin = Math.floor((agora - inicio) / 60000) - tempoTotalPausado(job)
    const chapasTotal = job.chapas_cortar || job.total_chapas || 0
    const chapasFeitas = job.chapas_feitas || 0
    const chapasRestantes = chapasTotal - chapasFeitas
    const previsto = chapasTotal * job.tempo_chapa
    const tempoRestantePrevisto = chapasRestantes * job.tempo_chapa
    if (decorridoMin > previsto && chapasRestantes > 0) {
      const chave = `critico-${job.id}`
      if (!alertasEnviados.has(chave)) {
        alertasEnviados.add(chave)
        notificarSupervisores(`🔴 *ALERTA LASER - Atrasado*\n\n*Job:* ${job.job}\n*Máquina:* ${job.maquina}\n*Situação:* Tempo previsto já passou — ainda faltam ${chapasRestantes} chapa(s)\n*Horário:* ${new Date().toLocaleString('pt-BR')}`)
      }
      return { nivel: 'critico', msg: `🔴 Atrasado! Tempo previsto já passou — faltam ${chapasRestantes} chapa(s)` }
    }
    const pctTempoUsado = previsto > 0 ? decorridoMin / previsto : 0
    const pctChapasFeitas = chapasTotal > 0 ? chapasFeitas / chapasTotal : 0
    if (pctTempoUsado > 0.75 && pctChapasFeitas < 0.5) {
      const chave = `atencao-${job.id}`
      if (!alertasEnviados.has(chave)) {
        alertasEnviados.add(chave)
        notificarSupervisores(`⚠️ *ALERTA LASER - Atenção*\n\n*Job:* ${job.job}\n*Máquina:* ${job.maquina}\n*Situação:* Mais de 75% do tempo usado e menos de 50% das chapas cortadas\n*Horário:* ${new Date().toLocaleString('pt-BR')}`)
      }
      return { nivel: 'atencao', msg: `⚠️ Atenção! Mais de 75% do tempo usado e menos de 50% das chapas cortadas` }
    }
    if (tempoRestantePrevisto <= 15 && chapasRestantes > 0) {
      return { nivel: 'atencao', msg: `⚠️ Menos de 15min para terminar — faltam ${chapasRestantes} chapa(s)` }
    }
    return null
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
      <h3>Nenhum job pendente</h3>
      <p>Lance um corte na aba Planejar</p>
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
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{jobs.length} job(s) pendente(s)</div>
            </div>
            <div style={{ background: 'rgba(255,214,10,.15)', border: '1px solid rgba(255,214,10,.3)', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700, color: 'var(--yellow)' }}>
              {nomeTurno(jobs[0]?.turno)}
            </div>
          </div>

          {jobs.map((job, idx) => {
            const chapasFeitas = job.chapas_feitas || 0
            const chapasTotal = job.chapas_cortar || job.total_chapas || 0
            const tempoRestante = job.tempo_chapa ? (chapasTotal - chapasFeitas) * job.tempo_chapa : null
            const previsao = tempoRestante && !estaPausado(job) ? previsaoTermino(tempoRestante) : null
            const cronometro = formatarCronometro(job)
            const perf = calcularPerformance(job)
            const alerta = calcularAlerta(job)
            const iniciado = !!job.iniciado_em
            const pausado = estaPausado(job)

            return (
              <div key={job.id} style={{ padding: '14px 16px', borderTop: '1px solid var(--border)' }}>
                {pausado && (
                  <div style={{ background: 'rgba(255,214,10,.12)', border: '1px solid rgba(255,214,10,.5)', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 12, fontWeight: 700, color: 'var(--yellow)' }}>
                    ⏸️ Pausado — {job.pausas?.[job.pausas.length - 1]?.motivo || 'Pausa'}
                  </div>
                )}
                {alerta && (
                  <div style={{ background: alerta.nivel === 'critico' ? 'rgba(255,61,90,.15)' : 'rgba(255,214,10,.12)', border: `1px solid ${alerta.nivel === 'critico' ? 'rgba(255,61,90,.5)' : 'rgba(255,214,10,.5)'}`, borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 12, fontWeight: 700, color: alerta.nivel === 'critico' ? 'var(--red)' : 'var(--yellow)' }}>
                    {alerta.msg}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: idx === 0 ? 'var(--accent)' : 'var(--surface2)', border: `2px solid ${idx === 0 ? 'var(--accent)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: idx === 0 ? '#000' : 'var(--muted)' }}>{idx + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
                      <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700 }}>{job.job}</div>
                      <span style={{ background: job.tipo === 'parcial' ? 'rgba(255,107,53,.2)' : 'rgba(0,255,136,.2)', color: job.tipo === 'parcial' ? '#ff6b35' : 'var(--green)', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>{job.tipo === 'parcial' ? '⚡ Parcial' : '✅ Total'}</span>
                      {job.estab && <span style={{ background: job.estab === '100' ? 'rgba(0,229,255,.15)' : 'rgba(0,255,136,.15)', color: job.estab === '100' ? 'var(--accent)' : 'var(--green)', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>{job.estab === '100' ? 'Limeira' : 'Palmeira'}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>👤 {job.usuario_nome} · {formatarHora(job.criado_em)}</div>
                    {iniciado && cronometro && (
                      <div style={{ background: pausado ? 'rgba(255,214,10,.08)' : 'rgba(0,229,255,.08)', border: `1px solid ${pausado ? 'rgba(255,214,10,.2)' : 'rgba(0,229,255,.2)'}`, borderRadius: 8, padding: '8px 12px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>{pausado ? '⏸️ Pausado' : '⏱️ Em corte'}</div>
                          <div style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700, color: pausado ? 'var(--yellow)' : 'var(--accent)', letterSpacing: 2 }}>{cronometro}</div>
                          {(job.pausas || []).filter(p => p.fim).length > 0 && (
                            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>⏸️ {(job.pausas || []).filter(p => p.fim).length} pausa(s) · {formatarTempo(tempoTotalPausado(job))} pausado</div>
                          )}
                        </div>
                        {perf && !pausado && (
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>Performance</div>
                            <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: perf.perf >= 100 ? 'var(--green)' : perf.perf >= 80 ? 'var(--yellow)' : 'var(--red)' }}>
                              {perf.perf >= 110 ? '🚀' : perf.perf >= 100 ? '🟢' : perf.perf >= 80 ? '🟡' : '🔴'} {perf.perf}%
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--muted)' }}>previsto {formatarTempo(perf.previsto)}</div>
                          </div>
                        )}
                      </div>
                    )}
                    {tempoRestante !== null && !pausado && (
                      <div style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 4, display: 'flex', gap: 10 }}>
                        <span>⏱️ {formatarTempo(tempoRestante)} restante</span>
                        {previsao && <span style={{ color: 'var(--green)', fontWeight: 700 }}>🏁 {previsao}</span>}
                      </div>
                    )}
                    <BarraProgresso feitas={chapasFeitas} total={chapasTotal} cor="var(--yellow)" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {!iniciado && <button onClick={() => iniciar(job)} style={{ background: 'rgba(0,229,255,.15)', border: '1px solid rgba(0,229,255,.4)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: 'var(--accent)', fontSize: 11, fontWeight: 700 }}>▶ Iniciar</button>}
                    {iniciado && !pausado && (
                      <button onClick={() => { const motivo = prompt('Motivo da pausa?') || 'Pausa'; pausar(job, motivo) }} style={{ background: 'rgba(255,214,10,.15)', border: '1px solid rgba(255,214,10,.4)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: 'var(--yellow)', fontSize: 13, fontWeight: 700 }}>⏸️</button>
                    )}
                    {iniciado && pausado && <button onClick={() => retomar(job)} style={{ background: 'rgba(0,255,136,.15)', border: '1px solid rgba(0,255,136,.4)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: 'var(--green)', fontSize: 11, fontWeight: 700 }}>▶ Retomar</button>}
                    <button onClick={() => marcarChapa(job)} style={{ background: 'rgba(0,255,136,.15)', border: '1px solid rgba(0,255,136,.3)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700 }}>
                      <Check size={13} /> +1
                    </button>
                    <button onClick={() => setReportando({ job: job.job, maquina: job.maquina })} style={{ background: 'rgba(255,107,53,.15)', border: '1px solid rgba(255,107,53,.4)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: '#ff6b35', display: 'flex', alignItems: 'center' }}>
                      <AlertTriangle size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
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
  const [editando, setEditando] = useState(null)
  const [editTempoH, setEditTempoH] = useState('')
  const [editTempoM, setEditTempoM] = useState('')
  const [salvandoEdit, setSalvandoEdit] = useState(false)
  const [toast, setToast] = useState(null)
  const isLiderOuMais = ['lider', 'supervisor', 'super'].includes(usuario?.nivel)

  useEffect(() => { carregarPlanejamentos() }, [planta])

  function showToast(msg, cor = 'var(--green)') {
    setToast({ msg, cor })
    setTimeout(() => setToast(null), 2500)
  }

  async function carregarPlanejamentos() {
    setLoading(true)
    let q = supabase.from('laser_planejamento').select('*').order('criado_em', { ascending: false })
    if (planta && planta !== 'todas') q = q.eq('estab', planta)
    const { data } = await q
    setPlanejamentos(data || [])
    setLoading(false)
  }

  async function excluir(id) {
    if (!confirm('Excluir este planejamento?')) return
    await supabase.from('laser_planejamento').delete().eq('id', id)
    showToast('🗑️ Planejamento excluído!')
    carregarPlanejamentos()
  }

  async function abrirDetalhe(plan) {
    setDetalhe(plan)
    setLoadingOrdens(true)
    const { data } = await supabase.from('ordens').select('ordem, item_ccs, cliente, qtde_ordem, saldo, estab').ilike('tarefa', `%${plan.job}%`).order('item_ccs')
    setOrdens(data || [])
    setLoadingOrdens(false)
  }

  function abrirEdicao(p) {
    setEditando({ ...p })
    const h = Math.floor((p.tempo_chapa || 0) / 60)
    const m = (p.tempo_chapa || 0) % 60
    setEditTempoH(h > 0 ? String(h) : '')
    setEditTempoM(m > 0 ? String(m) : '')
  }

  async function salvarEdicao() {
    if (!editando) return
    setSalvandoEdit(true)
    const tempoUnitMin = (parseInt(editTempoH) || 0) * 60 + (parseInt(editTempoM) || 0)
    await supabase.from('laser_planejamento').update({
      total_chapas: parseInt(editando.total_chapas),
      chapas_cortar: parseInt(editando.chapas_cortar),
      chapas_feitas: parseInt(editando.chapas_feitas) || 0,
      turno: editando.turno, maquina: editando.maquina,
      tempo_chapa: tempoUnitMin || null, finalizado: editando.finalizado
    }).eq('id', editando.id)
    setSalvandoEdit(false)
    setEditando(null)
    showToast('✅ Planejamento atualizado!')
    carregarPlanejamentos()
  }

  function formatarData(dataStr) {
    if (!dataStr) return '—'
    return new Date(dataStr).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  function tempoTotalPausado(pausas) {
    return (pausas || []).reduce((s, p) => {
      if (!p.fim) return s
      return s + Math.floor((new Date(p.fim) - new Date(p.inicio)) / 60000)
    }, 0)
  }

  if (loading) return <div className="empty"><div className="emoji">⏳</div><p>Carregando...</p></div>
  if (planejamentos.length === 0) return (
    <div className="empty">
      <div className="emoji">📋</div>
      <h3>Nenhum planejamento</h3>
      <p>Lance um corte na aba Planejar</p>
    </div>
  )

  const pendentes = planejamentos.filter(p => !p.finalizado)
  const finalizados = planejamentos.filter(p => p.finalizado)

  return (
    <>
      {pendentes.length > 0 && (
        <>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>⏳ Pendentes ({pendentes.length})</div>
          {pendentes.map(p => (
            <div key={p.id} className="card" style={{ marginBottom: 10, border: '1px solid rgba(255,107,53,.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => abrirDetalhe(p)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700 }}>{p.job}</div>
                    <span style={{ background: 'rgba(255,107,53,.2)', color: '#ff6b35', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>⏳ Pendente</span>
                    {p.estab && <span style={{ background: p.estab === '100' ? 'rgba(0,229,255,.15)' : 'rgba(0,255,136,.15)', color: p.estab === '100' ? 'var(--accent)' : 'var(--green)', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>{p.estab === '100' ? 'Limeira' : 'Palmeira'}</span>}
                    {p.pausas && p.pausas.some(x => !x.fim) && <span style={{ background: 'rgba(255,214,10,.2)', color: 'var(--yellow)', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>⏸️ Pausado</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>🖨️ {p.maquina} · {nomeTurno(p.turno)}</div>
                  {p.tempo_chapa && <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4 }}>⏱️ {formatarTempo((p.chapas_cortar || p.total_chapas) * p.tempo_chapa)} estimado</div>}
                  {(p.pausas || []).length > 0 && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>⏸️ {(p.pausas || []).filter(x => x.fim).length} pausa(s) · {formatarTempo(tempoTotalPausado(p.pausas))} pausado</div>}
                  <BarraProgresso feitas={p.chapas_feitas || 0} total={p.chapas_cortar || p.total_chapas} cor="#ff6b35" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {isLiderOuMais && (
                    <>
                      <button onClick={() => abrirEdicao(p)} style={{ background: 'rgba(0,229,255,.1)', border: '1px solid rgba(0,229,255,.3)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: 'var(--accent)' }}><Pencil size={14} /></button>
                      <button onClick={() => excluir(p.id)} style={{ background: 'rgba(255,61,90,.1)', border: '1px solid rgba(255,61,90,.3)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: 'var(--red)' }}>🗑️</button>
                    </>
                  )}
                  <button onClick={() => setReportando({ job: p.job, maquina: p.maquina })} style={{ background: 'rgba(255,107,53,.15)', border: '1px solid rgba(255,107,53,.4)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: '#ff6b35' }}><AlertTriangle size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {finalizados.length > 0 && (
        <>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginTop: 16 }}>✅ Finalizados ({finalizados.length})</div>
          {finalizados.map(p => (
            <div key={p.id} className="card" style={{ marginBottom: 10, opacity: 0.8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => abrirDetalhe(p)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700 }}>{p.job}</div>
                    <span style={{ background: 'rgba(0,255,136,.2)', color: 'var(--green)', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>✅ Finalizado</span>
                    {p.tipo === 'parcial' && <span style={{ background: 'rgba(255,107,53,.2)', color: '#ff6b35', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>⚡ Parcial</span>}
                    {p.iniciado_em && p.finalizado_em && (() => {
                      const totalMin = Math.floor((new Date(p.finalizado_em) - new Date(p.iniciado_em)) / 60000)
                      const pausado = tempoTotalPausado(p.pausas)
                      const min = totalMin - pausado
                      const previsto = (p.chapas_cortar || p.total_chapas || 0) * (p.tempo_chapa || 0)
                      const perf = previsto > 0 && min > 0 ? Math.round((previsto / min) * 100) : null
                      if (!perf) return null
                      return <span style={{ background: perf >= 100 ? 'rgba(0,255,136,.2)' : perf >= 80 ? 'rgba(255,214,10,.2)' : 'rgba(255,61,90,.2)', color: perf >= 100 ? 'var(--green)' : perf >= 80 ? 'var(--yellow)' : 'var(--red)', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>
                        {perf >= 110 ? '🚀' : perf >= 100 ? '🟢' : perf >= 80 ? '🟡' : '🔴'} {Math.min(perf, 999)}%
                      </span>
                    })()}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>🖨️ {p.maquina} · {p.total_chapas} chapas · {nomeTurno(p.turno)}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>👤 {p.usuario_nome} · {formatarData(p.criado_em)}</div>
                  {p.iniciado_em && p.finalizado_em && (
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                      ⏱️ Duração real: {formatarTempo(Math.floor((new Date(p.finalizado_em) - new Date(p.iniciado_em)) / 60000) - tempoTotalPausado(p.pausas))}
                      {tempoTotalPausado(p.pausas) > 0 && ` · ⏸️ ${formatarTempo(tempoTotalPausado(p.pausas))} pausado`}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {isLiderOuMais && (
                    <>
                      <button onClick={() => abrirEdicao(p)} style={{ background: 'rgba(0,229,255,.1)', border: '1px solid rgba(0,229,255,.3)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: 'var(--accent)' }}><Pencil size={14} /></button>
                      <button onClick={() => excluir(p.id)} style={{ background: 'rgba(255,61,90,.1)', border: '1px solid rgba(255,61,90,.3)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: 'var(--red)' }}>🗑️</button>
                    </>
                  )}
                  <button onClick={() => setReportando({ job: p.job, maquina: p.maquina })} style={{ background: 'rgba(255,107,53,.15)', border: '1px solid rgba(255,107,53,.4)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: '#ff6b35' }}><AlertTriangle size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {detalhe && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: 24, width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Job {detalhe.job}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{detalhe.maquina} · {detalhe.total_chapas} chapas · {nomeTurno(detalhe.turno)}</div>
              </div>
              <button onClick={() => { setDetalhe(null); setOrdens([]) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={20} /></button>
            </div>
            <BarraProgresso feitas={detalhe.chapas_feitas || 0} total={detalhe.chapas_cortar || detalhe.total_chapas} cor="var(--yellow)" />
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, margin: '16px 0 10px' }}>Ordens do job</div>
            {loadingOrdens ? (
              <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 20 }}>Carregando...</div>
            ) : ordens.map((o, i) => (
              <div key={i} style={{ padding: '10px 12px', marginBottom: 8, background: 'var(--surface2)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>{o.item_ccs}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>OP {o.ordem} · {o.cliente || '—'}</div>
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

      {editando && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: 24, width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Pencil size={18} color="var(--accent)" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Editar planejamento</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Job {editando.job}</div>
              </div>
              <button onClick={() => setEditando(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={20} /></button>
            </div>
            <div className="field"><label>Máquina</label><input className="input" value={editando.maquina || ''} onChange={e => setEditando(p => ({ ...p, maquina: e.target.value }))} /></div>
            <div className="field">
              <label>Turno</label>
              <select className="input" value={editando.turno || '1'} onChange={e => setEditando(p => ({ ...p, turno: e.target.value }))}>
                <option value="1">1º Turno</option>
                <option value="2">2º Turno</option>
                <option value="3">3º Turno</option>
              </select>
            </div>
            <div className="field"><label>Total de chapas</label><input className="input" type="number" value={editando.total_chapas || ''} onChange={e => setEditando(p => ({ ...p, total_chapas: e.target.value }))} min="1" /></div>
            <div className="field"><label>Chapas a cortar</label><input className="input" type="number" value={editando.chapas_cortar || ''} onChange={e => setEditando(p => ({ ...p, chapas_cortar: e.target.value }))} min="1" /></div>
            <div className="field"><label>Chapas feitas</label><input className="input" type="number" value={editando.chapas_feitas || 0} onChange={e => setEditando(p => ({ ...p, chapas_feitas: parseInt(e.target.value) || 0 }))} min="0" /></div>
            <div className="field">
              <label>Tempo por chapa <span style={{ fontSize: 11, color: 'var(--muted)' }}>(opcional)</span></label>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <input className="input" type="number" value={editTempoH} onChange={e => setEditTempoH(e.target.value)} placeholder="0" min="0" />
                  <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 4 }}>horas</div>
                </div>
                <div style={{ flex: 1 }}>
                  <input className="input" type="number" value={editTempoM} onChange={e => setEditTempoM(e.target.value)} placeholder="0" min="0" max="59" />
                  <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 4 }}>minutos</div>
                </div>
              </div>
            </div>
            <div className="field">
              <label>Status</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ key: false, label: '⏳ Pendente' }, { key: true, label: '✅ Finalizado' }].map(({ key, label }) => (
                  <button key={String(key)} onClick={() => setEditando(p => ({ ...p, finalizado: key }))} style={{ flex: 1, padding: '10px', border: '1px solid', borderColor: editando.finalizado === key ? 'var(--accent)' : 'var(--border)', background: editando.finalizado === key ? 'rgba(0,229,255,.1)' : 'var(--surface2)', color: editando.finalizado === key ? 'var(--accent)' : 'var(--muted)', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>{label}</button>
                ))}
              </div>
            </div>
            <button className="btn-primary" onClick={salvarEdicao} disabled={salvandoEdit}>{salvandoEdit ? 'Salvando...' : '✅ Salvar alterações'}</button>
          </div>
        </div>
      )}

      {reportando && <ModalReporte item={reportando} onClose={() => setReportando(null)} usuario={usuario} />}
      {toast && <div className="toast" style={{ background: toast.cor }}>{toast.msg}</div>}
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
      <p>Apontar produção na aba Apontar</p>
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
                <button onClick={() => setReportando({ job, maquina })} style={{ background: 'rgba(255,107,53,.15)', border: '1px solid rgba(255,107,53,.4)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: '#ff6b35', display: 'flex', alignItems: 'center' }}>
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
                        <div style={{ background: apontado >= planejado ? 'rgba(0,255,136,.1)' : 'rgba(255,61,90,.1)', border: `1px solid ${apontado >= planejado ? 'rgba(0,255,136,.3)' : 'rgba(255,61,90,.3)'}`, borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>✅ NO APP</div>
                          <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: apontado >= planejado ? 'var(--green)' : 'var(--red)' }}>{apontado}</div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: apontado >= planejado ? 'var(--green)' : 'var(--red)' }}>{diffApp >= 0 ? `+${diffApp}` : diffApp}</div>
                        </div>
                        <div style={{ background: sfcc >= planejado ? 'rgba(0,229,255,.1)' : 'rgba(255,214,10,.1)', border: `1px solid ${sfcc >= planejado ? 'rgba(0,229,255,.3)' : 'rgba(255,214,10,.3)'}`, borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>🖥️ SISTEMA</div>
                          <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: sfcc >= planejado ? 'var(--accent)' : 'var(--yellow)' }}>{sfcc}</div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: sfcc >= planejado ? 'var(--accent)' : 'var(--yellow)' }}>{diffSfcc >= 0 ? `+${diffSfcc}` : diffSfcc}</div>
                        </div>
                      </div>
                      {apontado !== sfcc && (
                        <div style={{ marginTop: 10, background: 'rgba(255,214,10,.08)', border: '1px solid rgba(255,214,10,.3)', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: 'var(--yellow)', display: 'flex', alignItems: 'center', gap: 6 }}>
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