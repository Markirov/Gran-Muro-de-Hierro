/* Kingdom of Alba Assault Detachment (Warbands 1.0.2): reglas de creación.
 * Claymore Smiths, Cold Steel (primera compra de cada arma cuerpo a cuerpo a
 * mitad, redondeando hacia arriba), Dum-Dum Ammunition, Highland Strength,
 * Lightly-armoured, Melee-focused, Rampant Charge, Strained Supply, Bagpipes
 * y la Lochaber Axe.
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
dom.window.eval(js.slice(0, bootIdx) + '\n;window.__X = { DATA, classifyBattlekitItem, findBattlekitItem, getUnit, modelCost, warbandTotals, effectiveKeywords, effectiveStats, battlekitPurchaseCost: typeof battlekitPurchaseCost === "function" ? battlekitPurchaseCost : null };');
const X = dom.window.__X;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

const NA = 'new-antioch';
const ALBA = (models = []) => ({ factionId: NA, variantId: 'alba', models });
const BASE = (models = []) => ({ factionId: NA, variantId: null, models });
const M = (unitId, bk = []) => ({ uid: unitId + Math.random(), unitId, battlekit: bk, upgrades: [] });
function state(wbf, model, itemId, others = []) {
  const wb = wbf(others.concat(model));
  const item = X.findBattlekitItem(NA, itemId, wb);
  if (!item) return 'missing';
  return X.classifyBattlekitItem(item, model, X.getUnit(NA, model.unitId), wb).state;
}
const kitCost = (wb, model) => X.modelCost(model, NA, wb).ducados - X.getUnit(NA, model.unitId).cost;

console.log('\nGroup 1: costes (Claymore Smiths, Cold Steel)');
const t1 = M('shock-troopers', ['great-sword-na']);
ok(kitCost(ALBA([t1]), t1) === 4, 'primera Great Sword/Axe: 7 👑 a mitad = 4 (redondeo hacia arriba)');
const t2 = M('shock-troopers', ['great-sword-na']);
ok(kitCost(ALBA([t1, t2]), t2) === 7, 'segunda Great Sword/Axe: 7 👑');
const s1 = M('shock-troopers', ['sword-na', 'trench-knife-na']);
ok(kitCost(ALBA([s1]), s1) === 2 + 1, 'Sword/Axe 2 y Trench Knife 1 (primeras compras)');
const r1 = M('shock-troopers', ['shotgun-na']);
ok(kitCost(ALBA([r1]), r1) === X.findBattlekitItem(NA, 'shotgun-na').cost, 'armas a distancia sin descuento');
ok(kitCost(BASE([t1]), t1) === 12, 'sin variante: Great Sword/Axe 12');
ok(X.warbandTotals(ALBA([t1, t2])).ducados === 2 * 45 + 4 + 7, 'total de banda con Cold Steel');
if (X.battlekitPurchaseCost) {
  const gs = X.findBattlekitItem(NA, 'great-sword-na', ALBA([]));
  ok(X.battlekitPurchaseCost(ALBA([]), gs) === 4 && X.battlekitPurchaseCost(ALBA([t1]), gs) === 7, 'precio mostrado al comprar: 4 la primera, 7 después');
  ok(X.battlekitPurchaseCost(ALBA([t1, t2]), gs, t1) === 4 && X.battlekitPurchaseCost(ALBA([t1, t2]), gs, t2) === 7, 'precio mostrado de la ya equipada: lo que pagó ese modelo');
} else ok(false, 'battlekitPurchaseCost existe');

console.log('\nGroup 2: armería');
ok(state(ALBA, M('shock-troopers'), 'lochaber-axe-alba') === 'available', 'Lochaber Axe disponible');
ok(state(BASE, M('shock-troopers'), 'lochaber-axe-alba') === 'hidden', 'sin variante: sin Lochaber Axe');
const la = X.findBattlekitItem(NA, 'lochaber-axe-alba');
ok(la && la.cost === 20 && la.type === '2-Handed' && ['+2 INJURY DICE', 'BLOCK', 'CRITICAL', 'CUMBERSOME', 'HEAVY'].every(k => la.weaponKeywords.includes(k)), 'Lochaber Axe: 20, 2H, +2 INJURY DICE BLOCK CRITICAL CUMBERSOME HEAVY');
const dd = X.findBattlekitItem(NA, 'dum-dum-alba');
ok(dd && dd.cost === 5 && /Limit: 3/.test(dd.restriction) && dd.weaponKeywords.includes('AMMUNITION (CRITICAL)'), 'Dum-Dum Bullets: 5 👑, Limit 3, AMMUNITION (CRITICAL)');
const two = [M('shock-troopers', ['smg-na'])];
['smg-na', 'auto-shotgun-na', 'grenade-launcher-na', 'machine-gun-na', 'sniper-rifle-na'].forEach(id => {
  const holder = [M('shock-troopers', [id])];
  ok(state(ALBA, M('shock-troopers'), id, holder) === 'disabled', 'Strained Supply: ' + id + ' Limit 1');
});
ok(state(BASE, M('shock-troopers'), 'smg-na', two) === 'available', 'sin variante: SMG Limit 2');

console.log('\nGroup 3: Lightly-armoured');
ok(state(ALBA, M('lieutenant'), 'reinforced-armour-na') === 'available', 'Lieutenant: Reinforced Armour');
ok(/Lieutenant/.test(X.findBattlekitItem(NA, 'reinforced-armour-na', ALBA()).restriction), 'Reinforced Armour: Lieutenant y MHI');
ok(state(ALBA, M('trench-cleric'), 'reinforced-armour-na') === 'hidden', 'otro ELITE (Trench Cleric): sin Reinforced Armour');
ok(state(ALBA, M('trench-cleric'), 'machine-armour-na') === 'hidden', 'Trench Cleric: sin Machine Armour');
ok(state(BASE, M('trench-cleric'), 'reinforced-armour-na') === 'available', 'sin variante: Trench Cleric sí');

console.log('\nGroup 4: keywords y perfiles');
const wbK = ALBA([]);
ok(X.effectiveKeywords(M('lieutenant'), X.getUnit(NA, 'lieutenant'), wbK).includes('STRONG'), 'Highland Strength: Lieutenant STRONG');
ok(X.effectiveKeywords(M('shock-troopers'), X.getUnit(NA, 'shock-troopers'), wbK).includes('STRONG'), 'Highland Strength: Shock Troopers STRONG');
ok(!X.effectiveKeywords(M('shock-troopers'), X.getUnit(NA, 'shock-troopers'), BASE([])).includes('STRONG'), 'sin variante: sin STRONG');
ok(X.effectiveKeywords(M('yeomen'), X.getUnit(NA, 'yeomen'), wbK).includes('IGNORE DEFENDED OBSTACLE'), 'Rampant Charge: IGNORE DEFENDED OBSTACLE');
const st = X.effectiveStats(M('mech-heavy-inf'), X.getUnit(NA, 'mech-heavy-inf'), wbK);
ok(st.melee === '+1 DICE' && st.ranged === '+0 DICE', 'Melee-focused: MHI Melee +1, Ranged +0');
const st1 = M('shock-troopers', ['great-hammer-na']);
ok(state(ALBA, st1, 'sword-na') === 'available', 'STRONG de Highland Strength: Great Hammer + Sword');
const music = X.findBattlekitItem(NA, 'music-na', wbK);
ok(/Bagpipes/.test(music.note || '') && /NEGATE FEAR/.test(music.note || ''), 'Bagpipes en la nota del Musical Instrument');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
