import { useState } from 'react'
import { Search } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Consulta() {
  const [query, setQuery] = useState('')
  const [resultado, setResultado] = useState(null)
  const [loading, setLoading] = useState(false)

  async function buscar() {
    if (!query) return
    setLoading(true)

    const { data: forms } = await supabase
      .from('lancamentos')
      .select('*')
      .ilike('codigo', `%${query}%`)
      .order('criado_em', { ascending: false })

    setResultado({ forms: forms || [] })
    setLoading(false)
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-icon">
          <Search size={22} color="#000" />
        </div>
        <div>
          <h1>CONSULTA</h1>
          <p>Onde está meu item?</p>
        </div>
      </div>

      <div className="search-box">
        <input
          className="input"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && buscar()}
          placeholder="Código do item..."
        />
        <button className="btn-search" onClick={buscar}>
          {loading ? '...' : 'Buscar'}
        </button>
      </div>

      {resultado && (
        <>
          {resultado.forms.length === 0 ? (
            <div className="empty">
              <div className="emoji">❌</div>
              <h3>Não encontrado</h3>
              <p>{query} não aparece nos lançamentos</p>
            </div>
          ) : (
            <div className="card">
              <div className="card-title">
                📋 Lançamentos — {resultado.forms.length} registro(s)
              </div>
              {resultado.forms.map((l, i) => (
                <div key={i} style={{
                  padding: '12px 0',
                  borderBottom: i < resultado.forms.length - 1 ? '1px solid var(--border)' : 'none',
                  display: 'flex', alignItems: 'center', gap: 10
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700 }}>
                      {l.codigo}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                      {l.setor} · Turno {l.turno}
                      {l.observacao ? ` · ${l.observacao}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--green)' }}>
                      {l.quantidade} pç
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {new Date(l.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
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