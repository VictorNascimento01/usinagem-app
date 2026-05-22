import { useState } from 'react'
import { Settings, Upload } from 'lucide-react'
import { supabase } from '../lib/supabase'

const SENHA_ADMIN = 'usi2024'

export default function Admin() {
  const [autenticado, setAutenticado] = useState(false)
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [progresso, setProgresso] = useState(null)
  const [toast, setToast] = useState(null)

  function showToast(msg, cor = 'var(--green)') {
    setToast({ msg, cor })
    setTimeout(() => setToast(null), 3000)
  }

  function logar() {
    if (senha === SENHA_ADMIN) {
      setAutenticado(true)
    } else {
      showToast('Senha incorreta!', 'var(--red)')
    }
  }

  async function processarCSV(file) {
    setLoading(true)
    setProgresso('Lendo arquivo...')

    const text = await file.text()
    const lines = text.trim().split('\n')
    const hdrs = lines[0].replace(/\r/g, '').split(';')

    // Valida se é o arquivo certo
    if (!hdrs.some(h => h.includes('Item CCS') || h.includes('Ordem'))) {
      setLoading(false)
      setProgresso(null)
      showToast('❌ Arquivo inválido! Carregue o CPCC de ordens.', 'var(--red)')
      return
    }

    const rows = []
    for (let i = 1; i < lines.length; i++) {
      const c = lines[i].replace(/\r/g, '').split(';')
      if (c.length < 10) continue
      const r = {}
      hdrs.forEach((h, j) => r[h] = (c[j] || '').trim())
      if (!r['Item CCS']) continue
      rows.push({
        ordem: r['Ordem'] || '',
        item_ccs: r['Item CCS'] || '',
        item_cliente: r['Item Cliente'] || '',
        estado: r['Estado'] || '',
        qtde_ordem: parseFloat(r['Qtde Ordem']) || 0,
        qtde_prod: parseFloat(r['Qtde Prod']) || 0,
        saldo: parseFloat(r['Saldo']) || 0,
        tarefa: r['Tarefa'] || '',
        operacoes: r['Operações'] || r['Opera\u00e7\u00f5es'] || '',
        prox_oper: r['Prox.Oper.'] || '',
        posto: r['Posto'] || '',
        cliente: r['Cliente'] || '',
        inicio: r['Inicio'] || '',
        termino: r['Término'] || r['T\u00e9rmino'] || ''
      })
    }

    // Valida se encontrou ordens
    if (rows.length === 0) {
      setLoading(false)
      setProgresso(null)
      showToast('❌ Nenhuma ordem encontrada! Verifique o arquivo.', 'var(--red)')
      return
    }

    setProgresso(`${rows.length} ordens lidas — limpando banco...`)

    // Limpa tabela
    await supabase
      .from('ordens')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    setProgresso('Enviando ordens...')

    // Envia em lotes de 500
    const LOTE = 500
    let enviados = 0
    for (let i = 0; i < rows.length; i += LOTE) {
      const lote = rows.slice(i, i + LOTE)
      const { error } = await supabase.from('ordens').insert(lote)
      if (error) {
        setLoading(false)
        setProgresso(null)
        showToast('❌ Erro ao salvar no banco! Tente novamente.', 'var(--red)')
        return
      }
      enviados += lote.length
      setProgresso(`Enviando... ${enviados}/${rows.length}`)
    }

    setLoading(false)
    setProgresso(null)
    showToast(`✅ ${rows.length} ordens atualizadas!`)
  }

  function onFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    processarCSV(file)
    e.target.value = ''
  }

  // Tela de login
  if (!autenticado) {
    return (
      <div>
        <div className="page-header">
          <div className="page-icon">
            <Settings size={22} color="#000" />
          </div>
          <div>
            <h1>ADMIN</h1>
            <p>Área restrita</p>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Acesso admin</div>
          <div className="field">
            <label>Senha</label>
            <input
              className="input"
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && logar()}
              placeholder="Digite a senha..."
            />
          </div>
          <button className="btn-primary" onClick={logar}>
            Entrar
          </button>
        </div>

        {toast && (
          <div className="toast" style={{ background: toast.cor }}>
            {toast.msg}
          </div>
        )}
      </div>
    )
  }

  // Tela admin
  return (
    <div>
      <div className="page-header">
        <div className="page-icon">
          <Settings size={22} color="#000" />
        </div>
        <div>
          <h1>ADMIN</h1>
          <p>Atualizar dados do sistema</p>
        </div>
        <button
          onClick={() => setAutenticado(false)}
          style={{
            marginLeft: 'auto', background: 'none',
            border: '1px solid var(--border)', borderRadius: 8,
            padding: '6px 12px', color: 'var(--muted)',
            cursor: 'pointer', fontSize: 12
          }}
        >
          Sair
        </button>
      </div>

      <div className="card">
        <div className="card-title">📦 Atualizar Ordens</div>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
          Carregue o arquivo CPCC exportado do sistema. O banco será atualizado automaticamente.
        </p>

        {loading ? (
          <div style={{
            background: 'rgba(0,229,255,.06)', border: '1px solid rgba(0,229,255,.2)',
            borderRadius: 10, padding: 20, textAlign: 'center'
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
            <div style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--accent)' }}>
              {progresso}
            </div>
          </div>
        ) : (
          <label style={{
            display: 'block', border: '1.5px dashed var(--border)',
            borderRadius: 12, padding: 24, textAlign: 'center',
            cursor: 'pointer'
          }}>
            <input type="file" accept=".csv" onChange={onFileChange} style={{ display: 'none' }} />
            <Upload size={28} color="var(--accent)" style={{ marginBottom: 8 }} />
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Carregar CSV de Ordens</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Arquivo CPCC — separado por ponto e vírgula</div>
          </label>
        )}
      </div>

      <div className="card">
        <div className="card-title">ℹ️ Informações</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8 }}>
          <div>📦 <strong style={{ color: 'var(--text)' }}>Ordens</strong> — atualizar diariamente com o CPCC</div>
          <div>📋 <strong style={{ color: 'var(--text)' }}>Lançamentos</strong> — salvos automaticamente pelos operadores</div>
          <div>🔄 <strong style={{ color: 'var(--text)' }}>Tempo real</strong> — qualquer atualização aparece pra todos na hora</div>
        </div>
      </div>

      {toast && (
        <div className="toast" style={{ background: toast.cor }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}