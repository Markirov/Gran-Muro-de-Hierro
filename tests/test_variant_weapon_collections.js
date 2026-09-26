/* The House of Wisdom (Warbands 1.0.2) — Weapon Collections: la banda puede
 * comprar 1 pieza de Battlekit de la armería de New Antioch y 1 de la de
 * Trench Pilgrims, siguiendo sus estipulaciones.
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
dom.window.eval(js.slice(0, bootIdx) + '\n;window.__X = { DATA, classifyBattlekitItem, findBattlekitItem, getUnit, modelCost, getArmouryCategory, foreignArmouryItems: typeof foreignArmouryItems === "function" ? foreignArmouryItems : null };');
const X = dom.window.__X;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

const IS = 'iron-sultanate';
const M = (unitId, bk = []) => ({ uid: unitId + Math.random(), unitId, battlekit: bk, upgrades: [] });
const wbOf = (variantId, models) => ({ factionId: IS, variantId, models });
function state(variantId, model, itemId, others = []) {
  const wb = wbOf(variantId, others.concat(model));
  const item = X.findBattlekitItem(IS, itemId, wb);
  if (!item) return 'missing';
  return X.classifyBattlekitItem(item, model, X.getUnit(IS, model.unitId), wb).state;
}

console.log('\nGroup 1: acceso');
ok(typeof X.foreignArmouryItems === 'function', 'foreignArmouryItems existe');
const groups = X.foreignArmouryItems ? X.foreignArmouryItems(wbOf('house-wisdom', [])) : [];
ok(groups.map(g => g.factionId).join(',') === 'new-antioch,trench-pilgrims', 'House of Wisdom: armerías de New Antioch y Trench Pilgrims');
ok(X.foreignArmouryItems && X.foreignArmouryItems(wbOf(null, [])).length === 0, 'sin variante: ninguna');
ok(state('house-wisdom', M('azebs'), 'sword-na') === 'available', 'Azeb puede comprar Sword/Axe de New Antioch');
ok(state(null, M('azebs'), 'sword-na') === 'missing', 'sin variante: no existe para Iron Sultanate');
ok(X.getArmouryCategory(IS, 'sword-na') === 'melee', 'categoría de la pieza ajena');

console.log('\nGroup 2: 1 por armería en toda la banda');
const a = M('azebs', ['sword-na']);
ok(state('house-wisdom', M('azebs'), 'trench-club-na', [a]) === 'disabled', 'segunda pieza de New Antioch bloqueada');
const tpItem = X.DATA.factions['trench-pilgrims'].armoury.melee.find(i => !i.restriction && i.type === '1-Handed');
ok(state('house-wisdom', M('azebs'), tpItem.id, [a]) === 'available', 'una de Trench Pilgrims sigue disponible');

console.log('\nGroup 3: estipulaciones y coste');
ok(state('house-wisdom', M('azebs'), 'misericordia-na') === 'hidden', 'Misericordia (Combat Medic only) no sirve');
const c = X.modelCost(a, IS, wbOf('house-wisdom', [a]));
ok(c.ducados === 25 + 4, 'coste: Azeb 25 + Sword/Axe 4');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
