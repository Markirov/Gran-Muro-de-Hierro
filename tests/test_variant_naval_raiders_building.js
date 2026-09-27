/* Heretic Naval Raiders (Warbands 1.0.2): creación de banda.
 * Close Assault Weapons, Let Sleeping Dogs Lie, Light Troops y Unseen Advance.
 * Fast as Lightning es regla de partida.
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
dom.window.eval(js.slice(0, bootIdx) + '\n;window.__X = { DATA, findBattlekitItem, getUnit, getUnitWithVariant, canAddUnit, modelCost, allAvailableUpgrades, classifyUpgrade };');
const X = dom.window.__X;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

const HL = 'heretic-legions';
const NR = (models = []) => ({ factionId: HL, variantId: 'naval-raiders', models });
const M = (unitId, bk = [], ups = []) => ({ uid: unitId + Math.random(), unitId, battlekit: bk, upgrades: ups });
const upState = (wb, model, upId) => {
  const unit = X.getUnit(HL, model.unitId);
  const up = X.allAvailableUpgrades(unit, wb).find(u => u.id === upId);
  return up ? X.classifyUpgrade(up, model, unit, wb).state : 'missing';
};

const smg = X.findBattlekitItem(HL, 'smg-hl', NR());
ok(smg.cost === 25 && smg.currency === '👑', 'Close Assault Weapons: Submachine Gun 25 👑');
ok(X.findBattlekitItem(HL, 'smg-hl').currency === '☼', 'sin variante: Submachine Gun 2 ☼');
const t = M('heretic-troopers', ['smg-hl']);
ok(X.modelCost(t, HL, NR([t])).ducados === 55 && X.modelCost(t, HL, NR([t])).glory === 0, 'coste del modelo con SMG: 30 + 25 👑');
ok(!X.canAddUnit(NR(), X.getUnit(HL, 'war-wolf')), 'Let Sleeping Dogs Lie: sin War Wolf');
const an = X.getUnitWithVariant(NR(), 'anointed');
ok(!X.canAddUnit(NR([M('anointed'), M('anointed')]), an) && X.canAddUnit(NR([M('anointed')]), an), 'Light Troops: máx. 2 Anointed');
ok(X.getUnitWithVariant(NR(), 'art-witch').limit === '0-1', 'Light Troops: máx. 1 Artillery Witch');
for (const uid of ['heretic-troopers', 'wretched-hl', 'anointed', 'art-witch']) {
  ok(upState(NR([M(uid)]), M(uid), 'unseen-advance') === 'available', 'Unseen Advance: ' + uid);
}
ok(upState(NR(), M('heretic-priest'), 'unseen-advance') === 'missing' && upState(NR(), M('chorister'), 'unseen-advance') === 'missing', 'Unseen Advance: no ELITE');
const three = [M('heretic-troopers', [], ['unseen-advance']), M('wretched-hl', [], ['unseen-advance']), M('anointed', [], ['unseen-advance'])];
const four = M('heretic-troopers');
ok(upState(NR(three.concat(four)), four, 'unseen-advance') === 'disabled', 'Unseen Advance: máx. 3 en la banda');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
