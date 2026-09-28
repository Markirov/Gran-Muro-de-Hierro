/* The Red Brigade (suplemento de New Antioch): creación de banda.
 * Trench Dogs, Crimson Communicant, Guns Blazing, Displeasure of the Church
 * y equipo propio (Red Banner, Blood Cloak). Wear and Tear, No Retreat,
 * Glory Hounds, Remember the Fallen y Live off the Land son de partida o
 * campaña.
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
dom.window.eval(js.slice(0, bootIdx) + '\n;window.__X = { DATA, classifyBattlekitItem, findBattlekitItem, getUnit, getUnitWithVariant, canAddUnit, modelCost, allAvailableUpgrades, classifyUpgrade, effectiveAbilities, effectiveKeywords, effectiveStats, lookupRuleText };');
const X = dom.window.__X;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

const NA = 'new-antioch';
const RB = (models = []) => ({ factionId: NA, variantId: 'red-brigade', models });
const BASE = (models = []) => ({ factionId: NA, variantId: null, models });
const M = (unitId, bk = [], ups = []) => ({ uid: unitId + Math.random(), unitId, battlekit: bk, upgrades: ups });
function state(wbf, model, itemId, others = []) {
  const wb = wbf(others.concat(model));
  const item = X.findBattlekitItem(NA, itemId, wb);
  if (!item) return 'missing';
  return X.classifyBattlekitItem(item, model, X.getUnit(NA, model.unitId), wb).state;
}
const U = id => X.getUnit(NA, id);
const ups = (wb, uid) => X.allAvailableUpgrades(U(uid), wb);
const upState = (wb, model, upId) => {
  const up = ups(wb, model.unitId).find(u => u.id === upId);
  return up ? X.classifyUpgrade(up, model, U(model.unitId), wb).state : 'missing';
};

console.log('\nGroup 1: Trench Dogs');
const dog = U('trench-dog-rb');
ok(dog && dog.cost === 35 && dog.stats.movement === '8"/Infantry' && dog.stats.melee === '+0 DICE' && dog.stats.base === '25mm' && dog.tier === 'troops', 'Trench Dog: 35 👑, 8", Melee +0, 25mm, Troops');
ok(dog && dog.abilities.includes('Four Paws') && /\+1 DICE/.test(X.lookupRuleText('Four Paws') || ''), 'Four Paws con texto');
ok(state(RB, M('trench-dog-rb'), 'sword-na') === 'hidden' && state(RB, M('trench-dog-rb'), 'frag-na') === 'hidden', 'los perros no llevan Battlekit');
ok(!X.canAddUnit(BASE(), dog), 'sin variante: sin perros');
ok(!X.canAddUnit(RB([M('lieutenant')]), dog) === false, 'perro con 1 modelo más');
ok(!X.canAddUnit(RB([M('lieutenant'), M('trench-dog-rb')]), dog), 'no más perros que otros modelos');
ok(X.canAddUnit(RB([M('lieutenant'), M('yeomen'), M('trench-dog-rb')]), dog), 'perros = otros modelos: sí');
const dUps = ups(RB(), 'trench-dog-rb');
const spec = ['guard-dog-rb', 'mercy-dog-rb', 'attack-dog-rb'];
ok(spec.every(id => { const u = dUps.find(x => x.id === id); return u && u.cost === 5; }) && new Set(spec.map(id => dUps.find(x => x.id === id).mutuallyExclusiveGroup)).size === 1, 'Guard, Mercy o Attack Dog: +5 👑, uno por perro');
ok(upState(RB([M('trench-dog-rb', [], ['guard-dog-rb'])]), M('trench-dog-rb'), 'guard-dog-rb') === 'disabled', 'Guard Dog: Limit 1');
ok(upState(RB([M('trench-dog-rb', [], ['mercy-dog-rb']), M('trench-dog-rb', [], ['mercy-dog-rb'])]), M('trench-dog-rb'), 'mercy-dog-rb') === 'disabled', 'Mercy Dog: Limit 2');
const ad = M('trench-dog-rb', [], ['attack-dog-rb']);
ok(X.effectiveStats(ad, dog, RB([ad])).melee === '+1 DICE', 'Attack Dog: +1 DICE Melee');
const gr = dUps.find(x => x.id === 'dog-grenades-rb');
ok(gr && gr.cost === 5, 'Grenades para el perro: +5 👑');
ok(dog && (dog.cannotPromote || /no pueden ser ELITE|cannot become ELITE/i.test(dog.note || '')), 'los perros no pueden ser ELITE');

console.log('\nGroup 2: Crimson Communicant y clero');
const cc = U('crimson-comm-rb');
ok(cc && cc.cost === 75 && cc.limit === '0-1' && cc.stats.ranged === '-1 DICE' && cc.stats.melee === '+1 DICE' && cc.stats.base === '40mm', 'Crimson Communicant: 0-1, 75 👑, -1/+1, 40mm');
ok(cc && ['STRONG', 'TOUGH', 'NEW ANTIOCH'].every(k => cc.keywords.includes(k)) && cc.abilities.includes('Strength through Pain') && cc.abilities.includes('Atonement Bell'), 'Crimson Communicant: STRONG, TOUGH, Strength through Pain, Atonement Bell');
ok(state(RB, M('crimson-comm-rb'), 'great-hammer-na') === 'available', 'Crimson Communicant: armería de New Antioch');
ok(X.canAddUnit(RB([M('trench-cleric')]), U('sniper-priests')), '1 Trench Cleric + 1 Sniper Priest');
ok(X.canAddUnit(RB([M('sniper-priests')]), U('sniper-priests')), '2 Sniper Priests');
ok(!X.canAddUnit(RB([M('trench-cleric'), M('sniper-priests')]), U('sniper-priests')), 'Displeasure of the Church: no 3 clérigos');
ok(!X.canAddUnit(RB([M('sniper-priests'), M('sniper-priests')]), U('trench-cleric')), 'Displeasure: 2 Sniper Priests y sin Trench Cleric');
const gs = ups(RB(), 'lieutenant').find(u => u.id === 'gunslinger-rb');
ok(gs && gs.cost === 5 && (gs.addsAbilities || []).includes('Gunslinger'), 'Guns Blazing: Gunslinger +5 👑 para el Lieutenant');

console.log('\nGroup 3: equipo');
const rb = X.findBattlekitItem(NA, 'red-banner-rb');
ok(rb && rb.cost === 2 && rb.currency === '☼' && /Limit: 1/.test(rb.restriction), 'Red Banner: 2 ☼, Limit 1');
ok(state(RB, M('yeomen'), 'flag-na') === 'hidden', 'Red Banner es el único estandarte: sin Troop Flag');
const bc = X.findBattlekitItem(NA, 'blood-cloak-rb');
ok(bc && bc.cost === 10 && bc.weaponKeywords.includes('SKIRMISHER') && /Limit: 4/.test(bc.restriction), 'Blood Cloak: 10 👑, SKIRMISHER, Limit 4');
ok(state(BASE, M('yeomen'), 'blood-cloak-rb') === 'hidden', 'sin variante: sin Blood Cloak');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
