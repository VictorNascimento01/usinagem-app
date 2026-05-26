import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase'

// Capacidade de cada turno em minutos
const TURNOS = {
  '1': { label: '1º Turno', min: 588, cor: 'var(--accent)', inicio: '07:00', fim: '16:48' },
  '2': { label: '2º Turno', min: 561, cor: 'var(--yellow)', inicio: '16:48', fim: '02:09' },
  '3': { label: '3º Turno', min: 531, cor: '#7c3aed', inicio: '02:09', fim: '07:00' },
}

const TOTAL_DIA = TURNOS['1'].min + TURNOS['2'].min + TURNOS['3'].min // 1680 min = 28h

const CORES_JOBS = [
  '#00e5ff', '#00ff88', '#ffd60a', '#ff6b35', '#7c3aed',
  '#ff3d5a', '#06d6a0', '#f72585', '#4361ee', '#4cc9f0'
]

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

function GaugeCircular({ valor, max = 100, cor, label, sublabel, onClick }) {
  const pct = max > 0 ? Math.min(100, Math.round((valor / max) * 100)) : 0
  const raio = 54
  const circ = 2 * Math.PI * raio
  const offset = circ - (pct / 100) * circ

  return (
    <div onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ position: 'relative', width: 130, height: 130 }}>
        <svg width="130" height="130" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="65" cy="65" r={raio} fill="none" stroke="var(--surface2)" strokeWidth="10" />
          <circle cx="65" cy="65" r={raio} fill="none" stroke={cor} strokeWidth="10"
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset .8s ease' }} />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 700, color: cor }}>{pct}%</div>
          {sublabel && <div style={{ fontSize: 10, color: 'var(--muted)' }}>{sublabel}</div>}
        </div>
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', textAlign: 'center' }}>{label}</div>
      {onClick && <div style={{ fontSize: 10, color: 'var(--muted)' }}>Toque para detalhes</div>}
    </div>
  )
}

function Modal({ titulo, subtitulo, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{titulo}</div>
            {subtitulo && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{subtitulo}</div>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: 16 }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// Gráfico vertical de carga máquina
function GraficoCargaMaquina({ maquina, jobs }) {
  const ALTURA = 320 // px total do gráfico
  const T1_MIN = TURNOS['1'].min
  const T2_MIN = TURNOS['2'].min
  const T3_MIN = TURNOS['3'].min

  // Total de minutos programados para essa máquina
  const totalMin = jobs.reduce((s, j) => s + (j.tempoTotalJob || 0), 0)
  const maxMin = TOTAL_DIA
  const escala = ALTURA / maxMin // px por minuto

  // Posições das linhas de turno (de baixo pra cima)
  const posT1 = T1_MIN * escala        // fim do T1
  const posT2 = (T1_MIN + T2_MIN) * escala  // fim do T2
  const posT3 = maxMin * escala         // fim do T3

  // Cor por job
  const jobCores = {}
  jobs.forEach((j, i) => { jobCores[j.id] = CORES_JOBS[i % CORES_JOBS.length] })

  // Monta segmentos de barras (de baixo pra cima)
  let acumulado = 0
  const segmentos = jobs.map(j => {
    const tempo = j.tempoTotalJob || 0
    const inicio = acumulado
    acumulado += tempo
    return { job: j, inicio, fim: acumulado, tempo }
  })

  const pctUsado = Math.round((totalMin / maxMin) * 100)
  const corPct = pctUsado > 100 ? 'var(--red)' : pctUsado > 80 ? 'var(--yellow)' : 'var(--green)'

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--yellow)' }} />
        <div style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 700, color: 'var(--yellow)', flex: 1 }}>
          {maquina.toUpperCase()}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: corPct }}>{pctUsado}%</div>
          <div style={{ fontSize: 10, color: 'var(--muted)' }}>{formatarTempo(totalMin)} / {formatarTempo(maxMin)}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {/* Eixo Y com labels de tempo */}
        <div style={{ position: 'relative', height: ALTURA, width: 36, flexShrink: 0 }}>
          {/* Labels dos turnos */}
          {[
            { pos: 0, label: '0h' },
            { pos: posT1, label: '9h48' },
            { pos: posT2, label: '19h09' },
            { pos: posT3, label: '28h' },
          ].map(({ pos, label }) => (
            <div key={label} style={{
              position: 'absolute', bottom: pos,
              fontSize: 9, color: 'var(--muted)',
              transform: 'translateY(50%)',
              right: 4, textAlign: 'right', whiteSpace: 'nowrap'
            }}>{label}</div>
          ))}
        </div>

        {/* Gráfico */}
        <div style={{ position: 'relative', height: ALTURA, flex: 1 }}>

          {/* Linhas tracejadas dos turnos */}
          {[
            { pos: posT1, cor: TURNOS['1'].cor, label: TURNOS['1'].label },
            { pos: posT2, cor: TURNOS['2'].cor, label: TURNOS['2'].label },
            { pos: posT3, cor: TURNOS['3'].cor, label: TURNOS['3'].label },
          ].map(({ pos, cor, label }) => (
            <div key={label} style={{
              position: 'absolute', bottom: pos, left: 0, right: 0,
              borderTop: `1.5px dashed ${cor}`,
              zIndex: 2
            }}>
              <span style={{
                position: 'absolute', right: 0, top: -16,
                fontSize: 9, color: cor, fontWeight: 700,
                background: 'var(--surface)', padding: '0 3px'
              }}>{label}</span>
            </div>
          ))}

          {/* Área de fundo dos turnos */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: posT1, background: `${TURNOS['1'].cor}08`,
            borderLeft: `2px solid ${TURNOS['1'].cor}33`
          }} />
          <div style={{
            position: 'absolute', bottom: posT1, left: 0, right: 0,
            height: posT2 - posT1, background: `${TURNOS['2'].cor}08`,
            borderLeft: `2px solid ${TURNOS['2'].cor}33`
          }} />
          <div style={{
            position: 'absolute', bottom: posT2, left: 0, right: 0,
            height: posT3 - posT2, background: `${'#7c3aed'}08`,
            borderLeft: `2px solid ${'#7c3aed'}33`
          }} />

          {/* Barras dos jobs */}
          {segmentos.map(({ job, inicio, fim, tempo }) => {
            const bottom = inicio * escala
            const height = Math.max(tempo * escala, 4)
            const cor = jobCores[job.id]
            const extrapolou = fim > maxMin

            return (
              <div key={job.id} style={{
                position: 'absolute',
                bottom, left: 8, right: 8,
                height,
                background: extrapolou ? 'var(--red)' : cor,
                borderRadius: 4,
                zIndex: 3,
                opacity: 0.85,
                display: 'flex', alignItems: 'center',
                padding: '0 6px',
                overflow: 'hidden'
              }}>
                {height > 18 && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, color: '#000',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                  }}>
                    {job.job} · {formatarTempo(tempo)}
                  </span>
                )}
              </div>
            )
          })}

          {/* Indicador de overflow */}
          {totalMin > maxMin && (
            <div style={{
              position: 'absolute', top: -24, left: 0, right: 0,
              background: 'rgba(255,61,90,.15)', border: '1px solid rgba(255,61,90,.4)',
              borderRadius: 6, padding: '3px 8px',
              fontSize: 10, color: 'var(--red)', fontWeight: 700, textAlign: 'center'
            }}>
              ⚠️ Excede capacidade diária em {formatarTempo(totalMin - maxMin)}
            </div>
          )}
        </div>
      </div>

      {/* Legenda */}
      <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {jobs.map(j => (
          <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: jobCores[j.id], flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>{j.job} ({formatarTempo(j.tempoTotalJob || 0)})</span>
          </div>
        ))}
      </div>

      {/* Resumo por turno */}
      <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        {['1', '2', '3'].map(t => {
          const capMin = TURNOS[t].min
          const usadoMin = Math.min(totalMin, capMin)
          const pct = Math.round((usadoMin / capMin) * 100)
          return (
            <div key={t} style={{
              background: 'var(--surface2)', borderRadius: 8, padding: '8px',
              border: `1px solid ${TURNOS[t].cor}33`
            }}>
              <div style={{ fontSize: 9, color: TURNOS[t].cor, fontWeight: 700, marginBottom: 4 }}>
                {TURNOS[t].label}
              </div>
              <div style={{ height: 4, background: 'var(--surface)', borderRadius: 99, overflow: 'hidden', marginBottom: 4 }}>
                <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: TURNOS[t].cor, borderRadius: 99 }} />
              </div>
              <div style={{ fontSize: 9, color: 'var(--muted)' }}>
                {pct > 100 ? '🔴 Cheio' : pct > 80 ? '🟡 Quase' : `🟢 ${100 - pct}% livre`}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Indicadores({ usuario }) {
  const [planejamentos, setPlanejamentos] = useState([])
  const [apontamentos, setApontamentos] = useState([])
  const [lancamentos, setLancamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [agora, setAgora] = useState(new Date())
  const [planta, setPlanta] = useState(usuario?.estab === 'todas' ? '' : usuario?.estab || '')
  const [modal, setModal] = useState(null)
  const [modalData, setModalData] = useState(null)
  const [abaIndicador, setAbaIndicador] = useState('geral')

  useEffect(() => {
    carregarDados()
    const interval = setInterval(() => {
      setAgora(new Date())
      carregarDados()
    }, 60000)
    return () => clearInterval(interval)
  }, [planta])

  async function carregarDados() {
    setLoading(true)
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    let qPlan = supabase.from('laser_planejamento').select('*').gte('criado_em', hoje.toISOString())
    if (planta) qPlan = qPlan.eq('estab', planta)
    const { data: plans } = await qPlan

    const { data: aponts } = await supabase
      .from('laser_apontamento').select('*').gte('criado_em', hoje.toISOString())

    let qLanc = supabase.from('lancamentos').select('*').gte('criado_em', hoje.toISOString())
    if (planta) qLanc = qLanc.eq('estab', planta)
    const { data: lancs } = await qLanc

    setPlanejamentos(plans || [])
    setApontamentos(aponts || [])
    setLancamentos(lancs || [])
    setLoading(false)
  }

  const pendentes = planejamentos.filter(p => !p.finalizado)
  const finalizados = planejamentos.filter(p => p.finalizado)
  const totalChapasPlanejadasHoje = planejamentos.reduce((s, p) => s + (p.chapas_cortar || p.total_chapas || 0), 0)
  const totalChapasFeitas = planejamentos.reduce((s, p) => s + (p.chapas_feitas || 0), 0)
  const pctChapas = totalChapasPlanejadasHoje > 0 ? Math.round((totalChapasFeitas / totalChapasPlanejadasHoje) * 100) : 0

  const totalPlanejadoApont = apontamentos.reduce((s, a) => s + (a.qtd_planejada || 0), 0)
  const totalRealApont = apontamentos.reduce((s, a) => s + (a.qtd_real || 0), 0)
  const qualidadeLaser = totalPlanejadoApont > 0 ? Math.round((totalRealApont / totalPlanejadoApont) * 100) : null

  const totalPecasLancadas = lancamentos.reduce((s, l) => s + (l.quantidade || 0), 0)
  const lancamentosPorTurno = { '1': 0, '2': 0, '3': 0 }
  lancamentos.forEach(l => { if (l.turno) lancamentosPorTurno[l.turno] += (l.quantidade || 0) })

  // Agrupa por máquina e calcula tempo total por job
  const porMaquina = {}
  pendentes.forEach(p => {
    const maq = p.maquina || '—'
    if (!porMaquina[maq]) porMaquina[maq] = []

    // Calcula tempo total do job pelos CNCs
    let tempoTotalJob = 0
    if (p.cncs && p.cncs.length > 0) {
      tempoTotalJob = p.cncs.reduce((s, c) => s + (c.tempoTotal || 0), 0)
    } else if (p.tempo_chapa) {
      tempoTotalJob = (p.chapas_cortar || p.total_chapas || 0) * p.tempo_chapa
    }

    porMaquina[maq].push({ ...p, tempoTotalJob })
  })

  const corQ = (q) => q === null ? 'var(--muted)' : q >= 95 ? 'var(--green)' : q >= 80 ? 'var(--yellow)' : 'var(--red)'
  const corP = (pct) => pct >= 80 ? 'var(--green)' : pct >= 40 ? 'var(--accent)' : 'var(--yellow)'

  function abrirModalQualidade() {
    const porJob = apontamentos.reduce((acc, a) => {
      if (!acc[a.job]) acc[a.job] = { planejado: 0, real: 0, maquina: a.maquina, itens: [] }
      acc[a.job].planejado += a.qtd_planejada || 0
      acc[a.job].real += a.qtd_real || 0
      acc[a.job].itens.push(a)
      return acc
    }, {})
    setModalData({ porJob, total: { planejado: totalPlanejadoApont, real: totalRealApont } })
    setModal('qualidade')
  }

  if (loading) return (
    <div>
      <div className="page-header">
        <div className="page-icon" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
          <span style={{ fontSize: 20 }}>📊</span>
        </div>
        <div><h1>INDICADORES</h1><p>Visão gerencial</p></div>
      </div>
      <div className="empty"><div className="emoji">⏳</div><p>Carregando...</p></div>
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <div className="page-icon" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
          <span style={{ fontSize: 20 }}>📊</span>
        </div>
        <div style={{ flex: 1 }}>
          <h1>INDICADORES</h1>
          <p>Atualizado às {agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <button onClick={carregarDados} style={{
          background: 'var(--surface2)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
          color: 'var(--muted)', fontSize: 12
        }}>🔄</button>
      </div>

      {usuario?.estab === 'todas' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {[
            { key: '', label: '🏭 Todas' },
            { key: '100', label: '📍 Limeira' },
            { key: '200', label: '📍 Palmeira' },
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

      {/* Sub-abas */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { key: 'geral', label: '📈 Geral' },
          { key: 'carga', label: '🖨️ Carga Máquina' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setAbaIndicador(key)} style={{
            flex: 1, padding: '10px 4px', border: '1px solid',
            borderColor: abaIndicador === key ? '#7c3aed' : 'var(--border)',
            background: abaIndicador === key ? 'rgba(124,58,237,.1)' : 'var(--surface)',
            color: abaIndicador === key ? '#7c3aed' : 'var(--muted)',
            borderRadius: 10, fontWeight: 700, fontSize: 12, cursor: 'pointer'
          }}>{label}</button>
        ))}
      </div>

      {/* ABA GERAL */}
      {abaIndicador === 'geral' && (
        <>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            ⚡ Laser — hoje
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Pendentes', valor: pendentes.length, cor: pendentes.length > 0 ? 'var(--yellow)' : 'var(--green)', onClick: () => { setModalData(pendentes); setModal('pendentes') } },
              { label: 'Finalizados', valor: finalizados.length, cor: 'var(--green)', onClick: () => { setModalData(finalizados); setModal('finalizados') } },
              { label: 'Jobs hoje', valor: planejamentos.length, cor: 'var(--accent)', onClick: () => { setModalData(planejamentos); setModal('todos') } },
            ].map(({ label, valor, cor, onClick }) => (
              <div key={label} onClick={onClick} className="card" style={{ padding: 12, textAlign: 'center', marginBottom: 0, cursor: 'pointer' }}
                onMouseDown={e => e.currentTarget.style.opacity = '.7'}
                onMouseUp={e => e.currentTarget.style.opacity = '1'}
                onTouchStart={e => e.currentTarget.style.opacity = '.7'}
                onTouchEnd={e => e.currentTarget.style.opacity = '1'}>
                <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</div>
                <div style={{ fontFamily: 'monospace', fontSize: 24, fontWeight: 700, color: cor }}>{valor}</div>
                <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 4 }}>ver ›</div>
              </div>
            ))}
          </div>

          {(totalChapasPlanejadasHoje > 0 || qualidadeLaser !== null) && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 16, padding: '8px 0' }}>
                {totalChapasPlanejadasHoje > 0 && (
                  <GaugeCircular
                    valor={totalChapasFeitas}
                    max={totalChapasPlanejadasHoje}
                    cor={corP(pctChapas)}
                    label="Chapas cortadas"
                    sublabel={`${totalChapasFeitas}/${totalChapasPlanejadasHoje}`}
                    onClick={() => { setModalData(planejamentos); setModal('chapas') }}
                  />
                )}
                {qualidadeLaser !== null && (
                  <GaugeCircular
                    valor={qualidadeLaser}
                    max={100}
                    cor={corQ(qualidadeLaser)}
                    label="Qualidade laser"
                    sublabel={qualidadeLaser >= 95 ? 'Excelente' : qualidadeLaser >= 80 ? 'Atenção' : 'Abaixo'}
                    onClick={abrirModalQualidade}
                  />
                )}
              </div>
            </div>
          )}

          {planejamentos.length === 0 && (
            <div className="empty" style={{ marginBottom: 16 }}>
              <div className="emoji">⚡</div>
              <h3>Sem dados laser hoje</h3>
            </div>
          )}

          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 8 }}>
            ⚙️ Usinagem — hoje
          </div>

          {lancamentos.length === 0 ? (
            <div className="empty">
              <div className="emoji">⚙️</div>
              <h3>Sem lançamentos hoje</h3>
            </div>
          ) : (
            <div onClick={() => { setModalData(lancamentos); setModal('usinagem') }} className="card" style={{ marginBottom: 16, cursor: 'pointer' }}
              onMouseDown={e => e.currentTarget.style.opacity = '.7'}
              onMouseUp={e => e.currentTarget.style.opacity = '1'}
              onTouchStart={e => e.currentTarget.style.opacity = '.7'}
              onTouchEnd={e => e.currentTarget.style.opacity = '1'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Total de peças lançadas</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 36, fontWeight: 700, color: 'var(--accent)' }}>{totalPecasLancadas}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{lancamentos.length} lançamento(s) · ver detalhes ›</div>
                </div>
                <div style={{ fontSize: 24 }}>⚙️</div>
              </div>
              {['1', '2', '3'].map(t => {
                const v = lancamentosPorTurno[t]
                if (!v) return null
                const pct = totalPecasLancadas > 0 ? Math.round((v / totalPecasLancadas) * 100) : 0
                const cores = { '1': 'var(--accent)', '2': 'var(--yellow)', '3': '#7c3aed' }
                const labels = { '1': '1º Turno', '2': '2º Turno', '3': '3º Turno' }
                return (
                  <div key={t} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                      <span style={{ color: 'var(--muted)' }}>{labels[t]}</span>
                      <span style={{ color: cores[t], fontWeight: 700 }}>{v} pç · {pct}%</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: cores[t], borderRadius: 99 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ABA CARGA MÁQUINA */}
      {abaIndicador === 'carga' && (
        <>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
            Cada barra representa um job. As linhas tracejadas marcam os limites de cada turno.
          </div>

          {/* Legenda turnos */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {['1', '2', '3'].map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 16, height: 2, borderTop: `2px dashed ${TURNOS[t].cor}` }} />
                <span style={{ fontSize: 10, color: TURNOS[t].cor, fontWeight: 700 }}>
                  {TURNOS[t].label} ({formatarTempo(TURNOS[t].min)})
                </span>
              </div>
            ))}
          </div>

          {Object.keys(porMaquina).length === 0 ? (
            <div className="empty">
              <div className="emoji">🖨️</div>
              <h3>Sem jobs pendentes</h3>
              <p>Nenhuma máquina em operação hoje</p>
            </div>
          ) : (
            Object.entries(porMaquina).map(([maquina, jobs]) => (
              <GraficoCargaMaquina key={maquina} maquina={maquina} jobs={jobs} />
            ))
          )}
        </>
      )}

      {/* MODAIS */}
      {modal === 'qualidade' && modalData && (
        <Modal titulo="Qualidade Laser" subtitulo="Apontamentos de hoje" onClose={() => setModal(null)}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 48, fontWeight: 700, color: corQ(qualidadeLaser) }}>{qualidadeLaser}%</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>{modalData.total.real} pç de {modalData.total.planejado} pç planejadas</div>
            <div style={{ height: 12, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden', margin: '12px 0' }}>
              <div style={{ height: '100%', width: `${qualidadeLaser}%`, background: corQ(qualidadeLaser), borderRadius: 99 }} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: corQ(qualidadeLaser) }}>
              {qualidadeLaser >= 95 ? '🟢 Excelente' : qualidadeLaser >= 80 ? '🟡 Atenção' : '🔴 Abaixo do esperado'}
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Por job</div>
          {Object.entries(modalData.porJob).map(([job, dados]) => {
            const q = dados.planejado > 0 ? Math.round((dados.real / dados.planejado) * 100) : 0
            return (
              <div key={job} style={{ marginBottom: 12, padding: '12px', background: 'var(--surface2)', borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, flex: 1 }}>{job}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: corQ(q) }}>{q}%</div>
                </div>
                <div style={{ height: 8, background: 'var(--surface)', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ height: '100%', width: `${q}%`, background: corQ(q), borderRadius: 99 }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>🖨️ {dados.maquina} · {dados.real}/{dados.planejado} pç</div>
              </div>
            )
          })}
        </Modal>
      )}

      {(modal === 'pendentes' || modal === 'finalizados' || modal === 'todos' || modal === 'chapas') && modalData && (
        <Modal
          titulo={modal === 'pendentes' ? '⏳ Jobs pendentes' : modal === 'finalizados' ? '✅ Jobs finalizados' : modal === 'chapas' ? '📊 Progresso chapas' : '📋 Todos os jobs'}
          subtitulo={`${modalData.length} job(s)`}
          onClose={() => setModal(null)}
        >
          {modalData.length === 0 ? (
            <div className="empty"><div className="emoji">📭</div><h3>Nenhum job</h3></div>
          ) : modalData.map(p => {
            const chapas = p.chapas_cortar || p.total_chapas || 0
            const feitas = p.chapas_feitas || 0
            const pct = chapas > 0 ? Math.round((feitas / chapas) * 100) : 0
            const tempoTotalJob = p.cncs?.length > 0
              ? p.cncs.reduce((s, c) => s + (c.tempoTotal || 0), 0)
              : p.tempo_chapa ? chapas * p.tempo_chapa : null
            const tempoRest = tempoTotalJob ? Math.round(tempoTotalJob * (1 - feitas / chapas)) : null
            const prev = tempoRest ? previsaoTermino(tempoRest) : null

            return (
              <div key={p.id} style={{ marginBottom: 10, padding: '12px', background: 'var(--surface2)', borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, flex: 1 }}>{p.job}</div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                    background: p.finalizado ? 'rgba(0,255,136,.2)' : 'rgba(255,107,53,.2)',
                    color: p.finalizado ? 'var(--green)' : '#ff6b35'
                  }}>{p.finalizado ? '✅ Finalizado' : '⏳ Pendente'}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>🖨️ {p.maquina}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
                  <span>{feitas}/{chapas} chapas</span>
                  <span style={{ color: corP(pct), fontWeight: 700 }}>{pct}%</span>
                </div>
                <div style={{ height: 8, background: 'var(--surface)', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: corP(pct), borderRadius: 99 }} />
                </div>
                {tempoTotalJob && <div style={{ fontSize: 11, color: 'var(--muted)' }}>⏱️ Total: {formatarTempo(tempoTotalJob)}{prev ? ` · 🏁 ${prev}` : ''}</div>}
              </div>
            )
          })}
        </Modal>
      )}

      {modal === 'usinagem' && modalData && (
        <Modal titulo="⚙️ Lançamentos Usinagem" subtitulo={`${modalData.length} lançamento(s) hoje`} onClose={() => setModal(null)}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 40, fontWeight: 700, color: 'var(--accent)' }}>{totalPecasLancadas}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>peças lançadas hoje</div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Por turno</div>
          {['1', '2', '3'].map(t => {
            const v = lancamentosPorTurno[t]
            if (!v) return null
            const pct = totalPecasLancadas > 0 ? Math.round((v / totalPecasLancadas) * 100) : 0
            const cores = { '1': 'var(--accent)', '2': 'var(--yellow)', '3': '#7c3aed' }
            const labels = { '1': '1º Turno (07:00 - 16:48)', '2': '2º Turno (16:48 - 02:09)', '3': '3º Turno (02:09 - 07:00)' }
            return (
              <div key={t} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: 'var(--muted)' }}>{labels[t]}</span>
                  <span style={{ color: cores[t], fontWeight: 700 }}>{v} pç · {pct}%</span>
                </div>
                <div style={{ height: 8, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: cores[t], borderRadius: 99 }} />
                </div>
              </div>
            )
          })}
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, margin: '16px 0 10px' }}>Lançamentos</div>
          {modalData.map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>{l.codigo}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  👤 {l.usuario_nome || '—'} · T{l.turno} · {new Date(l.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>+{l.quantidade} pç</div>
            </div>
          ))}
        </Modal>
      )}
    </div>
  )
}