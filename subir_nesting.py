import csv
import requests
import json

SUPABASE_URL = "https://bsxfsiakvukhrivzylsp.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzeGZzaWFrdnVraHJpdnp5bHNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzODkxODMsImV4cCI6MjA5NDk2NTE4M30.GycXQkAofWIp-bVcIZyBnKNSJmfjhitnyt4jYenpAkg"
ARQUIVO = r"C:\Users\victo\Downloads\listas_csv.php_20260529_205932.csv"
LOTE = 500

def to_float(val):
    try:
        return float(str(val).replace(',', '.').strip() or 0)
    except:
        return 0.0

def ler_nesting(caminho):
    rows = []
    with open(caminho, encoding='latin-1') as f:
        reader = csv.DictReader(f, delimiter=';')
        for r in reader:
            try:
                programa = (r.get('programa') or r.get('Programa') or '').strip()
                tarefa = (r.get('tarefa') or r.get('Tarefa') or '').strip()
                if not programa or not tarefa:
                    continue
                rows.append({
                    'tarefa': tarefa,
                    'programa': programa,
                    'maquina': (r.get('maquina') or r.get('Maquina') or '').strip(),
                    'qtd_chapa': int(float(str(r.get('qtd_chapa_cortada') or r.get('qtd_chapa') or 0).replace(',', '.') or 0)),
                    'tempo_corte_total': to_float(r.get('tempo_corte_total') or 0),
                    'ordem': (r.get('ordem') or r.get('Ordem') or '').strip(),
                    'item': (r.get('item') or r.get('Item') or '').strip(),
                    'qtd_nesting': int(float(str(r.get('qtd_nesting') or 0).replace(',', '.') or 0)),
                    'qtd_solicitado': int(float(str(r.get('qtd_solicitado') or 0).replace(',', '.') or 0)),
                    'estab': (r.get('estab.') or r.get('estab') or r.get('Estab.') or r.get('Estab') or '').strip(),
                    'data': (r.get('data') or r.get('Data') or '').strip(),
                })
            except:
                continue
    return rows

def limpar_tabela():
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}'
    }
    requests.delete(
        f"{SUPABASE_URL}/rest/v1/nesting?id=neq.00000000-0000-0000-0000-000000000000",
        headers=headers
    )
    print("Tabela limpa!")

def enviar(rows):
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    enviados = 0
    for i in range(0, len(rows), LOTE):
        lote = rows[i:i+LOTE]
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/nesting",
            headers=headers,
            data=json.dumps(lote),
            timeout=30
        )
        if r.status_code >= 400:
            print(f"Erro: {r.text}")
            return
        enviados += len(lote)
        print(f"Enviado {enviados}/{len(rows)}")
    print(f"✅ {len(rows)} registros enviados!")

print("Lendo arquivo...")
rows = ler_nesting(ARQUIVO)
print(f"{len(rows)} linhas encontradas")

# Mostra exemplo do estab
if rows:
    print(f"Exemplo estab: '{rows[0].get('estab')}' | maquina: '{rows[0].get('maquina')}'")

confirma = input("Limpar tabela e enviar? (s/n): ")
if confirma.lower() == 's':
    limpar_tabela()
    enviar(rows)
else:
    print("Cancelado!")