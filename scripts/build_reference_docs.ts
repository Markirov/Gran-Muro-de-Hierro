import fs from 'fs';
import path from 'path';
import { DATA } from '../app/data/01_trench_crusade_game_data';
import { KEYWORD_GLOSSARY } from '../app/data/03_keyword_glossary_canon_fuente_nica_de_lo';
import { WEAPON_KEYWORD_LIBRARY } from '../app/data/05_weapon_keyword_library';
import { KEYWORD_LIBRARY } from '../app/data/04_keyword_library';
import { ABILITY_LIBRARY } from '../app/data/02_ability_library';
import { STIPULATION_LIBRARY } from '../app/data/08_stipulation_library';

const outDir = path.resolve('referencia');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// -------------------------------------------------------------
// 1. KEYWORDS.md
// -------------------------------------------------------------
let kwMd = `# Compendio Canónico de Keywords — Trench Crusade (Reglamento 1.0.2)

> **Fuente Única de Verdad** para el proyecto. Documento consolidado con todas las keywords de modelo, de armas, de combate y de facción del reglamento oficial, Changelog 1.0.2 y FAQ/Erratas.

---

## 1. Reglas Fundamentales de Armas y Combate (Aclaraciones Críticas)

- **\`RELOAD\`:**
  > *"Si el modelo ataca con esta arma, su activación termina al acabar la ACTION con la que atacó."* (Rulebook 1.0.2).
  > **Nota de diseño:** En Trench Crusade, \`RELOAD\` **NO** significa que el arma quede descargada ni que se deba gastar una acción de recargar con fichas en mesa. Significa que disparar esa arma consume el resto del turno de la miniatura. En el Sultanato de Hierro, la única arma con esta regla es la **Machine Gun**.
- **\`GRANADAS\`:**
  > Las granadas estándar (*Frag Grenade*, *Concussion Grenade*, *Smoke Grenade*, etc.) son armas a distancia estándar del Battlekit (generalmente alcance 6" u 8", 1 mano). **NO** tienen la keyword \`CONSUMABLE\`. Una miniatura puede lanzar granadas en cualquiera de sus acciones de disparo sin que se agoten tras un uso.
- **\`AMMUNITION (X)\`:**
  > *"La pieza se usa en la siguiente partida del modelo. Al desplegarlo, eliges 1 arma a distancia: gana la keyword X hasta el final de la partida. Esa arma no puede tener ya BLAST, FIRE, GAS ni SHRAPNEL, ni más de un tipo de AMMUNITION."* (Rulebook 1.0.2).
  > **Nota de Errata (Q4):** Si se aplica a una Pistola, sus efectos también aplican cuando la pistola se usa en combate cuerpo a cuerpo.

---

## 2. Glosario Canónico Completo (Rulebook 1.0.2)

| Keyword | Tipo | Origen | Definición / Regla Canónica | Notas y Erratas |
|---|---|---|---|---|
`;

for (const k of KEYWORD_GLOSSARY) {
  const cleanText = (k.text || '').replace(/\n/g, ' ');
  const cleanNote = (k.note || '').replace(/\n/g, ' ');
  kwMd += `| **${k.key}** | ${k.type || 'Efecto'} | ${k.src || '1.0.2'} | ${cleanText} | ${cleanNote || '—'} |\n`;
}

kwMd += `\n---

## 3. Keywords de Armas y Efectos de Combate

| Keyword | Tipo | Descripción Canónica |
|---|---|---|
`;

for (const [kw, def] of Object.entries(WEAPON_KEYWORD_LIBRARY)) {
  const cleanSum = (def.summary || '').replace(/\n/g, ' ');
  kwMd += `| **${kw}** | ${def.type || 'effect'} | ${cleanSum} |\n`;
}

kwMd += `\n---

## 4. Keywords de Modelo y Rasgos de Unidad

| Keyword | Descripción Canónica |
|---|---|
`;

for (const [kw, desc] of Object.entries(KEYWORD_LIBRARY)) {
  const cleanDesc = (desc || '').replace(/\n/g, ' ');
  kwMd += `| **${kw}** | ${cleanDesc} |\n`;
}

fs.writeFileSync(path.join(outDir, 'KEYWORDS.md'), kwMd, 'utf8');
console.log('✓ Creado referencia/KEYWORDS.md');

// -------------------------------------------------------------
// 2. ARMAS.md
// -------------------------------------------------------------
let armasMd = `# Compendio Canónico de Armas — Trench Crusade (1.0.2)

> **Fuente Única de Verdad** de todas las armas cuerpo a cuerpo, a distancia y granadas de todas las facciones, variantes y mercenarios.

---

`;

const factionNames: Record<string, string> = {
  'new-antioch': 'Principality of New Antioch',
  'trench-pilgrims': 'Trench Pilgrims',
  'iron-sultanate': 'Sultanate of the Iron Wall',
  'heretic-legions': 'Heretic Legions',
  'black-grail': 'Black Grail',
  'court-serpent': 'Court of the Seven Headed Serpent',
};

const processedWeapons = new Map<string, any>();

for (const [fid, f] of Object.entries(DATA.factions)) {
  const facArmoury = (f as any).armoury || {};
  const categories = ['melee', 'ranged', 'grenades', 'anchoriteRanged'];
  
  for (const cat of categories) {
    const list = facArmoury[cat] || [];
    for (const item of list) {
      if (!processedWeapons.has(item.id)) {
        processedWeapons.set(item.id, { ...item, faction: factionNames[fid] || fid, category: cat });
      }
    }
  }
}

// Separar en Melee, Ranged y Granadas
const meleeList = Array.from(processedWeapons.values()).filter(w => w.category === 'melee');
const rangedList = Array.from(processedWeapons.values()).filter(w => w.category === 'ranged' || w.category === 'anchoriteRanged');
const grenadeList = Array.from(processedWeapons.values()).filter(w => w.category === 'grenades');

armasMd += `## 1. Armas Cuerpo a Cuerpo (Melee Weapons)\n\n`;
armasMd += `| Arma | Facción / Origen | Tipo | Alcance | Modif. Daño | Keywords | Coste | Restricción / Notas |\n`;
armasMd += `|---|---|---|---|---|---|---|---|\n`;

for (const w of meleeList) {
  const kws = (w.weaponKeywords || []).join(', ') || '—';
  const notes = (w.restriction || w.note || '—').replace(/\n/g, ' ');
  armasMd += `| **${w.name}** | ${w.faction} | ${w.type || '1-Handed'} | ${w.range || 'Melee'} | ${w.damageModifier || '—'} | ${kws} | ${w.cost} ${w.currency || '👑'} | ${notes} |\n`;
}

armasMd += `\n---\n\n## 2. Armas a Distancia (Ranged Weapons)\n\n`;
armasMd += `| Arma | Facción / Origen | Tipo | Alcance | Modif. Daño | Keywords | Coste | Restricción / Notas |\n`;
armasMd += `|---|---|---|---|---|---|---|---|\n`;

for (const w of rangedList) {
  const kws = (w.weaponKeywords || []).join(', ') || '—';
  const notes = (w.restriction || w.note || '—').replace(/\n/g, ' ');
  armasMd += `| **${w.name}** | ${w.faction} | ${w.type || '1-Handed'} | ${w.range || '—'} | ${w.damageModifier || '—'} | ${kws} | ${w.cost} ${w.currency || '👑'} | ${notes} |\n`;
}

armasMd += `\n---\n\n## 3. Granadas y Armas Arrojadizas\n\n`;
armasMd += `> **Regla de uso:** Las granadas comunes no son consumibles desechables, sino armas de disparo reutilizables en cada Shoot ACTION.\n\n`;
armasMd += `| Granada | Facción / Origen | Tipo | Alcance | Keywords | Coste | Restricción / Notas |\n`;
armasMd += `|---|---|---|---|---|---|---|\n`;

for (const w of grenadeList) {
  const kws = (w.weaponKeywords || []).join(', ') || '—';
  const notes = (w.restriction || w.note || '—').replace(/\n/g, ' ');
  armasMd += `| **${w.name}** | ${w.faction} | ${w.type || '1-Handed'} | ${w.range || '8"'} | ${kws} | ${w.cost} ${w.currency || '👑'} | ${notes} |\n`;
}

fs.writeFileSync(path.join(outDir, 'ARMAS.md'), armasMd, 'utf8');
console.log('✓ Creado referencia/ARMAS.md');

// -------------------------------------------------------------
// 3. ARMADURAS_Y_ESCUDOS.md
// -------------------------------------------------------------
let armourMd = `# Compendio Canónico de Armaduras y Escudos — Trench Crusade (1.0.2)

> **Fuente Única de Verdad** para todas las armaduras corporales y escudos del juego.

---

## 1. Armaduras Corporales (Body Armour)

| Armadura | Facción / Origen | Modificador de Blindaje | Keywords y Reglas Especiales | Coste | Restricciones |\n`;
armourMd += `|---|---|---|---|---|---|\n`;

const processedArmour = new Map<string, any>();
const processedShields = new Map<string, any>();

for (const [fid, f] of Object.entries(DATA.factions)) {
  const facArmoury = (f as any).armoury || {};
  for (const item of (facArmoury.armour || [])) {
    if (!processedArmour.has(item.id)) {
      processedArmour.set(item.id, { ...item, faction: factionNames[fid] || fid });
    }
  }
  for (const item of (facArmoury.shields || [])) {
    if (!processedShields.has(item.id)) {
      processedShields.set(item.id, { ...item, faction: factionNames[fid] || fid });
    }
  }
}

for (const a of processedArmour.values()) {
  const kws = (a.weaponKeywords || []).join(', ') || '—';
  const notes = (a.note || '—').replace(/\n/g, ' ');
  const restr = (a.restriction || '—').replace(/\n/g, ' ');
  const modMatch = (a.weaponKeywords || []).find((k: string) => /-\d+\s+INJURY MODIFIER/i.test(k));
  const mod = modMatch ? modMatch.split(' ')[0] : (a.armourModifier || '-1');
  armourMd += `| **${a.name}** | ${a.faction} | ${mod} | ${kws}${notes !== '—' ? '; ' + notes : ''} | ${a.cost} ${a.currency || '👑'} | ${restr} |\n`;
}

armourMd += `\n---

## 2. Escudos (Shields)

| Escudo | Facción / Origen | Modificador de Herida | Reglas Especiales / Keywords | Coste | Restricciones |\n`;
armourMd += `|---|---|---|---|---|---|\n`;

for (const s of processedShields.values()) {
  const kws = (s.weaponKeywords || []).join(', ') || '—';
  const notes = (s.note || '—').replace(/\n/g, ' ');
  const restr = (s.restriction || '—').replace(/\n/g, ' ');
  armourMd += `| **${s.name}** | ${s.faction} | -1 INJURY MODIFIER | ${kws}${notes !== '—' ? '; ' + notes : ''} | ${s.cost} ${s.currency || '👑'} | ${restr} |\n`;
}

fs.writeFileSync(path.join(outDir, 'ARMADURAS_Y_ESCUDOS.md'), armourMd, 'utf8');
console.log('✓ Creado referencia/ARMADURAS_Y_ESCUDOS.md');

// -------------------------------------------------------------
// 4. EQUIPO_Y_MUNICION.md
// -------------------------------------------------------------
let equipMd = `# Compendio Canónico de Equipo y Munición — Trench Crusade (1.0.2)

> **Fuente Única de Verdad** para equipo de apoyo, herramientas médicas, instrumentos, reliquias y municiones especiales.

---

## 1. Munición Especial

| Munición | Facción / Origen | Efecto / Keywords Canónicas | Coste | Restricción / Límite |\n`;
equipMd += `|---|---|---|---|---|\n`;

const processedEquip = new Map<string, any>();

for (const [fid, f] of Object.entries(DATA.factions)) {
  const facArmoury = (f as any).armoury || {};
  const list = [...(facArmoury.equipment || []), ...(facArmoury.anchoriteBattlekit || [])];
  for (const item of list) {
    if (!processedEquip.has(item.id)) {
      processedEquip.set(item.id, { ...item, faction: factionNames[fid] || fid });
    }
  }
}

const standardEquipRules: Record<string, string> = {
  'Medi-kit': 'Concede Treat ACTION: Risky Success Roll a 1". Con éxito, retira 1 BLOOD MARKER del usuario o de un aliado a 1", o levanta a un aliado Down a 1".',
  'Binoculars': 'Concede Spotter ACTION: Elige un enemigo visible en Line of Sight. Los ataques a distancia aliados contra ese objetivo ignoran Cover hasta el final de la ronda.',
  'Shovel': 'Concede Entrench ACTION: Coloca un marcador de Trinchera en contacto con la peana (da Cover). Con STRONG puede usarse además como arma cuerpo a cuerpo de 1 mano.',
  'Mountaineer Kit': 'El portador ignora las penalizaciones de movimiento por escalar (Climb) y cruzar terreno vertical difícil.',
  'Musical Instrument': 'Concede Rallying Horn / Instrument ACTION: +1 DICE a los Morale Checks de los aliados a 8". En Alba puede ser Bagpipes gratis (NEGATE FEAR a 8"). En Heretic Legions puede ser Carnyx (FEAR gratis).',
  'Gas Mask': 'Otorga NEGATE GAS: el portador es completamente inmune a los efectos del Gas y las armas con keyword GAS.',
  'Combat Helmet': 'Otorga NEGATE SHRAPNEL frente a impactos o armas con metralla.',
  'Iron Capirote': 'Otorga NEGATE FEAR y NEGATE SHRAPNEL.',
};

const ammoList = Array.from(processedEquip.values()).filter(e => 
  /ammunition|bullets|shells/i.test(e.name) || 
  (e.weaponKeywords || []).some((k: string) => k.startsWith('AMMUNITION'))
);

const miscList = Array.from(processedEquip.values()).filter(e => !ammoList.includes(e));

for (const am of ammoList) {
  const kws = (am.weaponKeywords || []).join(', ') || '—';
  const notes = (am.note || '—').replace(/\n/g, ' ');
  const restr = (am.restriction || '—').replace(/\n/g, ' ');
  equipMd += `| **${am.name}** | ${am.faction} | ${kws}${notes !== '—' ? ' (' + notes + ')' : ''} | ${am.cost} ${am.currency || '👑'} | ${restr} |\n`;
}

equipMd += `\n---

## 2. Equipo Misceláneo, Óptica y Herramientas

| Objeto | Facción / Origen | Efecto Canónico / Reglas | Coste | Restricción |\n`;
equipMd += `|---|---|---|---|---|\n`;

for (const eq of miscList) {
  const kws = (eq.weaponKeywords || []).join(', ') || '—';
  const notes = (eq.note || standardEquipRules[eq.name] || '—').replace(/\n/g, ' ');
  const restr = (eq.restriction || '—').replace(/\n/g, ' ');
  const effect = notes !== '—' ? notes : (kws !== '—' ? kws : '—');
  equipMd += `| **${eq.name}** | ${eq.faction} | ${effect} | ${eq.cost} ${eq.currency || '👑'} | ${restr} |\n`;
}

fs.writeFileSync(path.join(outDir, 'EQUIPO_Y_MUNICION.md'), equipMd, 'utf8');
console.log('✓ Creado referencia/EQUIPO_Y_MUNICION.md');

console.log('Todos los documentos generados exitosamente en /referencia.');
