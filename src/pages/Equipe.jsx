import { useState, useEffect } from 'react'
import { Users, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

const SETORES = [
  'Usinagem', 'Rosqueadeira', 'Robô de Solda', 'Calandra',
  'Dobradeira', 'Laser', 'Pintura', 'Expedição', 'PCP', 'Qualidade', 'Geral', 'Outro'
]

export default function Equipe({ usuario }) {
  const [pessoas, setPessoas] = useState([])
  const [loading, setLoading] = useState(true)
  const [adicionando, setAdicionando] = useState(false)
  const [toast, setToast] = useState(null)
  const [nova, setNova] = useState({
    nome: '', email: '', setor: '', notificacao: false,
    estab: usuario?.estab === 'todas' ? '200' : (usuario?.estab || '200')
  })

  useEffect(() => {
    carregarPessoas()
  }, [])

  function showToast(msg, cor = 'var(--green)') {
    setToast({ msg, cor })
    setTimeout(() => setToast(null), 2500)
  }

  async function carregarPessoas() {
    setLoading(true)

    let niveisPermitidos = []
    if (usuario?.nivel === 'lider') niveisPermitidos = ['operador']
    if (usuario?.nivel === 'supervisor') niveisPermitidos = ['operador', 'lider']
    if (usuario?.nivel === 'super') niveisPermitidos = ['operador', 'lider', 'supervisor']

    const { data: users } = await supabase
      .from('usuarios')
      .select('email')
      .in('nivel', niveisPermitidos)

    const emails = users?.map(u => u.email) || []

    if (emails.length === 0) {
      setPessoas([])
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('responsaveis')
      .select('*')
      .in('email', emails)
      .order('nome')

    setPessoas(data || [])
    setLoading(false)
  }

  async function adicionarPessoa() {
    if (!nova.nome || !nova.email || !nova.setor) {
      showToast('Preencha todos os campos!', 'var(--red)')
      return
    }
    setAdicionando(true)

    const estabFinal = usuario?.estab === 'todas' ? nova.estab : (usuario?.estab || '200')

    await supabase.from('usuarios').upsert({
      nome: nova.nome,
      email: nova.email,
      nivel: 'operador',
      estab: estabFinal,
      setor: nova.setor,
      ativo: true
    }, { onConflict: 'email' })

    const { data, error } = await supabase.from('responsaveis').upsert({
      nome: nova.nome,
      email: nova.email,
      setor: nova.setor,
      auto_copia: nova.notificacao
    }, { onConflict: 'email' }).select().single()

    if (error) {
      showToast('Erro ao cadastrar!', 'var(--red)')
    } else {
      setPessoas(prev => {
        const existe = prev.find(p => p.email === nova.email)
        if (existe) return prev.map(p => p.email === nova.email ? data : p)
        return [...prev, data]
      })
      setNova({
        nome: '', email: '', setor: '', notificacao: false,
        estab: usuario?.estab === 'todas' ? '200' : (usuario?.estab || '200')
      })
      showToast('✅ Pessoa cadastrada!')
    }
    setAdicionando(false)
  }

  async function remover(id) {
    if (!confirm('Remover esta pessoa?')) return
    await supabase.from('responsaveis').delete().eq('id', id)
    setPessoas(prev => prev.filter(p => p.id !== id))
    showToast('✅ Removido!')
  }

  async function toggleNotificacao(p) {
    const novo = !p.auto_copia
    await supabase.from('responsaveis').update({ auto_copia: novo }).eq('id', p.id)
    setPessoas(prev => prev.map(x => x.id === p.id ? { ...x, auto_copia: novo } : x))
    showToast(novo ? '📧 Cópia de todos ativada!' : '🔕 Só quando escolhido!')
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-icon"><Users size={22} color="#000" /></div>
        <div>
          <h1>EQUIPE</h1>
          <p>Gerenciar pessoas e notificações</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">➕ Cadastrar pessoa</div>

        <div className="field">
          <label>Nome</label>
          <input className="input" value={nova.nome}
            onChange={e => setNova(p => ({ ...p, nome: e.target.value }))}
            placeholder="Ex: João Silva" />
        </div>

        <div className="field">
          <label>Email</label>
          <input className="input" type="email" value={nova.email}
            onChange={e => setNova(p => ({ ...p, email: e.target.value }))}
            placeholder="Ex: joao@empresa.com" />
        </div>

        <div className="field">
          <label>Setor</label>
          <select className="input" value={nova.setor}
            onChange={e => setNova(p => ({ ...p, setor: e.target.value }))}>
            <option value="">Selecione o setor</option>
            {SETORES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Mostra seleção de estab só pra quem tem acesso a todas as plantas */}
        {usuario?.estab === 'todas' ? (
          <div className="field">
            <label>Estabelecimento</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { key: '100', label: '📍 Limeira' },
                { key: '200', label: '📍 Palmeira' },
                { key: 'todas', label: '🏭 Todas' },
              ].map(({ key, label }) => (
                <button key={key} onClick={() => setNova(p => ({ ...p, estab: key }))} style={{
                  flex: 1, padding: '9px 4px', border: '1px solid',
                  borderColor: nova.estab === key ? 'var(--accent)' : 'var(--border)',
                  background: nova.estab === key ? 'rgba(0,229,255,.1)' : 'var(--surface2)',
                  color: nova.estab === key ? 'var(--accent)' : 'var(--muted)',
                  borderRadius: 8, fontWeight: 700, fontSize: 11, cursor: 'pointer'
                }}>{label}</button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{
            background: usuario?.estab === '100' ? 'rgba(0,229,255,.08)' : 'rgba(0,255,136,.08)',
            border: `1px solid ${usuario?.estab === '100' ? 'rgba(0,229,255,.2)' : 'rgba(0,255,136,.2)'}`,
            borderRadius: 8, padding: '8px 12px', fontSize: 12,
            color: usuario?.estab === '100' ? 'var(--accent)' : 'var(--green)',
            marginBottom: 12
          }}>
            📍 Esta pessoa será cadastrada para: {usuario?.estab === '100' ? 'Limeira' : 'Palmeira'}
          </div>
        )}

        <div className="field">
          <label>Notificações por email</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { key: false, label: '🔕 Só quando escolhido' },
              { key: true, label: '📧 Cópia de todos' },
            ].map(({ key, label }) => (
              <button key={String(key)} onClick={() => setNova(p => ({ ...p, notificacao: key }))} style={{
                flex: 1, padding: '9px 4px', border: '1px solid',
                borderColor: nova.notificacao === key ? 'var(--green)' : 'var(--border)',
                background: nova.notificacao === key ? 'rgba(0,255,136,.1)' : 'var(--surface2)',
                color: nova.notificacao === key ? 'var(--green)' : 'var(--muted)',
                borderRadius: 8, fontWeight: 700, fontSize: 11, cursor: 'pointer'
              }}>{label}</button>
            ))}
          </div>
        </div>

        <button className="btn-primary" onClick={adicionarPessoa} disabled={adicionando}>
          {adicionando ? 'Cadastrando...' : '➕ Cadastrar'}
        </button>
      </div>

      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
        Pessoas cadastradas ({pessoas.length})
      </div>

      {loading ? (
        <div className="empty"><div className="emoji">⏳</div><p>Carregando...</p></div>
      ) : pessoas.length === 0 ? (
        <div className="empty">
          <div className="emoji">👥</div>
          <h3>Nenhuma pessoa cadastrada</h3>
          <p>Adicione as pessoas da sua equipe acima</p>
        </div>
      ) : (
        pessoas.map(p => (
          <div key={p.id} className="card" style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{p.nome}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{p.email}</div>
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{
                    background: 'rgba(0,229,255,.15)', color: 'var(--accent)',
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4
                  }}>{p.setor}</span>
                  <div onClick={() => toggleNotificacao(p)} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    cursor: 'pointer', padding: '3px 10px', borderRadius: 4,
                    background: p.auto_copia ? 'rgba(0,255,136,.15)' : 'rgba(107,114,128,.15)',
                    border: `1px solid ${p.auto_copia ? 'rgba(0,255,136,.3)' : 'var(--border)'}`,
                  }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: p.auto_copia ? 'var(--green)' : 'var(--muted)'
                    }} />
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: p.auto_copia ? 'var(--green)' : 'var(--muted)'
                    }}>
                      {p.auto_copia ? '📧 Cópia de todos' : '🔕 Só quando escolhido'}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => remover(p.id)} style={{
                background: 'rgba(255,61,90,.1)', border: '1px solid rgba(255,61,90,.3)',
                borderRadius: 8, padding: '8px 10px', cursor: 'pointer', color: 'var(--red)'
              }}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))
      )}

      {toast && <div className="toast" style={{ background: toast.cor }}>{toast.msg}</div>}
    </div>
  )
}