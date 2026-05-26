import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { BASE_ITENS } from '../lib/baseItens'
import { AlertTriangle, X, ChevronRight, Plus, Trash2 } from 'lucide-react'
import emailjs from '@emailjs/browser'

const EMAILJS_SERVICE = 'service_b110i99'
const EMAILJS_TEMPLATE = 'template_1gm1y15'
const EMAILJS_KEY = 'TrKMj1WLgqrejytoU'
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const VICTOR_WHATSAPP = '5519987556217'

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

function nomeOp(cod) { return OPERACOES[cod?.trim()] || cod }

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

function nomeTurno(t) {
  if (t === '1') return '1º Turno (07:00 - 16:48)'
  if (t === '2') return '2º Turno (16:48 - 02:09)'
  if (t === '3') return '3º Turno (02:09 - 07:00)'
  return t
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

function parseData(dataStr) {
  if (!dataStr) return new Date(0)
  try {
    const partes = dataStr.split('/')
    if (partes.length !== 3) return new Date(0)
    const ano = partes[2].length === 2 ? '20' + partes[2] : partes[2]
    return new Date(`${ano}-${partes[1]}-${partes[0]}`)
  } catch { return new Date(0) }
}

function formatarTempo(minutos) {
  if (!minutos) return '—'
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${m}min`
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

export default function Formulario({ usuario }) {
  const [tipo, setTipo] = useState('usinagem')
  const estabPadrao = usuario?.estab === 'todas' ? '' : (usuario?.estab || '')
  const [planta, setPlanta] = useState(estabPadrao)

  return (
    <div>
      <div className="page-header">
        <div className="page-icon" style={{ background: 'linear-gradient(135deg, var(--accent), #0077ff)' }}>
          <span style={{ fontSize: 20 }}>
            {tipo === 'usinagem' ? '⚙️' : tipo === 'laser' ? '⚡' : '📦'}
          </span>
        </div>
        <div>
          <h1>INÍCIO</h1>
          <p>Lançamentos e consulta de ordens</p>
        </div>
      </div>

      {usuario?.estab === 'todas' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {[
            { key: '100', label: '📍 Limeira' },
            { key: '200', label: '📍 Palmeira' },
            { key: '', label: '🏭 Todas' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setPlanta(key)} style={{
              flex: 1, padding: '9px 6px', border: '1px solid',
              borderColor: planta === key ? 'var(--accent)' : 'var(--border)',
              background: planta === key ? 'rgba(0,229,255,.1)' : 'var(--surface)',
              color: planta === key ? 'var(--accent)' : 'var(--muted)',
              borderRadius: 10, fontWeight: 700, fontSize: 12, cursor: 'pointer'
            }}>{label}</button>
          ))}
        </div>
      )}

      {usuario?.estab !== 'todas' && (
        <div style={{
          background: usuario?.estab === '100' ? 'rgba(0,229,255,.1)' : 'rgba(0,255,136,.1)',
          border: `1px solid ${usuario?.estab === '100' ? 'rgba(0,229,255,.3)' : 'rgba(0,255,136,.3)'}`,
          borderRadius: 8, padding: '8px 14px', marginBottom: 12,
          fontSize: 12, fontWeight: 700,
          color: usuario?.estab === '100' ? 'var(--accent)' : 'var(--green)'
        }}>
          📍 {usuario?.estab === '100' ? 'Limeira' : 'Palmeira'}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { key: 'usinagem', label: '⚙️ Usinagem' },
          { key: 'laser', label: '⚡ Laser' },
          { key: 'ordens', label: '📦 Ordens' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTipo(key)} style={{
            flex: 1, padding: '10px 4px', border: '1px solid',
            borderColor: tipo === key ? 'var(--accent)' : 'var(--border)',
            background: tipo === key ? 'rgba(0,229,255,.1)' : 'var(--surface)',
            color: tipo === key ? 'var(--accent)' : 'var(--muted)',
            borderRadius: 10, fontWeight: 700, fontSize: 12, cursor: 'pointer'
          }}>{label}</button>
        ))}
      </div>

      {tipo === 'usinagem' && <FormUsinagem usuario={usuario} planta={planta} />}
      {tipo === 'laser' && <FormLaser usuario={usuario} planta={planta} />}
      {tipo === 'ordens' && <FormOrdens usuario={usuario} planta={planta} />}
    </div>
  )
}

function FormUsinagem({ usuario, planta }) {
  const isLiderOuMais = ['lider', 'supervisor', 'super'].includes(usuario?.nivel)
  const [codigo, setCodigo] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [turno, setTurno] = useState(detectarTurno())
  const [obs, setObs] = useState('')
  const [sugestoes, setSugestoes] = useState([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  function showToast(msg, cor = 'var(--green)') {
    setToast({ msg, cor })
    setTimeout(() => setToast(null), 2500)
  }

  function onCodigoInput(val) {
    setCodigo(val)
    if (val.length < 2) { setSugestoes([]); return }
    const q = val.toLowerCase()
    setSugestoes(BASE_ITENS.filter(i => i.codigo.toLowerCase().includes(q)).slice(0, 8))
  }

  function selecionarItem(item) {
    if (item.tipo === 'blank') {
      setCodigo(item.codigoUsin)
      showToast(`⚡ Blank → ${item.codigoUsin}`, 'var(--yellow)')
    } else {
      setCodigo(item.codigo)
    }
    setSugestoes([])
  }

  async function lancar() {
    if (!codigo || !quantidade || !turno) {
      showToast('Preencha todos os campos!', 'var(--red)')
      return
    }
    const itemBlank = BASE_ITENS.find(i => i.codigo.toLowerCase() === codigo.toLowerCase() && i.tipo === 'blank')
    if (itemBlank) { showToast(`⚠️ Código Blank! Use: ${itemBlank.codigoUsin}`, 'var(--red)'); return }
    if (codigo.startsWith('7.')) { showToast(`⚠️ Código parece ser Blank!`, 'var(--red)'); return }

    if (usuario?.estab && usuario.estab !== 'todas') {
      const { data: ordemData } = await supabase.from('ordens').select('estab').ilike('item_ccs', codigo).limit(1).single()
      if (ordemData && ordemData.estab !== usuario.estab) {
        showToast(`❌ Este item é de ${ordemData.estab === '100' ? 'Limeira' : 'Palmeira'}!`, 'var(--red)')
        return
      }
    }

    setLoading(true)
    const { error } = await supabase.from('lancamentos').insert({
      codigo, quantidade: parseInt(quantidade),
      turno, setor: 'USINAGEM', observacao: obs,
      usuario_nome: usuario?.nome, usuario_email: usuario?.email
    })
    setLoading(false)

    if (error) { showToast('Erro ao lançar!', 'var(--red)') }
    else {
      showToast('✅ Lançado com sucesso!')
      setCodigo(''); setQuantidade(''); setObs('')
      setTurno(detectarTurno())
    }
  }

  return (
    <>
      <div className="card">
        <div className="card-title">⚙️ Lançamento Usinagem</div>
        <div className="field" style={{ position: 'relative' }}>
          <label>Código do item</label>
          <input className="input" value={codigo}
            onChange={e => onCodigoInput(e.target.value)}
            placeholder="Digite o código..." autoComplete="off" />
          {sugestoes.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              background: 'var(--surface2)', border: '1px solid var(--accent)',
              borderTop: 'none', borderRadius: '0 0 10px 10px',
              maxHeight: 200, overflowY: 'auto', zIndex: 100
            }}>
              {sugestoes.map((item, i) => (
                <div key={i} onClick={() => selecionarItem(item)} style={{
                  padding: '11px 15px', cursor: 'pointer', fontFamily: 'monospace', fontSize: 13,
                  borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8
                }}>
                  {item.codigo}
                  {item.tipo === 'blank' && (
                    <>
                      <span style={{ background: 'rgba(255,214,10,.2)', color: 'var(--yellow)', fontSize: 10, padding: '1px 6px', borderRadius: 4 }}>BLANK</span>
                      <span style={{ fontSize: 11, color: 'var(--accent)' }}>{item.codigoUsin} · usi</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="field">
          <label>Quantidade</label>
          <input className="input" type="number" value={quantidade}
            onChange={e => setQuantidade(e.target.value)} placeholder="0" min="1" />
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
            <div style={{
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '12px 14px', fontSize: 13,
              color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8
            }}>
              <span style={{ fontSize: 16 }}>🕐</span>
              <span style={{ fontWeight: 700 }}>{nomeTurno(turno)}</span>
              <span style={{ fontSize: 11, color: 'var(--green)', marginLeft: 'auto' }}>automático</span>
            </div>
          )}
        </div>
        <div className="field">
          <label>Observação (opcional)</label>
          <input className="input" value={obs}
            onChange={e => setObs(e.target.value)} placeholder="Alguma observação..." />
        </div>
        <button className="btn-primary" onClick={lancar} disabled={loading}>
          {loading ? 'Lançando...' : '✓ Lançar item'}
        </button>
      </div>
      {toast && <div className="toast" style={{ background: toast.cor }}>{toast.msg}</div>}
    </>
  )
}

function FormLaser({ usuario, planta }) {
  const [abaLaser, setAbaLaser] = useState('planejar')

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { key: 'planejar', label: '📋 Planejar corte' },
          { key: 'apontar', label: '✅ Apontar produção' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setAbaLaser(key)} style={{
            flex: 1, padding: '10px 8px', border: '1px solid',
            borderColor: abaLaser === key ? 'var(--yellow)' : 'var(--border)',
            background: abaLaser === key ? 'rgba(255,214,10,.1)' : 'var(--surface)',
            color: abaLaser === key ? 'var(--yellow)' : 'var(--muted)',
            borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer'
          }}>{label}</button>
        ))}
      </div>
      {abaLaser === 'planejar' ? <PlanejarCorte usuario={usuario} /> : <ApontarProducao usuario={usuario} />}
    </>
  )
}

function PlanejarCorte({ usuario }) {
  const isLiderOuMais = ['lider', 'supervisor', 'super'].includes(usuario?.nivel)
  const [maquina, setMaquina] = useState('')
  const [job, setJob] = useState('')
  const [turno, setTurno] = useState(detectarTurno())
  const [ordens, setOrdens] = useState([])
  const [totalChapas, setTotalChapas] = useState('')
  const [tipoCort, setTipoCort] = useState('total')
  const [chapasParcial, setChapasParcial] = useState('')
  const [cncs, setCncs] = useState([]) // [{codigo, tempoH, tempoM}]
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
    setTimeout(() => setToast(null), 2500)
  }

  function salvarMaquina(nome) {
    const salvas = JSON.parse(localStorage.getItem('maquinas_laser') || '[]')
    if (!salvas.includes(nome)) {
      salvas.push(nome)
      localStorage.setItem('maquinas_laser', JSON.stringify(salvas))
      setMaquinasSalvas(salvas)
    }
  }

  function adicionarCNC() {
    setCncs(prev => [...prev, { codigo: '', tempoH: '', tempoM: '' }])
  }

  function removerCNC(idx) {
    setCncs(prev => prev.filter((_, i) => i !== idx))
  }

  function atualizarCNC(idx, campo, valor) {
    setCncs(prev => prev.map((c, i) => i === idx ? { ...c, [campo]: valor } : c))
  }

  // Calcula tempo total de todos os CNCs
  const tempoTotalCNCs = cncs.reduce((s, c) => {
    const min = (parseInt(c.tempoH) || 0) * 60 + (parseInt(c.tempoM) || 0)
    return s + min
  }, 0)

  // Tempo unitário médio por chapa (para compatibilidade)
  const chapasParaCortar = tipoCort === 'parcial' ? parseInt(chapasParcial) || 0 : parseInt(totalChapas) || 0
  const tempoUnitMedio = cncs.length > 0 && chapasParaCortar > 0
    ? Math.round(tempoTotalCNCs / cncs.length)
    : 0

  async function buscarOrdens() {
    if (!maquina || !job) { showToast('Informe a máquina e o job!', 'var(--red)'); return }
    setLoading(true)
    const { data } = await supabase
      .from('ordens')
      .select('ordem, item_ccs, cliente, qtde_ordem, saldo, estab')
      .ilike('tarefa', `%${job}%`)
      .order('item_ccs')

    if (usuario?.estab && usuario.estab !== 'todas' && data?.length > 0) {
      const estabOrdem = data[0].estab
      if (estabOrdem !== usuario.estab) {
        showToast(`❌ Este job é de ${estabOrdem === '100' ? 'Limeira' : 'Palmeira'}!`, 'var(--red)')
        setLoading(false)
        return
      }
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

    // Monta array de CNCs com tempo em minutos
    const cncsFormatados = cncs.map((c, i) => ({
      numero: i + 1,
      codigo: c.codigo,
      tempo: (parseInt(c.tempoH) || 0) * 60 + (parseInt(c.tempoM) || 0)
    }))

    const { error } = await supabase.from('laser_planejamento').insert({
      job, maquina, turno,
      total_chapas: parseInt(totalChapas),
      tipo: tipoCort,
      chapas_cortar: chapasCortar,
      tempo_chapa: tempoUnitMedio || null,
      cncs: cncsFormatados,
      cnc_ativo: 0,
      chapas_feitas: 0,
      finalizado: false,
      estab, usuario_nome: usuario?.nome, usuario_email: usuario?.email
    })

    setSalvando(false)
    if (error) { showToast('Erro ao salvar!', 'var(--red)') }
    else {
      showToast('✅ Planejamento salvo!')
      setJob(''); setTotalChapas(''); setChapasParcial('')
      setTipoCort('total'); setOrdens([])
      setCncs([])
      setTurno(detectarTurno())
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
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              background: 'var(--surface2)', border: '1px solid var(--accent)',
              borderTop: 'none', borderRadius: '0 0 10px 10px', zIndex: 100
            }}>
              {maquinasFiltradas.map((m, i) => (
                <div key={i} onClick={() => { setMaquina(m); setShowMaquinas(false) }} style={{
                  padding: '10px 14px', cursor: 'pointer', fontFamily: 'monospace',
                  fontSize: 13, borderBottom: '1px solid var(--border)'
                }}>{m}</div>
              ))}
            </div>
          )}
        </div>

        <div className="field">
          <label>Job / Tarefa</label>
          <input className="input" value={job}
            onChange={e => setJob(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && buscarOrdens()}
            placeholder="Ex: J092362" />
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
            <div style={{
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '12px 14px', fontSize: 13,
              color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8
            }}>
              <span style={{ fontSize: 16 }}>🕐</span>
              <span style={{ fontWeight: 700 }}>{nomeTurno(turno)}</span>
              <span style={{ fontSize: 11, color: 'var(--green)', marginLeft: 'auto' }}>automático</span>
            </div>
          )}
        </div>

        <button className="btn-primary" onClick={buscarOrdens} disabled={loading}
          style={{ background: 'var(--yellow)', color: '#000', marginBottom: 0 }}>
          {loading ? 'Buscando...' : '🔍 Buscar ordens'}
        </button>
      </div>

      {ordens.length > 0 && (
        <div className="card">
          <div className="card-title">Ordens do job {job}</div>

          <div className="field">
            <label>Total de chapas do job</label>
            <input className="input" type="number" value={totalChapas}
              onChange={e => setTotalChapas(e.target.value)} placeholder="Ex: 10" min="1" />
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
              <input className="input" type="number" value={chapasParcial}
                onChange={e => setChapasParcial(e.target.value)}
                placeholder={`de ${totalChapas || '?'} chapas`} min="1" />
            </div>
          )}

          {/* CNCs do nesting */}
          <div className="field">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <label style={{ marginBottom: 0 }}>CNCs do nesting <span style={{ fontSize: 11, color: 'var(--muted)' }}>(opcional)</span></label>
              <button onClick={adicionarCNC} style={{
                background: 'rgba(0,229,255,.1)', border: '1px solid rgba(0,229,255,.3)',
                borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
                color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700
              }}>
                <Plus size={13} /> Adicionar CNC
              </button>
            </div>

            {cncs.length === 0 && (
              <div style={{
                background: 'var(--surface2)', borderRadius: 10, padding: '14px',
                textAlign: 'center', fontSize: 12, color: 'var(--muted)',
                border: '1px dashed var(--border)'
              }}>
                Toque em "Adicionar CNC" para informar os programas do nesting
              </div>
            )}

            {cncs.map((cnc, idx) => (
              <div key={idx} style={{
                background: 'var(--surface2)', borderRadius: 10,
                padding: '12px', marginBottom: 8,
                border: '1px solid var(--border)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--accent)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontFamily: 'monospace', fontSize: 12,
                    fontWeight: 700, color: '#000'
                  }}>{idx + 1}</div>
                  <div style={{ flex: 1, fontWeight: 700, fontSize: 13 }}>CNC {idx + 1}</div>
                  <button onClick={() => removerCNC(idx)} style={{
                    background: 'rgba(255,61,90,.1)', border: '1px solid rgba(255,61,90,.3)',
                    borderRadius: 6, padding: '4px 6px', cursor: 'pointer', color: 'var(--red)'
                  }}>
                    <Trash2 size={12} />
                  </button>
                </div>

                <div className="field" style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 11 }}>Código do CNC</label>
                  <input className="input" value={cnc.codigo}
                    onChange={e => atualizarCNC(idx, 'codigo', e.target.value)}
                    placeholder="Ex: CNC-001, A1, Prog01..." />
                </div>

                <div className="field" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 11 }}>Tempo de corte</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <input className="input" type="number" value={cnc.tempoH}
                        onChange={e => atualizarCNC(idx, 'tempoH', e.target.value)}
                        placeholder="0" min="0" />
                      <div style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'center', marginTop: 3 }}>horas</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <input className="input" type="number" value={cnc.tempoM}
                        onChange={e => atualizarCNC(idx, 'tempoM', e.target.value)}
                        placeholder="0" min="0" max="59" />
                      <div style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'center', marginTop: 3 }}>minutos</div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>
                        {formatarTempo((parseInt(cnc.tempoH) || 0) * 60 + (parseInt(cnc.tempoM) || 0))}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>total</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Resumo tempo total dos CNCs */}
            {cncs.length > 0 && tempoTotalCNCs > 0 && (
              <div style={{
                background: 'rgba(0,229,255,.08)', border: '1px solid rgba(0,229,255,.3)',
                borderRadius: 10, padding: '12px 16px', marginTop: 8,
                display: 'flex', alignItems: 'center', gap: 12
              }}>
                <div style={{ fontSize: 24 }}>⏱️</div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>Tempo total dos {cncs.length} CNC(s)</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>
                    {formatarTempo(tempoTotalCNCs)}
                  </div>
                  {cncs.length > 1 && (
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      Média: {formatarTempo(Math.round(tempoTotalCNCs / cncs.length))} por CNC
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '8px 0 16px' }} />

          {ordens.map((o, i) => (
            <div key={i} style={{
              padding: '10px 0', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 10
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>{o.item_ccs}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  OP {o.ordem} · {o.cliente || '—'} · {o.qtde_ordem} pç
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  background: o.estab === '100' ? 'rgba(0,229,255,.15)' : 'rgba(0,255,136,.15)',
                  color: o.estab === '100' ? 'var(--accent)' : 'var(--green)',
                  fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4
                }}>{o.estab === '100' ? 'Limeira' : 'Palmeira'}</span>
                <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--yellow)', fontWeight: 700, marginTop: 4 }}>
                  {o.saldo} pç
                </div>
              </div>
            </div>
          ))}

          <button className="btn-primary" onClick={confirmar} disabled={salvando}
            style={{ background: 'var(--yellow)', color: '#000', marginTop: 16 }}>
            {salvando ? 'Salvando...' : '✅ Confirmar planejamento'}
          </button>
        </div>
      )}
      {toast && <div className="toast" style={{ background: toast.cor }}>{toast.msg}</div>}
    </>
  )
}

function ApontarProducao({ usuario }) {
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

  function showToast(msg, cor = 'var(--green)') {
    setToast({ msg, cor })
    setTimeout(() => setToast(null), 2500)
  }

  async function buscarOrdens() {
    if (!job) { showToast('Informe o job!', 'var(--red)'); return }
    setLoading(true)

    const { data: ords } = await supabase
      .from('ordens')
      .select('ordem, item_ccs, cliente, qtde_ordem, saldo, estab')
      .ilike('tarefa', `%${job}%`)
      .order('item_ccs')

    if (usuario?.estab && usuario.estab !== 'todas' && ords?.length > 0) {
      const estabOrdem = ords[0].estab
      if (estabOrdem !== usuario.estab) {
        showToast(`❌ Este job é de ${estabOrdem === '100' ? 'Limeira' : 'Palmeira'}!`, 'var(--red)')
        setLoading(false)
        return
      }
    }

    const { data: plan } = await supabase
      .from('laser_planejamento')
      .select('*')
      .ilike('job', `%${job}%`)
      .order('criado_em', { ascending: false })
      .limit(1)

    setOrdens(ords || [])
    setOrdensFiltradas(ords || [])
    setPlanejamento(plan?.[0] || null)
    setCncAtivo(plan?.[0]?.cnc_ativo || 0)

    const qtds = {}
    ords?.forEach(o => { qtds[o.ordem] = '' })
    setQuantidades(qtds)
    setLoading(false)
    setBusca('')

    if (!ords?.length) showToast('Nenhuma ordem encontrada!', 'var(--red)')
  }

  async function selecionarCNC(idx) {
    setCncAtivo(idx)
    if (planejamento) {
      await supabase.from('laser_planejamento').update({ cnc_ativo: idx }).eq('id', planejamento.id)
    }
  }

  function filtrarOrdens(val) {
    setBusca(val)
    if (!val) { setOrdensFiltradas(ordens); return }
    const q = val.toLowerCase()
    setOrdensFiltradas(ordens.filter(o =>
      o.item_ccs.toLowerCase().includes(q) ||
      o.ordem.toLowerCase().includes(q) ||
      (o.cliente || '').toLowerCase().includes(q)
    ))
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
    setQuantidades({}); setPlanejamento(null); setBusca('')
    setCncAtivo(0)
  }

  const cncs = planejamento?.cncs || []
  const cncAtivoObj = cncs[cncAtivo] || null

  return (
    <>
      <div className="card">
        <div className="card-title">✅ Apontar produção</div>
        <div className="field">
          <label>Job / Tarefa</label>
          <input className="input" value={job}
            onChange={e => setJob(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && buscarOrdens()}
            placeholder="Ex: J092362" />
        </div>
        <button className="btn-primary" onClick={buscarOrdens} disabled={loading} style={{ marginBottom: 0 }}>
          {loading ? 'Buscando...' : '🔍 Buscar ordens'}
        </button>
      </div>

      {planejamento && (
        <div style={{
          background: 'rgba(255,214,10,.08)', border: '1px solid rgba(255,214,10,.3)',
          borderRadius: 10, padding: '10px 14px', marginBottom: 12
        }}>
          <div style={{ fontWeight: 700, color: 'var(--yellow)', marginBottom: 4 }}>📋 Planejamento encontrado</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            Máquina: {planejamento.maquina} · {planejamento.total_chapas} chapas
            {planejamento.turno ? ` · ${nomeTurno(planejamento.turno)}` : ''}
            {planejamento.tipo === 'parcial' ? ` · Parcial: ${planejamento.chapas_cortar} chapas` : ' · Total'}
          </div>
        </div>
      )}

      {/* Seletor de CNC ativo */}
      {cncs.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-title">🎯 Qual CNC está cortando agora?</div>
          {cncs.map((cnc, idx) => (
            <div key={idx} onClick={() => selecionarCNC(idx)} style={{
              padding: '12px', marginBottom: 8,
              background: cncAtivo === idx ? 'rgba(0,229,255,.08)' : 'var(--surface2)',
              border: `2px solid ${cncAtivo === idx ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 10, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 12
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: cncAtivo === idx ? 'var(--accent)' : 'var(--surface)',
                border: `2px solid ${cncAtivo === idx ? 'var(--accent)' : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'monospace', fontSize: 13, fontWeight: 700,
                color: cncAtivo === idx ? '#000' : 'var(--muted)'
              }}>{cnc.numero}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: cncAtivo === idx ? 'var(--accent)' : 'var(--text)' }}>
                  CNC {cnc.numero} {cnc.codigo ? `— ${cnc.codigo}` : ''}
                </div>
                {cnc.tempo > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    ⏱️ {formatarTempo(cnc.tempo)} de corte
                  </div>
                )}
              </div>
              {cncAtivo === idx && (
                <div style={{
                  background: 'var(--accent)', color: '#000',
                  borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 700
                }}>▶ Ativo</div>
              )}
            </div>
          ))}

          {cncAtivoObj && cncAtivoObj.tempo > 0 && (
            <div style={{
              background: 'rgba(0,229,255,.08)', border: '1px solid rgba(0,229,255,.2)',
              borderRadius: 8, padding: '10px 12px', marginTop: 8,
              display: 'flex', alignItems: 'center', gap: 10
            }}>
              <div style={{ fontSize: 20 }}>⏱️</div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Tempo do CNC {cncAtivoObj.numero}</div>
                <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>
                  {formatarTempo(cncAtivoObj.tempo)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {ordens.length > 0 && (
        <>
          <div className="field">
            <input className="input" value={busca}
              onChange={e => filtrarOrdens(e.target.value)}
              placeholder="Filtrar por item, ordem ou cliente..." />
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            {ordensFiltradas.length} de {ordens.length} ordem(s)
          </div>
          {ordensFiltradas.map(o => (
            <div key={o.ordem} className="card" style={{ marginBottom: 10, padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700 }}>{o.item_ccs}</div>
                <span style={{
                  background: o.estab === '100' ? 'rgba(0,229,255,.15)' : 'rgba(0,255,136,.15)',
                  color: o.estab === '100' ? 'var(--accent)' : 'var(--green)',
                  fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4
                }}>{o.estab === '100' ? 'Limeira' : 'Palmeira'}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>
                OP {o.ordem} · {o.cliente || '—'} · Planejado: {o.qtde_ordem} pç
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Quantidade real</label>
                <input className="input" type="number"
                  value={quantidades[o.ordem] || ''}
                  onChange={e => setQuantidades(p => ({ ...p, [o.ordem]: e.target.value }))}
                  placeholder={`Planejado: ${o.qtde_ordem} pç`} min="0" />
              </div>
            </div>
          ))}
          <button className="btn-primary" onClick={confirmar} disabled={salvando}>
            {salvando ? 'Salvando...' : `✅ Confirmar apontamentos`}
          </button>
        </>
      )}
      {toast && <div className="toast" style={{ background: toast.cor }}>{toast.msg}</div>}
    </>
  )
}

function FormOrdens({ usuario, planta }) {
  const [query, setQuery] = useState('')
  const [tipoBusca, setTipoBusca] = useState('item')
  const [resultado, setResultado] = useState(null)
  const [loading, setLoading] = useState(false)
  const [detalhe, setDetalhe] = useState(null)
  const [loadingDetalhe, setLoadingDetalhe] = useState(false)
  const [modal, setModal] = useState(null)
  const [descricao, setDescricao] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [toast, setToast] = useState(null)
  const [responsaveis, setResponsaveis] = useState([])
  const [selectedResps, setSelectedResps] = useState([])
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
    const estabFiltro = usuario?.estab !== 'todas' ? usuario?.estab : planta
    if (estabFiltro) q = q.eq('estab', estabFiltro)
    const { data, error } = await q.order('saldo', { ascending: false })
    setLoading(false)
    if (error) { console.error(error); return }

    const ordens = data.map(r => r.ordem).filter(Boolean)
    let apontamentos = {}
    if (ordens.length > 0) {
      const { data: apont } = await supabase
        .from('apontamentos_prod')
        .select('ordem, data_apontamento, operador, operacao, qtd_aprov')
        .in('ordem', ordens)
        .order('data_apontamento', { ascending: false })
      if (apont) apont.forEach(a => { if (!apontamentos[a.ordem]) apontamentos[a.ordem] = a })
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
    setDetalhe({ ordem: r.ordem, item: r.item_ccs, apont: [] })
    const { data } = await supabase
      .from('apontamentos_prod').select('*').eq('ordem', r.ordem)
      .order('data_apontamento', { ascending: true }).limit(200)
    setDetalhe({ ordem: r.ordem, item: r.item_ccs, apont: data || [] })
    setLoadingDetalhe(false)
  }

  async function abrirModal(r) {
    if (usuario?.estab && usuario.estab !== 'todas' && r.estab !== usuario.estab) {
      showToast(`❌ Você não pode reportar esta ordem!`, 'var(--red)')
      return
    }
    setModal(r); setDescricao(''); setSelectedResps([]); setBuscaResp('')
    const { data } = await supabase.from('responsaveis').select('*').eq('auto_copia', false).order('nome')
    setResponsaveis(data || []); setRespFiltrados(data || [])
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
      const msgWpp = `⚠️ *Novo reporte - CCS Tec*\n\n*Reportado por:* ${usuario?.nome}\n*OP:* ${modal.ordem}\n*Item:* ${modal.item_ccs}\n*Problema:* ${descricao}\n\n*Enviado para:* ${selectedResps.map(r => r.nome).join(', ')}\n*Horário:* ${new Date().toLocaleString('pt-BR')}`

      const { data: supervisores } = await supabase.from('responsaveis').select('*').eq('auto_copia', true)
      const participantes = [
        usuario?.email,
        ...selectedResps.map(r => r.email),
        ...(supervisores || []).map(s => s.email)
      ].filter(Boolean)

      for (const resp of selectedResps) {
        await supabase.from('apontamentos').insert({
          ordem: modal.ordem, item: modal.item_ccs,
          motivo: descricao, responsavel: resp.nome,
          responsavel_email: resp.email, participantes
        })
        try {
          await emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
            ordem: modal.ordem, item: modal.item_ccs,
            cliente: modal.cliente || '—', operacao: modal.prox_oper || '—',
            saldo: modal.saldo, descricao,
            horario: new Date().toLocaleString('pt-BR'), to_email: resp.email
          }, EMAILJS_KEY)
        } catch (e) { console.warn(e) }
        if (resp.telefone) await enviarWhatsApp(resp.telefone, msgWpp)
      }

      for (const sup of supervisores || []) {
        try {
          await emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
            ordem: modal.ordem, item: modal.item_ccs,
            cliente: modal.cliente || '—', operacao: modal.prox_oper || '—',
            saldo: modal.saldo, descricao,
            horario: new Date().toLocaleString('pt-BR'), to_email: sup.email
          }, EMAILJS_KEY)
        } catch (e) { console.warn(e) }
        if (sup.telefone) await enviarWhatsApp(sup.telefone, msgWpp)
      }

      await enviarWhatsApp(VICTOR_WHATSAPP, msgWpp)
      setModal(null)
      showToast(`✅ Enviado para ${selectedResps.map(r => r.nome.split(' ')[0]).join(', ')}!`)
    } catch (err) {
      console.error(err)
      showToast('Erro ao enviar!', 'var(--red)')
    }
    setEnviando(false)
  }

  const totalSaldo = resultado?.found.reduce((s, r) => s + (r.saldo || 0), 0) || 0

  return (
    <>
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
          placeholder={tipoBusca === 'item' ? 'Ex: 8.0124.05635.01' : tipoBusca === 'ordem' ? 'Ex: 9715787' : 'Ex: J092362'}
        />
        <button className="btn-search" onClick={buscar}>{loading ? '...' : 'Buscar'}</button>
      </div>

      {resultado && (
        <>
          {resultado.found.length === 0 ? (
            <div className="empty"><div className="emoji">❌</div><h3>Nenhuma ordem encontrada</h3></div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                {[
                  ['Ordens', resultado.found.length, 'var(--accent)'],
                  ['Saldo', totalSaldo + ' pç', 'var(--yellow)'],
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
                    <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: 'var(--yellow)', flex: 1 }}>{nomeOp(op)}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{rows.length} ordem(s)</div>
                  </div>

                  {rows.map((r, i) => {
                    const ap = r.ultimoApont
                    const dias = ap ? diasParado(ap.data_apontamento) : null
                    const cor = dias === null ? 'var(--red)' : dias === 0 ? 'var(--green)' : dias <= 3 ? 'var(--yellow)' : 'var(--red)'
                    const texto = dias === null ? 'Sem apontamento' : dias === 0 ? 'Hoje' : `${dias}d atrás`
                    const podeInteragir = !usuario?.estab || usuario.estab === 'todas' || r.estab === usuario.estab

                    return (
                      <div key={i} style={{ padding: '12px 14px', borderTop: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>OP {r.ordem}</div>
                              {!podeInteragir && (
                                <span style={{ background: 'rgba(107,114,128,.15)', color: 'var(--muted)', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4 }}>🔒 Leitura</span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{r.item_ccs} · {r.cliente || '—'}</div>
                            {r.tarefa && <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 1 }}>🎯 {r.tarefa}</div>}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
                              <div style={{ width: 7, height: 7, borderRadius: '50%', background: cor }} />
                              <span style={{ fontSize: 11, color: cor, fontWeight: 600 }}>{texto}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                            <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--yellow)' }}>{r.saldo} pç</div>
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

      {detalhe && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: 24, width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Roteiro de apontamentos</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>OP {detalhe.ordem} · {detalhe.item}</div>
              </div>
              <button onClick={() => setDetalhe(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                <X size={20} />
              </button>
            </div>

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
                const chave = a.desc_operacao || nomeOp(a.operacao) || 'Outros'
                if (!grupos[chave]) grupos[chave] = { nome: chave, items: [], primeiraData: a.data_apontamento }
                grupos[chave].items.push(a)
              })
              const gruposOrdenados = Object.values(grupos).sort((a, b) => parseData(a.primeiraData) - parseData(b.primeiraData))
              let qtdAnterior = null
              return gruposOrdenados.map((grupo) => {
                const totalOK = grupo.items.reduce((s, a) => s + (a.qtd_aprov || 0), 0)
                const totalRef = grupo.items.reduce((s, a) => s + (a.qtd_refug || 0), 0)
                const ultimo = [...grupo.items].sort((a, b) => parseData(b.data_apontamento) - parseData(a.data_apontamento))[0]
                const dias = diasParado(ultimo?.data_apontamento)
                const icone = qtdAnterior !== null && totalOK < qtdAnterior ? '⚠️' : '✅'
                const corBorda = qtdAnterior !== null && totalOK < qtdAnterior ? 'var(--yellow)' : 'var(--green)'
                qtdAnterior = totalOK
                return (
                  <div key={grupo.nome} style={{ marginBottom: 10 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 8,
                      background: 'var(--surface2)', border: `1px solid ${corBorda}33`
                    }}>
                      <div style={{ fontSize: 16 }}>{icone}</div>
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

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: 24, width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto' }}>
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
                placeholder="Ex: peça com defeito, falta material..."
                style={{ minHeight: 100, resize: 'vertical', fontSize: 14 }} />
            </div>

            <button className="btn-primary" onClick={reportar} disabled={enviando}>
              {enviando ? 'Enviando...' : `⚠️ Enviar${selectedResps.length > 0 ? ` para ${selectedResps.length} pessoa(s)` : ''}`}
            </button>
          </div>
        </div>
      )}

      {toast && <div className="toast" style={{ background: toast.cor }}>{toast.msg}</div>}
    </>
  )
}