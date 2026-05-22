import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login({ onLogin }) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState(null)

  async function entrar() {
    if (!nome || !email) {
      setErro('Preencha nome e email!')
      return
    }
    setLoading(true)

    // Verifica se usuário já existe
    const { data: existente } = await supabase
      .from('usuarios')
      .select('*')
      .ilike('email', email)
      .single()

    if (existente) {
      // Usuário já cadastrado — loga direto
      localStorage.setItem('usuario', JSON.stringify(existente))
      onLogin(existente)
    } else {
      // Cadastra novo usuário
      const { data, error } = await supabase
        .from('usuarios')
        .insert({ nome, email, nivel: 'operador' })
        .select()
        .single()

      if (error) {
        setErro('Erro ao cadastrar! Tente novamente.')
      } else {
        localStorage.setItem('usuario', JSON.stringify(data))
        onLogin(data)
      }
    }

    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 24
    }}>
      <div style={{
        width: '44px', height: '44px',
        background: 'linear-gradient(135deg, var(--accent), #0077ff)',
        borderRadius: 12, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 22, marginBottom: 16
      }}>⚙️</div>

      <h1 style={{
        fontFamily: 'monospace', fontSize: 20,
        color: 'var(--accent)', marginBottom: 4
      }}>USINAGEM APP</h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 32 }}>
        Identifique-se para continuar
      </p>

      <div style={{ width: '100%', maxWidth: 380 }}>
        <div className="card">
          <div className="card-title">Acesso</div>

          <div className="field">
            <label>Seu nome</label>
            <input
              className="input"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: João Silva"
            />
          </div>

          <div className="field">
            <label>Seu email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && entrar()}
              placeholder="Ex: joao@empresa.com"
            />
          </div>

          {erro && (
            <div style={{
              background: 'rgba(255,61,90,.1)', border: '1px solid rgba(255,61,90,.3)',
              borderRadius: 8, padding: '8px 12px', fontSize: 13,
              color: 'var(--red)', marginBottom: 12
            }}>
              {erro}
            </div>
          )}

          <button className="btn-primary" onClick={entrar} disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </div>
      </div>
    </div>
  )
}