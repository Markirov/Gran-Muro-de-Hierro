/* Papal States Intervention Force (Warbands 1.0.2): creación de banda.
 * Far from Home, Lector, Supreme Blessing (Crucifix gratis y obligatorio),
 * Swiss Guard (Lieutenant + hasta 4 modelos con NEGATE FEAR gratis).
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
dom.window.eval(js.slice(0, bootIdx) + '\n;window.__X = { DATA, classifyBattlekitItem, findBattlekitItem, getUnit, modelCost, allAvailableUpgrades, classifyUpgrade, effectiveAbilities, effectiveKeywords, checkUpgradeLegality, battlekitPurchaseCost };');
const X = dom.window.__X;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

const NA = 'new-antioch';
const PA = (models = []) => ({ factionId: NA, variantId: 'papal-states', models });
const BASE = (models = []) => ({ factionId: NA, variantId: null, models });
const M = (unitId, bk = [], ups = []) => ({ uid: unitId + Math.random(), unitId, battlekit: bk, upgrades: ups });
const upState = (wb, model, upId) => {
  const unit = X.getUnit(NA, model.unitId);
  const up = X.allAvailableUpgrades(unit, wb).find(u => u.id === upId);
  return up ? X.classifyUpgrade(up, model, unit, wb).state : 'missing';
};

console.log('\nGroup 1: Supreme Blessing');
const cr = X.findBattlekitItem(NA, 'crucifix-papal');
ok(cr && cr.cost === 3 && cr.currency === '☼' && /Limit: 1/.test(cr.restriction) && /Inspiring Relic/.test(cr.note), "Supreme Pontiff's Crucifix: 3 ☼, Limit 1, Inspiring Relic");
const cl = M('trench-cleric', ['crucifix-papal']);
ok(X.modelCost(cl, NA, PA([cl])).glory === 0, 'el Crucifix inicial es gratis');
ok(X.battlekitPurchaseCost(PA([]), cr) === 0 && X.battlekitPurchaseCost(PA([cl]), cr) === 3, 'precio mostrado: 0 el primero, 3 un reemplazo');
const cleric = M('trench-cleric');
ok(X.checkUpgradeLegality(PA([cleric])).some(w => /Crucifix/.test(w)), 'aviso si ningún modelo lleva el Crucifix');
ok(!X.checkUpgradeLegality(PA([cl])).some(w => /Crucifix/.test(w)), 'sin aviso si alguien lo lleva');
const it = X.findBattlekitItem(NA, 'crucifix-papal', BASE([]));
ok(!it || X.classifyBattlekitItem(it, M('lieutenant'), X.getUnit(NA, 'lieutenant'), BASE([])).state === 'hidden', 'sin variante: no hay Crucifix');

console.log('\nGroup 2: Lector');
const clu = X.getUnit(NA, 'trench-cleric');
ok(X.effectiveKeywords(M('trench-cleric'), clu, PA()).includes('LEADER'), 'Trench Cleric con LEADER');
ok(X.effectiveAbilities(M('trench-cleric'), clu, PA()).includes('Arise and be Healed! ACTION'), 'Trench Cleric con Arise and be Healed!');
ok(!X.checkUpgradeLegality(PA([cl])).some(w => /Lieutenant/.test(w)), 'no exige Lieutenant');

console.log('\nGroup 3: Swiss Guard');
const lt = M('lieutenant');
const ltUp = X.allAvailableUpgrades(X.getUnit(NA, 'lieutenant'), PA()).find(u => /Swiss Guard/.test(u.name));
ok(ltUp && ltUp.cost === 0 && ltUp.addsKeywords.includes('NEGATE FEAR'), 'Lieutenant: Swiss Guard gratis (NEGATE FEAR)');
['yeomen', 'shock-troopers', 'sniper-priests', 'combat-engineers', 'mech-heavy-inf', 'combat-medic'].forEach(u => {
  ok(X.allAvailableUpgrades(X.getUnit(NA, u), PA()).some(x => x.id === 'swiss-guard' && x.cost === 0), u + ': Swiss Guard disponible');
});
const four = [1, 2, 3, 4].map(() => M('yeomen', [], ['swiss-guard']));
const fifth = M('shock-troopers');
ok(upState(PA(four.concat(fifth, lt)), fifth, 'swiss-guard') === 'disabled', 'Swiss Guard: máximo 4 modelos además del Lieutenant');
ok(!X.allAvailableUpgrades(X.getUnit(NA, 'yeomen'), BASE()).some(x => x.id === 'swiss-guard'), 'sin variante: sin Swiss Guard');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
