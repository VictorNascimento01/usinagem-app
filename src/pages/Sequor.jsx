import { useState, useEffect } from 'react'
import { Activity } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Sequor() {
  const [setores, setSetores] = useState([])
  const [setorAtivo, setSetorAtivo] = useState(null)
  const [maquinas, setMaquinas] = useState([])
  const [maquinaAtiva, setMaquinaAtiva] = useState(null)
  const [itens, setItens] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarSetores()
  }, [])

  async function carregarSetores() {
    setLoading(true)
    const { data } = await supabase
      .from('sequor')
      .select('setor')
      .order('setor')

    const unicos = [...new Set((data || []).map(r => r.setor).filter(Boolean))]
    setSetores(unicos)
    setLoading(false)
  }

  async function selecionarSetor(setor) {
    setSetorAtivo(setor)
    setMaquinaAtiva(null)
    setItens([])

    const { data } = await supabase
      .from('sequor')
      .select('estacao, produto, qtd_ok, qtd_nok, data_inicial, data_final, turno, etapa')
      .eq('setor', setor)
      .order('data_inicial', { ascending: false })

    // Agrupa por máquina
    const porMaquina = {}
    data?.forEach(r => {
      if (!porMaquina[r.estacao]) porMaquina[r.estacao] = []
      porMaquina[r.estacao].push(r)
    })

    const listaMaquinas = Object.entries(porMaquina).map(([estacao, registros]) => {
      const ultimo = registros[0]
      const totalOK = registros.reduce((s, r) => s + (r.qtd_ok || 0), 0)
      const ativa = !ultimo.data_final || ultimo.data_final === ''
      return { estacao, registros, ultimo, totalOK, ativa }
    }).sort((a, b) => a.estacao.localeCompare(b.estacao))

    setMaquinas(listaMaquinas)
  }

  async function selecionarMaquina(maquina) {
    setMaquinaAtiva(maquina)
    const { data } = await supabase
      .from('sequor')
      .select('*')
      .eq('estacao', maquina.estacao)
      .eq('setor', setorAtivo)
      .order('data_inicial', { ascending: false })
    setItens(data || [])
  }

  function formatarData(dataStr) {
    if (!dataStr) return '—'
    try {
      return new Date(dataStr).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit',
        hour: '2-digit', minute: '2-digit'
      })
    } catch { return dataStr }
  }

  function statusMaquina(maquina) {
    if (maquina.ativa) return { texto: 'Em operação', cor: 'var(--green)' }
    return { texto: 'Parada', cor: 'var(--muted)' }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-icon">
          <Activity size={22} color="#000" />
        </div>
        <div>
          <h1>SEQUOR</h1>
          <p>Produção em tempo real — Limeira</p>
        </div>
      </div>

      {loading ? (
        <div className="empty"><div className="emoji">⏳</div><p>Carregando...</p></div>
      ) : (
        <>
          {/* Seletor de setor */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              Selecione o setor
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {setores.map(s => (
                <button key={s} onClick={() => selecionarSetor(s)} style={{
                  padding: '8px 14px', border: '1px solid',
                  borderColor: setorAtivo === s ? 'var(--accent)' : 'var(--border)',
                  background: setorAtivo === s ? 'rgba(0,229,255,.1)' : 'var(--surface)',
                  color: setorAtivo === s ? 'var(--accent)' : 'var(--muted)',
                  borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer'
                }}>{s}</button>
              ))}
            </div>
          </div>

          {/* Máquinas do setor */}
          {setorAtivo && maquinas.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Máquinas — {setorAtivo}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
                {maquinas.map(m => {
                  const st = statusMaquina(m)
                  return (
                    <div key={m.estacao}
                      onClick={() => selecionarMaquina(m)}
                      style={{
                        padding: '12px 10px', borderRadius: 10, cursor: 'pointer',
                        border: `1px solid ${maquinaAtiva?.estacao === m.estacao ? 'var(--accent)' : st.cor + '44'}`,
                        background: maquinaAtiva?.estacao === m.estacao ? 'rgba(0,229,255,.1)' : 'var(--surface)',
                        textAlign: 'center'
                      }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: st.cor, margin: '0 auto 6px' }} />
                      <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{m.estacao}</div>
                      <div style={{ fontSize: 10, color: st.cor, marginTop: 3 }}>{st.texto}</div>
                      <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 4, fontWeight: 700 }}>{m.totalOK} pç</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Detalhe da máquina */}
          {maquinaAtiva && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                {maquinaAtiva.estacao} — histórico do dia
              </div>

              {/* Item atual */}
              {itens[0] && (
                <div style={{
                  background: 'rgba(0,255,136,.08)', border: '1px solid rgba(0,255,136,.3)',
                  borderRadius: 12, padding: '14px 16px', marginBottom: 12
                }}>
                  <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700, marginBottom: 6 }}>
                    🔄 FAZENDO AGORA
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700 }}>{itens[0].produto}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                    Turno {itens[0].turno} · Início: {formatarData(itens[0].data_inicial)}
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>OK</div>
                      <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: 'var(--green)' }}>{itens[0].qtd_ok}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>NOK</div>
                      <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: itens[0].qtd_nok > 0 ? 'var(--red)' : 'var(--muted)' }}>{itens[0].qtd_nok}</div>
                    </div>
                    {itens[0].tempo_teorico > 0 && (
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--muted)' }}>T. Unit</div>
                        <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: 'var(--yellow)' }}>{itens[0].tempo_teorico}min</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Histórico */}
              {itens.slice(1).map((item, i) => (
                <div key={i} className="card" style={{ marginBottom: 8, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>{item.produto}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                        {formatarData(item.data_inicial)} → {formatarData(item.data_final)}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>Turno {item.turno}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>{item.qtd_ok} pç</div>
                      {item.qtd_nok > 0 && (
                        <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--red)' }}>{item.qtd_nok} ref.</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}