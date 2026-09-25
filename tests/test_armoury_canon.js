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
dom.window.eval(js.slice(0, bootIdx) + '\n;window.__lib = { DATA };');
const { DATA } = dom.window.__lib;

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

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
