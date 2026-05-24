import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login({ onLogin }) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [estab, setEstab] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState(null)

  async function entrar() {
    if (!nome || !email) {
      setErro('Preencha nome e email!')
      return
    }
    setLoading(true)
    setErro(null)

    const { data: existente } = await supabase
      .from('usuarios')
      .select('*')
      .ilike('email', email)
      .single()

    if (existente) {
      // Sempre salva dados frescos do banco — ignora o que tinha no localStorage
      localStorage.setItem('usuario', JSON.stringify(existente))
      onLogin(existente)
    } else {
      // Usuário novo — precisa de estab
      if (!estab) {
        setErro('Selecione o estabelecimento!')
        setLoading(false)
        return
      }
      const { data, error } = await supabase
        .from('usuarios')
        .insert({ nome, email, nivel: 'operador', estab })
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
        width: 56, height: 56,
        background: 'linear-gradient(135deg, var(--accent), #0077ff)',
        borderRadius: 16, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 26, marginBottom: 20
      }}>⚙️</div>

      <h1 style={{ fontFamily: 'monospace', fontSize: 22, color: 'var(--accent)', marginBottom: 6 }}>
        USINAGEM APP
      </h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 32, textAlign: 'center' }}>
        Identifique-se para continuar
      </p>

      <div style={{ width: '100%', maxWidth: 380 }}>
        <div className="card">
          <div className="card-title">Acesso</div>

          <div className="field">
            <label>Seu nome</label>
            <input className="input" value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: João Silva" />
          </div>

          <div className="field">
            <label>Seu email</label>
            <input className="input" type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && entrar()}
              placeholder="Ex: joao@empresa.com" />
          </div>

          <div className="field">
            <label>Estabelecimento <span style={{ fontSize: 11, color: 'var(--muted)' }}>(só para novos usuários)</span></label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { key: '100', label: '📍 Limeira' },
                { key: '200', label: '📍 Palmeira' },
              ].map(({ key, label }) => (
                <button key={key} onClick={() => setEstab(key)} style={{
                  flex: 1, padding: '10px 6px', border: '1px solid',
                  borderColor: estab === key ? 'var(--accent)' : 'var(--border)',
                  background: estab === key ? 'rgba(0,229,255,.1)' : 'var(--surface2)',
                  color: estab === key ? 'var(--accent)' : 'var(--muted)',
                  borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer'
                }}>{label}</button>
              ))}
            </div>
          </div>

          {erro && (
            <div style={{
              background: 'rgba(255,61,90,.1)', border: '1px solid rgba(255,61,90,.3)',
              borderRadius: 8, padding: '8px 12px', fontSize: 13,
              color: 'var(--red)', marginBottom: 12
            }}>{erro}</div>
          )}

          <button className="btn-primary" onClick={entrar} disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </div>

        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginTop: 16 }}>
          Usuários existentes entram automaticamente sem selecionar estabelecimento.
        </div>
      </div>
    </div>
  )
}