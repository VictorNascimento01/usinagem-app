import os
import time
import csv
import requests
import json
from datetime import datetime

# ======== CONFIGURAÇÕES ========
PASTA = r"\\server-bi\DADOS-BI-PCP\Totvs"
PASTA_DOWNLOADS = r"C:\Users\victorggn\Downloads"
SUPABASE_URL = "https://bsxfsiakvukhrivzylsp.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzeGZzaWFrdnVraHJpdnp5bHNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzODkxODMsImV4cCI6MjA5NDk2NTE4M30.GycXQkAofWIp-bVcIZyBnKNSJmfjhitnyt4jYenpAkg"
INTERVALO = 3600
LOTE = 1000
# ================================

ultimo_cpcc = None
ultimo_sfcc = None
ultimo_sfcc_pr = None
ultimo_nesting = None

def log(msg):
    print(f"[{datetime.now().strftime('%d/%m/%Y %H:%M:%S')}] {msg}", flush=True)

def to_float(val):
    try:
        return float(str(val).replace(',', '.').strip() or 0)
    except:
        return 0.0

def ler_cpcc(caminho):
    rows = []
    with open(caminho, encoding='latin-1') as f:
        reader = csv.DictReader(f, delimiter=';')
        for r in reader:
            try:
                item = (r.get('Item CCS') or '').strip()
                if not item:
                    continue
                rows.append({
                    'ordem': (r.get('Ordem') or '').strip(),
                    'item_ccs': item,
                    'item_cliente': (r.get('Item Cliente') or '').strip(),
                    'estado': (r.get('Estado') or '').strip(),
                    'qtde_ordem': to_float(r.get('Qtde Ordem') or 0),
                    'qtde_prod': to_float(r.get('Qtde Prod') or 0),
                    'saldo': to_float(r.get('Saldo') or 0),
                    'tarefa': (r.get('Tarefa') or '').strip(),
                    'operacoes': (r.get('Operações') or '').strip(),
                    'prox_oper': (r.get('Prox.Oper.') or '').strip(),
                    'posto': (r.get('Posto') or '').strip(),
                    'cliente': (r.get('Cliente') or '').strip(),
                    'inicio': (r.get('Inicio') or '').strip(),
                    'termino': (r.get('Término') or '').strip(),
                    'estab': (r.get('Estab.') or '').strip(),
                })
            except:
                continue
    return rows

def ler_sfcc(caminho):
    rows = []
    with open(caminho, encoding='latin-1') as f:
        reader = csv.DictReader(f, delimiter=';')
        for r in reader:
            try:
                item = (r.get('ITEM') or '').strip()
                if not item:
                    continue
                rows.append({
                    'estab': (r.get('Estab.') or '').strip(),
                    'ordem': (r.get('Ordem') or '').strip(),
                    'cliente': (r.get('Cliente') or '').strip(),
                    'item': item,
                    'item_cliente': (r.get('ITEM Cliente') or '').strip(),
                    'operador': (r.get('Operador') or '').strip(),
                    'maquina': (r.get('Maquina') or '').strip(),
                    'data_apontamento': (r.get('Data') or '').strip(),
                    'hora': (r.get('Hora') or '').strip(),
                    'tempo': (r.get('Tempo') or '').strip(),
                    'qtd_aprov': to_float(r.get('Qtd Aprov.') or 0),
                    'qtd_refug': to_float(r.get('Qtd Refug.') or 0),
                    'posto': (r.get('Posto') or '').strip(),
                    'tarefa': (r.get('Tarefa') or '').strip(),
                    'operacao': (r.get('Operação') or '').strip(),
                    'desc_operacao': (r.get('Descrição Operação') or '').strip(),
                })
            except:
                continue
    return rows

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
                    'estab': (r.get('estab') or r.get('Estab') or '').strip(),
                    'data': (r.get('data') or r.get('Data') or '').strip(),
                })
            except:
                continue
    return rows

def limpar_tabela(tabela):
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}'
    }
    requests.delete(
        f"{SUPABASE_URL}/rest/v1/{tabela}?id=neq.00000000-0000-0000-0000-000000000000",
        headers=headers
    )
    log(f"Tabela {tabela} limpa!")

def enviar_lote(tabela, rows):
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    enviados = 0
    for i in range(0, len(rows), LOTE):
        lote = rows[i:i+LOTE]
        tentativas = 0
        while tentativas < 3:
            try:
                r = requests.post(
                    f"{SUPABASE_URL}/rest/v1/{tabela}",
                    headers=headers,
                    data=json.dumps(lote),
                    timeout=30
                )
                if r.status_code >= 400:
                    log(f"❌ Erro ao enviar lote: {r.text}")
                    return False
                enviados += len(lote)
                log(f"Enviando {tabela}... {enviados}/{len(rows)}")
                break
            except Exception as e:
                tentativas += 1
                log(f"⚠️ Tentativa {tentativas}/3 falhou: {e}")
                time.sleep(5)
        else:
            log(f"❌ Lote falhou após 3 tentativas!")
            return False
    log(f"✅ {len(rows)} registros enviados para {tabela}!")
    return True

def atualizar_cpcc(caminho):
    log(f"Atualizando ordens com {os.path.basename(caminho)}...")
    try:
        rows = ler_cpcc(caminho)
        if not rows:
            log("❌ Nenhuma ordem encontrada!")
            return
        log(f"{len(rows)} ordens encontradas")
        limpar_tabela('ordens')
        enviar_lote('ordens', rows)
    except Exception as e:
        log(f"❌ Erro: {e}")

def atualizar_sfcc(caminho_limeira, caminho_palmeira):
    log("Atualizando apontamentos...")
    try:
        rows = []
        if caminho_limeira:
            r1 = ler_sfcc(caminho_limeira)
            log(f"Limeira: {len(r1)} apontamentos")
            rows += r1
        if caminho_palmeira:
            r2 = ler_sfcc(caminho_palmeira)
            log(f"Palmeira: {len(r2)} apontamentos")
            rows += r2
        if not rows:
            log("❌ Nenhum apontamento encontrado!")
            return
        log(f"Total: {len(rows)} apontamentos")
        limpar_tabela('apontamentos_prod')
        enviar_lote('apontamentos_prod', rows)
    except Exception as e:
        log(f"❌ Erro: {e}")

def encontrar_nesting():
    """Pega o arquivo de nesting mais recente nos Downloads"""
    try:
        arquivos = [
            f for f in os.listdir(PASTA_DOWNLOADS)
            if 'listas_csv' in f.lower() and f.lower().endswith('.php')
               or 'listas_csv' in f.lower() and f.lower().endswith('.csv')
               or 'listas_csv' in f.lower()
        ]
        if not arquivos:
            return None
        # Pega o mais recente
        arquivos_com_path = [os.path.join(PASTA_DOWNLOADS, f) for f in arquivos]
        return max(arquivos_com_path, key=os.path.getmtime)
    except Exception as e:
        log(f"❌ Erro ao buscar nesting: {e}")
        return None

def atualizar_nesting(caminho):
    log(f"Atualizando nesting com {os.path.basename(caminho)}...")
    try:
        rows = ler_nesting(caminho)
        if not rows:
            log("❌ Nenhum dado de nesting encontrado!")
            return
        log(f"{len(rows)} linhas de nesting encontradas")
        limpar_tabela('nesting')
        enviar_lote('nesting', rows)
    except Exception as e:
        log(f"❌ Erro nesting: {e}")

def encontrar_arquivo(prefixo):
    try:
        for f in os.listdir(PASTA):
            if prefixo.upper() in f.upper() and f.upper().endswith('.CSV'):
                return os.path.join(PASTA, f)
    except Exception as e:
        log(f"❌ Erro ao acessar pasta: {e}")
    return None

# ======== INICIO ========
log("🔍 Monitor iniciado!")
log(f"📁 Monitorando: {PASTA}")
log(f"📁 Downloads: {PASTA_DOWNLOADS}")
log(f"⏱ Intervalo: {INTERVALO//60} minutos")
log(f"📦 Lote: {LOTE} registros")

while True:
    # CPCC - Ordens
    cpcc = encontrar_arquivo('CPCC0401')
    if cpcc:
        mod = os.path.getmtime(cpcc)
        if mod != ultimo_cpcc:
            ultimo_cpcc = mod
            log(f"📄 CPCC detectado: {os.path.basename(cpcc)}")
            atualizar_cpcc(cpcc)
        else:
            log("Sem mudança no CPCC")
    else:
        log("⚠️ CPCC0401 não encontrado!")

    # SFCC - Apontamentos
    sfcc_limeira = encontrar_arquivo('SFCC0005.csv')
    sfcc_palmeira = encontrar_arquivo('SFCC0005-PR')

    mod_l = os.path.getmtime(sfcc_limeira) if sfcc_limeira else None
    mod_p = os.path.getmtime(sfcc_palmeira) if sfcc_palmeira else None

    if mod_l != ultimo_sfcc or mod_p != ultimo_sfcc_pr:
        ultimo_sfcc = mod_l
        ultimo_sfcc_pr = mod_p
        log("📄 SFCC detectado — atualizando apontamentos...")
        atualizar_sfcc(sfcc_limeira, sfcc_palmeira)
    else:
        log("Sem mudança nos apontamentos")

    # NESTING - Downloads
    nesting = encontrar_nesting()
    if nesting:
        mod_n = os.path.getmtime(nesting)
        if mod_n != ultimo_nesting:
            ultimo_nesting = mod_n
            log(f"📄 Nesting detectado: {os.path.basename(nesting)}")
            atualizar_nesting(nesting)
        else:
            log("Sem mudança no nesting")
    else:
        log("⚠️ Arquivo de nesting não encontrado nos Downloads!")

    time.sleep(INTERVALO)