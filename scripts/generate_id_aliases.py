import sys
import re
import json
from pathlib import Path

# Add herramientas/pdfs-reglamento to path to load validador
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'herramientas' / 'pdfs-reglamento'))
import validador

v = validador.Validator()
tc_dir = Path(__file__).resolve().parent.parent / 'herramientas' / 'pdfs-reglamento'
for f in sorted(tc_dir.glob('Tc_Tc_*.md')):
    if f.name != 'Tc_Tc_00_Convencion_IDs.md':
        v.collect(f)

app_data_path = Path(__file__).resolve().parent.parent / 'app' / 'data' / '01_trench_crusade_game_data.ts'
code = app_data_path.read_text(encoding='utf-8')
# Clean escaped single quotes
code_clean = re.sub(r"\\'", "'", code)

item_matches = re.findall(r'\{\s*id:\s*[\'\"]([^\'\"]+)[\'\"]\s*,\s*name:\s*[\'\"]([^\'\"]+)[\'\"]', code_clean)

app_to_stable = {}
for aid, aname in item_matches:
    if aid in v.defined:
        app_to_stable[aid] = aid
        continue
    norm_aname = aname.strip().lower()
    matches = []
    for tid, entries in v.defined.items():
        for fname, lno, tname in entries:
            if tname.strip().lower() == norm_aname:
                matches.append((tid, fname))
    if matches:
        best = None
        for suf in ['-na', '-sult', '-is', '-hl', '-bg', '-tp', '-court', '-fid', '-iw', '-wis']:
            target_suf = '-sult' if suf == '-is' else suf
            if aid.endswith(suf):
                for tid, fn in matches:
                    if tid.endswith(target_suf):
                        best = tid
                        break
        if not best:
            best = matches[0][0]
        app_to_stable[aid] = best

# Explicit canon aliases from audit report
app_to_stable['assassin-dagger-is'] = 'assassin-s-dagger-sult'
app_to_stable['beelz-axe-bg'] = 'beelzebub-s-axe-bg'
app_to_stable['punt-gun-anchor'] = 'punt-gun-anchorite-tp'
app_to_stable['heavy-flame-anchor'] = 'heavy-flamethrower-anchorite-tp'
app_to_stable['anti-mat-rifle-anchor'] = 'anti-materiel-rifle-anchorite-tp'
app_to_stable['gas-censer-anchor'] = 'gas-censer-anchorite-tp'
app_to_stable['trench-mortar-anchor'] = 'trench-mortar-anchorite-tp'
app_to_stable['autocannon-anchor'] = 'autocannon-anchorite-tp'

stable_to_app = {}
for aid, sid in app_to_stable.items():
    if sid not in stable_to_app or aid == sid:
        stable_to_app[sid] = aid

output_ts = '''// Mapas de alias e identidades canónicas entre IDs de la aplicación (Warband Forge)
// y los IDs estables normalizados en los compendios maestros Tc_Tc_*.md.
// Generado automáticamente para garantizar paridad SSOT al 100%.

export const APP_TO_STABLE_ID_MAP: Record<string, string> = ''' + json.dumps(app_to_stable, indent=2, ensure_ascii=False) + ''';

export const STABLE_TO_APP_ID_MAP: Record<string, string> = ''' + json.dumps(stable_to_app, indent=2, ensure_ascii=False) + ''';

/**
 * Resuelve un ID (sea de la app o estable de los compendios Tc_Tc) a su ID estable canónico.
 */
export function toStableId(id: string): string {
  if (!id) return '';
  return APP_TO_STABLE_ID_MAP[id] || id;
}

/**
 * Resuelve un ID estable de los compendios Tc_Tc al ID interno utilizado por la app.
 */
export function toAppId(id: string): string {
  if (!id) return '';
  return STABLE_TO_APP_ID_MAP[id] || id;
}

/**
 * Comprueba si dos IDs se refieren al mismo concepto (por identidad directa o alias).
 */
export function areIdsEquivalent(idA: string, idB: string): boolean {
  if (!idA || !idB) return false;
  if (idA === idB) return true;
  const stableA = toStableId(idA);
  const stableB = toStableId(idB);
  if (stableA === stableB) return true;
  const appA = toAppId(idA);
  const appB = toAppId(idB);
  return appA === appB;
}
'''

dest_path = Path(__file__).resolve().parent.parent / 'app' / 'data' / 'id_aliases.ts'
dest_path.write_text(output_ts, encoding='utf-8')

output_js = '''// Versión CommonJS para compatibilidad con suites de pruebas en Node.js
const APP_TO_STABLE_ID_MAP = ''' + json.dumps(app_to_stable, indent=2, ensure_ascii=False) + ''';
const STABLE_TO_APP_ID_MAP = ''' + json.dumps(stable_to_app, indent=2, ensure_ascii=False) + ''';

function toStableId(id) {
  if (!id) return '';
  return APP_TO_STABLE_ID_MAP[id] || id;
}

function toAppId(id) {
  if (!id) return '';
  return STABLE_TO_APP_ID_MAP[id] || id;
}

function areIdsEquivalent(idA, idB) {
  if (!idA || !idB) return false;
  if (idA === idB) return true;
  const stableA = toStableId(idA);
  const stableB = toStableId(idB);
  if (stableA === stableB) return true;
  const appA = toAppId(idA);
  const appB = toAppId(idB);
  return appA === appB;
}

module.exports = {
  APP_TO_STABLE_ID_MAP,
  STABLE_TO_APP_ID_MAP,
  toStableId,
  toAppId,
  areIdsEquivalent,
};
'''
dest_js_path = Path(__file__).resolve().parent.parent / 'app' / 'data' / 'id_aliases.js'
dest_js_path.write_text(output_js, encoding='utf-8')
print(f'Generado app/data/id_aliases.ts e id_aliases.js con {len(app_to_stable)} mapeos directos y {len(stable_to_app)} mapeos inversos.')
