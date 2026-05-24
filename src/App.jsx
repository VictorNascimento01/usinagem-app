import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useNavigate, Navigate } from 'react-router-dom'
import { ClipboardList, Search, Package, Lock, LogOut, Activity, Zap, Users, Bell, X, Send } from 'lucide-react'
import { supabase } from './lib/supabase'
import Formulario from './pages/Formulario'
import Consulta from './pages/Consulta'
import Ordens from './pages/Ordens'
import Admin from './pages/Admin'
import Login from './pages/Login'
import Sequor from './pages/Sequor'
import Laser from './pages/Laser'
import Equipe from './pages/Equipe'
import './App.css'

const SENHA_APP = 'ccs2024'
const SUPABASE_URL = 'https://bsxfsiakvukhrivzylsp.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzeGZzaWFrdnVraHJpdnp5bHNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzODkxODMsImV4cCI6MjA5NDk2NTE4M30.GycXQkAofWIp-bVcIZyBnKNSJmfjhitnyt4jYenpAkg'
const VICTOR_WHATSAPP = '5519987556217'
const TELAS = ['Formulário', 'Consultar', 'Ordens', 'Sequor', 'Laser', 'Equipe', 'Admin', 'Outro']

function Manutencao({ onSenha }) {
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState(false)

  function tentar() {
    if (senha === SENHA_APP) {
      sessionStorage.setItem('appkey', SENHA_APP)
      onSenha()
    } else {
      setErro(true)
      setTimeout(() => setErro(false), 2000)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 24
    }}>
      <div style={{
        width: 56, height: 56,
        background: 'linear-gradient(135deg, var(--accent), #0077ff)',
        borderRadius: 16, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 26, marginBottom: 20
      }}>⚙️</div>
      <h1 style={{ fontFamily: 'monospace', fontSize: 22, color: 'var(--accent)', marginBottom: 6 }}>
        USINAGEM APP
      </h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 32, textAlign: 'center' }}>
        Sistema em configuração — acesso restrito
      </p>
      <div style={{ width: '100%', maxWidth: 340 }}>
        <div className="card">
          <div className="field">
            <label>Senha de acesso</label>
            <input className="input" type="password" value={senha}
              onChange={e => setSenha(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && tentar()}
              placeholder="Digite a senha..."
              style={{ borderColor: erro ? 'var(--red)' : undefined }}
            />
            {erro && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>❌ Senha incorreta!</div>}
          </div>
          <button className="btn-primary" onClick={tentar}>Entrar</button>
        </div>
      </div>
    </div>
  )
}

function Layout({ usuario, onLogout }) {
  const navigate = useNavigate()
  const isLiderOuMais = ['lider', 'supervisor', 'super'].includes(usuario?.nivel)

  const [feedbackModal, setFeedbackModal] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState('')
  const [feedbackTela, setFeedbackTela] = useState('')
  const [enviandoFeedback, setEnviandoFeedback] = useState(false)
  const [feedbackOk, setFeedbackOk] = useState(false)

  const [chatModal, setChatModal] = useState(false)
  const [reportes, setReportes] = useState([])
  const [chatAberto, setChatAberto] = useState(null)
  const [mensagens, setMensagens] = useState([])
  const [novaMensagem, setNovaMensagem] = useState('')
  const [enviandoMsg, setEnviandoMsg] = useState(false)
  const [naoLidas, setNaoLidas] = useState(0)

  useEffect(() => {
    carregarReportes()
    const interval = setInterval(carregarReportes, 30000)
    return () => clearInterval(interval)
  }, [])

  async function carregarReportes() {
    const { data } = await supabase
      .from('apontamentos')
      .select('*')
      .eq('resolvido', false)
      .order('criado_em', { ascending: false })

    if (data) {
      const reportesComMsg = await Promise.all(data.map(async r => {
        const { data: msgs } = await supabase
          .from('chat_reportes')
          .select('*')
          .eq('apontamento_id', r.id)
          .order('criado_em', { ascending: false })
          .limit(1)
        return { ...r, ultimaMsg: msgs?.[0] || null }
      }))
      setReportes(reportesComMsg)

      let count = 0
      for (const r of reportesComMsg) {
        const { count: c } = await supabase
          .from('chat_reportes')
          .select('*', { count: 'exact', head: true })
          .eq('apontamento_id', r.id)
          .not('lido_por', 'cs', `{${usuario.email}}`)
        count += c || 0
      }
      setNaoLidas(count)
    }
  }

  async function abrirChat(reporte) {
    setChatAberto(reporte)
    const { data } = await supabase
      .from('chat_reportes')
      .select('*')
      .eq('apontamento_id', reporte.id)
      .order('criado_em', { ascending: true })
    setMensagens(data || [])

    for (const msg of data || []) {
      if (!msg.lido_por?.includes(usuario.email)) {
        await supabase
          .from('chat_reportes')
          .update({ lido_por: [...(msg.lido_por || []), usuario.email] })
          .eq('id', msg.id)
      }
    }
    carregarReportes()
  }

  async function enviarMensagem() {
    if (!novaMensagem.trim()) return
    setEnviandoMsg(true)

    const { data } = await supabase.from('chat_reportes').insert({
      apontamento_id: chatAberto.id,
      ordem: chatAberto.ordem,
      item: chatAberto.item,
      usuario_nome: usuario.nome,
      usuario_email: usuario.email,
      mensagem: novaMensagem,
      lido_por: [usuario.email]
    }).select().single()

    if (data) {
      setMensagens(prev => [...prev, data])
      setNovaMensagem('')

      const msg = `💬 *Chat CCS Tec*\n\n*OP:* ${chatAberto.ordem}\n*Item:* ${chatAberto.item}\n*${usuario.nome}:* ${novaMensagem}`
      await fetch(`${SUPABASE_URL}/functions/v1/enviar-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ numero: VICTOR_WHATSAPP, mensagem: msg })
      })

      carregarReportes()
    }
    setEnviandoMsg(false)
  }

  async function enviarFeedback() {
    if (!feedbackMsg) return
    setEnviandoFeedback(true)
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/enviar-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({
          numero: VICTOR_WHATSAPP,
          mensagem: `🐛 *Feedback do App - CCS Tec*\n\n*Usuário:* ${usuario?.nome}\n*Tela:* ${feedbackTela || 'Não informado'}\n*Mensagem:* ${feedbackMsg}\n*Horário:* ${new Date().toLocaleString('pt-BR')}`
        })
      })
      setFeedbackOk(true)
      setTimeout(() => {
        setFeedbackModal(false)
        setFeedbackMsg('')
        setFeedbackTela('')
        setFeedbackOk(false)
      }, 1500)
    } catch (e) { console.error(e) }
    setEnviandoFeedback(false)
  }

  function formatarHora(dataStr) {
    if (!dataStr) return ''
    return new Date(dataStr).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
  }

  return (
    <div className="app">
      <div style={{
        position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, background: 'var(--surface)',
        borderBottom: '1px solid var(--border)', padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 10, zIndex: 99
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {usuario.nivel === 'super' ? '👑 Super Admin' :
             usuario.nivel === 'supervisor' ? '🎖️ Supervisor' :
             usuario.nivel === 'lider' ? '⭐ Líder' : 'Olá,'}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{usuario.nome}</div>
        </div>

        <button onClick={() => { setChatModal(true); setChatAberto(null) }} style={{
          background: 'var(--surface2)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '7px 10px', cursor: 'pointer',
          color: naoLidas > 0 ? 'var(--yellow)' : 'var(--muted)',
          display: 'flex', alignItems: 'center', gap: 4,
          position: 'relative'
        }}>
          <Bell size={16} />
          {naoLidas > 0 && (
            <span style={{
              position: 'absolute', top: -6, right: -6,
              background: 'var(--red)', color: '#fff',
              borderRadius: '50%', width: 18, height: 18,
              fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>{naoLidas}</span>
          )}
        </button>

        {isLiderOuMais && (
          <button onClick={() => navigate('/admin')} style={{
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '7px 10px', cursor: 'pointer',
            color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12
          }}>
            <Lock size={13} /> Admin
          </button>
        )}
        <button onClick={onLogout} style={{
          background: 'none', border: '1px solid var(--border)',
          borderRadius: 8, padding: '7px 10px', cursor: 'pointer',
          color: 'var(--muted)', display: 'flex', alignItems: 'center'
        }}>
          <LogOut size={14} />
        </button>
      </div>

      <main className="content" style={{ paddingTop: 70 }}>
        <Routes>
          <Route path="/" element={<Formulario usuario={usuario} />} />
          <Route path="/consulta" element={<Consulta />} />
          <Route path="/ordens" element={<Ordens usuario={usuario} />} />
          <Route path="/sequor" element={<Sequor />} />
          <Route path="/laser" element={<Laser />} />
          <Route path="/equipe" element={<Equipe usuario={usuario} />} />
          <Route path="/admin" element={<Admin usuario={usuario} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      {/* Botão feedback */}
      <button onClick={() => setFeedbackModal(true)} style={{
        position: 'fixed', bottom: 80, right: 16,
        width: 44, height: 44, borderRadius: '50%',
        background: 'rgba(255,214,10,.9)', border: 'none',
        cursor: 'pointer', fontSize: 20, zIndex: 98,
        boxShadow: '0 4px 12px rgba(0,0,0,.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>🐛</button>

      {/* Modal Chat */}
      {chatModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>

            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
              {chatAberto ? (
                <>
                  <button onClick={() => setChatAberto(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 18 }}>←</button>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>OP {chatAberto.ordem}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{chatAberto.item}</div>
                  </div>
                </>
              ) : (
                <>
                  <Bell size={18} color="var(--yellow)" />
                  <div style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>Reportes ativos</div>
                </>
              )}
              <button onClick={() => setChatModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                <X size={20} />
              </button>
            </div>

            {!chatAberto && (
              <div style={{ overflowY: 'auto', flex: 1, padding: 16 }}>
                {reportes.length === 0 ? (
                  <div className="empty">
                    <div className="emoji">✅</div>
                    <h3>Nenhum reporte ativo</h3>
                  </div>
                ) : reportes.map(r => (
                  <div key={r.id} onClick={() => abrirChat(r)} className="card" style={{ marginBottom: 10, cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ fontSize: 20 }}>⚠️</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>OP {r.ordem} · {r.item}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{r.motivo}</div>
                        {r.ultimaMsg ? (
                          <div style={{
                            fontSize: 11, marginTop: 4, padding: '4px 8px',
                            background: 'var(--surface2)', borderRadius: 6,
                            display: 'flex', gap: 4
                          }}>
                            <span style={{ color: 'var(--accent)', fontWeight: 700 }}>
                              {r.ultimaMsg.usuario_nome.split(' ')[0]}:
                            </span>
                            <span style={{ color: 'var(--muted)' }}>
                              {r.ultimaMsg.mensagem.length > 30
                                ? r.ultimaMsg.mensagem.slice(0, 30) + '...'
                                : r.ultimaMsg.mensagem}
                            </span>
                          </div>
                        ) : (
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                            💬 Sem mensagens ainda
                          </div>
                        )}
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                          👤 {r.responsavel} · {formatarHora(r.ultimaMsg?.criado_em || r.criado_em)}
                        </div>
                      </div>
                      <div style={{ fontSize: 18, color: 'var(--muted)' }}>›</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {chatAberto && (
              <>
                <div style={{ overflowY: 'auto', flex: 1, padding: 16 }}>
                  <div style={{
                    background: 'rgba(255,107,53,.1)', border: '1px solid rgba(255,107,53,.3)',
                    borderRadius: 10, padding: '10px 12px', marginBottom: 12
                  }}>
                    <div style={{ fontSize: 11, color: '#ff6b35', fontWeight: 700, marginBottom: 4 }}>⚠️ Reporte original</div>
                    <div style={{ fontSize: 13 }}>{chatAberto.motivo}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                      {chatAberto.responsavel} · {formatarHora(chatAberto.criado_em)}
                    </div>
                  </div>

                  {mensagens.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: 20 }}>
                      Nenhuma mensagem ainda. Seja o primeiro a comentar!
                    </div>
                  ) : mensagens.map((m, i) => {
                    const meu = m.usuario_email === usuario.email
                    return (
                      <div key={i} style={{
                        display: 'flex', flexDirection: 'column',
                        alignItems: meu ? 'flex-end' : 'flex-start',
                        marginBottom: 10
                      }}>
                        <div style={{
                          maxWidth: '80%', padding: '8px 12px', borderRadius: 12,
                          background: meu ? 'var(--accent)' : 'var(--surface2)',
                          color: meu ? '#000' : 'var(--text)'
                        }}>
                          {!meu && <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 4, color: 'var(--accent)' }}>{m.usuario_nome}</div>}
                          <div style={{ fontSize: 13 }}>{m.mensagem}</div>
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                          {formatarHora(m.criado_em)}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                  <input className="input" value={novaMensagem}
                    onChange={e => setNovaMensagem(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && enviarMensagem()}
                    placeholder="Digite uma mensagem..."
                    style={{ flex: 1, marginBottom: 0 }} />
                  <button onClick={enviarMensagem} disabled={enviandoMsg} style={{
                    background: 'var(--accent)', border: 'none', borderRadius: 10,
                    padding: '0 14px', cursor: 'pointer', color: '#000',
                    display: 'flex', alignItems: 'center'
                  }}>
                    <Send size={16} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal feedback */}
      {feedbackModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: 24, width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ fontSize: 20 }}>🐛</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Reportar problema no app</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Vai direto pro Victor via WhatsApp</div>
              </div>
              <button onClick={() => setFeedbackModal(false)} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 20
              }}>×</button>
            </div>

            {feedbackOk ? (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
                <div style={{ fontWeight: 700, color: 'var(--green)' }}>Feedback enviado!</div>
              </div>
            ) : (
              <>
                <div className="field">
                  <label>Em qual tela aconteceu?</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {TELAS.map(t => (
                      <button key={t} onClick={() => setFeedbackTela(t)} style={{
                        padding: '6px 12px', border: '1px solid',
                        borderColor: feedbackTela === t ? 'var(--yellow)' : 'var(--border)',
                        background: feedbackTela === t ? 'rgba(255,214,10,.1)' : 'var(--surface2)',
                        color: feedbackTela === t ? 'var(--yellow)' : 'var(--muted)',
                        borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer'
                      }}>{t}</button>
                    ))}
                  </div>
                </div>

                <div className="field">
                  <label>O que aconteceu?</label>
                  <textarea className="input" value={feedbackMsg}
                    onChange={e => setFeedbackMsg(e.target.value)}
                    placeholder="Descreva o problema ou sugestão..."
                    style={{ minHeight: 80, resize: 'vertical', fontSize: 14 }} />
                </div>

                <button className="btn-primary" onClick={enviarFeedback} disabled={enviandoFeedback}
                  style={{ background: 'var(--yellow)', color: '#000' }}>
                  {enviandoFeedback ? 'Enviando...' : '🚀 Enviar feedback'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <nav className="bottom-nav">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <ClipboardList size={22} />
          <span>Formulário</span>
        </NavLink>
        <NavLink to="/consulta" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <Search size={22} />
          <span>Consultar</span>
        </NavLink>
        <NavLink to="/ordens" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <Package size={22} />
          <span>Ordens</span>
        </NavLink>
        <NavLink to="/sequor" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <Activity size={22} />
          <span>Sequor</span>
        </NavLink>
        <NavLink to="/laser" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <Zap size={22} />
          <span>Laser</span>
        </NavLink>
        {isLiderOuMais && (
          <NavLink to="/equipe" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <Users size={22} />
            <span>Equipe</span>
          </NavLink>
        )}
      </nav>
    </div>
  )
}

export default function App() {
  const [liberado, setLiberado] = useState(false)
  const [usuario, setUsuario] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const key = sessionStorage.getItem('appkey')
    if (key === SENHA_APP) setLiberado(true)

    const salvo = localStorage.getItem('usuario')
    if (salvo) {
      const usuarioLocal = JSON.parse(salvo)
      supabase
        .from('usuarios')
        .select('*')
        .ilike('email', usuarioLocal.email)
        .single()
        .then(({ data }) => {
          if (data) {
            localStorage.setItem('usuario', JSON.stringify(data))
            setUsuario(data)
          } else {
            setUsuario(usuarioLocal)
          }
          setCarregando(false)
        })
    } else {
      setCarregando(false)
    }
  }, [])

  function onSenha() { setLiberado(true) }
  function onLogin(user) { setUsuario(user) }
  function onLogout() {
    localStorage.removeItem('usuario')
    setUsuario(null)
  }

  if (carregando) return null
  if (!liberado) return <Manutencao onSenha={onSenha} />
  if (!usuario) return <Login onLogin={onLogin} />

  return (
    <BrowserRouter>
      <Layout usuario={usuario} onLogout={onLogout} />
    </BrowserRouter>
  )
}