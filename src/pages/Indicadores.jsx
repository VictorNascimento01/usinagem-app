import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase'

const TURNOS_MIN = { '1': 528, '2': 501, '3': 276 }
const CAP_DIA = 528 + 501 + 276 // 1305 min

const CORES = [
  '#00e5ff', '#00ff88', '#ffd60a', '#ff6b35', '#7c3aed',
  '#ff3d5a', '#06d6a0', '#f72585', '#4361ee', '#4cc9f0',
  '#fb5607', '#8338ec', '#3a86ff', '#43aa8b', '#ffbe0b',
  '#e63946', '#457b9d', '#2a9d8f', '#e9c46a', '#f4a261'
]

function formatarTempo(minutos) {
  if (!minutos || minutos <= 0) return '—'
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${m}min`
}

function proximosDiasUteis(n = 7, inicio = new Date()) {
  const dias = []
  const d = new Date(inicio)
  d.setHours(0, 0, 0, 0)
  while (dias.length < n) {
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) dias.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return dias
}

function semanasDoMes() {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth()
  const semanas = []
  let d = new Date(ano, mes, 1)
  while (d.getMonth() === mes) {
    const inicio = new Date(d)
    const fim = new Date(d)
    fim.setDate(fim.getDate() + 6)
    if (fim.getMonth() !== mes) fim.setDate(new Date(ano, mes + 1, 0).getDate())
    semanas.push({ inicio: new Date(inicio), fim: new Date(fim) })
    d.setDate(d.getDate() + 7)
  }
  return semanas
}

function distribuirNoDias(tarefas, dias) {
  const resultado = {}
  dias.forEach(d => { resultado[d.toISOString().split('T')[0]] = [] })

  let diaIdx = 0
  let minUsado = 0

  for (const t of tarefas) {
    const tempo = t.tempo || 0
    if (tempo <= 0) continue

    while (diaIdx < dias.length && minUsado >= CAP_DIA) {
      diaIdx++
      minUsado = 0
    }

    if (diaIdx >= dias.length) break

    const key = dias[diaIdx].toISOString().split('T')[0]
    resultado[key].push({ ...t, tempoNoDia: tempo })
    minUsado += tempo

    if (minUsado >= CAP_DIA) {
      diaIdx++
      minUsado = 0
    }
  }

  return resultado
}

function corOcupacao(pct) {
  if (pct >= 90) return 'var(--red)'
  if (pct >= 70) return 'var(--yellow)'
  return 'var(--green)'
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
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset .8s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
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
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={20} /></button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: 16 }}>{children}</div>
      </div>
    </div>
  )
}

function GraficoBarrasSemana({ tarefas, tarefaCores }) {
  const [tooltip, setTooltip] = useState(null)
  const dias = proximosDiasUteis(7)
  const distribuicao = distribuirNoDias(tarefas, dias)
  const ALTURA = 220
  const escala = ALTURA / CAP_DIA
  const posT1 = TURNOS_MIN['1'] * escala
  const posT2 = (TURNOS_MIN['1'] + TURNOS_MIN['2']) * escala

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        {[
          { cor: 'var(--accent)', label: `1º T (${formatarTempo(TURNOS_MIN['1'])})` },
          { cor: 'var(--yellow)', label: `2º T (${formatarTempo(TURNOS_MIN['2'])})` },
          { cor: '#7c3aed', label: `3º T (${formatarTempo(TURNOS_MIN['3'])})` },
        ].map(({ cor, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 14, height: 2, borderTop: `2px dashed ${cor}` }} />
            <span style={{ fontSize: 9, color: cor, fontWeight: 700 }}>{label}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end' }}>
        <div style={{ width: 4, height: ALTURA, flexShrink: 0, position: 'relative' }}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: 'var(--border)' }} />
        </div>

        {dias.map((dia) => {
          const key = dia.toISOString().split('T')[0]
          const segs = distribuicao[key] || []
          const totalDia = segs.reduce((s, sg) => s + sg.tempoNoDia, 0)
          const pct = Math.round((totalDia / CAP_DIA) * 100)
          const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
          const ehHoje = dia.getTime() === hoje.getTime()
          const nomeDia = dia.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' })
          const estouro = totalDia > CAP_DIA

          return (
            <div key={key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                position: 'relative', height: ALTURA, width: '92%',
                background: 'var(--surface2)', borderRadius: '4px 4px 0 0',
                border: estouro ? '1px solid rgba(255,61,90,.5)' : ehHoje ? '1px solid rgba(0,229,255,.4)' : '1px solid var(--border)',
                overflow: 'hidden' // mantém barras dentro
              }}>
                {/* Fundo turnos */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: posT1, background: 'rgba(0,229,255,.05)' }} />
                <div style={{ position: 'absolute', bottom: posT1, left: 0, right: 0, height: posT2 - posT1, background: 'rgba(255,214,10,.04)' }} />
                <div style={{ position: 'absolute', bottom: posT2, left: 0, right: 0, height: ALTURA - posT2, background: 'rgba(124,58,237,.04)' }} />

                {/* Linhas tracejadas */}
                {[{ pos: posT1, cor: 'var(--accent)' }, { pos: posT2, cor: 'var(--yellow)' }].map(({ pos, cor }, i) => (
                  <div key={i} style={{ position: 'absolute', bottom: pos, left: 0, right: 0, borderTop: `1px dashed ${cor}`, zIndex: 2, opacity: 0.5 }} />
                ))}

                {/* Barras empilhadas */}
                {(() => {
                  let acum = 0
                  return segs.map((sg, i) => {
                    const bottom = acum * escala
                    const height = Math.max(sg.tempoNoDia * escala, 3)
                    const extrapolou = (acum + sg.tempoNoDia) > CAP_DIA
                    acum += sg.tempoNoDia
                    const cor = extrapolou ? 'var(--red)' : tarefaCores[sg.tarefa] || '#888'
                    const isTooltip = tooltip?.key === key + sg.tarefa + i

                    return (
                      <div
                        key={sg.tarefa + i}
                        onClick={() => setTooltip(isTooltip ? null : { key: key + sg.tarefa + i, tarefa: sg.tarefa, tempo: sg.tempoNoDia, dia: nomeDia, extrapolou })}
                        style={{
                          position: 'absolute', bottom, left: 1, right: 1,
                          height,
                          background: cor,
                          borderRadius: i === segs.length - 1 ? '3px 3px 0 0' : 1,
                          zIndex: 3,
                          opacity: isTooltip ? 1 : 0.85,
                          cursor: 'pointer',
                          outline: isTooltip ? '1px solid #fff' : 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          overflow: 'hidden'
                        }}
                      >
                        {height > 16 && (
                          <span style={{ fontSize: 7, fontWeight: 700, color: '#000', textAlign: 'center', padding: '0 2px', lineHeight: 1.1, pointerEvents: 'none' }}>
                            {sg.tarefa.length > 8 ? sg.tarefa.slice(0, 7) + '…' : sg.tarefa}
                          </span>
                        )}
                      </div>
                    )
                  })
                })()}

                {/* Tooltip dentro da barra */}
                {tooltip && segs.some((sg, i) => tooltip.key === key + sg.tarefa + i) && (
                  <div style={{
                    position: 'absolute', top: 4, left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--surface)', border: '1px solid var(--accent)',
                    borderRadius: 8, padding: '6px 10px', zIndex: 10,
                    whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(0,0,0,.5)',
                    pointerEvents: 'none'
                  }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: tooltip.extrapolou ? 'var(--red)' : 'var(--accent)', marginBottom: 2 }}>
                      {tooltip.tarefa}{tooltip.extrapolou ? ' ⚠️' : ''}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--muted)' }}>⏱️ {formatarTempo(tooltip.tempo)}</div>
                  </div>
                )}
              </div>

              <div style={{ fontSize: 8, color: estouro ? 'var(--red)' : ehHoje ? 'var(--accent)' : 'var(--muted)', fontWeight: ehHoje || estouro ? 700 : 400, textAlign: 'center', marginTop: 3, lineHeight: 1.3 }}>
                {nomeDia.replace('.', '')}
              </div>
              {totalDia > 0 && (
                <div style={{ fontSize: 8, fontWeight: 700, color: corOcupacao(pct), marginTop: 1 }}>
                  {pct}%{estouro ? '🔴' : ''}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legenda */}
      <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {tarefas.map(t => (
          <div key={t.tarefa} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface2)', borderRadius: 6, padding: '3px 7px' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: tarefaCores[t.tarefa], flexShrink: 0 }} />
            <span style={{ fontSize: 9, color: 'var(--text)', fontWeight: 700 }}>{t.tarefa}</span>
            <span style={{ fontSize: 9, color: 'var(--muted)' }}>{formatarTempo(t.tempo)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function GraficoBarrasMes({ tarefas, tarefaCores }) {
  const semanas = semanasDoMes()
  const ALTURA = 200

  const capSemana = semanas.map(s => {
    let dias = 0
    const d = new Date(s.inicio)
    while (d <= s.fim) {
      if (d.getDay() !== 0 && d.getDay() !== 6) dias++
      d.setDate(d.getDate() + 1)
    }
    return { ...s, cap: dias * CAP_DIA, dias }
  })

  const maxCap = Math.max(...capSemana.map(s => s.cap))
  const escala = ALTURA / maxCap
  const hoje = new Date()

  const tarefasSemana = semanas.map((s, idx) => {
    const nDias = capSemana[idx].dias
    const diasUteis = proximosDiasUteis(nDias, s.inicio)
    const dist = distribuirNoDias(tarefas, diasUteis)
    const porTarefa = {}
    Object.values(dist).forEach(segs => {
      segs.forEach(sg => {
        if (!porTarefa[sg.tarefa]) porTarefa[sg.tarefa] = 0
        porTarefa[sg.tarefa] += sg.tempoNoDia
      })
    })
    const total = Object.values(porTarefa).reduce((s, v) => s + v, 0)
    return { ...s, total, cap: capSemana[idx].cap, porTarefa }
  })

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', marginTop: 8 }}>
        <div style={{ width: 4, flexShrink: 0 }} />
        {tarefasSemana.map((s, idx) => {
          const pct = s.cap > 0 ? Math.round((s.total / s.cap) * 100) : 0
          const ehAtual = hoje >= s.inicio && hoje <= s.fim
          const estouro = s.total > s.cap
          const label = `S${idx + 1}\n${s.inicio.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`
          const segmentos = Object.entries(s.porTarefa).sort((a, b) => b[1] - a[1])

          return (
            <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                position: 'relative', height: ALTURA, width: '88%',
                background: 'var(--surface2)', borderRadius: '4px 4px 0 0',
                border: estouro ? '1px solid rgba(255,61,90,.5)' : ehAtual ? '1px solid rgba(0,229,255,.4)' : '1px solid var(--border)',
                overflow: 'hidden' // limita dentro da barra
              }}>
                {(() => {
                  let acum = 0
                  return segmentos.map(([tarefa, tempo], i) => {
                    const bottom = acum * escala
                    const height = Math.max(tempo * escala, 2)
                    const extrapolou = (acum + tempo) > s.cap
                    acum += tempo
                    const cor = extrapolou ? 'var(--red)' : tarefaCores[tarefa] || '#888'
                    return (
                      <div key={tarefa} style={{
                        position: 'absolute', bottom, left: 1, right: 1,
                        height,
                        background: cor,
                        borderRadius: i === segmentos.length - 1 ? '3px 3px 0 0' : 0,
                        opacity: 0.85,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden'
                      }}>
                        {height > 14 && (
                          <span style={{ fontSize: 7, fontWeight: 700, color: '#000', textAlign: 'center', padding: '0 2px' }}>
                            {tarefa.length > 7 ? tarefa.slice(0, 6) + '…' : tarefa}
                          </span>
                        )}
                      </div>
                    )
                  })
                })()}

                {/* Linha capacidade */}
                <div style={{
                  position: 'absolute',
                  bottom: Math.min(s.cap * escala, ALTURA - 1),
                  left: 0, right: 0,
                  borderTop: '1px dashed rgba(255,255,255,.3)',
                  zIndex: 4
                }} />
              </div>

              <div style={{ fontSize: 8, color: estouro ? 'var(--red)' : ehAtual ? 'var(--accent)' : 'var(--muted)', fontWeight: ehAtual || estouro ? 700 : 400, textAlign: 'center', marginTop: 3, lineHeight: 1.4, whiteSpace: 'pre-line' }}>
                {label}
              </div>
              <div style={{ fontSize: 8, fontWeight: 700, color: corOcupacao(pct), marginTop: 1 }}>
                {pct > 0 ? `${pct}%${estouro ? '🔴' : ''}` : '—'}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legenda */}
      <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {tarefas.map(t => (
          <div key={t.tarefa} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface2)', borderRadius: 6, padding: '3px 7px' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: tarefaCores[t.tarefa], flexShrink: 0 }} />
            <span style={{ fontSize: 9, color: 'var(--text)', fontWeight: 700 }}>{t.tarefa}</span>
            <span style={{ fontSize: 9, color: 'var(--muted)' }}>{formatarTempo(t.tempo)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ModalMaquina({ maquina, tarefas, onClose }) {
  const [aba, setAba] = useState('semana')
  const totalMin = tarefas.reduce((s, t) => s + t.tempo, 0)
  const diasNecessarios = Math.ceil(totalMin / CAP_DIA)
  const tarefaCores = {}
  tarefas.forEach((t, i) => { tarefaCores[t.tarefa] = CORES[i % CORES.length] })

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 16, color: 'var(--yellow)' }}>{maquina.toUpperCase()}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{tarefas.length} tarefa(s) · {formatarTempo(totalMin)} total · ~{diasNecessarios} dia(s)</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={20} /></button>
        </div>

        <div style={{ display: 'flex', gap: 6, padding: '12px 16px 0', flexShrink: 0 }}>
          {[
            { key: 'semana', label: '📅 Próxima semana' },
            { key: 'mes', label: '🗓️ Mês atual' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setAba(key)} style={{
              flex: 1, padding: '8px', border: '1px solid',
              borderColor: aba === key ? 'var(--accent)' : 'var(--border)',
              background: aba === key ? 'rgba(0,229,255,.1)' : 'var(--surface2)',
              color: aba === key ? 'var(--accent)' : 'var(--muted)',
              borderRadius: 8, fontWeight: 700, fontSize: 11, cursor: 'pointer'
            }}>{label}</button>
          ))}
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: 16 }}>
          {aba === 'semana' && <GraficoBarrasSemana tarefas={tarefas} tarefaCores={tarefaCores} />}
          {aba === 'mes' && <GraficoBarrasMes tarefas={tarefas} tarefaCores={tarefaCores} />}

          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Tarefas na fila</div>
            {tarefas.map((t) => {
              const pctDia = Math.round((t.tempo / CAP_DIA) * 100)
              return (
                <div key={t.tarefa} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: tarefaCores[t.tarefa], flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>{t.tarefa}</div>
                    <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden', marginTop: 4 }}>
                      <div style={{ height: '100%', width: `${Math.min(pctDia, 100)}%`, background: tarefaCores[t.tarefa], borderRadius: 99 }} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: pctDia > 100 ? 'var(--red)' : 'var(--accent)' }}>{formatarTempo(t.tempo)}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>{pctDia}% de 1 dia</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Indicadores({ usuario }) {
  const [planejamentos, setPlanejamentos] = useState([])
  const [apontamentos, setApontamentos] = useState([])
  const [lancamentos, setLancamentos] = useState([])
  const [nestingPorMaquina, setNestingPorMaquina] = useState({})
  const [loading, setLoading] = useState(true)
  const [agora, setAgora] = useState(new Date())
  const [planta, setPlanta] = useState(usuario?.estab === 'todas' ? '' : usuario?.estab || '')
  const [modal, setModal] = useState(null)
  const [modalData, setModalData] = useState(null)
  const [abaIndicador, setAbaIndicador] = useState('geral')
  const [maquinaSelecionada, setMaquinaSelecionada] = useState(null)

  useEffect(() => {
    carregarDados()
    const interval = setInterval(() => { setAgora(new Date()); carregarDados() }, 60000)
    return () => clearInterval(interval)
  }, [planta])

  async function carregarDados() {
    setLoading(true)
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)

    let qPlan = supabase.from('laser_planejamento').select('*').gte('criado_em', hoje.toISOString())
    if (planta) qPlan = qPlan.eq('estab', planta)
    const { data: plans } = await qPlan

    const { data: aponts } = await supabase.from('laser_apontamento').select('*').gte('criado_em', hoje.toISOString())

    let qLanc = supabase.from('lancamentos').select('*').gte('criado_em', hoje.toISOString())
    if (planta) qLanc = qLanc.eq('estab', planta)
    const { data: lancs } = await qLanc

    const { data: nestingRows } = await supabase
      .from('nesting')
      .select('maquina, tarefa, programa, tempo_corte_total')

    const porMaquina = {}
    const programasVistos = new Set()

    if (nestingRows) {
      nestingRows.forEach(row => {
        const maq = (row.maquina || '—').trim()
        const tar = (row.tarefa || '—').trim()
        const prog = (row.programa || '').trim()
        const chave = `${maq}|${tar}|${prog}`

        if (programasVistos.has(chave)) return
        programasVistos.add(chave)

        if (!porMaquina[maq]) porMaquina[maq] = {}
        if (!porMaquina[maq][tar]) porMaquina[maq][tar] = 0
        const tempoH = parseFloat(String(row.tempo_corte_total || 0).replace(',', '.')) || 0
        porMaquina[maq][tar] += tempoH * 60
      })
    }

    const resultado = {}
    Object.entries(porMaquina).forEach(([maq, tarefas]) => {
      resultado[maq] = Object.entries(tarefas)
        .map(([tarefa, tempo]) => ({ tarefa, tempo: Math.round(tempo) }))
        .filter(t => t.tempo > 0)
        .sort((a, b) => b.tempo - a.tempo)
    })

    setNestingPorMaquina(resultado)
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
        <button onClick={carregarDados} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: 'var(--muted)', fontSize: 12 }}>🔄</button>
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

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { key: 'geral', label: '📈 Geral' },
          { key: 'carga', label: '🖨️ Carga' },
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

      {abaIndicador === 'geral' && (
        <>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>⚡ Laser — hoje</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Pendentes', valor: pendentes.length, cor: pendentes.length > 0 ? 'var(--yellow)' : 'var(--green)', onClick: () => { setModalData(pendentes); setModal('pendentes') } },
              { label: 'Finalizados', valor: finalizados.length, cor: 'var(--green)', onClick: () => { setModalData(finalizados); setModal('finalizados') } },
              { label: 'Jobs hoje', valor: planejamentos.length, cor: 'var(--accent)', onClick: () => { setModalData(planejamentos); setModal('todos') } },
            ].map(({ label, valor, cor, onClick }) => (
              <div key={label} onClick={onClick} className="card" style={{ padding: 12, textAlign: 'center', marginBottom: 0, cursor: 'pointer' }}>
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
                  <GaugeCircular valor={totalChapasFeitas} max={totalChapasPlanejadasHoje} cor={corP(pctChapas)} label="Chapas cortadas" sublabel={`${totalChapasFeitas}/${totalChapasPlanejadasHoje}`} onClick={() => { setModalData(planejamentos); setModal('chapas') }} />
                )}
                {qualidadeLaser !== null && (
                  <GaugeCircular valor={qualidadeLaser} max={100} cor={corQ(qualidadeLaser)} label="Qualidade laser" sublabel={qualidadeLaser >= 95 ? 'Excelente' : qualidadeLaser >= 80 ? 'Atenção' : 'Abaixo'} onClick={abrirModalQualidade} />
                )}
              </div>
            </div>
          )}

          {planejamentos.length === 0 && <div className="empty" style={{ marginBottom: 16 }}><div className="emoji">⚡</div><h3>Sem dados laser hoje</h3></div>}

          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 8 }}>⚙️ Usinagem — hoje</div>
          {lancamentos.length === 0 ? (
            <div className="empty"><div className="emoji">⚙️</div><h3>Sem lançamentos hoje</h3></div>
          ) : (
            <div onClick={() => { setModalData(lancamentos); setModal('usinagem') }} className="card" style={{ marginBottom: 16, cursor: 'pointer' }}>
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

      {abaIndicador === 'carga' && (
        <>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 16 }}>
            Baseado no nesting · toque em uma máquina para ver a carga detalhada
          </div>

          {Object.keys(nestingPorMaquina).length === 0 ? (
            <div className="empty">
              <div className="emoji">🖨️</div>
              <h3>Sem dados de nesting</h3>
              <p>Importe o arquivo de nesting pelo monitor</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {Object.entries(nestingPorMaquina)
                .sort((a, b) => b[1].reduce((s, t) => s + t.tempo, 0) - a[1].reduce((s, t) => s + t.tempo, 0))
                .map(([maquina, tarefas]) => {
                  const totalMin = tarefas.reduce((s, t) => s + t.tempo, 0)
                  const diasNec = Math.ceil(totalMin / CAP_DIA)
                  const pctSemana = Math.min(Math.round((totalMin / (CAP_DIA * 5)) * 100), 999)
                  const cor = corOcupacao(pctSemana)
                  const tarefaCores = {}
                  tarefas.forEach((t, i) => { tarefaCores[t.tarefa] = CORES[i % CORES.length] })

                  const dias5 = proximosDiasUteis(5)
                  const dist5 = distribuirNoDias(tarefas, dias5)
                  const HMIN = 60
                  const escMin = HMIN / CAP_DIA

                  return (
                    <div key={maquina} onClick={() => setMaquinaSelecionada({ maquina, tarefas })}
                      className="card" style={{ marginBottom: 0, cursor: 'pointer', padding: '14px' }}>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: cor, flexShrink: 0 }} />
                        <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--yellow)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {maquina.toUpperCase()}
                        </div>
                      </div>

                      {/* Mini gráfico colorido 5 dias */}
                      <div style={{ display: 'flex', gap: 2, height: HMIN, alignItems: 'flex-end', marginBottom: 10 }}>
                        {dias5.map(dia => {
                          const key = dia.toISOString().split('T')[0]
                          const segs = dist5[key] || []
                          const totalDia = segs.reduce((s, sg) => s + sg.tempoNoDia, 0)
                          const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
                          const ehHoje = dia.getTime() === hoje.getTime()
                          const estouro = totalDia > CAP_DIA
                          let acum = 0

                          return (
                            <div key={key} style={{
                              flex: 1, position: 'relative', height: HMIN,
                              background: 'var(--surface2)', borderRadius: '2px 2px 0 0',
                              border: estouro ? '1px solid rgba(255,61,90,.5)' : ehHoje ? '1px solid rgba(0,229,255,.3)' : '1px solid var(--border)',
                              overflow: 'hidden'
                            }}>
                              {segs.map((sg, i) => {
                                const bottom = acum * escMin
                                const height = Math.max(sg.tempoNoDia * escMin, 2)
                                const extrapolou = (acum + sg.tempoNoDia) > CAP_DIA
                                acum += sg.tempoNoDia
                                return (
                                  <div key={i} style={{
                                    position: 'absolute', bottom, left: 0, right: 0,
                                    height,
                                    background: extrapolou ? 'var(--red)' : tarefaCores[sg.tarefa] || '#888',
                                    opacity: 0.9
                                  }} />
                                )
                              })}
                            </div>
                          )
                        })}
                      </div>

                      <div style={{ textAlign: 'center', marginBottom: 6 }}>
                        <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 700, color: cor }}>{pctSemana}%</div>
                        <div style={{ fontSize: 9, color: 'var(--muted)' }}>ocupação semana</div>
                      </div>

                      <div style={{ height: 5, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
                        <div style={{ height: '100%', width: `${Math.min(pctSemana, 100)}%`, background: cor, borderRadius: 99 }} />
                      </div>

                      <div style={{ fontSize: 9, color: 'var(--muted)', textAlign: 'center' }}>
                        {formatarTempo(totalMin)} · ~{diasNec} dia(s) · {tarefas.length} tarefa(s)
                      </div>
                      <div style={{ fontSize: 9, color: '#7c3aed', textAlign: 'center', marginTop: 4, fontWeight: 700 }}>
                        ver detalhes ›
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </>
      )}

      {maquinaSelecionada && (
        <ModalMaquina
          maquina={maquinaSelecionada.maquina}
          tarefas={maquinaSelecionada.tarefas}
          onClose={() => setMaquinaSelecionada(null)}
        />
      )}

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
            const tempoTotalJob = p.cncs?.length > 0 ? p.cncs.reduce((s, c) => s + (c.tempoTotal || 0), 0) : p.tempo_chapa ? chapas * p.tempo_chapa : null
            const tempoRest = tempoTotalJob ? Math.round(tempoTotalJob * (1 - feitas / chapas)) : null
            const prev = tempoRest ? (() => { const a = new Date(); a.setMinutes(a.getMinutes() + tempoRest); return a.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) })() : null
            return (
              <div key={p.id} style={{ marginBottom: 10, padding: '12px', background: 'var(--surface2)', borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, flex: 1 }}>{p.job}</div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: p.finalizado ? 'rgba(0,255,136,.2)' : 'rgba(255,107,53,.2)', color: p.finalizado ? 'var(--green)' : '#ff6b35' }}>{p.finalizado ? '✅' : '⏳'}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>🖨️ {p.maquina}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
                  <span>{feitas}/{chapas} chapas</span>
                  <span style={{ color: corP(pct), fontWeight: 700 }}>{pct}%</span>
                </div>
                <div style={{ height: 8, background: 'var(--surface)', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: corP(pct), borderRadius: 99 }} />
                </div>
                {tempoTotalJob && <div style={{ fontSize: 11, color: 'var(--muted)' }}>⏱️ {formatarTempo(tempoTotalJob)}{prev ? ` · 🏁 ${prev}` : ''}</div>}
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
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>👤 {l.usuario_nome || '—'} · T{l.turno} · {new Date(l.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>+{l.quantidade} pç</div>
            </div>
          ))}
        </Modal>
      )}
    </div>
  )
}