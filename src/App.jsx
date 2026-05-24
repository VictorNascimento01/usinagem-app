import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useNavigate, Navigate } from 'react-router-dom'
import { ClipboardList, Search, Package, Lock, LogOut, Activity, Zap, Users } from 'lucide-react'
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
      // Busca dados frescos do banco sempre
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