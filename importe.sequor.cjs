const fs = require('fs')
const https = require('https')

const SUPABASE_URL = 'bsxfsiakvukhrivzylsp.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzeGZzaWFrdnVraHJpdnp5bHNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzODkxODMsImV4cCI6MjA5NDk2NTE4M30.GycXQkAofWIp-bVcIZyBnKNSJmfjhitnyt4jYenpAkg'

function lerCSV(caminho) {
  const text = fs.readFileSync(caminho, 'utf-8')
  const lines = text.trim().split('\n')
  const hdrs = lines[0].replace(/\r/g, '').split(',')
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].replace(/\r/g, '').split(',')
    if (c.length < hdrs.length) continue
    const r = {}
    hdrs.forEach((h, j) => r[h] = (c[j] || '').trim())
    if (!r['Estacao']) continue
    rows.push({
      estacao: r['Estacao'] || '',
      data_inicial: r['Data Inicial'] || '',
      data_final: r['Data Final'] || '',
      ordem: r['Ordem'] || '',
      produto: r['Produto'] || '',
      qtd_ok: parseFloat(r['Qtd OK']) || 0,
      qtd_nok: parseFloat(r['Qtd NOK']) || 0,
      tempo_teorico: parseFloat(r['Tempo Teorico']) || 0,
      tempo_real: parseFloat(r['Tempo Real']) || 0,
      tempo_parada: parseFloat(r['Tempo Parada']) || 0,
      etapa: r['Etapa'] || '',
      turno: r['Turno'] || '',
      setor: r['Setor'] || '',
    })
  }
  return rows
}

async function limpar() {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: SUPABASE_URL,
      path: '/rest/v1/sequor?id=neq.00000000-0000-0000-0000-000000000000',
      method: 'DELETE',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    }, res => { res.on('data', () => {}); res.on('end', resolve) })
    req.on('error', reject)
    req.end()
  })
}

async function enviarLote(rows) {
  const LOTE = 500
  let enviados = 0
  for (let i = 0; i < rows.length; i += LOTE) {
    const lote = rows.slice(i, i + LOTE)
    await new Promise((resolve, reject) => {
      const body = JSON.stringify(lote)
      const req = https.request({
        hostname: SUPABASE_URL,
        path: '/rest/v1/sequor',
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
    enviados += lote.length
    console.log(`Enviando... ${enviados}/${rows.length}`)
  }
}

async function main() {
  const arquivo = process.argv[2] || 'Tempo_Itens.csv'
  console.log(`Lendo ${arquivo}...`)
  const rows = lerCSV(arquivo)
  console.log(`${rows.length} registros encontrados`)
  console.log('Limpando banco...')
  await limpar()
  console.log('Enviando...')
  await enviarLote(rows)
  console.log('✅ Importação concluída!')
}

main().catch(console.error)