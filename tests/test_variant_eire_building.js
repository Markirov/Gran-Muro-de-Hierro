/* Éire Rangers (Warbands 1.0.2): creación de banda. Anointed Ammunition,
 * Berserker, Carnyx, Fianna, Light Infantry, Loose Formation y Strong in Faith.
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
let html = fs.readFileSync(path.join(ROOT, 'public', 'app.html'), 'utf8');
  const cssContent = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'css', 'app.css'), 'utf8');
  html += '\n<style>\n' + cssContent + '\n</style>\n';
  const JS_DIR_ALL = path.resolve(__dirname, '..', 'public', 'js');
  const jsContentAll = fs.readdirSync(JS_DIR_ALL).filter(x => x.endsWith('.js')).map(x => fs.readFileSync(path.join(JS_DIR_ALL, x), 'utf8')).join('\n');
  html += '\n<script>\n' + jsContentAll + '\n</script>\n';
const JS_DIR = path.resolve(__dirname, '..', 'public', 'js');
const jsFiles = fs.readdirSync(JS_DIR).filter(f => f.endsWith('.js')).sort();
const js = jsFiles.map(f => fs.readFileSync(path.join(JS_DIR, f), 'utf8')).join('\n');
const bootIdx = js.search(/\nfunction boot\(\)/);
const dom = new JSDOM(html.replace('</body>', '<script>' + js + '</script></body>').replace(/<script[\s\S]*?<\/script>/g, ''), { runScripts: 'outside-only', url: 'http://localhost/' });
dom.window.alert = () => {};
dom.window.eval(js.slice(0, bootIdx) + '\n;window.__X = { DATA, classifyBattlekitItem, findBattlekitItem, getUnit, getUnitWithVariant, canAddUnit, allAvailableUpgrades, classifyUpgrade, effectiveAbilities, effectiveKeywords, lookupRuleText };');
const X = dom.window.__X;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

const NA = 'new-antioch';
const EI = (models = []) => ({ factionId: NA, variantId: 'eire-rangers', models });
const BASE = (models = []) => ({ factionId: NA, variantId: null, models });
const M = (unitId, bk = [], ups = []) => ({ uid: unitId + Math.random(), unitId, battlekit: bk, upgrades: ups });
function state(wbf, model, itemId, others = []) {
  const wb = wbf(others.concat(model));
  const item = X.findBattlekitItem(NA, itemId, wb);
  if (!item) return 'missing';
  return X.classifyBattlekitItem(item, model, X.getUnit(NA, model.unitId), wb).state;
}
const upState = (wb, model, upId) => {
  const unit = X.getUnit(NA, model.unitId);
  const up = X.allAvailableUpgrades(unit, wb).find(u => u.id === upId);
  return up ? X.classifyUpgrade(up, model, unit, wb).state : 'missing';
};

console.log('\nGroup 1: límites de unidades');
ok(!X.canAddUnit(EI([M('mech-heavy-inf')]), X.getUnitWithVariant(EI(), 'mech-heavy-inf')), 'Light Infantry: máximo 1 MHI');
ok(X.canAddUnit(EI([M('combat-engineers'), M('combat-engineers'), M('combat-engineers')]), X.getUnitWithVariant(EI(), 'combat-engineers')), 'Light Infantry: hasta 4 Combat Engineers');
ok(X.canAddUnit(EI([M('trench-cleric')]), X.getUnitWithVariant(EI(), 'trench-cleric')), 'Strong in Faith: 0-2 Trench Clerics');

console.log('\nGroup 2: Light Infantry (armería)');
ok(state(EI, M('shock-troopers'), 'machine-gun-na') === 'hidden', 'arma a distancia HEAVY: solo MHI');
ok(state(EI, M('mech-heavy-inf'), 'machine-gun-na') !== 'hidden', 'MHI sí puede llevar Machine Gun');
ok(state(EI, M('shock-troopers'), 'great-hammer-na') === 'hidden', 'arma cuerpo a cuerpo HEAVY: solo MHI');
ok(state(EI, M('shock-troopers'), 'great-sword-na') === 'available', 'Great Sword/Axe: excepción para todos');
ok(state(EI, M('mech-heavy-inf'), 'great-sword-na') === 'hidden', 'MHI no puede llevar Great Sword/Axe');
const gs3 = [1, 2, 3].map(() => M('shock-troopers', ['great-sword-na']));
ok(state(EI, M('shock-troopers'), 'great-sword-na', gs3) === 'disabled', 'máximo 3 Great Sword/Axe');
ok(state(EI, M('combat-engineers'), 'satchel-na') === 'available', 'Combat Engineers: Satchel Charges');
ok(state(EI, M('shock-troopers'), 'satchel-na') === 'hidden', 'Shock Troopers: sin Satchel Charges (HEAVY)');
const sat3 = [1, 2, 3].map(() => M('combat-engineers', ['satchel-na']));
ok(state(EI, M('combat-engineers'), 'satchel-na', sat3) === 'available', 'Satchel Charges: Limit 4');
ok(state(EI, M('lieutenant'), 'reinforced-armour-na') === 'hidden', 'Reinforced Armour: solo MHI');
ok(state(BASE, M('shock-troopers'), 'great-hammer-na') === 'available', 'sin variante: Great Hammer para todos');

console.log('\nGroup 3: Anointed Ammunition y Carnyx');
const ap = X.findBattlekitItem(NA, 'ap-bullets-eire');
ok(ap && ap.cost === 5 && /Limit: 2/.test(ap.restriction) && ap.weaponKeywords.includes('AMMUNITION (ARMOUR-PIERCING)'), 'Armour-Piercing Bullets: 5 👑, Limit 2');
ok(state(EI, M('shock-troopers'), 'ap-bullets-eire') === 'available' && state(BASE, M('shock-troopers'), 'ap-bullets-eire') === 'hidden', 'AP Bullets solo en Éire');
ok(/Carnyx/.test(X.findBattlekitItem(NA, 'music-na', EI()).note || ''), 'Carnyx en la nota del Musical Instrument');

console.log('\nGroup 4: Berserker, Fianna, Loose Formation, Strong in Faith');
const lt = X.getUnit(NA, 'lieutenant');
const berL = M('lieutenant', [], ['berserker']);
const fian = M('shock-troopers', [], ['fianna']);
ok(upState(EI([berL, fian]), fian, 'berserker') === 'disabled', 'Berserker: solo uno (Lieutenant o un Fianna)');
ok(upState(EI([fian]), fian, 'berserker') === 'available', 'un Fianna puede ser Berserker');
const plain = M('shock-troopers');
ok(upState(EI([plain]), plain, 'berserker') === 'disabled', 'un Shock Trooper que no es Fianna no');
ok(state(EI, berL, 'reinforced-armour-na') === 'hidden' && state(EI, M('lieutenant', [], ['berserker']), 'trench-shield-na') === 'available', 'Berserker: sin armadura, con escudo');
const ltKw = X.effectiveKeywords(M('lieutenant'), lt, EI());
ok(ltKw.includes('SKIRMISHER') && !X.effectiveAbilities(M('lieutenant'), lt, EI()).includes('Hold Your Fire! ACTION'), 'Loose Formation: SKIRMISHER en vez de Hold Your Fire!');
const cl = X.getUnit(NA, 'trench-cleric');
const clAb = X.effectiveAbilities(M('trench-cleric'), cl, EI());
ok(!clAb.includes('Onward Christian Soldiers!') && clAb.includes('Arise and be Healed! ACTION') && clAb.includes('Away Serpents! ACTION'), 'Trench Cleric: Arise and be Healed! y Away Serpents! en vez de Onward');
ok(/Down/.test(X.lookupRuleText('Away Serpents! ACTION')) && /BLOOD/.test(X.lookupRuleText('Arise and be Healed! ACTION')), 'textos de Arise and be Healed! y Away Serpents!');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);

