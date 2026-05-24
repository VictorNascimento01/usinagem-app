import { useState, useEffect } from 'react'
import { ClipboardList } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { BASE_ITENS } from '../lib/baseItens'

export default function Formulario({ usuario }) {
  const [tipo, setTipo] = useState('usinagem')

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

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { key: 'usinagem', label: '⚙️ Usinagem' },
          { key: 'laser', label: '⚡ Laser' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTipo(key)} style={{
            flex: 1, padding: '12px 8px', border: '1px solid',
            borderColor: tipo === key ? 'var(--accent)' : 'var(--border)',
            background: tipo === key ? 'rgba(0,229,255,.1)' : 'var(--surface)',
            color: tipo === key ? 'var(--accent)' : 'var(--muted)',
            borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer'
          }}>{label}</button>
        ))}
      </div>

      {tipo === 'usinagem' ? <FormUsinagem usuario={usuario} /> : <FormLaser usuario={usuario} />}
    </div>
  )
}

function FormUsinagem({ usuario }) {
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
    setSugestoes(BASE_ITENS.filter(i => i.codigo.toLowerCase().includes(q)).slice(0, 8))
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

    if (codigo.startsWith('7.')) {
      const deParaBlank = BASE_ITENS.find(i => i.tipo === 'blank' && i.codigo.toLowerCase() === codigo.toLowerCase())
      if (deParaBlank) {
        showToast(`⚠️ Blank! Use: ${deParaBlank.codigoUsin}`, 'var(--red)')
      } else {
        showToast(`⚠️ Código parece ser Blank (começa com 7.)`, 'var(--red)')
      }
      return
    }

    // Bloqueia se estab não bater
    if (usuario?.estab && usuario.estab !== 'todas') {
      const { data: ordemData } = await supabase
        .from('ordens')
        .select('estab')
        .ilike('item_ccs', codigo)
        .limit(1)
        .single()

      if (ordemData && ordemData.estab !== usuario.estab) {
        const planta = ordemData.estab === '100' ? 'Limeira' : 'Palmeira'
        showToast(`❌ Este item é de ${planta}! Você não tem acesso.`, 'var(--red)')
        return
      }
    }

    setLoading(true)
    const { error } = await supabase.from('lancamentos').insert({
      codigo, quantidade: parseInt(quantidade),
      turno, setor: 'USINAGEM', observacao: obs,
      usuario_nome: usuario?.nome, usuario_email: usuario?.email
    })
    setLoading(false)

    if (error) {
      showToast('Erro ao lançar!', 'var(--red)')
    } else {
      showToast('✅ Lançado com sucesso!')
      setCodigo(''); setQuantidade(''); setTurno(''); setObs('')
    }
  }

  return (
    <>
      {usuario?.estab && usuario.estab !== 'todas' && (
        <div style={{
          background: usuario.estab === '100' ? 'rgba(0,229,255,.1)' : 'rgba(0,255,136,.1)',
          border: `1px solid ${usuario.estab === '100' ? 'rgba(0,229,255,.3)' : 'rgba(0,255,136,.3)'}`,
          borderRadius: 8, padding: '8px 14px', marginBottom: 12,
          fontSize: 12, fontWeight: 700,
          color: usuario.estab === '100' ? 'var(--accent)' : 'var(--green)'
        }}>
          📍 Estabelecimento: {usuario.estab === '100' ? 'Limeira' : 'Palmeira'}
        </div>
      )}

      <div className="card">
        <div className="card-title">Dados do item</div>

        <div className="field" style={{ position: 'relative' }}>
          <label>Código do item</label>
          <input className="input" value={codigo}
            onChange={e => onCodigoInput(e.target.value)}
            placeholder="Digite o código..." autoComplete="off" />
          {sugestoes.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              background: 'var(--surface2)', border: '1px solid var(--accent)',
              borderTop: 'none', borderRadius: '0 0 10px 10px',
              maxHeight: 200, overflowY: 'auto', zIndex: 100
            }}>
              {sugestoes.map((item, i) => (
                <div key={i} onClick={() => selecionarItem(item)} style={{
                  padding: '11px 15px', cursor: 'pointer',
                  fontFamily: 'monospace', fontSize: 13,
                  borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', gap: 8
                }}>
                  {item.codigo}
                  {item.tipo === 'blank' && (
                    <>
                      <span style={{ background: 'rgba(255,214,10,.2)', color: 'var(--yellow)', fontSize: 10, padding: '1px 6px', borderRadius: 4 }}>BLANK</span>
                      <span style={{ fontSize: 11, color: 'var(--accent)' }}>{item.codigoUsin} · usi</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label>Quantidade</label>
            <input className="input" type="number" value={quantidade}
              onChange={e => setQuantidade(e.target.value)} placeholder="0" min="1" />
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
          <input className="input" value={obs}
            onChange={e => setObs(e.target.value)} placeholder="Alguma observação..." />
        </div>

        <button className="btn-primary" onClick={lancar} disabled={loading}>
          {loading ? 'Lançando...' : '✓ Lançar item'}
        </button>
      </div>

      {toast && <div className="toast" style={{ background: toast.cor }}>{toast.msg}</div>}
    </>
  )
}

function FormLaser({ usuario }) {
  const [abaLaser, setAbaLaser] = useState('planejar')

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { key: 'planejar', label: '📋 Planejar corte' },
          { key: 'apontar', label: '✅ Apontar produção' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setAbaLaser(key)} style={{
            flex: 1, padding: '10px 8px', border: '1px solid',
            borderColor: abaLaser === key ? 'var(--yellow)' : 'var(--border)',
            background: abaLaser === key ? 'rgba(255,214,10,.1)' : 'var(--surface)',
            color: abaLaser === key ? 'var(--yellow)' : 'var(--muted)',
            borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer'
          }}>{label}</button>
        ))}
      </div>

      {abaLaser === 'planejar'
        ? <PlanejarCorte usuario={usuario} />
        : <ApontarProducao usuario={usuario} />
      }
    </>
  )
}

function PlanejarCorte({ usuario }) {
  const [maquina, setMaquina] = useState('')
  const [job, setJob] = useState('')
  const [ordens, setOrdens] = useState([])
  const [totalChapas, setTotalChapas] = useState('')
  const [tipoCort, setTipoCort] = useState('total')
  const [chapasParcial, setChapasParcial] = useState('')
  const [loading, setLoading] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [toast, setToast] = useState(null)
  const [maquinasSalvas, setMaquinasSalvas] = useState([])
  const [showMaquinas, setShowMaquinas] = useState(false)

  useEffect(() => {
    const salvas = JSON.parse(localStorage.getItem('maquinas_laser') || '[]')
    setMaquinasSalvas(salvas)
  }, [])

  function showToast(msg, cor = 'var(--green)') {
    setToast({ msg, cor })
    setTimeout(() => setToast(null), 2500)
  }

  function salvarMaquina(nome) {
    const salvas = JSON.parse(localStorage.getItem('maquinas_laser') || '[]')
    if (!salvas.includes(nome)) {
      salvas.push(nome)
      localStorage.setItem('maquinas_laser', JSON.stringify(salvas))
      setMaquinasSalvas(salvas)
    }
  }

  async function buscarOrdens() {
    if (!maquina || !job) {
      showToast('Informe a máquina e o job!', 'var(--red)')
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('ordens')
      .select('ordem, item_ccs, cliente, qtde_ordem, saldo, estab')
      .ilike('tarefa', `%${job}%`)
      .order('item_ccs')

    // Bloqueia se estab não bater
    if (usuario?.estab && usuario.estab !== 'todas' && data?.length > 0) {
      const estabOrdem = data[0].estab
      if (estabOrdem !== usuario.estab) {
        const planta = estabOrdem === '100' ? 'Limeira' : 'Palmeira'
        showToast(`❌ Este job é de ${planta}! Você não tem acesso.`, 'var(--red)')
        setOrdens([])
        setLoading(false)
        return
      }
    }

    setOrdens(data || [])
    salvarMaquina(maquina)
    setLoading(false)
    if (!data?.length) showToast('Nenhuma ordem encontrada!', 'var(--red)')
  }

  async function confirmar() {
    if (!totalChapas) { showToast('Informe o total de chapas!', 'var(--red)'); return }
    if (tipoCort === 'parcial' && !chapasParcial) { showToast('Informe quantas chapas vai cortar!', 'var(--red)'); return }
    if (ordens.length === 0) { showToast('Busque as ordens primeiro!', 'var(--red)'); return }

    setSalvando(true)
    const estab = ordens[0]?.estab || ''

    const { error } = await supabase.from('laser_planejamento').insert({
      job, maquina,
      total_chapas: parseInt(totalChapas),
      tipo: tipoCort,
      chapas_cortar: tipoCort === 'parcial' ? parseInt(chapasParcial) : parseInt(totalChapas),
      estab,
      usuario_nome: usuario?.nome,
      usuario_email: usuario?.email
    })

    setSalvando(false)
    if (error) {
      showToast('Erro ao salvar!', 'var(--red)')
    } else {
      showToast('✅ Planejamento salvo!')
      setJob(''); setTotalChapas(''); setChapasParcial('')
      setTipoCort('total'); setOrdens([])
    }
  }

  const maquinasFiltradas = maquinasSalvas.filter(m =>
    m.toLowerCase().includes(maquina.toLowerCase())
  )

  return (
    <>
      {usuario?.estab && usuario.estab !== 'todas' && (
        <div style={{
          background: usuario.estab === '100' ? 'rgba(0,229,255,.1)' : 'rgba(0,255,136,.1)',
          border: `1px solid ${usuario.estab === '100' ? 'rgba(0,229,255,.3)' : 'rgba(0,255,136,.3)'}`,
          borderRadius: 8, padding: '8px 14px', marginBottom: 12,
          fontSize: 12, fontWeight: 700,
          color: usuario.estab === '100' ? 'var(--accent)' : 'var(--green)'
        }}>
          📍 Estabelecimento: {usuario.estab === '100' ? 'Limeira' : 'Palmeira'}
        </div>
      )}

      <div className="card">
        <div className="card-title">📋 Planejar corte</div>

        <div className="field" style={{ position: 'relative' }}>
          <label>Máquina</label>
          <input className="input" value={maquina}
            onChange={e => { setMaquina(e.target.value); setShowMaquinas(true) }}
            onFocus={() => setShowMaquinas(true)}
            onBlur={() => setTimeout(() => setShowMaquinas(false), 200)}
            placeholder="Ex: ML42, ML35..." autoComplete="off" />
          {showMaquinas && maquinasFiltradas.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              background: 'var(--surface2)', border: '1px solid var(--accent)',
              borderTop: 'none', borderRadius: '0 0 10px 10px', zIndex: 100
            }}>
              {maquinasFiltradas.map((m, i) => (
                <div key={i} onClick={() => { setMaquina(m); setShowMaquinas(false) }} style={{
                  padding: '10px 14px', cursor: 'pointer', fontFamily: 'monospace',
                  fontSize: 13, borderBottom: '1px solid var(--border)'
                }}>{m}</div>
              ))}
            </div>
          )}
        </div>

        <div className="field">
          <label>Job / Tarefa</label>
          <input className="input" value={job}
            onChange={e => setJob(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && buscarOrdens()}
            placeholder="Ex: J092362" />
        </div>

        <button className="btn-primary" onClick={buscarOrdens} disabled={loading}
          style={{ background: 'var(--yellow)', color: '#000', marginBottom: 0 }}>
          {loading ? 'Buscando...' : '🔍 Buscar ordens'}
        </button>
      </div>

      {ordens.length > 0 && (
        <div className="card">
          <div className="card-title">Ordens do job {job}</div>

          <div className="field">
            <label>Total de chapas do job</label>
            <input className="input" type="number" value={totalChapas}
              onChange={e => setTotalChapas(e.target.value)}
              placeholder="Ex: 3" min="1" />
          </div>

          <div className="field">
            <label>Vai cortar</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['total', 'parcial'].map(opt => (
                <button key={opt} onClick={() => setTipoCort(opt)} style={{
                  flex: 1, padding: '10px', border: '1px solid',
                  borderColor: tipoCort === opt ? 'var(--yellow)' : 'var(--border)',
                  background: tipoCort === opt ? 'rgba(255,214,10,.1)' : 'var(--surface2)',
                  color: tipoCort === opt ? 'var(--yellow)' : 'var(--muted)',
                  borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer'
                }}>{opt === 'total' ? '✅ Total' : '⚡ Parcial'}</button>
              ))}
            </div>
          </div>

          {tipoCort === 'parcial' && (
            <div className="field">
              <label>Quantas chapas vai cortar agora?</label>
              <input className="input" type="number" value={chapasParcial}
                onChange={e => setChapasParcial(e.target.value)}
                placeholder={`de ${totalChapas || '?'} chapas`} min="1" />
            </div>
          )}

          <div style={{ height: 1, background: 'var(--border)', margin: '8px 0 16px' }} />

          {ordens.map((o, i) => (
            <div key={i} style={{
              padding: '10px 0', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 10
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>{o.item_ccs}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  OP {o.ordem} · {o.cliente || '—'} · {o.qtde_ordem} pç
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  background: o.estab === '100' ? 'rgba(0,229,255,.15)' : 'rgba(0,255,136,.15)',
                  color: o.estab === '100' ? 'var(--accent)' : 'var(--green)',
                  fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4
                }}>{o.estab === '100' ? 'Limeira' : 'Palmeira'}</span>
                <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--yellow)', fontWeight: 700, marginTop: 4 }}>
                  {o.saldo} pç
                </div>
              </div>
            </div>
          ))}

          <button className="btn-primary" onClick={confirmar} disabled={salvando}
            style={{ background: 'var(--yellow)', color: '#000', marginTop: 16 }}>
            {salvando ? 'Salvando...' : '✅ Confirmar planejamento'}
          </button>
        </div>
      )}

      {toast && <div className="toast" style={{ background: toast.cor }}>{toast.msg}</div>}
    </>
  )
}

function ApontarProducao({ usuario }) {
  const [job, setJob] = useState('')
  const [busca, setBusca] = useState('')
  const [ordens, setOrdens] = useState([])
  const [ordensFiltradas, setOrdensFiltradas] = useState([])
  const [quantidades, setQuantidades] = useState({})
  const [loading, setLoading] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [toast, setToast] = useState(null)
  const [planejamento, setPlanejamento] = useState(null)

  function showToast(msg, cor = 'var(--green)') {
    setToast({ msg, cor })
    setTimeout(() => setToast(null), 2500)
  }

  async function buscarOrdens() {
    if (!job) { showToast('Informe o job!', 'var(--red)'); return }
    setLoading(true)

    const { data: ords } = await supabase
      .from('ordens')
      .select('ordem, item_ccs, cliente, qtde_ordem, saldo, estab')
      .ilike('tarefa', `%${job}%`)
      .order('item_ccs')

    // Bloqueia se estab não bater
    if (usuario?.estab && usuario.estab !== 'todas' && ords?.length > 0) {
      const estabOrdem = ords[0].estab
      if (estabOrdem !== usuario.estab) {
        const planta = estabOrdem === '100' ? 'Limeira' : 'Palmeira'
        showToast(`❌ Este job é de ${planta}! Você não tem acesso.`, 'var(--red)')
        setOrdens([])
        setOrdensFiltradas([])
        setLoading(false)
        return
      }
    }

    const { data: plan } = await supabase
      .from('laser_planejamento')
      .select('*')
      .ilike('job', `%${job}%`)
      .order('criado_em', { ascending: false })
      .limit(1)

    setOrdens(ords || [])
    setOrdensFiltradas(ords || [])
    setPlanejamento(plan?.[0] || null)

    const qtds = {}
    ords?.forEach(o => { qtds[o.ordem] = '' })
    setQuantidades(qtds)
    setLoading(false)
    setBusca('')

    if (!ords?.length) showToast('Nenhuma ordem encontrada!', 'var(--red)')
  }

  function filtrarOrdens(val) {
    setBusca(val)
    if (!val) { setOrdensFiltradas(ordens); return }
    const q = val.toLowerCase()
    setOrdensFiltradas(ordens.filter(o =>
      o.item_ccs.toLowerCase().includes(q) ||
      o.ordem.toLowerCase().includes(q) ||
      (o.cliente || '').toLowerCase().includes(q)
    ))
  }

  async function confirmar() {
    const temQtd = Object.values(quantidades).some(q => q !== '' && parseInt(q) >= 0)
    if (!temQtd) { showToast('Preencha pelo menos uma quantidade!', 'var(--red)'); return }

    setSalvando(true)
    for (const ordem of ordens) {
      const qtd = quantidades[ordem.ordem]
      if (qtd === '') continue
      await supabase.from('laser_apontamento').insert({
        job, ordem: ordem.ordem, item_ccs: ordem.item_ccs,
        qtd_planejada: ordem.qtde_ordem,
        qtd_real: parseInt(qtd),
        maquina: planejamento?.maquina || '',
        usuario_nome: usuario?.nome,
        usuario_email: usuario?.email
      })
    }

    setSalvando(false)
    showToast('✅ Apontamentos salvos!')
    setOrdens([]); setOrdensFiltradas([]); setJob('')
    setQuantidades({}); setPlanejamento(null); setBusca('')
  }

  return (
    <>
      <div className="card">
        <div className="card-title">✅ Apontar produção</div>

        <div className="field">
          <label>Job / Tarefa</label>
          <input className="input" value={job}
            onChange={e => setJob(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && buscarOrdens()}
            placeholder="Ex: J092362" />
        </div>

        <button className="btn-primary" onClick={buscarOrdens} disabled={loading}
          style={{ marginBottom: 0 }}>
          {loading ? 'Buscando...' : '🔍 Buscar ordens'}
        </button>
      </div>

      {planejamento && (
        <div style={{
          background: 'rgba(255,214,10,.08)', border: '1px solid rgba(255,214,10,.3)',
          borderRadius: 10, padding: '10px 14px', marginBottom: 12
        }}>
          <div style={{ fontWeight: 700, color: 'var(--yellow)', marginBottom: 4 }}>
            📋 Planejamento encontrado
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            Máquina: {planejamento.maquina} · {planejamento.total_chapas} chapas ·
            {planejamento.tipo === 'parcial'
              ? ` Parcial: ${planejamento.chapas_cortar} chapas`
              : ' Total'}
          </div>
        </div>
      )}

      {ordens.length > 0 && (
        <>
          <div className="field">
            <input className="input" value={busca}
              onChange={e => filtrarOrdens(e.target.value)}
              placeholder="Filtrar por item, ordem ou cliente..." />
          </div>

          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            {ordensFiltradas.length} de {ordens.length} ordem(s)
          </div>

          {ordensFiltradas.map(o => (
            <div key={o.ordem} className="card" style={{ marginBottom: 10, padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700 }}>{o.item_ccs}</div>
                <span style={{
                  background: o.estab === '100' ? 'rgba(0,229,255,.15)' : 'rgba(0,255,136,.15)',
                  color: o.estab === '100' ? 'var(--accent)' : 'var(--green)',
                  fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4
                }}>{o.estab === '100' ? 'Limeira' : 'Palmeira'}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>
                OP {o.ordem} · {o.cliente || '—'} · Planejado: {o.qtde_ordem} pç
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Quantidade real</label>
                <input className="input" type="number"
                  value={quantidades[o.ordem] || ''}
                  onChange={e => setQuantidades(p => ({ ...p, [o.ordem]: e.target.value }))}
                  placeholder={`Planejado: ${o.qtde_ordem} pç`} min="0" />
              </div>
            </div>
          ))}

          <button className="btn-primary" onClick={confirmar} disabled={salvando}>
            {salvando ? 'Salvando...' : `✅ Confirmar apontamentos`}
          </button>
        </>
      )}

      {toast && <div className="toast" style={{ background: toast.cor }}>{toast.msg}</div>}
    </>
  )
}