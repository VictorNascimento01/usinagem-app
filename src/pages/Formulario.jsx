import { useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { BASE_ITENS } from '../lib/baseItens'

export default function Formulario() {
  const [codigo, setCodigo] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [turno, setTurno] = useState('')
  const [obs, setObs] = useState('')
  const [sugestoes, setSugestoes] = useState([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  function showToast(msg, cor = 'var(--green)') {
    setToast({ msg, cor })
    setTimeout(() => setToast(null), 2500)
  }

  function onCodigoInput(val) {
    setCodigo(val)
    if (val.length < 2) { setSugestoes([]); return }
    const q = val.toLowerCase()
    const matches = BASE_ITENS.filter(i =>
      i.codigo.toLowerCase().includes(q)
    ).slice(0, 8)
    setSugestoes(matches)
  }

  function selecionarItem(item) {
    if (item.tipo === 'blank') {
      setCodigo(item.codigoUsin)
      showToast(`⚡ Blank → ${item.codigoUsin}`, 'var(--yellow)')
    } else {
      setCodigo(item.codigo)
    }
    setSugestoes([])
  }

  async function lancar() {
    if (!codigo || !quantidade || !turno) {
      showToast('Preencha todos os campos!', 'var(--red)')
      return
    }

    const itemBlank = BASE_ITENS.find(i =>
      i.codigo.toLowerCase() === codigo.toLowerCase() && i.tipo === 'blank'
    )
    if (itemBlank) {
      showToast(`⚠️ Código Blank! Use: ${itemBlank.codigoUsin}`, 'var(--red)')
      return
    }

    setLoading(true)
    const { error } = await supabase.from('lancamentos').insert({
      codigo,
      quantidade: parseInt(quantidade),
      turno,
      setor: 'USINAGEM',
      observacao: obs
    })
    setLoading(false)

    if (error) {
      showToast('Erro ao lançar!', 'var(--red)')
    } else {
      showToast('✅ Lançado com sucesso!')
      setCodigo('')
      setQuantidade('')
      setTurno('')
      setObs('')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-icon">
          <ClipboardList size={22} color="#000" />
        </div>
        <div>
          <h1>LANÇAMENTO</h1>
          <p>Registrar item em produção</p>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Dados do item</div>

        <div className="field" style={{ position: 'relative' }}>
          <label>Código do item</label>
          <input
            className="input"
            value={codigo}
            onChange={e => onCodigoInput(e.target.value)}
            placeholder="Digite o código..."
            autoComplete="off"
          />
          {sugestoes.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              background: 'var(--surface2)', border: '1px solid var(--accent)',
              borderTop: 'none', borderRadius: '0 0 10px 10px',
              maxHeight: 200, overflowY: 'auto', zIndex: 100
            }}>
              {sugestoes.map((item, i) => (
                <div key={i}
                  onClick={() => selecionarItem(item)}
                  style={{
                    padding: '11px 15px', cursor: 'pointer',
                    fontFamily: 'monospace', fontSize: 13,
                    borderBottom: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', gap: 8
                  }}
                >
                  {item.codigo}
                  {item.tipo === 'blank' && (
                    <span className="tag tag-yellow">BLANK</span>
                  )}
                  {item.tipo === 'blank' && (
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                      → {item.codigoUsin} · usi
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label>Quantidade</label>
            <input
              className="input"
              type="number"
              value={quantidade}
              onChange={e => setQuantidade(e.target.value)}
              placeholder="0"
              min="1"
            />
          </div>
          <div className="field">
            <label>Turno</label>
            <select className="input" value={turno} onChange={e => setTurno(e.target.value)}>
              <option value="">Selecione</option>
              <option value="1">1º Turno</option>
              <option value="2">2º Turno</option>
              <option value="3">3º Turno</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label>Observação (opcional)</label>
          <input
            className="input"
            value={obs}
            onChange={e => setObs(e.target.value)}
            placeholder="Alguma observação..."
          />
        </div>

        <button className="btn-primary" onClick={lancar} disabled={loading}>
          {loading ? 'Lançando...' : '✓ Lançar item'}
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