const fs = require('fs')

const lines = fs.readFileSync('CPCC0401.csv', 'latin1').trim().split('\n')
const hdrs = lines[0].replace(/\r/g, '').split(';')

console.log('Colunas encontradas:', hdrs)

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

console.log('Total:', rows.length)
const comTarefa = rows.filter(r => r.tarefa !== '')
console.log('Com tarefa:', comTarefa.length)
if (comTarefa.length > 0) console.log('Exemplo:', comTarefa[0])

fs.writeFileSync('ordens.json', JSON.stringify(rows))
console.log('ordens.json criado!')