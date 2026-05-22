const fs = require('fs')
const https = require('https')

const SUPABASE_URL = 'bsxfsiakvukhrivzylsp.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzeGZzaWFrdnVraHJpdnp5bHNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzODkxODMsImV4cCI6MjA5NDk2NTE4M30.GycXQkAofWIp-bVcIZyBnKNSJmfjhitnyt4jYenpAkg'

const ordens = JSON.parse(fs.readFileSync('ordens.json', 'utf8'))

// Envia em lotes de 500
const LOTE = 500
let enviados = 0

async function enviarLote(lote) {
  const body = JSON.stringify(lote)
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: SUPABASE_URL,
      path: '/rest/v1/ordens',
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

async function main() {
  // Limpa tabela antes de importar
  await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: SUPABASE_URL,
      path: '/rest/v1/ordens?id=neq.00000000-0000-0000-0000-000000000000',
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    }, res => { res.on('data', ()=>{}); res.on('end', resolve) })
    req.on('error', reject)
    req.end()
  })
  console.log('Tabela limpa!')

  for (let i = 0; i < ordens.length; i += LOTE) {
    const lote = ordens.slice(i, i + LOTE)
    await enviarLote(lote)
    enviados += lote.length
    console.log(`Enviado: ${enviados}/${ordens.length}`)
  }
  console.log('✅ Importação concluída!')
}

main().catch(console.error)