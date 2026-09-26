/* Auditoría canon de la armería (2026-09-25) — keywords de Battlekit.
 * Fuente: perfiles "Type Range Keywords" de Trench-Crusade-Digital-Rulebook.pdf
 * y Warbands-of-Trench-Crusade.pdf, con erratas de Changelog 1.0.2
 * (DEPLOYABLE en Field Shrine p.82, Anq Guard p.100, Grand Cannon p.102;
 * AMMUNITION (+1 DICE) en Alchemical Ammunition).
 * Este lote solo toca equipo/piezas cuyas keywords no lee el motor del Lab.
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const js = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/)[1];
const bootIdx = js.search(/\nfunction boot\(\)/);
const dom = new JSDOM(html.replace(/<script[\s\S]*?<\/script>/g, ''), { runScripts: 'outside-only', url: 'http://localhost/' });
dom.window.alert = () => {};
const W = dom.window;
W.eval(js.slice(0, bootIdx) + '\n;window.__lib = { DATA };');
const { DATA } = W.__lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

const byId = {};
for (const f of Object.values(DATA.factions)) for (const items of Object.values(f.armoury || {})) for (const it of items || []) byId[it.id] = it;
const kwOf = (id) => (byId[id] && byId[id].weaponKeywords || []).slice().sort().join(', ');

const EXPECTED = {
  // Combat Helmet — Rulebook p.80
  'helmet-na': ['NEGATE SHRAPNEL'], 'helmet-is': ['NEGATE SHRAPNEL'], 'helmet-hl': ['NEGATE SHRAPNEL'],
  'helmet-bg': ['NEGATE SHRAPNEL'], 'helmet-co': ['NEGATE SHRAPNEL'],
  // Gas Mask — Rulebook p.83
  'gas-mask-na': ['NEGATE GAS'], 'gas-mask-tp': ['NEGATE GAS'], 'gas-mask-is': ['NEGATE GAS'],
  'gas-mask-hl': ['NEGATE GAS'], 'gas-mask-co': ['NEGATE GAS'],
  // Musical Instrument / Troop Flag — Rulebook p.84-85
  'music-na': ['HELD'], 'music-tp': ['HELD'], 'music-is': ['HELD'], 'music-hl': ['HELD'], 'music-bg': ['HELD'], 'music-co': ['HELD'],
  'flag-na': ['HELD', 'LEADER'], 'flag-tp': ['HELD', 'LEADER'], 'flag-is': ['HELD', 'LEADER'],
  'flag-hl': ['HELD', 'LEADER'], 'flag-bg': ['HELD', 'LEADER'], 'flag-co': ['HELD', 'LEADER'],
  // Consumibles — Rulebook
  'martyr-pills-na': ['CONSUMABLE'], 'martyr-pills-tp': ['CONSUMABLE'], 'blessed-icon-tp': ['CONSUMABLE'],
  'unholy-trinket-hl': ['CONSUMABLE'], 'unholy-trinket-bg': ['CONSUMABLE'], 'unholy-trinket-co': ['CONSUMABLE'],
  // Field Shrine — Rulebook p.82 + Changelog 1.0.2
  'shrine-na': ['DEPLOYABLE'], 'shrine-tp': ['DEPLOYABLE'], 'shrine-bg': ['DEPLOYABLE'],
  // Reliquias — Rulebook
  'holy-relic-tp': ['BLESSED 1'], 'holy-relic-is': ['BLESSED 1'],
  'unholy-relic-hl': ['FEAR'], 'unholy-relic-co': ['FEAR'], 'inf-brand-hl': ['NEGATE FIRE'],
  // Warbands of TC
  'capirote-tp': ['NEGATE FEAR', 'NEGATE SHRAPNEL'], 'marid-shovel-is': ['HEAVY'],
  'banner-desert-wind-iw': ['HELD', 'LEADER'], 'explosive-charges-iw': ['CONSUMABLE'],
  'compound-eyes-bg': ['NEGATE SHRAPNEL'], 'alch-ammo-is': ['AMMUNITION (+1 DICE)'],
  'anq-guard-iw': ['DEPLOYABLE', 'HEAVY'],
  'grand-cannon-iw': ['+2 INJURY DICE', 'DEPLOYABLE', 'HEAVY', 'IGNORE ARMOUR'],
};

console.log('\nGroup 1: keywords canon de equipo');
for (const [id, kws] of Object.entries(EXPECTED)) {
  ok(!!byId[id] && kwOf(id) === kws.slice().sort().join(', '), `${id}: ${kws.join(', ')} (got ${kwOf(id) || '—'})`);
}

// Lote 2 (aprobado por Marcos): armas y granadas, sí afectan al Lab.
// Revisión 2026-09-26: el Rulebook de referencia es el 1.0.1 (el PDF sin número es
// la 1.0.0). En 1.0.1 la Heavy Shotgun lleva +1 INJURY DICE y SHOTGUN y Tungsten
// shot da +1 (no +2); la Trench Knife tiene -1 DICE.
console.log('\nGroup 2: armas y granadas (Rulebook 1.0.1 pp.70-78, Warbands of TC)');
const FRAG = ['ASSAULT', 'BLAST 2"', 'IGNORE COVER', 'IGNORE LONG RANGE', 'SHRAPNEL'];
const GAS = ['-1 INJURY DICE', 'ASSAULT', 'BLAST 3"', 'GAS', 'IGNORE ARMOUR', 'IGNORE COVER', 'IGNORE LONG RANGE'];
const INC = ['ASSAULT', 'FIRE', 'IGNORE COVER', 'IGNORE LONG RANGE'];
const WEAPONS = {
  'frag-na': FRAG, 'frag-is': FRAG, 'frag-hl': FRAG,
  'gas-hl': GAS, 'gas-bg': GAS, 'gas-co': GAS,
  'incend-na': INC, 'incend-tp': INC, 'incend-is': INC, 'incend-hl': INC, 'incend-co': INC,
  'molotov-tp': ['-1 INJURY DICE'].concat(INC),
  'warcross-tp': ['ASSAULT', 'IGNORE LONG RANGE'],
  // Warbands of Trench Crusade 1.0.2 (trenchcrusade.com, 09-sep-2026).
  'parasite-bg': ['ASSAULT', 'IGNORE COVER', 'IGNORE LONG RANGE'],
  'flail-tp': ['+1 DICE'],
  'satchel-na': ['+1 INJURY DICE', 'BLAST 3"', 'CONSUMABLE', 'HEAVY', 'IGNORE ARMOUR', 'IGNORE COVER', 'SCATTER'],
  'heavy-shotgun-na': ['+1 DICE', '+1 INJURY DICE', 'HEAVY', 'SHOTGUN'],
  'trench-knife-na': ['-1 DICE'], 'trench-knife-tp': ['-1 DICE'], 'trench-knife-is': ['-1 DICE'],
  'trench-knife-hl': ['-1 DICE'], 'trench-knife-bg': ['-1 DICE'], 'trench-knife-co': ['-1 DICE'],
  'putrid-shotgun-bg': ['+1 DICE', 'ASSAULT', 'INFECTION MARKERS', 'SHOTGUN'],
  'ophidian-rifle-co': ['HEAVY'],
  'punt-gun-anchor': ['+1 DICE', '+1 INJURY DICE', 'HEAVY', 'SHOTGUN', 'SHRAPNEL'],
  'trench-mortar-anchor': ['+1 INJURY DICE', 'BLAST 3"', 'FIRE', 'HEAVY', 'IGNORE COVER', 'SCATTER'],
  'heavy-ballistic-na': ['COVER'],
  'incend-ammo-tp': ['AMMUNITION (FIRE)', 'CONSUMABLE'], 'incend-ammo-hl': ['AMMUNITION (FIRE)', 'CONSUMABLE'],
  'incend-ammo-co': ['AMMUNITION (FIRE)', 'CONSUMABLE'],
};
for (const [id, kws] of Object.entries(WEAPONS)) {
  ok(!!byId[id] && kwOf(id) === kws.slice().sort().join(', '), `${id}: ${kws.join(', ')} (got ${kwOf(id) || '—'})`);
}
ok(byId['satchel-na'] && byId['satchel-na'].range === '6"', 'Satchel Charge alcance 6"');
ok(/Overcharge/.test(byId['punt-gun-anchor'].note || ''), 'Punt Gun: Overcharge como nota de regla');
ok(/High Trajectory/.test(byId['trench-mortar-anchor'].note || ''), 'Trench Mortar: High Trajectory como nota de regla');
ok(['incend-na', 'incend-tp', 'incend-is', 'incend-hl', 'incend-co', 'molotov-tp'].every(id => byId[id].critIgnoreArmour === true),
   'Liquid Fire: flag critIgnoreArmour en incendiarias y Molotov');
ok(byId['heavy-shotgun-na'].shortRangeInjuryDice === 1, 'Heavy Shotgun: flag shortRangeInjuryDice = 1 (Tungsten shot, 1.0.1)');

ok(/Unwieldy/.test(byId['flail-tp'].note || ''), 'Flail/Scourge: nota Unwieldy (el +1 DICE no aplica como Off-Hand)');
ok(/Unnatural Inversion/.test(byId['ophidian-rifle-co'].note || '') && byId['ophidian-rifle-co'].unnaturalInversion === true,
   'Ophidian Rifle: Unnatural Inversion como nota + flag');

console.log('\nGroup 3: motor del Lab');
const wpn = (id) => W._armouryItemToBattleWeapon(byId[id]);
ok(typeof W.hasBlastKeyword === 'function' && W.hasBlastKeyword(wpn('frag-na')) && W.hasBlastKeyword(wpn('gas-hl')) &&
   !W.hasBlastKeyword(wpn('incend-na')), 'hasBlastKeyword reconoce BLAST 2" y BLAST 3"; incendiaria sin BLAST');
ok(wpn('incend-na').critIgnoreArmour === true && wpn('heavy-shotgun-na').shortRangeInjuryDice === 1,
   '_armouryItemToBattleWeapon copia los flags');
ok(wpn('ophidian-rifle-co').unnaturalInversion === true, '_armouryItemToBattleWeapon copia unnaturalInversion');
{
  // Unnatural Inversion: con Cover el modificador pasa de -1 DICE a +1 DICE.
  const origCover = W.applyTerrainCoverModifier, origSR2 = W.successRollWithBlessing_lab, origIR2 = W.injuryRoll_lab;
  let dm = null;
  W.applyTerrainCoverModifier = (o) => (o && o.attackerHasIgnoreCover ? 0 : -1);  // siempre a cubierto
  W.successRollWithBlessing_lab = (a, d) => { dm = d; return 'FAILURE'; };
  const mk0 = () => ({ rangedDice: 0, meleeDice: 0, bloodMarkers: 0, armour: 0, keywords: new Set(), weapons: [], isOut: false, isDown: false });
  W.resolveRanged_lab(mk0(), mk0(), wpn('ophidian-rifle-co'), []);
  ok(dm === 1, 'Unnatural Inversion: objetivo a cubierto → +1 DICE (got ' + dm + ')');
  W.resolveRanged_lab(mk0(), mk0(), wpn('frag-na'), []);
  ok(dm === 0, 'arma normal con IGNORE COVER sigue en 0 (got ' + dm + ')');
  const rifle = { name: 'Rifle', isRanged: true, range: 24, diceMod: 0, injuryDice: 0, injuryMod: 0, keywords: new Set() };
  W.resolveRanged_lab(mk0(), mk0(), rifle, []);
  ok(dm === -1, 'arma normal a cubierto → -1 DICE (got ' + dm + ')');
  W.applyTerrainCoverModifier = origCover; W.successRollWithBlessing_lab = origSR2; W.injuryRoll_lab = origIR2;
}
const cw = W.companionEquipToBattleWeapon({ name: 'Molotov Cocktail', type: 'grenade' });
ok(cw && cw.critIgnoreArmour === true, 'companionEquipToBattleWeapon copia critIgnoreArmour');

// Las funciones del script son globales de window: se pueden interceptar.
const origSR = W.successRollWithBlessing_lab, origIR = W.injuryRoll_lab;
let lastDiceMod = null, lastInjury = null;
W.successRollWithBlessing_lab = (a, d) => { lastDiceMod = d; return 'SUCCESS'; };
W.injuryRoll_lab = (dice, mod, armour, bypass) => { lastInjury = { dice, mod, bypass }; return 'NONE'; };
const mk = (x) => ({ rangedDice: 0, meleeDice: 0, bloodMarkers: 0, armour: -1, keywords: new Set(), weapons: [],
  isOut: false, isDown: false, _pos: x == null ? undefined : { x, y: 0 } });

const shotgun = { name: 'Shotgun', isRanged: true, range: 12, diceMod: 1, injuryDice: 0, injuryMod: 0, keywords: new Set(['SHOTGUN', 'IGNORE COVER']) }; // IGNORE COVER: quita el azar de cobertura
W.resolveRanged_lab(mk(), mk(), shotgun, []);
ok(lastDiceMod === 1, 'SHOTGUN no suma +1 DICE extra (el +1 ya va en el perfil) → diceMod ' + lastDiceMod);

const molo = wpn('molotov-tp');
W.applyInjury_lab(mk(), mk(), molo, true, false, []);
ok(lastInjury && lastInjury.bypass === true, 'Liquid Fire: crítico → IGNORE ARMOUR');
W.applyInjury_lab(mk(), mk(), molo, false, false, []);
ok(lastInjury && lastInjury.bypass === false, 'Liquid Fire: sin crítico → armadura normal');

const hs = wpn('heavy-shotgun-na');
W.applyInjury_lab(mk(0), mk(5), hs, false, false, []);
ok(lastInjury && lastInjury.dice === 2, 'Tungsten shot: a corta distancia (5" ≤ 6") +1 del perfil +1 → ' + (lastInjury && lastInjury.dice));
W.applyInjury_lab(mk(0), mk(10), hs, false, false, []);
ok(lastInjury && lastInjury.dice === 1, 'Tungsten shot: a larga distancia solo el +1 del perfil');
W.applyInjury_lab(mk(), mk(), hs, false, false, []);
ok(lastInjury && lastInjury.dice === 1, 'Tungsten shot: sin posiciones (Lab abstracto) no se aplica');
W.successRollWithBlessing_lab = origSR; W.injuryRoll_lab = origIR;

console.log('\nGroup 4: toda keyword de la armería tiene texto de consulta (modo mesa / tarjetas)');
const allKw = new Set();
Object.values(byId).forEach(it => (it.weaponKeywords || []).forEach(k => allKw.add(k)));
const noText = [...allKw].filter(k => !W.lookupRuleText(k));
ok(noText.length === 0, 'sin keywords huérfanas (' + (noText.join(' | ') || 'ninguna') + ')');
ok(W.lookupRuleText('AMMUNITION').length > 20 && W.lookupRuleText('AMMUNITION (FIRE)').startsWith(W.lookupRuleText('AMMUNITION')) &&
   /X = FIRE/.test(W.lookupRuleText('AMMUNITION (FIRE)')), 'AMMUNITION (X) usa la definición base con X = FIRE');
ok(/Efecto/.test(W.lookupRuleText('NEGATE GAS')) && /Efecto/.test(W.lookupRuleText('NEGATE SHRAPNEL')) && /Efecto/.test(W.lookupRuleText('NEGATE FIRE')),
   'NEGATE X con semántica canon ("no le afecta el Efecto")');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
