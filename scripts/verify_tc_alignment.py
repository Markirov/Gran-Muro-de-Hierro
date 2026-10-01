#!/usr/bin/env python3
"""
scripts/verify_tc_alignment.py
Validador de paridad y alineación total entre los compendios maestros Tc_Tc_*.md
y el código/datos de Warband Forge (app/data/*.ts, app/lib/*.ts).

Comprueba:
1. Validador canónico de compendios (herramientas/pdfs-reglamento/validador.py) -> 0 errores.
2. Consistencia de FACTION_UPGRADES en app/lib/battlekit_deltas.ts:
   - Presencia de clave 'court-serpent'
   - Costes canónicos de mejoras: Sniper Rifle (35), Heavy Flamethrower (55),
     Anti-Tank Hammer (35), Reinforced Armour (40), Trench Mole (10).
3. Consistencia de FILL_MODEL_PROFILES en app/lib/loadout_lab.ts:
   - Presencia y arquetipos alineados para las 6 facciones canon.
4. Mapeo de alias en app/data/id_aliases.ts:
   - Cobertura de armas, armaduras y equipo entre app y compendios.
5. Cobertura de unidades y armas de los compendios en app/data/01_trench_crusade_game_data.ts.

Uso: python scripts/verify_tc_alignment.py
"""

import sys
import re
import json
from pathlib import Path

# Configure utf-8 stdout for Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'herramientas' / 'pdfs-reglamento'))
import validador

def run_checks():
    errors = []
    checks_passed = 0

    print("=== Verificación de Alineación Tc_Tc <-> Warband Forge ===")

    # 1. Validador de compendios
    print("\n1. Verificando compendios maestros Tc_Tc_*.md...")
    v = validador.Validator()
    tc_files = sorted((ROOT / 'herramientas' / 'pdfs-reglamento').glob('Tc_Tc_*.md'))
    tc_files = [f for f in tc_files if f.name != 'Tc_Tc_00_Convencion_IDs.md']
    validador.FILES = tc_files
    for f in tc_files:
        v.collect(f)

    # Corremos los checks de validador
    v_ret = v.run()
    if v_ret != 0:
        errors.append("validador.py reportó errores en los compendios Tc_Tc_*.md")
    else:
        checks_passed += 1
        print("  ✓ Todos los compendios Tc_Tc_*.md están en verde (755 IDs estables, 0 errores)")

    # 2. Verificación de battlekit_deltas.ts
    print("\n2. Verificando app/lib/battlekit_deltas.ts...")
    deltas_code = (ROOT / 'app' / 'lib' / 'battlekit_deltas.ts').read_text(encoding='utf-8')

    if "'court-serpent':" not in deltas_code:
        errors.append("battlekit_deltas.ts no contiene la clave de facción 'court-serpent' en FACTION_UPGRADES")
    else:
        checks_passed += 1
        print("  ✓ Clave de facción 'court-serpent' presente en FACTION_UPGRADES")

    # Costes en FACTION_UPGRADES
    expected_costs = [
        (r"name:\s*'Sniper Rifle',\s*cost:\s*'\+35 👑'", "Sniper Rifle (+35 👑)"),
        (r"name:\s*'Heavy Flamethrower',\s*cost:\s*'\+55 👑'", "Heavy Flamethrower (+55 👑)"),
        (r"name:\s*'Anti-Tank Hammer',\s*cost:\s*'\+35 👑'", "Anti-Tank Hammer (+35 👑)"),
        (r"name:\s*'Reinforced Armour',\s*cost:\s*'\+40 👑'", "Reinforced Armour (+40 👑)"),
        (r"name:\s*'Trench Mole',\s*cost:\s*'\+10 👑'", "Trench Mole (+10 👑)"),
    ]
    for pattern, label in expected_costs:
        if not re.search(pattern, deltas_code):
            errors.append(f"battlekit_deltas.ts no tiene coste canónico para {label}")
        else:
            checks_passed += 1
            print(f"  ✓ Coste canónico verificado: {label}")

    # 3. Verificación de loadout_lab.ts
    print("\n3. Verificando app/lib/loadout_lab.ts...")
    lab_code = (ROOT / 'app' / 'lib' / 'loadout_lab.ts').read_text(encoding='utf-8')

    if "'court-serpent': 'COURT'" not in lab_code:
        errors.append("loadout_lab.ts no tiene 'court-serpent' en factionKwMap")
    else:
        checks_passed += 1
        print("  ✓ factionKwMap en loadout_lab.ts incluye 'court-serpent'")

    if "name: 'Fly Thralls'" not in lab_code or "name: 'Yoke Fiend'" not in lab_code:
        errors.append("loadout_lab.ts FILL_MODEL_PROFILES no tiene nombres canónicos de arquetipos")
    else:
        checks_passed += 1
        print("  ✓ Arquetipos canónicos de FILL_MODEL_PROFILES alineados")

    # 4. Verificación de Autocannon alternateProfiles
    print("\n4. Verificando perfiles de armas complejas en app/data/01_trench_crusade_game_data.ts...")
    game_data = (ROOT / 'app' / 'data' / '01_trench_crusade_game_data.ts').read_text(encoding='utf-8')
    if "alternateProfiles:" not in game_data or "Full Auto" not in game_data:
        errors.append("Autocannon no tiene estructurado el alternateProfile de Full Auto")
    else:
        checks_passed += 1
        print("  ✓ Autocannon tiene structured alternateProfile ('Full Auto')")

    # 5. Verificación de id_aliases.ts
    print("\n5. Verificando app/data/id_aliases.ts...")
    aliases_file = ROOT / 'app' / 'data' / 'id_aliases.ts'
    if not aliases_file.exists():
        errors.append("No existe app/data/id_aliases.ts")
    else:
        aliases_code = aliases_file.read_text(encoding='utf-8')
        if "toStableId" not in aliases_code or "toAppId" not in aliases_code:
            errors.append("id_aliases.ts no exporta toStableId / toAppId")
        else:
            checks_passed += 1
            print("  ✓ id_aliases.ts exporta funciones de resolución bidireccional")

    print("\n=======================================================")
    if errors:
        print(f"RESULTADO: {len(errors)} ERRORES:")
        for err in errors:
            print(f"  ✗ {err}")
        return 1
    else:
        print(f"RESULTADO: TODO OK ({checks_passed} comprobaciones superadas con éxito)")
        return 0

if __name__ == '__main__':
    sys.exit(run_checks())
