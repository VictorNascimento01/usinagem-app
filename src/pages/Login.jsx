import { useState } from 'react'
import bcrypt from 'bcryptjs'
import { supabase } from '../lib/supabase'

export default function Login({ onLogin }) {
  const emailSalvo = localStorage.getItem('ultimo_email')
  const nomeSalvo = localStorage.getItem('ultimo_nome')

  const [etapa, setEtapa] = useState(emailSalvo ? 'senha' : 'email')
  const [email, setEmail] = useState(emailSalvo || '')
  const [nome, setNome] = useState(nomeSalvo || '')
  const [senha, setSenha] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [estab, setEstab] = useState('')
  const [telefone, setTelefone] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState(null)
  const [usuarioEncontrado, setUsuarioEncontrado] = useState(null)

  async function verificarEmail() {
    if (!email) { setErro('Digite seu email!'); return }
    setLoading(true)
    setErro(null)

    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .ilike('email', email)
      .single()

    setLoading(false)

    if (data) {
      setUsuarioEncontrado(data)
      setNome(data.nome)
      if (data.senha) {
        setEtapa('senha')
      } else {
        setEtapa('criar_senha')
      }
    } else {
      setEtapa('novo')
    }
  }

  async function entrarComSenha() {
    if (!senha) { setErro('Digite sua senha!'); return }
    setLoading(true)
    setErro(null)

    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .ilike('email', emailSalvo || email)
      .single()

    if (!data) {
      setErro('Usuário não encontrado!')
      setLoading(false)
      return
    }

    // Verifica se é hash ou texto puro (migração gradual)
    let senhaCorreta = false
    if (data.senha?.startsWith('$2')) {
      senhaCorreta = await bcrypt.compare(senha, data.senha)
    } else {
      senhaCorreta = data.senha === senha
      // Migra pra hash automaticamente
      if (senhaCorreta) {
        const hash = await bcrypt.hash(senha, 10)
        await supabase.from('usuarios').update({ senha: hash }).eq('id', data.id)
      }
    }

    if (!senhaCorreta) {
      setErro('Senha incorreta!')
      setLoading(false)
      return
    }

    localStorage.setItem('ultimo_email', data.email)
    localStorage.setItem('ultimo_nome', data.nome)
    localStorage.setItem('usuario', JSON.stringify(data))
    onLogin(data)
    setLoading(false)
  }

  async function criarSenha() {
    if (!novaSenha) { setErro('Digite uma senha!'); return }
    if (novaSenha !== confirmarSenha) { setErro('Senhas não conferem!'); return }
    if (novaSenha.length < 4) { setErro('Senha muito curta! Mínimo 4 caracteres.'); return }
    setLoading(true)
    setErro(null)

    const hash = await bcrypt.hash(novaSenha, 10)
    const telFormatado = telefone ? '55' + telefone.replace(/\D/g, '') : null

    await supabase
      .from('usuarios')
      .update({ senha: hash, telefone: telFormatado })
      .eq('id', usuarioEncontrado.id)

    const atualizado = { ...usuarioEncontrado, senha: hash, telefone: telFormatado }
    localStorage.setItem('ultimo_email', atualizado.email)
    localStorage.setItem('ultimo_nome', atualizado.nome)
    localStorage.setItem('usuario', JSON.stringify(atualizado))
    onLogin(atualizado)
    setLoading(false)
  }

  async function cadastrarNovo() {
    if (!nome || !email || !novaSenha || !estab) {
      setErro('Preencha todos os campos!')
      return
    }
    if (novaSenha !== confirmarSenha) { setErro('Senhas não conferem!'); return }
    if (novaSenha.length < 4) { setErro('Senha muito curta! Mínimo 4 caracteres.'); return }
    setLoading(true)
    setErro(null)

    const hash = await bcrypt.hash(novaSenha, 10)
    const telFormatado = telefone ? '55' + telefone.replace(/\D/g, '') : null

    const { data, error } = await supabase
      .from('usuarios')
      .insert({ nome, email, nivel: 'operador', estab, senha: hash, telefone: telFormatado })
      .select()
      .single()

    if (error) {
      setErro('Erro ao cadastrar! Tente novamente.')
      setLoading(false)
      return
    }

    localStorage.setItem('ultimo_email', data.email)
    localStorage.setItem('ultimo_nome', data.nome)
    localStorage.setItem('usuario', JSON.stringify(data))
    onLogin(data)
    setLoading(false)
  }

  function trocarUsuario() {
    localStorage.removeItem('ultimo_email')
    localStorage.removeItem('ultimo_nome')
    setEtapa('email')
    setEmail('')
    setNome('')
    setSenha('')
    setErro(null)
    setUsuarioEncontrado(null)
  }

  const campoTelefone = (
    <div className="field">
      <label>WhatsApp <span style={{ fontSize: 11, color: 'var(--muted)' }}>(opcional)</span></label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{
          background: 'var(--surface2)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '12px 14px', fontSize: 13,
          color: 'var(--muted)', fontWeight: 700, whiteSpace: 'nowrap'
        }}>🇧🇷 +55</div>
        <input className="input" value={telefone}
          onChange={e => setTelefone(e.target.value)}
          placeholder="(DDD) 99999-9999" style={{ flex: 1 }} />
      </div>
    </div>
  )

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
        CCS TEC
      </h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 32, textAlign: 'center' }}>
        {etapa === 'senha' ? `Olá, ${nome}! 👋` : 'Identifique-se para continuar'}
      </p>

      <div style={{ width: '100%', maxWidth: 380 }}>
        <div className="card">

          {/* Etapa 1 — Email */}
          {etapa === 'email' && (
            <>
              <div className="card-title">Acesso</div>
              <div className="field">
                <label>Seu email</label>
                <input className="input" type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && verificarEmail()}
                  placeholder="Ex: joao@empresa.com" />
              </div>
              {erro && (
                <div style={{
                  background: 'rgba(255,61,90,.1)', border: '1px solid rgba(255,61,90,.3)',
                  borderRadius: 8, padding: '8px 12px', fontSize: 13,
                  color: 'var(--red)', marginBottom: 12
                }}>{erro}</div>
              )}
              <button className="btn-primary" onClick={verificarEmail} disabled={loading}>
                {loading ? 'Verificando...' : 'Continuar →'}
              </button>
            </>
          )}

          {/* Etapa 2 — Senha */}
          {etapa === 'senha' && (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                marginBottom: 16, padding: '10px 12px',
                background: 'var(--surface2)', borderRadius: 10
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent), #0077ff)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 700, color: '#000', flexShrink: 0
                }}>
                  {nome?.charAt(0)?.toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{nome}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{emailSalvo || email}</div>
                </div>
                <button onClick={trocarUsuario} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--muted)', fontSize: 11, textDecoration: 'underline'
                }}>Não sou eu</button>
              </div>

              <div className="field">
                <label>Senha</label>
                <input className="input" type="password" value={senha}
                  onChange={e => setSenha(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && entrarComSenha()}
                  placeholder="Digite sua senha..." />
              </div>
              {erro && (
                <div style={{
                  background: 'rgba(255,61,90,.1)', border: '1px solid rgba(255,61,90,.3)',
                  borderRadius: 8, padding: '8px 12px', fontSize: 13,
                  color: 'var(--red)', marginBottom: 12
                }}>{erro}</div>
              )}
              <button className="btn-primary" onClick={entrarComSenha} disabled={loading}>
                {loading ? 'Entrando...' : '🔓 Entrar'}
              </button>
            </>
          )}

          {/* Etapa 3 — Criar senha */}
          {etapa === 'criar_senha' && (
            <>
              <div className="card-title">Crie sua senha</div>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
                Olá, {nome}! É a sua primeira vez entrando. Crie uma senha para os próximos acessos.
              </p>
              <div className="field">
                <label>Nova senha</label>
                <input className="input" type="password" value={novaSenha}
                  onChange={e => setNovaSenha(e.target.value)}
                  placeholder="Mínimo 4 caracteres" />
              </div>
              <div className="field">
                <label>Confirmar senha</label>
                <input className="input" type="password" value={confirmarSenha}
                  onChange={e => setConfirmarSenha(e.target.value)}
                  placeholder="Repita a senha" />
              </div>
              {campoTelefone}
              {erro && (
                <div style={{
                  background: 'rgba(255,61,90,.1)', border: '1px solid rgba(255,61,90,.3)',
                  borderRadius: 8, padding: '8px 12px', fontSize: 13,
                  color: 'var(--red)', marginBottom: 12
                }}>{erro}</div>
              )}
              <button className="btn-primary" onClick={criarSenha} disabled={loading}>
                {loading ? 'Salvando...' : '✅ Criar senha e entrar'}
              </button>
              <button onClick={trocarUsuario} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--muted)', fontSize: 12, marginTop: 10,
                textDecoration: 'underline', width: '100%', textAlign: 'center'
              }}>← Voltar</button>
            </>
          )}

          {/* Etapa 4 — Novo usuário */}
          {etapa === 'novo' && (
            <>
              <div className="card-title">Novo cadastro</div>
              <div className="field">
                <label>Seu nome</label>
                <input className="input" value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Ex: João Silva" />
              </div>
              <div className="field">
                <label>Email</label>
                <input className="input" type="email" value={email}
                  placeholder="Ex: joao@empresa.com" disabled />
              </div>
              <div className="field">
                <label>Estabelecimento</label>
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
              <div className="field">
                <label>Crie uma senha</label>
                <input className="input" type="password" value={novaSenha}
                  onChange={e => setNovaSenha(e.target.value)}
                  placeholder="Mínimo 4 caracteres" />
              </div>
              <div className="field">
                <label>Confirmar senha</label>
                <input className="input" type="password" value={confirmarSenha}
                  onChange={e => setConfirmarSenha(e.target.value)}
                  placeholder="Repita a senha" />
              </div>
              {campoTelefone}
              {erro && (
                <div style={{
                  background: 'rgba(255,61,90,.1)', border: '1px solid rgba(255,61,90,.3)',
                  borderRadius: 8, padding: '8px 12px', fontSize: 13,
                  color: 'var(--red)', marginBottom: 12
                }}>{erro}</div>
              )}
              <button className="btn-primary" onClick={cadastrarNovo} disabled={loading}>
                {loading ? 'Cadastrando...' : '✅ Cadastrar e entrar'}
              </button>
              <button onClick={trocarUsuario} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--muted)', fontSize: 12, marginTop: 10,
                textDecoration: 'underline', width: '100%', textAlign: 'center'
              }}>← Voltar</button>
            </>
          )}

        </div>
      </div>
    </div>
  )
}