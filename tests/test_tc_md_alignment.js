// tests/test_tc_md_alignment.js
// Suite de pruebas para garantizar la alineación canónica de datos y motor
// contra los compendios maestros Tc_Tc_*.md y resolver las discrepancias detectadas.

const assert = require('assert');
const path = require('path');

// 1. id_aliases
const {
  APP_TO_STABLE_ID_MAP,
  STABLE_TO_APP_ID_MAP,
  toStableId,
  toAppId,
  areIdsEquivalent
} = require('../app/data/id_aliases.js');

const fs = require('fs');


// 2. Cargar módulos de public/js en global según el patrón estándar de tests
eval(fs.readFileSync(path.resolve(__dirname, '../public/js/01_trench_crusade_game_data.js'), 'utf8') + '\nglobal.DATA = DATA;');
eval(fs.readFileSync(path.resolve(__dirname, '../public/js/14_battlekit_deltas_armoury_upgrade_recomme.js'), 'utf8'));
eval(fs.readFileSync(path.resolve(__dirname, '../public/js/12_loadout_lab_analyse_single_model_variant.js'), 'utf8') + '\nglobal.FILL_MODEL_PROFILES = FILL_MODEL_PROFILES;');

const FILL_MODEL_PROFILES = global.FILL_MODEL_PROFILES;
const FACTIONS = (global.DATA && global.DATA.factions) || {};

let pass = 0;
let fail = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    pass++;
  } catch (err) {
    console.error(`  ✗ ${name}:`, err.message);
    fail++;
  }
}

console.log('=== Suite de pruebas: Alineación Tc_Tc_*.md <-> Warband Forge ===\n');

console.log('Group 1: Mapeo de IDs estables (Tc_Tc) y alias de la aplicación');
test('Assassin\'s Dagger resuelve bidireccionalmente entre app y stableId', () => {
  assert.strictEqual(toStableId('assassin-dagger-is'), 'assassin-s-dagger-sult');
  assert.strictEqual(toAppId('assassin-s-dagger-sult'), 'assassin-dagger-is');
  assert.strictEqual(areIdsEquivalent('assassin-dagger-is', 'assassin-s-dagger-sult'), true);
});

test('Beelzebub\'s Axe resuelve entre app y stableId', () => {
  assert.strictEqual(toStableId('beelz-axe-bg'), 'beelzebub-s-axe-bg');
  assert.strictEqual(toAppId('beelzebub-s-axe-bg'), 'beelz-axe-bg');
  assert.strictEqual(areIdsEquivalent('beelz-axe-bg', 'beelzebub-s-axe-bg'), true);
});

test('Punt Gun de Anchorite resuelve entre app y stableId', () => {
  assert.strictEqual(toStableId('punt-gun-anchor'), 'punt-gun-anchorite-tp');
  assert.strictEqual(toAppId('punt-gun-anchorite-tp'), 'punt-gun-anchor');
  assert.strictEqual(areIdsEquivalent('punt-gun-anchor', 'punt-gun-anchorite-tp'), true);
});

test('Mapeos directos e inversos tienen cobertura amplia (>300 entradas)', () => {
  assert(Object.keys(APP_TO_STABLE_ID_MAP).length >= 300);
  assert(Object.keys(STABLE_TO_APP_ID_MAP).length >= 300);
});

console.log('\nGroup 2: Sugerencias de mejoras de facción (battlekit_deltas.ts)');
test('Corte recibe sugerencias con factionId court-serpent', () => {
  const wb = { factionId: 'court-serpent', models: [] };
  const coverage = { antiArmour: { score: 10, label: 'low' } };
  const suggestions = suggestFactionUpgrades_lab(wb, coverage);
  assert(Array.isArray(suggestions) && suggestions.length > 0, 'Debe devolver sugerencias para la Corte');
  const antiArmour = suggestions.find(s => s.dimension === 'antiArmour');
  assert(antiArmour, 'Debe sugerir opciones anti-armour para la Corte');
  assert(antiArmour.text.includes("Beelzebub's Axe") || antiArmour.text.includes("Burning Inferno"));
});

test('Corte recibe sugerencias también con factionId legacy court-of-the-seven-headed-serpent', () => {
  const wb = { factionId: 'court-of-the-seven-headed-serpent', models: [] };
  const coverage = { antiArmour: { score: 10, label: 'low' } };
  const suggestions = suggestFactionUpgrades_lab(wb, coverage);
  assert(Array.isArray(suggestions) && suggestions.length > 0);
});

test('Costes canónicos corregidos en sugerencias de New Antioch', () => {
  const wb = { factionId: 'new-antioch', models: [] };
  const coverage = {
    antiArmour: { score: 10, label: 'low' },
    antiHorde:  { score: 10, label: 'low' },
    antiElite:  { score: 10, label: 'low' },
    resilience: { score: 10, label: 'low' },
    mobility:   { score: 10, label: 'low' },
  };
  const suggestions = suggestFactionUpgrades_lab(wb, coverage);
  const allTexts = suggestions.map(s => s.text).join(' ');

  assert(allTexts.includes('Sniper Rifle') && allTexts.includes('+35 👑'), 'Sniper Rifle (+35 👑)');
  assert(allTexts.includes('Heavy Flamethrower') && allTexts.includes('+55 👑'), 'Heavy Flamethrower (+55 👑)');
  assert(allTexts.includes('Anti-Tank Hammer') && allTexts.includes('+35 👑'), 'Anti-Tank Hammer (+35 👑)');
  assert(allTexts.includes('Reinforced Armour') && allTexts.includes('+40 👑'), 'Reinforced Armour (+40 👑)');
  assert(allTexts.includes('Trench Mole') && allTexts.includes('+10 👑'), 'Trench Mole (+10 👑)');
});

console.log('\nGroup 3: Arquetipos de relleno en el simulador Lab');
test('Black Grail usa Fly Thralls en arquetipo de relleno', () => {
  const bg = FILL_MODEL_PROFILES['blackGrail'];
  assert(bg, 'Arquetipo blackGrail existe');
  assert.strictEqual(bg.name, 'Fly Thralls');
  assert.strictEqual(bg.cost, 28);
});

test('Court of the Seven-Headed Serpent usa Yoke Fiend con coste canónico 30', () => {
  const court = FILL_MODEL_PROFILES['courtSerpent'];
  assert(court, 'Arquetipo courtSerpent existe');
  assert.strictEqual(court.name, 'Yoke Fiend');
  assert.strictEqual(court.cost, 30);
});

console.log('\nGroup 4: Estructuración de perfiles complejos en datos del juego');
test('Autocannon en St. Methodius tiene alternateProfiles estructurado para Full Auto', () => {
  const tp = FACTIONS['trench-pilgrims'];
  assert(tp, 'Facción trench-pilgrims encontrada');
  const anchorArmoury = (tp.armoury && tp.armoury.anchoriteRanged) || [];
  const autocannon = anchorArmoury.find(w => w.id === 'autocannon-anchor');
  assert(autocannon, 'Autocannon encontrado en anchoriteRanged');
  assert(Array.isArray(autocannon.alternateProfiles) && autocannon.alternateProfiles.length > 0, 'alternateProfiles presente');
  const fullAuto = autocannon.alternateProfiles.find(p => p.name === 'Full Auto');
  assert(fullAuto, 'Perfil Full Auto presente');
  assert(fullAuto.weaponKeywords.includes('AUTOMATIC 5'));
  assert(fullAuto.weaponKeywords.includes('RELOAD'));
  assert(fullAuto.weaponKeywords.includes('RISKY'));
});

console.log(`\nResultado: ${pass} superadas · ${fail} fallidas`);
if (fail > 0) process.exit(1);
