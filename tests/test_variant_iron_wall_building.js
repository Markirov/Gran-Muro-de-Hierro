/* Defenders of the Iron Wall (Warbands 1.0.2): reglas de creación de banda.
 * Far from the Sublime Gate (sin Cloak of Alamut ni Wind Amulet), Silahdar
 * (entrada del Yüzbaşı: Janissary Veteran; Alaybozan, Anq Guard y Explosive
 * Charges), Grand Cannons (máx. 1 por Brazen Bull) y restricciones de la
 * armería propia.
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'app.html'), 'utf8');
const js = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/)[1];
const bootIdx = js.search(/\nfunction boot\(\)/);
const dom = new JSDOM(html.replace(/<script[\s\S]*?<\/script>/g, ''), { runScripts: 'outside-only', url: 'http://localhost/' });
dom.window.alert = () => {};
dom.window.eval(js.slice(0, bootIdx) + '\n;window.__X = { DATA, classifyBattlekitItem, findBattlekitItem, getUnit, allAvailableUpgrades, armouryItemsForWarband: typeof armouryItemsForWarband === "function" ? armouryItemsForWarband : null };');
const X = dom.window.__X;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

const IS = 'iron-sultanate';
const IW = { factionId: IS, variantId: 'iron-wall-def', models: [] };
const BASE = { factionId: IS, variantId: null, models: [] };
function state(wb, unitId, itemId, bk = []) {
  const unit = X.getUnit(IS, unitId);
  const model = { uid: 'm-' + unitId, unitId, battlekit: bk };
  const w = Object.assign({}, wb, { models: [model] });
  const item = X.findBattlekitItem(IS, itemId, w);
  return X.classifyBattlekitItem(item, model, unit, w).state;
}

console.log('\nGroup 1: Far from the Sublime Gate');
ok(state(IW, 'silahdar-iw', 'cloak-alamut-is') === 'hidden', 'Iron Wall: sin Cloak of Alamut');
ok(state(IW, 'sappers', 'wind-amulet-is') === 'hidden', 'Iron Wall: sin Wind Amulet');
ok(state(BASE, 'sappers', 'wind-amulet-is') === 'available', 'Sin variante: Wind Amulet disponible');
const cloakInList = X.armouryItemsForWarband && X.armouryItemsForWarband(IW, 'equipment').some(i => i.id === 'cloak-alamut-is');
ok(!cloakInList, 'Cloak of Alamut fuera de la armería de la banda');
ok(X.armouryItemsForWarband(BASE, 'equipment').some(i => i.id === 'cloak-alamut-is'), 'Sin variante: Cloak of Alamut en la armería');

console.log('\nGroup 2: Silahdar');
ok(state(IW, 'silahdar-iw', 'alaybozan-is') === 'available', 'Silahdar puede llevar Alaybozan');
ok(state(IW, 'sappers', 'alaybozan-is') === 'available', 'Sappers siguen pudiendo llevar Alaybozan');
ok(state(IW, 'janofficer-iw', 'alaybozan-is') === 'hidden', 'Janissary Officer no puede llevar Alaybozan');
ok(state(IW, 'silahdar-iw', 'anq-guard-iw') === 'available', 'Silahdar puede llevar Anq Guard');
ok(state(IW, 'janofficer-iw', 'anq-guard-iw') === 'hidden', 'Anq Guard: solo Sappers y Silahdar');
ok(state(IW, 'silahdar-iw', 'explosive-charges-iw') === 'available', 'Silahdar puede llevar Explosive Charges');
ok(state(IW, 'sappers', 'explosive-charges-iw') === 'available', 'Sappers pueden llevar Explosive Charges');
ok(state(IW, 'janofficer-iw', 'explosive-charges-iw') === 'hidden', 'Explosive Charges: solo Silahdar y Sappers');
const sil = X.getUnit(IS, 'silahdar-iw');
const vet = X.allAvailableUpgrades(sil, IW).find(u => u.id === 'veteran');
ok(vet && vet.cost === 5, 'Silahdar puede ser Janissary Veteran (+5 👑, revisión de abril 2026)');

console.log('\nGroup 3: Grand Cannons');
ok(state(IW, 'brazen-bull', 'grand-cannon-iw') === 'available', 'Brazen Bull puede llevar un Grand Cannon');
ok(state(IW, 'brazen-bull', 'grand-cannon-iw', ['grand-cannon-iw']) === 'disabled', 'Máximo 1 Grand Cannon por Brazen Bull');
ok(state(IW, 'sappers', 'grand-cannon-iw') === 'hidden', 'Otros modelos no llevan Grand Cannon');
ok(state(BASE, 'brazen-bull', 'grand-cannon-iw') === 'hidden', 'Sin variante: no hay Grand Cannon');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
