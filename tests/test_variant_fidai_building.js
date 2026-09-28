/* Fida'i of Alamut – The Cabal of Assassins (Warbands 1.0.2): creación de banda.
 * Alamut Alone, Art of Assassination, Assassin Acolytes, Dervishes, Flock of
 * Assassins, Master Assassin y armería propia (Bow of Alamut, Golden Khanjar,
 * Hashashin Leaf). Killing Squad (Fireteam) no se modela.
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
dom.window.eval(js.slice(0, bootIdx) + '\n;window.__X = { DATA, classifyBattlekitItem, findBattlekitItem, getUnit, getUnitWithVariant, canAddUnit, modelCost, allAvailableUpgrades, classifyUpgrade, effectiveAbilities, effectiveKeywords, effectiveStats, checkUpgradeLegality, lookupRuleText };');
const X = dom.window.__X;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

const IS = 'iron-sultanate';
const FI = (models = []) => ({ factionId: IS, variantId: 'fidai-alamut', models });
const BASE = (models = []) => ({ factionId: IS, variantId: null, models });
const M = (unitId, bk = [], ups = []) => ({ uid: unitId + Math.random(), unitId, battlekit: bk, upgrades: ups });
function state(wbf, model, itemId, others = []) {
  const wb = wbf(others.concat(model));
  const item = X.findBattlekitItem(IS, itemId, wb);
  if (!item) return 'missing';
  return X.classifyBattlekitItem(item, model, X.getUnit(IS, model.unitId), wb).state;
}
const upState = (wb, model, upId) => {
  const unit = X.getUnit(IS, model.unitId);
  const up = X.allAvailableUpgrades(unit, wb).find(u => u.id === upId);
  return up ? X.classifyUpgrade(up, model, unit, wb).state : 'missing';
};

console.log('\nGroup 1: unidades');
const ma = X.getUnit(IS, 'master-assassin-fid');
ok(ma && ma.cost === 95 && ma.keywords.includes('LEADER') && ma.keywords.includes('TOUGH') && ma.keywords.includes('INFILTRATOR'), 'Master Assassin: 95 👑, LEADER, TOUGH (entrada de Sultanate Assassin)');
ok(ma && ma.abilities.includes('Temporal Assassin'), 'Master Assassin con Temporal Assassin');
ok(X.checkUpgradeLegality(FI([M('azebs')])).some(w => /Master Assassin/.test(w)), 'aviso: falta Master Assassin');
ok(!X.checkUpgradeLegality(FI([M('master-assassin-fid')])).some(w => /Yüzbaşı/.test(w)), 'sin aviso de Yüzbaşı');
ok(!X.canAddUnit(FI([M('master-assassin-fid')]), X.getUnitWithVariant(FI(), 'master-assassin-fid')), 'solo 1 Master Assassin');
const sa = X.getUnitWithVariant(FI(), 'sult-assassin');
ok(X.canAddUnit(FI([M('sult-assassin')]), sa) && !X.canAddUnit(FI([M('sult-assassin'), M('sult-assassin')]), sa), 'Flock of Assassins: 0-2 Sultanate Assassins');
ok(!X.canAddUnit(FI(), X.getUnit(IS, 'janissaries')) && !X.canAddUnit(FI(), X.getUnit(IS, 'brazen-bull')), 'Alamut Alone: sin Janissaries ni Brazen Bull');
const dv = X.getUnit(IS, 'dervish-fid');
ok(dv && dv.cost === 55 && dv.keywords.includes('IGNORE OFF-HAND WEAPON') && !dv.keywords.includes('STRONG') && dv.abilities.includes('Whirling Dervish'), 'Dervish: entrada de Janissary con IGNORE OFF-HAND WEAPON y Whirling Dervish en vez de STRONG');
ok(!X.canAddUnit(FI([1, 2, 3, 4].map(() => M('dervish-fid'))), X.getUnitWithVariant(FI(), 'dervish-fid')), 'Dervishes: 0-4');
ok(!X.canAddUnit(BASE(), dv), 'sin variante: sin Dervishes');
ok(/-1 DICE/.test(X.lookupRuleText('Whirling Dervish')), 'Whirling Dervish con texto');

console.log('\nGroup 2: Battlekit');
ok(state(FI, M('dervish-fid'), 'reinforced-is') === 'hidden', 'Dervish sin Reinforced Armour');
ok(state(FI, M('dervish-fid'), 'sniper-is') === 'available', 'Dervish usa la entrada de Janissary: Sniper Rifle (ELITE & Janissaries)');
ok(state(FI, M('master-assassin-fid'), 'assassin-dagger-is') === 'available', "Master Assassin: Assassin's Dagger (entrada de Sultanate Assassin)");
const bow = X.findBattlekitItem(IS, 'bow-alamut-fid');
ok(bow && bow.cost === 50 && bow.type === '2-Handed' && bow.range === '40"' && bow.weaponKeywords.includes('IGNORE ARMOUR') && /Temporal Slipstream/.test(bow.note), 'Bow of Alamut: 50 👑, 2H, 40", ASSAULT CRITICAL IGNORE ARMOUR');
ok(state(FI, M('master-assassin-fid'), 'bow-alamut-fid') === 'available' && state(FI, M('sult-assassin'), 'bow-alamut-fid') === 'available', 'Bow of Alamut: Master Assassin y Sultanate Assassins');
ok(state(FI, M('azebs'), 'bow-alamut-fid') === 'hidden', 'Bow of Alamut: no Azebs');
ok(state(FI, M('sult-assassin'), 'bow-alamut-fid', [M('master-assassin-fid', ['bow-alamut-fid'])]) === 'disabled', 'Bow of Alamut: Limit 1');
ok(state(BASE, M('sult-assassin'), 'bow-alamut-fid') === 'hidden', 'sin variante: sin Bow of Alamut');
const kh = X.findBattlekitItem(IS, 'khanjar-fid');
ok(kh && kh.cost === 20 && kh.type === '1-Handed' && kh.weaponKeywords.includes('CLEAVE 2') && /Limit: 2/.test(kh.restriction), 'Golden Khanjar: 20 👑, 1H, +1 INJURY MODIFIER, CLEAVE 2, Limit 2');
const leaf = X.findBattlekitItem(IS, 'hashashin-leaf-fid');
ok(leaf && leaf.cost === 5 && /Consumable/.test(leaf.restriction) && /Limit: 4/.test(leaf.restriction) && /STRONG/.test(leaf.note), 'Hashashin Leaf: 5 👑, Consumable, Limit 4');
ok(state(FI, M('azebs'), 'hashashin-leaf-fid') === 'available', 'Hashashin Leaf: cualquiera');

console.log('\nGroup 3: mejoras');
const arts = { 'hallucinogen-disguise': 20, 'mirage-of-time': 15, 'secret-paths': 10, 'thunderbolt-alamut': 20 };
const maUps = X.allAvailableUpgrades(ma, FI());
ok(Object.keys(arts).every(id => { const u = maUps.find(x => x.id === id); return u && u.cost === arts[id]; }), 'Art of Assassination: 4 habilidades con su coste (Master Assassin)');
ok(Object.keys(arts).every(id => X.allAvailableUpgrades(X.getUnit(IS, 'sult-assassin'), FI()).some(x => x.id === id)), 'Art of Assassination: también Sultanate Assassin');
ok(!X.allAvailableUpgrades(X.getUnit(IS, 'sult-assassin'), BASE()).some(x => x.id === 'mirage-of-time'), 'sin variante: sin Art of Assassination');
const a1 = M('master-assassin-fid', [], ['mirage-of-time']);
const a2 = M('sult-assassin');
ok(upState(FI([a1, a2]), a2, 'mirage-of-time') === 'disabled', 'Art of Assassination: no repetir la misma habilidad');
ok(new Set(Object.keys(arts).map(id => (maUps.find(x => x.id === id) || {}).mutuallyExclusiveGroup)).size === 1 && maUps.find(x => x.id === 'secret-paths').mutuallyExclusiveGroup, 'Art of Assassination: una por Assassin (grupo exclusivo)');
const tb = M('sult-assassin', [], ['thunderbolt-alamut']);
ok(X.effectiveStats(tb, X.getUnit(IS, 'sult-assassin'), FI([tb])).movement === '8"/Infantry', 'Thunderbolt of Alamut: +2" Movement');
ok(['Hallucinogen Disguise', 'Mirage of Time', 'Secret Paths', 'Thunderbolt of Alamut'].every(n => X.lookupRuleText(n)), 'Art of Assassination con texto');
const acol = [1, 2, 3].map(() => M('azebs', [], ['assassin-acolyte']));
const az4 = M('azebs');
ok(upState(FI(acol.concat(az4)), az4, 'assassin-acolyte') === 'disabled', 'Assassin Acolytes: máx. 3');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
