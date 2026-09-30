// @ts-nocheck
import fs from 'fs';
import path from 'path';
import { DATA } from '../app/data/01_trench_crusade_game_data';
import { ABILITY_LIBRARY } from '../app/data/02_ability_library';
import { FACTION_RULES_LIBRARY } from '../app/data/06_faction_special_rules_library';
import { GENERAL_TERMS_LIBRARY } from '../app/data/07_general_terms_library';

const outDir = path.resolve('referencia');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// -------------------------------------------------------------
// 1. REGLAS_Y_HABILIDADES.md
// -------------------------------------------------------------
let reglasMd = `# Gran Compendio Maestro de Reglas, Habilidades y Términos — Trench Crusade (1.0.2)

> **Fuente Única de Verdad** que consolida absolutamente todas las reglas especiales, habilidades de miniatura, acciones tácticas, reglas de facción y variantes, y términos de juego. Todos los módulos, desarrolladores y jugadores leen de este documento.

---

## 1. Términos y Mecánicas Fundamentales del Sistema

| Término / Regla | Tipo | Definición y Mecánica Canónica |
|---|---|---|
`;

for (const [term, def] of Object.entries(GENERAL_TERMS_LIBRARY)) {
  const cleanSum = (def.summary || '').replace(/\n/g, ' ');
  reglasMd += `| **${term}** | ${def.type || 'game-term'} | ${cleanSum} |\n`;
}

// Mapear qué miniaturas tienen qué habilidad
const abilityToUnits: Record<string, string[]> = {};
for (const [fid, f] of Object.entries(DATA.factions)) {
  for (const u of ((f as any).units || [])) {
    for (const ab of (u.abilities || [])) {
      const name = typeof ab === 'string' ? ab : ab.name;
      if (!abilityToUnits[name]) abilityToUnits[name] = [];
      abilityToUnits[name].push(`${u.name} (${f.name})`);
    }
  }
}
for (const m of (DATA.mercenaries || [])) {
  for (const ab of (m.abilities || [])) {
    const name = typeof ab === 'string' ? ab : ab.name;
    if (!abilityToUnits[name]) abilityToUnits[name] = [];
    abilityToUnits[name].push(`${m.name} (Mercenarios)`);
  }
}

reglasMd += `\n---

## 2. Habilidades de Miniaturas y Acciones Tácticas

| Habilidad / Acción | Tipo | Poseída por | Efecto / Regla Canónica |
|---|---|---|---|
`;

for (const [abName, def] of Object.entries(ABILITY_LIBRARY)) {
  const cleanSum = (def.summary || '').replace(/\n/g, ' ');
  const owners = abilityToUnits[abName]?.join(', ') || 'Varias / Especial';
  reglasMd += `| **${abName}** | ${def.type || 'habilidad'} | ${owners} | ${cleanSum} |\n`;
}

reglasMd += `\n---

## 3. Reglas Especiales de Facción y Doctrina

| Regla / Facción | Tipo | Descripción Canónica |
|---|---|---|
`;

for (const [ruleName, def] of Object.entries(FACTION_RULES_LIBRARY)) {
  const cleanSum = (def.summary || '').replace(/\n/g, ' ');
  reglasMd += `| **${ruleName}** | Regla de Facción | ${cleanSum} |\n`;
}

reglasMd += `\n---

## 4. Reglas Especiales de Variantes de Banda (Subfacciones)

`;

for (const [fid, f] of Object.entries(DATA.factions)) {
  const variants = (f as any).variants || [];
  if (variants.length === 0) continue;

  reglasMd += `### ${f.name}\n\n`;
  for (const v of variants) {
    reglasMd += `#### ${v.name} (\`${v.id}\`)\n`;
    reglasMd += `- **Resumen:** ${v.summary || '—'}\n`;
    if (v.specialRule) {
      reglasMd += `- **Regla Especial Principal:** ${v.specialRule}\n`;
    }
    if (v.rules && Array.isArray(v.rules)) {
      reglasMd += `- **Doctrinas Adicionales:**\n`;
      for (const r of v.rules) {
        if (typeof r === 'string') {
          reglasMd += `  - ${r}\n`;
        } else if (r.name) {
          reglasMd += `  - **${r.name}:** ${r.summary || r.desc || ''}\n`;
        }
      }
    }
    if (v.forbiddenUnitIds && v.forbiddenUnitIds.length > 0) {
      reglasMd += `- **Unidades Prohibidas:** ${v.forbiddenUnitIds.join(', ')}\n`;
    }
    if (v.mandatoryUnits && v.mandatoryUnits.length > 0) {
      reglasMd += `- **Unidades Obligatorias:** ${v.mandatoryUnits.join(', ')}\n`;
    }
    reglasMd += `\n`;
  }
}

fs.writeFileSync(path.join(outDir, 'REGLAS_Y_HABILIDADES.md'), reglasMd, 'utf8');
console.log('✓ Creado referencia/REGLAS_Y_HABILIDADES.md');

// -------------------------------------------------------------
// 2. MINIATURAS.md
// -------------------------------------------------------------
let miniMd = `# Compendio Maestro de Miniaturas — Trench Crusade (1.0.2)

> **Fuente Única de Verdad** con los costes, atributos, equipamiento innato, habilidades, mejoras y restricciones de todas las miniaturas de todas las facciones, variantes y mercenarios.

---

## Índice Rápido de Facciones

- [Principality of New Antioch](#principality-of-new-antioch)
- [Trench Pilgrims](#trench-pilgrims)
- [Sultanate of the Iron Wall](#sultanate-of-the-iron-wall)
- [Heretic Legions](#heretic-legions)
- [Cult of the Black Grail](#cult-of-the-black-grail)
- [Court of the Seven Headed Serpent](#court-of-the-seven-headed-serpent)
- [Mercenarios](#mercenarios)

---

`;

function renderUnitCard(u: any, factionName: string): string {
  let card = `### ${u.name} (\`${u.id}\`)\n\n`;
  const costStr = u.costAlt ? `${u.cost} ${u.currency || '👑'} (o ${u.costAlt} ${u.currency || '👑'} en versión alternativa)` : `${u.cost} ${u.currency || '👑'}`;
  const isLeader = u.isLeader || (u.keywords && u.keywords.includes('LEADER'));
  card += `- **Facción:** ${factionName}\n`;
  card += `- **Rango / Categoría:** ${u.tier ? u.tier.toUpperCase() : 'TROOP'} ${isLeader ? '· LÍDER' : ''} ${u.variantOnly ? `· Exclusivo de variante (\`${u.variantOnly}\`)` : ''}\n`;
  card += `- **Coste Base:** **${costStr}**\n`;
  if (u.costNote) {
    card += `- **Detalle de Coste:** ${u.costNote}\n`;
  }
  card += `- **Límite por Banda:** ${u.limit || 'Sin límite específico'}\n\n`;

  // Atributos
  card += `#### Atributos Base\n\n`;
  card += `| MOV (Move) | MEL (Melee) | DIS (Ranged) | BLI (Armour) | PEANA (Base) |\n`;
  card += `|---|---|---|---|---|\n`;
  const st = u.stats || {};
  card += `| **${st.movement || '—'}** | **${st.melee || '—'}** | **${st.ranged || '—'}** | **${st.armour || '0'}** | **${st.base || '25mm'}** |\n\n`;

  // Keywords
  const kws = (u.keywords || []).join(', ') || 'Ninguna';
  card += `- **Keywords:** ${kws}\n`;

  // Notas especiales
  if (u.note) {
    card += `- **Reglas Especiales / Notas:** ${u.note}\n`;
  }

  // Equipamiento permanente
  if (u.permanentEquipment && u.permanentEquipment.length > 0) {
    card += `- **Equipamiento Innato / Permanente:** ${u.permanentEquipment.join(', ')}\n`;
  } else {
    card += `- **Equipamiento Innato:** Ninguno (comienza desarmado salvo compras del Battlekit)\n`;
  }

  // Habilidades
  if (u.abilities && u.abilities.length > 0) {
    card += `\n#### Habilidades Innatas\n\n`;
    for (const ab of u.abilities) {
      const name = typeof ab === 'string' ? ab : ab.name;
      const def = ABILITY_LIBRARY[name];
      const desc = def ? def.summary : (typeof ab === 'object' && ab.desc ? ab.desc : 'Ver descripción de reglas');
      card += `- **${name}:** ${desc}\n`;
    }
  }

  // Mejoras disponibles (Upgrades)
  if (u.upgrades && u.upgrades.length > 0) {
    card += `\n#### Mejoras Disponibles (Upgrades)\n\n`;
    card += `| Mejora | Coste | Efecto y Reglas |\n`;
    card += `|---|---|---|\n`;
    for (const up of u.upgrades) {
      const upCost = `${up.cost} ${up.currency || '👑'}`;
      const upEffect = (up.note || up.summary || up.desc || (up.addsAbilities ? up.addsAbilities.join(', ') : '—')).replace(/\n/g, ' ');
      card += `| **${up.name}** | ${upCost} | ${upEffect} |\n`;
    }
  }

  // Acceso al Battlekit y restricciones
  const bka = u.battlekitAccess;
  if (bka || u.battlekitNote) {
    card += `\n#### Restricciones de Battlekit\n\n`;
    if (u.battlekitNote) {
      card += `- **Nota de Battlekit:** ${u.battlekitNote}\n`;
    }
    if (bka) {
      if (bka.forbidden) {
        card += `- **Battlekit Prohibido:** Esta unidad no puede adquirir equipo del Battlekit de facción.\n`;
      }
      if (bka.forbidCategories && bka.forbidCategories.length > 0) {
        card += `- **Categorías Prohibidas:** ${bka.forbidCategories.join(', ')}\n`;
      }
      if (bka.forbiddenWeaponNames && bka.forbiddenWeaponNames.length > 0) {
        card += `- **Armas Específicas Prohibidas:** ${bka.forbiddenWeaponNames.join(', ')}\n`;
      }
      if (bka.weaponLimits) {
        const wl = bka.weaponLimits;
        card += `- **Límites de Armas:** Melee máx: ${wl.meleeMax ?? 'estándar'}, Ranged máx: ${wl.rangedMax ?? 'estándar'}${wl.totalMax ? `, Total máx: ${wl.totalMax}` : ''}\n`;
      }
      if (bka.onlyCategories && bka.onlyCategories.length > 0) {
        card += `- **Solo puede equipar:** ${bka.onlyCategories.join(', ')}\n`;
      }
    }
  }

  card += `\n---\n\n`;
  return card;
}

for (const [fid, f] of Object.entries(DATA.factions)) {
  miniMd += `## ${f.name}\n\n`;
  for (const u of ((f as any).units || [])) {
    miniMd += renderUnitCard(u, f.name);
  }
}

miniMd += `## Mercenarios\n\n`;
for (const m of (DATA.mercenaries || [])) {
  miniMd += renderUnitCard(m, 'Mercenarios');
}

fs.writeFileSync(path.join(outDir, 'MINIATURAS.md'), miniMd, 'utf8');
console.log('✓ Creado referencia/MINIATURAS.md');

console.log('Compendios maestros generados con éxito.');
