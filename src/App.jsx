import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { ClipboardList, Search, Package, Lock } from 'lucide-react'
import Formulario from './pages/Formulario'
import Consulta from './pages/Consulta'
import Ordens from './pages/Ordens'
import Admin from './pages/Admin'
import './App.css'

function Layout() {
  const navigate = useNavigate()

  return (
    <div className="app">
      {/* Cadeado fixo no canto superior direito */}
      <button
        onClick={() => navigate('/admin')}
        style={{
          position: 'fixed', top: 12, right: 16, zIndex: 999,
          background: 'var(--surface2)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '8px 10px', cursor: 'pointer',
          color: 'var(--muted)', display: 'flex', alignItems: 'center'
        }}
      >
        <Lock size={16} />
      </button>

      <main className="content">
        <Routes>
          <Route path="/" element={<Formulario />} />
          <Route path="/consulta" element={<Consulta />} />
          <Route path="/ordens" element={<Ordens />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>

      <nav className="bottom-nav">
        <NavLink to="/" end className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
          <ClipboardList size={22} />
          <span>Formulário</span>
        </NavLink>
        <NavLink to="/consulta" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
          <Search size={22} />
          <span>Consultar</span>
        </NavLink>
        <NavLink to="/ordens" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
          <Package size={22} />
          <span>Ordens</span>
        </NavLink>
      </nav>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  )
}