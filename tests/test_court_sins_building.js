/* The Court of the Seven-Headed Serpent (Warbands 1.0.2): Seven Deadly Sins.
 * Cada pecado abre su lista de Goetic Powers (con coste, restricción y Limit),
 * fija el aura del Desecrated Saint y el número de poderes del Praetor (1 en
 * Wrath). La banda debe elegir pecado antes de reclutar.
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
dom.window.eval(js.slice(0, bootIdx) + '\n;window.__X = { DATA, getUnit, allAvailableUpgrades, classifyUpgrade, effectiveAbilities, effectiveKeywords, checkUpgradeLegality, modelCost, lookupRuleText };');
const X = dom.window.__X;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

const CO = 'court-serpent';
const W = sin => (models = []) => ({ factionId: CO, variantId: sin ? 'sin-' + sin : null, models });
const M = (unitId, ups = []) => ({ uid: unitId + Math.random(), unitId, battlekit: [], upgrades: ups });
const U = id => X.getUnit(CO, id);
const ups = (wb, uid) => X.allAvailableUpgrades(U(uid), wb);
const upState = (wb, model, upId) => {
  const up = ups(wb, model.unitId).find(u => u.id === upId);
  return up ? X.classifyUpgrade(up, model, U(model.unitId), wb).state : 'missing';
};

const LISTS = {
  wrath:    { 'blind-rage': 10, 'charge-of-hatred': 10, 'lesser-mark-of-cain': 20 },
  envy:     { 'coveted-position': 10, 'envious-eyes': 5, 'what-is-yours-is-mine': 10 },
  lust:     { 'call-of-the-flesh': 15, 'exquisite-pain': 15, 'forbidden-pleasures': 10 },
  pride:    { 'light-of-samael': 15, 'proud-defiance': 15, 'too-proud-to-fall': 10 },
  sloth:    { 'charm-of-acedia': 15, 'daemonium-meridianum': 20, 'morphean-mind': 15 },
  gluttony: { 'belly-of-the-beast': 5, 'eater-of-the-flesh': 10, 'uncaring-gluttony': 10 },
  greed:    { 'black-heart': 5, 'body-of-gold': 15, 'greedy-hearts': 15 },
};

console.log('\nGroup 1: listas por pecado');
for (const [sin, list] of Object.entries(LISTS)) {
  const pu = ups(W(sin)(), 'praetor');
  ok(Object.entries(list).every(([id, c]) => { const u = pu.find(x => x.id === 'gp-' + id); return u && u.cost === c && u.currency === '👑'; }), sin + ': sus 3 Goetic Powers con coste (Praetor)');
  const other = Object.keys(LISTS).find(s => s !== sin);
  ok(!Object.keys(LISTS[other]).some(id => pu.some(x => x.id === 'gp-' + id)), sin + ': sin poderes de ' + other);
}
ok(!ups(W(null)(), 'praetor').some(u => /^gp-/.test(u.id)), 'sin pecado: sin Goetic Powers');
const allNames = ['Blind Rage', 'Charge of Hatred', 'Lesser Mark of Cain', 'Coveted Position', 'Envious Eyes', 'What is Yours is Mine', 'Call of the Flesh', 'Exquisite Pain', 'Forbidden Pleasures', 'Light of Samael', 'Proud Defiance', 'Too Proud to Fall', 'Charm of Acedia', 'Daemonium Meridianum', 'Morphean Mind', 'Belly of the Beast', 'Eater of the Flesh', 'Uncaring Gluttony', 'Black Heart', 'Body of Gold', 'Greedy Hearts'];
ok(allNames.every(n => X.lookupRuleText(n)), 'los 21 Goetic Powers con texto');

console.log('\nGroup 2: restricciones');
ok(ups(W('envy')(), 'hell-knights').some(u => u.id === 'gp-what-is-yours-is-mine') && !ups(W('envy')(), 'hell-knights').some(u => u.id === 'gp-coveted-position'), 'Praetors & Sorcerers only: no Hell Knights; ELITE only: sí');
ok(!ups(W('wrath')(), 'wretched-co').some(u => /^gp-/.test(u.id)), 'Troops sin Goetic Powers');
ok(upState(W('wrath')([M('hell-knights', ['gp-lesser-mark-of-cain'])]), M('praetor'), 'gp-lesser-mark-of-cain') === 'disabled', 'Lesser Mark of Cain: Limit 1');
const three = [M('hell-knights', ['gp-blind-rage']), M('hell-knights', ['gp-blind-rage']), M('sorcerer', ['gp-blind-rage'])];
ok(upState(W('wrath')(three), M('praetor'), 'gp-blind-rage') === 'disabled', 'Blind Rage: Limit 3');
const pw = M('praetor', ['gp-blind-rage']);
ok(upState(W('wrath')([pw]), pw, 'gp-charge-of-hatred') === 'disabled', 'Praetor de Wrath: solo 1 Goetic Power');
const pp = M('praetor', ['gp-light-of-samael']);
ok(upState(W('pride')([pp]), pp, 'gp-proud-defiance') === 'available', 'Praetor: hasta 2 Goetic Powers');
const pp2 = M('praetor', ['gp-light-of-samael', 'gp-proud-defiance']);
ok(upState(W('pride')([pp2]), pp2, 'gp-too-proud-to-fall') === 'disabled', 'Praetor: no un 3.º');
const so = M('sorcerer', ['gp-light-of-samael', 'gp-proud-defiance']);
ok(upState(W('pride')([so]), so, 'gp-too-proud-to-fall') === 'available', 'Sorcerer: hasta 3 Goetic Powers');
const hk = M('hell-knights', ['gp-proud-defiance']);
ok(upState(W('pride')([M('praetor'), hk]), M('hell-knights'), 'gp-proud-defiance') === 'available' && upState(W('sloth')([M('hell-knights', ['gp-charm-of-acedia'])]), M('hell-knights', ['gp-charm-of-acedia']), 'gp-morphean-mind') === 'disabled', 'Hell Knight: 1 Goetic Power además de Blood Magic');
const bg = M('praetor', ['gp-body-of-gold']);
const bgK = X.effectiveKeywords(bg, U('praetor'), W('greed')([bg]));
ok(bgK.includes('GOLEM') && !bgK.includes('TOUGH'), 'Body of Gold: GOLEM y pierde TOUGH');
const mk = M('praetor', ['gp-lesser-mark-of-cain']);
ok(X.effectiveKeywords(mk, U('praetor'), W('wrath')([mk])).includes('-1 INJURY DICE'), 'Lesser Mark of Cain: -1 INJURY DICE');
ok(X.modelCost(pp, CO, W('pride')([pp])).ducados === 115 + 15, 'coste: Praetor + Light of Samael');

console.log('\nGroup 3: Desecrated Saint y elección de pecado');
const AURAS = { wrath: 'Aura of Wrath', envy: 'Aura of Envy', lust: 'Aura of Lust', pride: 'Aura of Pride', sloth: 'Aura of Sloth', gluttony: 'Aura of Gluttony', greed: 'Aura of Greed' };
for (const [sin, aura] of Object.entries(AURAS)) {
  const ds = X.effectiveAbilities(M('desecrated-saint'), U('desecrated-saint'), W(sin)());
  ok(ds.includes(aura) && X.lookupRuleText(aura), 'Desecrated Saint (' + sin + '): ' + aura);
}
ok(X.checkUpgradeLegality(W(null)([M('praetor')])).some(w => /pecado|Sin/i.test(w)), 'aviso: la banda debe elegir pecado');
ok(!X.checkUpgradeLegality(W('wrath')([M('praetor')])).some(w => /elegir.*pecado/i.test(w)), 'con pecado: sin aviso');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);

