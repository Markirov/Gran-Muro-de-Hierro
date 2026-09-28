/* Cavalcade of the Tenth Plague (Warbands 1.0.2): creación de banda.
 * Blood of the Lamb, Day of His Wrath, Heaven Awaits, Only the Righteous
 * (Sacrificial Lamb), Stolen Communicants (3 ☼) y The Unclean (0-2 Prisoners).
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
let html = fs.readFileSync(path.join(ROOT, 'app.html'), 'utf8');
  const cssContent = fs.readFileSync(path.resolve(__dirname, '..', 'css', 'app.css'), 'utf8');
  html += '\n<style>\n' + cssContent + '\n</style>\n';
  const JS_DIR_ALL = path.resolve(__dirname, '..', 'js');
  const jsContentAll = fs.readdirSync(JS_DIR_ALL).filter(x => x.endsWith('.js')).map(x => fs.readFileSync(path.join(JS_DIR_ALL, x), 'utf8')).join('\n');
  html += '\n<script>\n' + jsContentAll + '\n</script>\n';
const JS_DIR = path.resolve(__dirname, '..', 'js');
const jsFiles = fs.readdirSync(JS_DIR).filter(f => f.endsWith('.js')).sort();
const js = jsFiles.map(f => fs.readFileSync(path.join(JS_DIR, f), 'utf8')).join('\n');
const bootIdx = js.search(/\nfunction boot\(\)/);
const dom = new JSDOM(html.replace('</body>', '<script>' + js + '</script></body>').replace(/<script[\s\S]*?<\/script>/g, ''), { runScripts: 'outside-only', url: 'http://localhost/' });
dom.window.alert = () => {};
dom.window.eval(js.slice(0, bootIdx) + '\n;window.__X = { DATA, classifyBattlekitItem, findBattlekitItem, getUnit, getUnitWithVariant, canAddUnit, modelCost, effectiveAbilities, effectiveKeywords, lookupRuleText };');
const X = dom.window.__X;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

const TP = 'trench-pilgrims';
const TE = (models = []) => ({ factionId: TP, variantId: 'tenth-plague', models });
const BASE = (models = []) => ({ factionId: TP, variantId: null, models });
const M = (unitId, bk = []) => ({ uid: unitId + Math.random(), unitId, battlekit: bk, upgrades: [] });
function state(wbf, model, itemId, others = []) {
  const wb = wbf(others.concat(model));
  const item = X.findBattlekitItem(TP, itemId, wb);
  if (!item) return 'missing';
  return X.classifyBattlekitItem(item, model, X.getUnit(TP, model.unitId), wb).state;
}

ok(X.effectiveKeywords(M('castigator'), X.getUnit(TP, 'castigator'), TE()).includes('TOUGH'), 'Blood of the Lamb: Castigator TOUGH');
const wp = X.effectiveAbilities(M('war-prophet'), X.getUnit(TP, 'war-prophet'), TE());
ok(wp.includes('Day of His Wrath ACTION') && !wp.includes('Laying on of Hands ACTION'), 'Day of His Wrath en vez de Laying on of Hands');
ok(/IGNORE ARMOUR/.test(X.lookupRuleText('Day of His Wrath ACTION')), 'Day of His Wrath con texto');
ok(!X.canAddUnit(TE(), X.getUnit(TP, 'martyr-penitent')), 'Heaven Awaits: sin Martyr Penitents');
const c = M('communicant');
const cc = X.modelCost(c, TP, TE([c]));
ok(cc.ducados === 0 && cc.glory === 3, 'Stolen Communicants: 3 ☼ y 0 👑');
ok(X.modelCost(c, TP, BASE([c])).ducados === 100, 'sin variante: Communicant 100 👑');
ok(!X.canAddUnit(TE([M('eccl-prisoners'), M('eccl-prisoners')]), X.getUnitWithVariant(TE(), 'eccl-prisoners')), 'The Unclean: máx. 2 Ecclesiastic Prisoners');
const lamb = X.findBattlekitItem(TP, 'lamb-tenth');
ok(lamb && lamb.cost === 5 && /Consumable/.test(lamb.restriction) && /Warded by Blood/.test(lamb.note), 'Sacrificial Lamb: 5 👑, Consumable, Warded by Blood');
ok(state(TE, M('pilgrim'), 'lamb-tenth') === 'available', 'Sacrificial Lamb: Trench Pilgrim');
ok(state(TE, M('anchorite-shrine'), 'lamb-tenth') === 'available', 'Sacrificial Lamb: también el Anchorite Shrine');
ok(state(TE, M('eccl-prisoners'), 'lamb-tenth') === 'hidden', 'Sacrificial Lamb: no Ecclesiastic Prisoners');
ok(state(BASE, M('pilgrim'), 'lamb-tenth') === 'hidden', 'sin variante: sin Sacrificial Lamb');
ok(state(TE, M('anchorite-shrine'), 'medikit-tp') === 'hidden', 'el Anchorite sigue sin otro Equipment');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
