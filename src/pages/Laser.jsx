import { useState, useEffect } from 'react'
import { Zap, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

const PLANTAS = [
  { key: 'todas', label: '🏭 Todas' },
  { key: '100', label: '📍 Limeira' },
  { key: '200', label: '📍 Palmeira' },
]

export default function Laser() {
  const [aba, setAba] = useState('planejamentos')
  const [planta, setPlanta] = useState('todas')

  return (
    <div>
      <div className="page-header">
        <div className="page-icon"><Zap size={22} color="#000" /></div>
        <div>
          <h1>LASER</h1>
          <p>Planejamentos e apontamentos</p>
        </div>
      </div>

      {/* Filtro planta */}
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

      {/* Abas */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { key: 'planejamentos', label: '📋 Planejamentos' },
          { key: 'relatorio', label: '📊 Relatório' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setAba(key)} style={{
            flex: 1, padding: '10px 8px', border: '1px solid',
            borderColor: aba === key ? 'var(--accent)' : 'var(--border)',
            background: aba === key ? 'rgba(0,229,255,.1)' : 'var(--surface)',
            color: aba === key ? 'var(--accent)' : 'var(--muted)',
            borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer'
          }}>{label}</button>
        ))}
      </div>

      {aba === 'planejamentos'
        ? <Planejamentos planta={planta} />
        : <Relatorio planta={planta} />
      }
    </div>
  )
}

function Planejamentos({ planta }) {
  const [planejamentos, setPlanejamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [detalhe, setDetalhe] = useState(null)
  const [ordens, setOrdens] = useState([])
  const [loadingOrdens, setLoadingOrdens] = useState(false)

  useEffect(() => {
    carregarPlanejamentos()
  }, [])

  async function carregarPlanejamentos() {
    setLoading(true)
    const { data } = await supabase
      .from('laser_planejamento')
      .select('*')
      .order('criado_em', { ascending: false })
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
    return new Date(dataStr).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const filtrados = planta === 'todas'
    ? planejamentos
    : planejamentos.filter(p => p.estab === planta)

  return (
    <>
      {loading ? (
        <div className="empty"><div className="emoji">⏳</div><p>Carregando...</p></div>
      ) : filtrados.length === 0 ? (
        <div className="empty">
          <div className="emoji">📋</div>
          <h3>Nenhum planejamento</h3>
          <p>Lance um corte no formulário Laser</p>
        </div>
      ) : (
        filtrados.map(p => (
          <div key={p.id} className="card" style={{ marginBottom: 10, cursor: 'pointer' }}
            onClick={() => abrirDetalhe(p)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1 }}>
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
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  🖨️ {p.maquina} · {p.total_chapas} chapa(s)
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  👤 {p.usuario_nome} · {formatarData(p.criado_em)}
                </div>
              </div>
              <div style={{ fontSize: 20, color: 'var(--muted)' }}>›</div>
            </div>
          </div>
        ))
      )}

      {/* Modal detalhe */}
      {detalhe && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: 24, width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Job {detalhe.job}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {detalhe.maquina} · {detalhe.total_chapas} chapas ·
                  {detalhe.tipo === 'parcial' ? ` Parcial: ${detalhe.chapas_cortar} chapas` : ' Total'}
                </div>
              </div>
              <button onClick={() => { setDetalhe(null); setOrdens([]) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{
              background: 'rgba(255,214,10,.08)', border: '1px solid rgba(255,214,10,.3)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 16
            }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                👤 {detalhe.usuario_nome} · {new Date(detalhe.criado_em).toLocaleString('pt-BR')}
              </div>
            </div>

            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              Ordens do job
            </div>

            {loadingOrdens ? (
              <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 20 }}>Carregando...</div>
            ) : ordens.map((o, i) => (
              <div key={i} style={{
                padding: '10px 12px', marginBottom: 8,
                background: 'var(--surface2)', borderRadius: 8,
                display: 'flex', alignItems: 'center', gap: 10
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>{o.item_ccs}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    OP {o.ordem} · {o.cliente || '—'}
                  </div>
                  {o.estab && (
                    <span style={{
                      background: o.estab === '100' ? 'rgba(0,229,255,.15)' : 'rgba(0,255,136,.15)',
                      color: o.estab === '100' ? 'var(--accent)' : 'var(--green)',
                      fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                      display: 'inline-block', marginTop: 4
                    }}>{o.estab === '100' ? 'Limeira' : 'Palmeira'}</span>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--yellow)' }}>
                    {o.qtde_ordem} pç
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>saldo: {o.saldo}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function Relatorio({ planta }) {
  const [apontamentos, setApontamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [detalhe, setDetalhe] = useState(null)
  const [sfccData, setSfccData] = useState({})

  useEffect(() => {
    carregarApontamentos()
  }, [])

  async function carregarApontamentos() {
    setLoading(true)
    const { data } = await supabase
      .from('laser_apontamento')
      .select('*')
      .order('criado_em', { ascending: false })
    setApontamentos(data || [])
    setLoading(false)
  }

  async function abrirDetalhe(job, itens, maquina, usuario, data) {
    setDetalhe({ job, itens, maquina, usuario, data })

    // Busca apontamentos do SFCC por ordem
    const ordens = itens.map(i => i.ordem).filter(Boolean)
    const { data: sfcc } = await supabase
      .from('apontamentos_prod')
      .select('ordem, qtd_aprov, desc_operacao')
      .in('ordem', ordens)

    // Soma por ordem
    const porOrdem = {}
    sfcc?.forEach(s => {
      if (!porOrdem[s.ordem]) porOrdem[s.ordem] = 0
      porOrdem[s.ordem] += (s.qtd_aprov || 0)
    })
    setSfccData(porOrdem)
  }

  function formatarData(dataStr) {
    if (!dataStr) return '—'
    return new Date(dataStr).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const porJob = {}
  apontamentos.forEach(a => {
    if (!porJob[a.job]) porJob[a.job] = []
    porJob[a.job].push(a)
  })

  const jobs = Object.entries(porJob)

  return (
    <>
      {loading ? (
        <div className="empty"><div className="emoji">⏳</div><p>Carregando...</p></div>
      ) : jobs.length === 0 ? (
        <div className="empty">
          <div className="emoji">📊</div>
          <h3>Nenhum apontamento</h3>
          <p>Apontar produção no formulário Laser</p>
        </div>
      ) : (
        jobs.map(([job, itens]) => {
          const maquina = itens[0]?.maquina || '—'
          const usuario = itens[0]?.usuario_nome || '—'
          const data = itens[0]?.criado_em
          const isAberto = detalhe?.job === job

          return (
            <div key={job} className="card" style={{ marginBottom: 10 }}>
              {/* Header do job */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                onClick={() => isAberto ? setDetalhe(null) : abrirDetalhe(job, itens, maquina, usuario, data)}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{job}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>🖨️ {maquina} · {itens.length} item(s)</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>👤 {usuario} · {formatarData(data)}</div>
                </div>
                <div style={{ fontSize: 20, color: 'var(--muted)' }}>{isAberto ? '▲' : '▼'}</div>
              </div>

              {/* Detalhe expandido */}
              {isAberto && (
                <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                  {itens.map((a, i) => {
                    const sfcc = sfccData[a.ordem] || 0
                    const planejado = a.qtd_planejada || 0
                    const apontado = a.qtd_real || 0
                    const diffApp = apontado - planejado
                    const diffSfcc = sfcc - planejado

                    return (
                      <div key={i} style={{
                        marginBottom: 14, padding: '12px',
                        background: 'var(--surface2)', borderRadius: 10
                      }}>
                        {/* Item */}
                        <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
                          {a.item_ccs}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>
                          OP {a.ordem}
                        </div>

                        {/* 3 indicadores */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                          {/* Planejado */}
                          <div style={{
                            background: 'rgba(107,114,128,.15)', borderRadius: 8,
                            padding: '10px 8px', textAlign: 'center'
                          }}>
                            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>📋 PLANEJADO</div>
                            <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700 }}>{planejado}</div>
                            <div style={{ fontSize: 10, color: 'var(--muted)' }}>peças</div>
                          </div>

                          {/* Apontado no app */}
                          <div style={{
                            background: apontado >= planejado ? 'rgba(0,255,136,.1)' : 'rgba(255,61,90,.1)',
                            border: `1px solid ${apontado >= planejado ? 'rgba(0,255,136,.3)' : 'rgba(255,61,90,.3)'}`,
                            borderRadius: 8, padding: '10px 8px', textAlign: 'center'
                          }}>
                            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>✅ NO APP</div>
                            <div style={{
                              fontFamily: 'monospace', fontSize: 18, fontWeight: 700,
                              color: apontado >= planejado ? 'var(--green)' : 'var(--red)'
                            }}>{apontado}</div>
                            <div style={{
                              fontSize: 10, fontWeight: 700,
                              color: apontado >= planejado ? 'var(--green)' : 'var(--red)'
                            }}>
                              {diffApp >= 0 ? `+${diffApp}` : diffApp}
                            </div>
                          </div>

                          {/* Apontado no sistema SFCC */}
                          <div style={{
                            background: sfcc >= planejado ? 'rgba(0,229,255,.1)' : 'rgba(255,214,10,.1)',
                            border: `1px solid ${sfcc >= planejado ? 'rgba(0,229,255,.3)' : 'rgba(255,214,10,.3)'}`,
                            borderRadius: 8, padding: '10px 8px', textAlign: 'center'
                          }}>
                            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>🖥️ SISTEMA</div>
                            <div style={{
                              fontFamily: 'monospace', fontSize: 18, fontWeight: 700,
                              color: sfcc >= planejado ? 'var(--accent)' : 'var(--yellow)'
                            }}>{sfcc}</div>
                            <div style={{
                              fontSize: 10, fontWeight: 700,
                              color: sfcc >= planejado ? 'var(--accent)' : 'var(--yellow)'
                            }}>
                              {diffSfcc >= 0 ? `+${diffSfcc}` : diffSfcc}
                            </div>
                          </div>
                        </div>

                        {/* Alerta se divergência */}
                        {apontado !== sfcc && (
                          <div style={{
                            marginTop: 10, background: 'rgba(255,214,10,.08)',
                            border: '1px solid rgba(255,214,10,.3)',
                            borderRadius: 8, padding: '6px 10px',
                            fontSize: 12, color: 'var(--yellow)',
                            display: 'flex', alignItems: 'center', gap: 6
                          }}>
                            ⚠️ Divergência: app apontou {apontado} pç mas sistema registrou {sfcc} pç
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })
      )}
    </>
  )
}