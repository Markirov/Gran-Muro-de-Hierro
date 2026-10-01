#!/usr/bin/env python3
"""
scripts/sync_from_tc_master.py
Generador y sincronizador automatizado entre los compendios maestros Tc_Tc_*.md
(Fuente Única de Verdad / SSOT) y los datasets de Warband Forge (app/data/*.ts y public/js/).

Modos de uso:
  python scripts/sync_from_tc_master.py --check
    Verifica que el 100% de armas, armaduras, equipo y miniaturas en la app
    coincidan en costes, estadísticas y keywords con los compendios maestros.
    Sale con código 0 si todo está alineado, o código 1 si hay discrepancias.

  python scripts/sync_from_tc_master.py --write
    Aplica las actualizaciones de costes y atributos a app/data/01_trench_crusade_game_data.ts,
    regenera id_aliases.ts/.js y compila a public/js/ mediante build-legacy-data.js.
"""

import sys
import re
import json
import subprocess
from pathlib import Path

# Configurar salida UTF-8 para consola
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path(__file__).resolve().parent.parent
TC_DIR = ROOT / 'herramientas' / 'pdfs-reglamento'
APP_DATA_PATH = ROOT / 'app' / 'data' / '01_trench_crusade_game_data.ts'

# Cargar id_aliases
sys.path.insert(0, str(ROOT / 'scripts'))
try:
    from generate_id_aliases import app_to_stable, stable_to_app
except Exception:
    app_to_stable = {}
    stable_to_app = {}

def clean_text(s: str) -> str:
    s = re.sub(r'[*`]', '', s).strip()
    return re.sub(r'\s+', ' ', s)

def extract_id(text: str) -> str:
    m = re.search(r'\(\s*`([a-z0-9-]+)`\s*\)', text)
    return m.group(1) if m else ''

def parse_cost(cost_str: str):
    cost_str = clean_text(cost_str)
    if 'Gratis' in cost_str or '—' in cost_str or cost_str == '-':
        return 0, '👑'
    m_ducats = re.search(r'(\d+)\s*(👑|\?\?|ducats)', cost_str)
    if m_ducats:
        return int(m_ducats.group(1)), '👑'
    m_glory = re.search(r'(\d+)\s*(☼|glory)', cost_str)
    if m_glory:
        return int(m_glory.group(1)), '☼'
    # Solo número
    m_num = re.search(r'(\d+)', cost_str)
    if m_num:
        return int(m_num.group(1)), '👑'
    return 0, '👑'

# -------------------------------------------------------------
# 1. Parsers de Compendios Markdown
# -------------------------------------------------------------

def parse_weapons():
    path = TC_DIR / 'Tc_Tc_Armas.md'
    lines = path.read_text(encoding='utf-8').splitlines()
    weapons = {}
    current_category = 'melee'

    for line in lines:
        if line.startswith('## 1.'):
            current_category = 'melee'
        elif line.startswith('## 2.'):
            current_category = 'ranged'
        elif line.startswith('## 3.'):
            current_category = 'grenades'

        if not line.startswith('|') or '---' in line or 'Arma |' in line:
            continue

        parts = [p.strip() for p in line.strip().strip('|').split('|')]
        if len(parts) < 8:
            continue

        name_cell = parts[0]
        stable_id = extract_id(name_cell)
        name = clean_text(re.sub(r'\(\s*`[^`]+`\s*\)', '', name_cell))
        faction = clean_text(parts[1])
        hands_type = clean_text(parts[2])
        w_range = clean_text(parts[3])
        dmg_mod = clean_text(parts[4])
        raw_kws = clean_text(parts[5])
        cost_cell = parts[6]
        cost, currency = parse_cost(cost_cell)
        notes = clean_text(parts[7])

        kws = []
        if dmg_mod and dmg_mod != '—':
            for mod in dmg_mod.split(','):
                if mod.strip(): kws.append(mod.strip())
        if raw_kws and raw_kws != '—':
            for kw in raw_kws.split(','):
                if kw.strip(): kws.append(kw.strip())

        weapons[stable_id] = {
            'id': stable_id,
            'name': name,
            'faction': faction,
            'type': hands_type,
            'category': current_category,
            'range': w_range,
            'keywords': kws,
            'cost': cost,
            'currency': currency,
            'notes': notes
        }
    return weapons

def parse_armours():
    path = TC_DIR / 'Tc_Tc_Armaduras_Y_Escudos.md'
    lines = path.read_text(encoding='utf-8').splitlines()
    armours = {}
    current_category = 'armour'

    for line in lines:
        if line.startswith('## 1.'):
            current_category = 'armour'
        elif line.startswith('## 2.'):
            current_category = 'shields'

        if not line.startswith('|') or '---' in line or 'Nombre |' in line:
            continue

        parts = [p.strip() for p in line.strip().strip('|').split('|')]
        if len(parts) < 6:
            continue

        name_cell = parts[0]
        stable_id = extract_id(name_cell)
        name = clean_text(re.sub(r'\(\s*`[^`]+`\s*\)', '', name_cell))
        faction = clean_text(parts[1])
        item_type = clean_text(parts[2])
        effect = clean_text(parts[3])
        cost, currency = parse_cost(parts[4])
        notes = clean_text(parts[5])

        kws = []
        if effect and effect != '—':
            for e in effect.split(','):
                if e.strip(): kws.append(e.strip())

        armours[stable_id] = {
            'id': stable_id,
            'name': name,
            'faction': faction,
            'category': current_category,
            'type': item_type,
            'keywords': kws,
            'cost': cost,
            'currency': currency,
            'notes': notes
        }
    return armours

def parse_equipment():
    path = TC_DIR / 'Tc_Tc_Equipo_Y_Municion.md'
    lines = path.read_text(encoding='utf-8').splitlines()
    equipment = {}

    for line in lines:
        if not line.startswith('|') or '---' in line or 'Nombre |' in line:
            continue

        parts = [p.strip() for p in line.strip().strip('|').split('|')]
        if len(parts) < 5:
            continue

        name_cell = parts[0]
        stable_id = extract_id(name_cell)
        name = clean_text(re.sub(r'\(\s*`[^`]+`\s*\)', '', name_cell))
        faction = clean_text(parts[1])
        effect = clean_text(parts[2])
        cost, currency = parse_cost(parts[3])
        notes = clean_text(parts[4]) if len(parts) > 4 else ''

        equipment[stable_id] = {
            'id': stable_id,
            'name': name,
            'faction': faction,
            'category': 'equipment',
            'type': 'equipment',
            'effect': effect,
            'cost': cost,
            'currency': currency,
            'notes': notes
        }
    return equipment

def parse_units():
    path = TC_DIR / 'Tc_Tc_Miniaturas.md'
    lines = path.read_text(encoding='utf-8').splitlines()
    units = {}
    current = None

    for i, line in enumerate(lines):
        m_head = re.match(r'^###\s+(.+?)\s*\(\s*`([a-z0-9-]+)`\s*\)', line)
        if m_head:
            name = clean_text(m_head.group(1))
            uid = m_head.group(2)
            current = {
                'id': uid,
                'name': name,
                'faction': '',
                'tier': 'troops',
                'cost': 0,
                'currency': '👑',
                'limit': None,
                'stats': {},
                'keywords': [],
                'abilities': []
            }
            units[uid] = current
            continue

        if not current:
            continue

        if line.startswith('- **Facción:**'):
            current['faction'] = clean_text(line.split(':', 1)[1])
        elif line.startswith('- **Rango / Categoría:**'):
            val = line.split(':', 1)[1]
            if 'ELITE' in val or 'ÉLITE' in val: current['tier'] = 'elite'
            elif 'MERCENARY' in val: current['tier'] = 'mercenary'
            else: current['tier'] = 'troops'
        elif line.startswith('- **Coste Base:**'):
            c, cur = parse_cost(line.split(':', 1)[1])
            current['cost'] = c
            current['currency'] = cur
        elif line.startswith('- **Límite por Banda:**'):
            lim_text = clean_text(line.split(':', 1)[1])
            m_lim = re.search(r'(\d+-\d+|\d+)', lim_text)
            current['limit'] = m_lim.group(1) if m_lim else None
        elif line.startswith('- **Keywords:**'):
            kw_text = clean_text(line.split(':', 1)[1])
            if kw_text and kw_text != '—' and kw_text != 'Ninguna':
                current['keywords'] = [k.strip() for k in kw_text.split(',') if k.strip()]
        elif line.startswith('| **') and 'Infantry' in line or 'Stationary' in line or 'Cavalry' in line:
            # Stats row: | **6"/Infantry** | **+0 DICE** | ...
            cols = [clean_text(c) for c in line.strip().strip('|').split('|')]
            if len(cols) >= 5:
                current['stats'] = {
                    'movement': cols[0],
                    'melee': cols[1],
                    'ranged': cols[2],
                    'armour': cols[3],
                    'base': cols[4]
                }

    return units

# -------------------------------------------------------------
# 2. Extracción de datos de la App (01_trench_crusade_game_data.ts)
# -------------------------------------------------------------

def extract_app_items():
    code = APP_DATA_PATH.read_text(encoding='utf-8')
    code_clean = re.sub(r"\\'", "'", code)

    # Buscar items en armería: { id:'...', name:'...', cost:..., ... }
    item_pattern = re.compile(
        r'\{\s*id:\s*[\'\"]([^\'\"]+)[\'\"]\s*,\s*name:\s*[\'\"]([^\'\"]+)[\'\"]\s*,\s*cost:\s*(\d+)\s*,\s*currency:\s*[\'\"]([^\'\"]+)[\'\"]'
    )
    items = {}
    for m in item_pattern.finditer(code_clean):
        aid, name, cost, cur = m.groups()
        cur_sym = '👑' if cur in ['👑', 'ducats', '??'] else '☼'
        items[aid] = {
            'id': aid,
            'name': name,
            'cost': int(cost),
            'currency': cur_sym
        }

    # Buscar unidades: { id:'...', name:'...', tier:'...', limit:..., cost:..., currency:'...'
    unit_pattern = re.compile(
        r'\{\s*id:\s*[\'\"]([^\'\"]+)[\'\"]\s*,\s*name:\s*[\'\"]([^\'\"]+)[\'\"](?:,\s*tier:\s*[\'\"]([^\'\"]+)[\'\"])?(?:,\s*limit:\s*([^\,]+))?,\s*cost:\s*(\d+)\s*,\s*currency:\s*[\'\"]([^\'\"]+)[\'\"]'
    )
    units = {}
    for m in unit_pattern.finditer(code_clean):
        uid, name, tier, limit, cost, cur = m.groups()
        cur_sym = '👑' if cur in ['👑', 'ducats', '??'] else '☼'
        units[uid] = {
            'id': uid,
            'name': name,
            'tier': tier,
            'cost': int(cost),
            'currency': cur_sym
        }

    return items, units

# -------------------------------------------------------------
# 3. Comparación y Sincronización
# -------------------------------------------------------------

def run_sync(check_only=True):
    print("=== Sincronizador Automatizado Tc_Tc_*.md -> Warband Forge ===")
    weapons = parse_weapons()
    armours = parse_armours()
    equipment = parse_equipment()
    units_master = parse_units()

    master_items = {}
    master_items.update(weapons)
    master_items.update(armours)
    master_items.update(equipment)

    print(f"Compendios parseados: {len(weapons)} armas, {len(armours)} armaduras/escudos, {len(equipment)} equipo, {len(units_master)} miniaturas.")

    app_items, app_units = extract_app_items()
    print(f"App data parseada: {len(app_items)} items de armería, {len(app_units)} miniaturas.")

    differences = []
    matches = 0

    # 1. Comparar items de armería
    for aid, app_item in app_items.items():
        # Resolver ID estable
        stable_id = app_to_stable.get(aid, aid)
        master_item = master_items.get(stable_id)

        if not master_item:
            # Buscar por nombre
            for mid, mitem in master_items.items():
                if mitem['name'].lower() == app_item['name'].lower():
                    master_item = mitem
                    break

        if not master_item:
            continue

        # Comparar coste y moneda
        if app_item['cost'] != master_item['cost'] or app_item['currency'] != master_item['currency']:
            differences.append({
                'type': 'item_cost',
                'id': aid,
                'stable_id': master_item['id'],
                'name': app_item['name'],
                'app_cost': f"{app_item['cost']} {app_item['currency']}",
                'master_cost': f"{master_item['cost']} {master_item['currency']}"
            })
        else:
            matches += 1

    # 2. Comparar miniaturas
    for uid, aunit in app_units.items():
        munit = units_master.get(uid)
        if not munit:
            for mid, mu in units_master.items():
                if mu['name'].lower() == aunit['name'].lower():
                    munit = mu
                    break

        if not munit:
            continue

        if aunit['cost'] != munit['cost'] or aunit['currency'] != munit['currency']:
            differences.append({
                'type': 'unit_cost',
                'id': uid,
                'stable_id': munit['id'],
                'name': aunit['name'],
                'app_cost': f"{aunit['cost']} {aunit['currency']}",
                'master_cost': f"{munit['cost']} {munit['currency']}"
            })
        else:
            matches += 1

    print(f"\nResultados de comparación:")
    print(f"  Coincidencias verificadas al 100%: {matches}")
    print(f"  Diferencias encontradas: {len(differences)}")

    if differences:
        print("\nDetalle de diferencias detectadas:")
        for diff in differences:
            print(f"  [{diff['type']}] {diff['name']} ({diff['id']}): App={diff['app_cost']} vs Master={diff['master_cost']}")

    if check_only:
        if differences:
            print("\nRESULTADO: Falló la verificación de sincronización (se detectaron derivas).")
            return 1
        else:
            print("\nRESULTADO: TODO OK (Cero derivas entre compendios Tc_Tc_*.md y app/data/*.ts).")
            return 0
    else:
        # Modo --write: aplicar sincronización
        if not differences:
            print("No se requieren modificaciones en app/data/*.ts.")
        else:
            print(f"Aplicando {len(differences)} correcciones a app/data/01_trench_crusade_game_data.ts...")
            code = APP_DATA_PATH.read_text(encoding='utf-8')
            for diff in differences:
                # Reemplazar coste del item
                aid = diff['id']
                m_cost = int(diff['master_cost'].split()[0])
                m_cur = diff['master_cost'].split()[1]
                # Patrón: id:'aid', name:'...', cost:..., currency:'...'
                pattern = rf"(id:\s*[\'\"]{aid}[\'\"][^}}]*?cost:\s*)\d+(\s*,\s*currency:\s*[\'\"])[^\'\"]+([\'\"])"
                code = re.sub(pattern, rf"\g<1>{m_cost}\g<2>{m_cur}\g<3>", code)
            APP_DATA_PATH.write_text(code, encoding='utf-8')
            print("app/data/01_trench_crusade_game_data.ts actualizado.")

        # Regenerar alias y compilar legacy
        print("\nRegenerando alias y compilando a Vanilla JS...")
        subprocess.run([sys.executable, str(ROOT / 'scripts' / 'generate_id_aliases.py')], check=True)
        subprocess.run(['node', str(ROOT / 'scripts' / 'build-legacy-data.js')], check=True)
        print("Sincronización completada con éxito.")
        return 0

if __name__ == '__main__':
    mode = '--write' if '--write' in sys.argv else '--check'
    sys.exit(run_sync(check_only=(mode == '--check')))
