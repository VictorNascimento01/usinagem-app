const fs = require('fs')
const https = require('https')

const SUPABASE_URL = 'bsxfsiakvukhrivzylsp.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzeGZzaWFrdnVraHJpdnp5bHNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzODkxODMsImV4cCI6MjA5NDk2NTE4M30.GycXQkAofWIp-bVcIZyBnKNSJmfjhitnyt4jYenpAkg'

function lerCSV(caminho) {
  const text = fs.readFileSync(caminho, 'latin1')
  const lines = text.trim().split('\n')
  const hdrs = lines[0].replace(/\r/g, '').split(';')
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].replace(/\r/g, '').split(';')
    if (c.length < 10) continue
    const r = {}
    hdrs.forEach((h, j) => r[h] = (c[j] || '').trim())
    if (!r['ITEM']) continue
    rows.push({
      estab: r['Estab.'] || '',
      ordem: r['Ordem'] || '',
      cliente: r['Cliente'] || '',
      item: r['ITEM'] || '',
      item_cliente: r['ITEM Cliente'] || '',
      operador: r['Operador'] || '',
      maquina: r['Maquina'] || '',
      data_apontamento: r['Data'] || '',
      hora: r['Hora'] || '',
      tempo: r['Tempo'] || '',
      qtd_aprov: parseFloat((r['Qtd Aprov.'] || '0').replace(',', '.')) || 0,
      qtd_refug: parseFloat((r['Qtd Refug.'] || '0').replace(',', '.')) || 0,
      posto: r['Posto'] || '',
      tarefa: r['Tarefa'] || '',
      operacao: r['Operação'] || '',
      desc_operacao: r['Descrição Operação'] || ''
    })
  }
  return rows
}

async function enviarLote(lote) {
  const body = JSON.stringify(lote)
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: SUPABASE_URL,
      path: '/rest/v1/apontamentos_prod',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal'
      }
    }, res => {
      let data = ''
      res.on('data', d => data += d)
      res.on('end', () => {
        if (res.statusCode >= 400) reject(new Error(`Erro ${res.statusCode}: ${data}`))
        else resolve()
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

async function limpar() {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: SUPABASE_URL,
      path: '/rest/v1/apontamentos_prod?id=neq.00000000-0000-0000-0000-000000000000',
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    }, res => { res.on('data', () => {}); res.on('end', resolve) })
    req.on('error', reject)
    req.end()
  })
}

async function main() {
  // Lê os dois arquivos
  console.log('Lendo SFCC0005.csv (Limeira)...')
  const limeira = lerCSV('SFCC0005.csv')
  console.log(`Limeira: ${limeira.length} apontamentos`)

  console.log('Lendo SFCC0005-pr.csv (Palmeira)...')
  const palmeira = lerCSV('SFCC0005-pr.csv')
  console.log(`Palmeira: ${palmeira.length} apontamentos`)

  const todos = [...limeira, ...palmeira]
  console.log(`Total: ${todos.length} apontamentos`)

  console.log('Limpando banco...')
  await limpar()
  console.log('Banco limpo!')

  const LOTE = 500
  let enviados = 0
  for (let i = 0; i < todos.length; i += LOTE) {
    const lote = todos.slice(i, i + LOTE)
    await enviarLote(lote)
    enviados += lote.length
    console.log(`Enviando... ${enviados}/${todos.length}`)
  }
  console.log('✅ Importação concluída!')
}

main().catch(console.error)