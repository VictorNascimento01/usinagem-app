import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase'

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

export default function Indicadores({ usuario }) {
  const [planejamentos, setPlanejamentos] = useState([])
  const [apontamentos, setApontamentos] = useState([])
  const [lancamentos, setLancamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [agora, setAgora] = useState(new Date())
  const [planta, setPlanta] = useState(usuario?.estab === 'todas' ? '' : usuario?.estab || '')
  const [modal, setModal] = useState(null) // 'chapas' | 'qualidade' | 'maquina' | 'usinagem' | 'pendentes' | 'finalizados'
  const [modalData, setModalData] = useState(null)

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

  const porMaquina = {}
  pendentes.forEach(p => {
    const maq = p.maquina || '—'
    if (!porMaquina[maq]) porMaquina[maq] = []
    porMaquina[maq].push(p)
  })

  const corQ = (q) => q === null ? 'var(--muted)' : q >= 95 ? 'var(--green)' : q >= 80 ? 'var(--yellow)' : 'var(--red)'
  const corP = (pct) => pct >= 80 ? 'var(--green)' : pct >= 40 ? 'var(--accent)' : 'var(--yellow)'

  function abrirModalMaquina(maquina, jobs) {
    setModalData({ maquina, jobs })
    setModal('maquina')
  }

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
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
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

      {/* ⚡ LASER */}
      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
        ⚡ Laser — hoje
      </div>

      {/* Cards clicáveis */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Pendentes', valor: pendentes.length, cor: pendentes.length > 0 ? 'var(--yellow)' : 'var(--green)', onClick: () => { setModalData(pendentes); setModal('pendentes') } },
          { label: 'Finalizados', valor: finalizados.length, cor: 'var(--green)', onClick: () => { setModalData(finalizados); setModal('finalizados') } },
          { label: 'Jobs hoje', valor: planejamentos.length, cor: 'var(--accent)', onClick: () => { setModalData(planejamentos); setModal('todos') } },
        ].map(({ label, valor, cor, onClick }) => (
          <div key={label} onClick={onClick} className="card" style={{ padding: 12, textAlign: 'center', marginBottom: 0, cursor: 'pointer', transition: 'opacity .2s' }}
            onMouseDown={e => e.currentTarget.style.opacity = '.7'}
            onMouseUp={e => e.currentTarget.style.opacity = '1'}
            onTouchStart={e => e.currentTarget.style.opacity = '.7'}
            onTouchEnd={e => e.currentTarget.style.opacity = '1'}>
            <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</div>
            <div style={{ fontFamily: 'monospace', fontSize: 24, fontWeight: 700, color: cor }}>{valor}</div>
            <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 4 }}>ver detalhes ›</div>
          </div>
        ))}
      </div>

      {/* Gauges */}
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

      {/* Máquinas em operação */}
      {Object.keys(porMaquina).length > 0 && (
        <>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            🖨️ Máquinas em operação
          </div>
          {Object.entries(porMaquina).map(([maquina, jobs]) => {
            const totalChapas = jobs.reduce((s, j) => s + (j.chapas_cortar || j.total_chapas || 0), 0)
            const feitas = jobs.reduce((s, j) => s + (j.chapas_feitas || 0), 0)
            const pct = totalChapas > 0 ? Math.round((feitas / totalChapas) * 100) : 0
            let tempoTotal = 0
            let temTempo = true
            jobs.forEach(j => {
              const rest = (j.chapas_cortar || j.total_chapas || 0) - (j.chapas_feitas || 0)
              if (j.tempo_chapa) tempoTotal += rest * j.tempo_chapa
              else temTempo = false
            })
            const previsao = temTempo && tempoTotal > 0 ? previsaoTermino(tempoTotal) : null

            return (
              <div key={maquina} onClick={() => abrirModalMaquina(maquina, jobs)} className="card" style={{ marginBottom: 10, cursor: 'pointer' }}
                onMouseDown={e => e.currentTarget.style.opacity = '.7'}
                onMouseUp={e => e.currentTarget.style.opacity = '1'}
                onTouchStart={e => e.currentTarget.style.opacity = '.7'}
                onTouchEnd={e => e.currentTarget.style.opacity = '1'}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--yellow)', flexShrink: 0 }} />
                  <div style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 700, color: 'var(--yellow)', flex: 1 }}>{maquina.toUpperCase()}</div>
                  <div style={{ textAlign: 'right' }}>
                    {previsao && <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>🏁 {previsao}</div>}
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{jobs.length} job(s)</div>
                  </div>
                  <div style={{ fontSize: 16, color: 'var(--muted)' }}>›</div>
                </div>

                {/* Barra de progresso */}
                <div style={{ marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
                    <span>{feitas}/{totalChapas} chapas</span>
                    <span style={{ color: corP(pct), fontWeight: 700 }}>{pct}%</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: corP(pct), borderRadius: 99, transition: 'width .3s' }} />
                  </div>
                </div>

                {temTempo && tempoTotal > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>⏱️ {formatarTempo(tempoTotal)} restante</div>
                )}
              </div>
            )
          })}
        </>
      )}

      {planejamentos.length === 0 && (
        <div className="empty" style={{ marginBottom: 16 }}>
          <div className="emoji">⚡</div>
          <h3>Sem dados laser hoje</h3>
        </div>
      )}

      {/* ⚙️ USINAGEM */}
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

          {/* Mini barras por turno */}
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

      {/* MODAIS */}

      {/* Modal máquina */}
      {modal === 'maquina' && modalData && (
        <Modal titulo={`${modalData.maquina.toUpperCase()} — Jobs em andamento`} subtitulo={`${modalData.jobs.length} job(s) na fila`} onClose={() => setModal(null)}>
          {modalData.jobs.map((job, idx) => {
            const chapas = job.chapas_cortar || job.total_chapas || 0
            const feitas = job.chapas_feitas || 0
            const restantes = chapas - feitas
            const tempo = job.tempo_chapa ? restantes * job.tempo_chapa : null
            const prev = tempo ? previsaoTermino(tempo) : null
            const pct = chapas > 0 ? Math.round((feitas / chapas) * 100) : 0

            return (
              <div key={job.id} style={{
                padding: '14px', marginBottom: 10,
                background: idx === 0 ? 'rgba(0,229,255,.05)' : 'var(--surface2)',
                border: `1px solid ${idx === 0 ? 'rgba(0,229,255,.2)' : 'var(--border)'}`,
                borderRadius: 12
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: idx === 0 ? 'var(--accent)' : 'var(--surface)',
                    border: `2px solid ${idx === 0 ? 'var(--accent)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
                    color: idx === 0 ? '#000' : 'var(--muted)', flexShrink: 0
                  }}>{idx + 1}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, flex: 1 }}>{job.job}</div>
                  {idx === 0 && <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700 }}>▶ Cortando</span>}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
                  <span>{feitas}/{chapas} chapas</span>
                  <span style={{ color: corP(pct), fontWeight: 700 }}>{pct}%</span>
                </div>
                <div style={{ height: 10, background: 'var(--surface)', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: idx === 0 ? 'var(--accent)' : 'var(--muted)', borderRadius: 99 }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>Tempo restante</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>{tempo ? formatarTempo(tempo) : '—'}</div>
                  </div>
                  <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>Previsão término</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: 'var(--green)' }}>{prev || '—'}</div>
                  </div>
                </div>

                {job.tempo_chapa && (
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
                    ⏱️ {formatarTempo(job.tempo_chapa)}/chapa · {nomeTurno(job.turno)}
                  </div>
                )}
              </div>
            )
          })}
        </Modal>
      )}

      {/* Modal qualidade */}
      {modal === 'qualidade' && modalData && (
        <Modal titulo="Qualidade Laser" subtitulo="Apontamentos de hoje" onClose={() => setModal(null)}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 48, fontWeight: 700, color: corQ(qualidadeLaser) }}>{qualidadeLaser}%</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>{modalData.total.real} pç produzidas de {modalData.total.planejado} pç planejadas</div>
            <div style={{ height: 12, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden', margin: '12px 0' }}>
              <div style={{ height: '100%', width: `${qualidadeLaser}%`, background: corQ(qualidadeLaser), borderRadius: 99 }} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: corQ(qualidadeLaser) }}>
              {qualidadeLaser >= 95 ? '🟢 Excelente — acima de 95%' : qualidadeLaser >= 80 ? '🟡 Atenção — entre 80% e 95%' : '🔴 Abaixo do esperado — menos de 80%'}
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
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  🖨️ {dados.maquina} · {dados.real}/{dados.planejado} pç
                </div>
                {dados.itens.map((item, i) => (
                  <div key={i} style={{ marginTop: 8, padding: '6px 8px', background: 'var(--surface)', borderRadius: 6, fontSize: 11 }}>
                    <div style={{ fontFamily: 'monospace', fontWeight: 700 }}>{item.item_ccs}</div>
                    <div style={{ color: 'var(--muted)', marginTop: 2 }}>Real: {item.qtd_real} · Planejado: {item.qtd_planejada}</div>
                  </div>
                ))}
              </div>
            )
          })}
        </Modal>
      )}

      {/* Modal lista de jobs */}
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
            const tempoRest = p.tempo_chapa ? (chapas - feitas) * p.tempo_chapa : null
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
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>
                  🖨️ {p.maquina} · {nomeTurno(p.turno)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
                  <span>{feitas}/{chapas} chapas</span>
                  <span style={{ color: corP(pct), fontWeight: 700 }}>{pct}%</span>
                </div>
                <div style={{ height: 8, background: 'var(--surface)', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: corP(pct), borderRadius: 99 }} />
                </div>
                {tempoRest !== null && (
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    ⏱️ {formatarTempo(tempoRest)} restante {prev ? `· 🏁 ${prev}` : ''}
                  </div>
                )}
              </div>
            )
          })}
        </Modal>
      )}

      {/* Modal usinagem */}
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

function nomeTurno(t) {
  if (t === '1') return '1º Turno'
  if (t === '2') return '2º Turno'
  if (t === '3') return '3º Turno'
  return t || '—'
}

function corP(pct) {
  return pct >= 80 ? 'var(--green)' : pct >= 40 ? 'var(--accent)' : 'var(--yellow)'
}

function corQ(q) {
  return q === null ? 'var(--muted)' : q >= 95 ? 'var(--green)' : q >= 80 ? 'var(--yellow)' : 'var(--red)'
}