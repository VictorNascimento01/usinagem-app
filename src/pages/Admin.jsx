import { useState, useEffect } from 'react'
import { Settings, Trash2, CheckCircle, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'

const SENHA_ADMIN = 'usi2024'

const SETORES = [
  'Usinagem', 'Rosqueadeira', 'Robô de Solda', 'Calandra',
  'Dobradeira', 'Laser', 'Pintura', 'Expedição', 'PCP', 'Qualidade', 'Outro'
]

const NIVEIS = ['operador', 'lider', 'supervisor', 'super']

export default function Admin({ usuario, onLogout }) {
  const [autenticado, setAutenticado] = useState(false)
  const [senha, setSenha] = useState('')
  const [toast, setToast] = useState(null)
  const [stats, setStats] = useState(null)
  const [reportes, setReportes] = useState([])
  const [responsaveis, setResponsaveis] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [lancamentos, setLancamentos] = useState([])
  const [abaAtiva, setAbaAtiva] = useState('status')
  const [novoResp, setNovoResp] = useState({ nome: '', email: '', setor: '' })
  const [adicionando, setAdicionando] = useState(false)

  useEffect(() => {
    if (usuario?.nivel === 'super') {
      setAutenticado(true)
      carregarDados()
    }
  }, [usuario])

  function showToast(msg, cor = 'var(--green)') {
    setToast({ msg, cor })
    setTimeout(() => setToast(null), 3000)
  }

  async function logar() {
    if (senha === SENHA_ADMIN) {
      setAutenticado(true)
      await carregarDados()
    } else {
      showToast('Senha incorreta!', 'var(--red)')
    }
  }

  async function carregarDados() {
    const { count: totalOrdens } = await supabase
      .from('ordens').select('*', { count: 'exact', head: true })
    const { count: totalLancamentos } = await supabase
      .from('lancamentos').select('*', { count: 'exact', head: true })
    const { count: totalReportes } = await supabase
      .from('apontamentos').select('*', { count: 'exact', head: true })
    setStats({ totalOrdens, totalLancamentos, totalReportes })

    const { data: reps } = await supabase
      .from('apontamentos')
      .select('*')
      .order('criado_em', { ascending: false })
    setReportes(reps || [])

    const { data: resps } = await supabase
      .from('responsaveis')
      .select('*')
      .order('nome')
    setResponsaveis(resps || [])

    const { data: users } = await supabase
      .from('usuarios')
      .select('*')
      .order('criado_em', { ascending: false })
    setUsuarios(users || [])

    const { data: lancs } = await supabase
      .from('lancamentos')
      .select('*')
      .order('criado_em', { ascending: false })
      .limit(50)
    setLancamentos(lancs || [])
  }

  async function resolverReporte(id) {
    await supabase.from('apontamentos').delete().eq('id', id)
    setReportes(prev => prev.filter(r => r.id !== id))
    setStats(prev => ({ ...prev, totalReportes: prev.totalReportes - 1 }))
    showToast('✅ Reporte resolvido!')
  }

  async function limparTodos() {
    if (!confirm('Limpar todos os reportes?')) return
    await supabase.from('apontamentos').delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    setReportes([])
    setStats(prev => ({ ...prev, totalReportes: 0 }))
    showToast('✅ Todos os reportes limpos!')
  }

  async function adicionarResponsavel() {
    if (!novoResp.nome || !novoResp.email || !novoResp.setor) {
      showToast('Preencha todos os campos!', 'var(--red)')
      return
    }
    setAdicionando(true)
    const { data, error } = await supabase
      .from('responsaveis')
      .insert({ ...novoResp, auto_copia: false })
      .select()
      .single()

    if (error) {
      showToast('Erro ao adicionar!', 'var(--red)')
    } else {
      setResponsaveis(prev => [...prev, data])
      setNovoResp({ nome: '', email: '', setor: '' })
      showToast('✅ Responsável adicionado!')
    }
    setAdicionando(false)
  }

  async function removerResponsavel(id) {
    await supabase.from('responsaveis').delete().eq('id', id)
    setResponsaveis(prev => prev.filter(r => r.id !== id))
    showToast('✅ Removido!')
  }

  async function toggleAutoCopia(r) {
    const novo = !r.auto_copia
    await supabase.from('responsaveis').update({ auto_copia: novo }).eq('id', r.id)
    setResponsaveis(prev => prev.map(x => x.id === r.id ? { ...x, auto_copia: novo } : x))
    showToast(novo ? '✅ Cópia automática ativada!' : '🔕 Cópia automática desativada!')
  }

  async function atualizarUsuario(id, campo, valor) {
    await supabase.from('usuarios').update({ [campo]: valor }).eq('id', id)
    setUsuarios(prev => prev.map(u => u.id === id ? { ...u, [campo]: valor } : u))
    showToast('✅ Atualizado!')
  }

  async function removerUsuario(id) {
    if (!confirm('Remover este usuário?')) return
    await supabase.from('usuarios').delete().eq('id', id)
    setUsuarios(prev => prev.filter(u => u.id !== id))
    showToast('✅ Usuário removido!')
  }

  async function removerLancamento(id) {
    if (!confirm('Remover este lançamento?')) return
    await supabase.from('lancamentos').delete().eq('id', id)
    setLancamentos(prev => prev.filter(l => l.id !== id))
    setStats(prev => ({ ...prev, totalLancamentos: prev.totalLancamentos - 1 }))
    showToast('✅ Lançamento removido!')
  }

  if (!autenticado) {
    return (
      <div>
        <div className="page-header">
          <div className="page-icon"><Settings size={22} color="#000" /></div>
          <div><h1>ADMIN</h1><p>Área restrita</p></div>
        </div>
        <div className="card">
          <div className="card-title">Acesso admin</div>
          <div className="field">
            <label>Senha</label>
            <input className="input" type="password" value={senha}
              onChange={e => setSenha(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && logar()}
              placeholder="Digite a senha..." />
          </div>
          <button className="btn-primary" onClick={logar}>Entrar</button>
        </div>
        {toast && <div className="toast" style={{ background: toast.cor }}>{toast.msg}</div>}
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-icon"><Settings size={22} color="#000" /></div>
        <div style={{ flex: 1 }}>
          <h1>ADMIN</h1>
          <p>{usuario?.nivel === 'super' ? '👑 Super Admin' : 'Painel de controle'}</p>
        </div>
        {usuario?.nivel !== 'super' && (
          <button onClick={() => setAutenticado(false)} style={{
            background: 'none', border: '1px solid var(--border)',
            borderRadius: 8, padding: '6px 12px', color: 'var(--muted)',
            cursor: 'pointer', fontSize: 12
          }}>Sair</button>
        )}
      </div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[
            ['📦 Ordens', stats.totalOrdens, 'var(--accent)'],
            ['📋 Lançamentos', stats.totalLancamentos, 'var(--green)'],
            ['⚠️ Reportes', stats.totalReportes, stats.totalReportes > 0 ? 'var(--yellow)' : 'var(--green)'],
          ].map(([l, v, c]) => (
            <div key={l} className="card" style={{ padding: 12, textAlign: 'center', marginBottom: 0, cursor: 'pointer' }}
              onClick={() => {
                if (l.includes('Reporte')) setAbaAtiva('reportes')
                if (l.includes('Lançamento')) setAbaAtiva('lancamentos')
              }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>{l}</div>
              <div style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700, color: c }}>{v}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { key: 'status', label: '🟢 Status' },
          { key: 'reportes', label: `⚠️ Reportes${stats?.totalReportes > 0 ? ` (${stats.totalReportes})` : ''}` },
          { key: 'lancamentos', label: '📋 Lançamentos' },
          { key: 'responsaveis', label: '👤 Responsáveis' },
          { key: 'usuarios', label: `👥 Usuários (${usuarios.length})` },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setAbaAtiva(key)} style={{
            flex: 1, padding: '10px 4px', border: '1px solid',
            borderColor: abaAtiva === key ? 'var(--accent)' : 'var(--border)',
            background: abaAtiva === key ? 'rgba(0,229,255,.1)' : 'var(--surface)',
            color: abaAtiva === key ? 'var(--accent)' : 'var(--muted)',
            borderRadius: 10, fontWeight: 700, fontSize: 10, cursor: 'pointer'
          }}>{label}</button>
        ))}
      </div>

      {/* Status */}
      {abaAtiva === 'status' && (
        <div className="card">
          <div className="card-title">ℹ️ Status do sistema</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8 }}>
            <div>🟢 <strong style={{ color: 'var(--text)' }}>Banco de dados</strong> — Supabase online</div>
            <div>🔄 <strong style={{ color: 'var(--text)' }}>Ordens</strong> — atualizadas automaticamente</div>
            <div>📋 <strong style={{ color: 'var(--text)' }}>Lançamentos</strong> — salvos em tempo real</div>
            <div>⚠️ <strong style={{ color: 'var(--text)' }}>Reportes</strong> — enviados ao responsável</div>
          </div>
        </div>
      )}

      {/* Reportes */}
      {abaAtiva === 'reportes' && (
        <div>
          {reportes.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
              <button onClick={limparTodos} style={{
                background: 'rgba(255,61,90,.1)', border: '1px solid rgba(255,61,90,.3)',
                borderRadius: 8, padding: '7px 14px', color: 'var(--red)',
                cursor: 'pointer', fontSize: 12, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 6
              }}>
                <Trash2 size={13} /> Limpar todos
              </button>
            </div>
          )}
          {reportes.length === 0 ? (
            <div className="empty">
              <div className="emoji">✅</div>
              <h3>Nenhum reporte pendente</h3>
            </div>
          ) : (
            reportes.map(r => (
              <div key={r.id} className="card" style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                      OP {r.ordem} · {r.item}
                    </div>
                    {r.responsavel && (
                      <div style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 4 }}>
                        👤 {r.responsavel}
                      </div>
                    )}
                    <div style={{
                      background: 'rgba(255,214,10,.08)', border: '1px solid rgba(255,214,10,.2)',
                      borderRadius: 6, padding: '6px 10px', fontSize: 13,
                      color: 'var(--text)', marginBottom: 6
                    }}>{r.motivo}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {new Date(r.criado_em).toLocaleString('pt-BR')}
                    </div>
                  </div>
                  <button onClick={() => resolverReporte(r.id)} style={{
                    background: 'rgba(0,255,136,.1)', border: '1px solid rgba(0,255,136,.3)',
                    borderRadius: 8, padding: '8px 10px', cursor: 'pointer',
                    color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap'
                  }}>
                    <CheckCircle size={13} /> Resolver
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Lançamentos */}
      {abaAtiva === 'lancamentos' && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
            Últimos 50 lançamentos
          </p>
          {lancamentos.length === 0 ? (
            <div className="empty">
              <div className="emoji">📋</div>
              <h3>Nenhum lançamento</h3>
            </div>
          ) : (
            lancamentos.map(l => (
              <div key={l.id} className="card" style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700 }}>{l.codigo}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                      {l.quantidade} pç · Turno {l.turno} · {l.setor}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                      👤 {l.usuario_nome || '—'} · {new Date(l.criado_em).toLocaleString('pt-BR')}
                    </div>
                    {l.observacao && (
                      <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 1 }}>
                        💬 {l.observacao}
                      </div>
                    )}
                  </div>
                  <button onClick={() => removerLancamento(l.id)} style={{
                    background: 'rgba(255,61,90,.1)', border: '1px solid rgba(255,61,90,.3)',
                    borderRadius: 8, padding: '8px 10px', cursor: 'pointer', color: 'var(--red)'
                  }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Responsáveis */}
      {abaAtiva === 'responsaveis' && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title">➕ Adicionar responsável</div>
            <div className="field">
              <label>Nome</label>
              <input className="input" value={novoResp.nome}
                onChange={e => setNovoResp(p => ({ ...p, nome: e.target.value }))}
                placeholder="Ex: João Silva" />
            </div>
            <div className="field">
              <label>Email</label>
              <input className="input" type="email" value={novoResp.email}
                onChange={e => setNovoResp(p => ({ ...p, email: e.target.value }))}
                placeholder="Ex: joao@empresa.com" />
            </div>
            <div className="field">
              <label>Setor</label>
              <select className="input" value={novoResp.setor}
                onChange={e => setNovoResp(p => ({ ...p, setor: e.target.value }))}>
                <option value="">Selecione o setor</option>
                {SETORES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <button className="btn-primary" onClick={adicionarResponsavel} disabled={adicionando}>
              {adicionando ? 'Adicionando...' : '➕ Adicionar'}
            </button>
          </div>

          {responsaveis.length === 0 ? (
            <div className="empty">
              <div className="emoji">👤</div>
              <h3>Nenhum responsável cadastrado</h3>
            </div>
          ) : (
            responsaveis.map(r => (
              <div key={r.id} className="card" style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{r.nome}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{r.email}</div>
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{
                        background: 'rgba(0,229,255,.15)', color: 'var(--accent)',
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4
                      }}>{r.setor}</span>
                      <div onClick={() => toggleAutoCopia(r)} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        cursor: 'pointer', padding: '3px 10px', borderRadius: 4,
                        background: r.auto_copia ? 'rgba(0,255,136,.15)' : 'rgba(107,114,128,.15)',
                        border: `1px solid ${r.auto_copia ? 'rgba(0,255,136,.3)' : 'var(--border)'}`,
                      }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: r.auto_copia ? 'var(--green)' : 'var(--muted)'
                        }} />
                        <span style={{
                          fontSize: 11, fontWeight: 700,
                          color: r.auto_copia ? 'var(--green)' : 'var(--muted)'
                        }}>
                          {r.auto_copia ? '📧 Cópia auto ON' : '🔕 Cópia auto OFF'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => removerResponsavel(r.id)} style={{
                    background: 'rgba(255,61,90,.1)', border: '1px solid rgba(255,61,90,.3)',
                    borderRadius: 8, padding: '8px 10px', cursor: 'pointer', color: 'var(--red)'
                  }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Usuários */}
      {abaAtiva === 'usuarios' && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
            Gerencie o acesso de cada usuário.
          </p>
          {usuarios.length === 0 ? (
            <div className="empty">
              <div className="emoji">👥</div>
              <h3>Nenhum usuário cadastrado</h3>
            </div>
          ) : (
            usuarios.map(u => (
              <div key={u.id} className="card" style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{u.nome}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{u.email}</div>
                  </div>
                  {u.email !== usuario?.email && (
                    <button onClick={() => removerUsuario(u.id)} style={{
                      background: 'rgba(255,61,90,.1)', border: '1px solid rgba(255,61,90,.3)',
                      borderRadius: 8, padding: '8px 10px', cursor: 'pointer', color: 'var(--red)'
                    }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Nível</div>
                    <select className="input" value={u.nivel || 'operador'}
                      onChange={e => atualizarUsuario(u.id, 'nivel', e.target.value)}
                      disabled={u.email === usuario?.email}
                      style={{ padding: '8px 6px', fontSize: 11 }}>
                      {NIVEIS.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Setor</div>
                    <select className="input" value={u.setor || ''}
                      onChange={e => atualizarUsuario(u.id, 'setor', e.target.value)}
                      style={{ padding: '8px 6px', fontSize: 11 }}>
                      <option value="">Geral</option>
                      {SETORES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Planta</div>
                    <select className="input" value={u.estab || '200'}
                      onChange={e => atualizarUsuario(u.id, 'estab', e.target.value)}
                      disabled={u.email === usuario?.email}
                      style={{ padding: '8px 6px', fontSize: 11 }}>
                      <option value="100">Limeira</option>
                      <option value="200">Palmeira</option>
                      <option value="todas">Todas</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{
                    background: u.nivel === 'super' ? 'rgba(255,214,10,.2)' :
                      u.nivel === 'supervisor' ? 'rgba(255,107,53,.2)' :
                      u.nivel === 'lider' ? 'rgba(0,229,255,.2)' : 'rgba(107,114,128,.2)',
                    color: u.nivel === 'super' ? 'var(--yellow)' :
                      u.nivel === 'supervisor' ? '#ff6b35' :
                      u.nivel === 'lider' ? 'var(--accent)' : 'var(--muted)',
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4
                  }}>
                    {u.nivel === 'super' ? '👑 Super' :
                     u.nivel === 'supervisor' ? '🎖️ Supervisor' :
                     u.nivel === 'lider' ? '⭐ Líder' : '👤 Operador'}
                  </span>
                  <span style={{
                    background: u.estab === 'todas' ? 'rgba(255,214,10,.2)' :
                      u.estab === '100' ? 'rgba(0,229,255,.2)' : 'rgba(0,255,136,.2)',
                    color: u.estab === 'todas' ? 'var(--yellow)' :
                      u.estab === '100' ? 'var(--accent)' : 'var(--green)',
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4
                  }}>
                    {u.estab === 'todas' ? '🏭 Todas' :
                     u.estab === '100' ? '📍 Limeira' : '📍 Palmeira'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {toast && <div className="toast" style={{ background: toast.cor }}>{toast.msg}</div>}
    </div>
  )
}