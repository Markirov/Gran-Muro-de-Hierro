/* The House of Wisdom (Warbands 1.0.2): Takwin Homunculus y Alchemical
 * Formulas. Uno por Jabirean Alchemist; sin Battlekit salvo Human Hands
 * (armas y Trench/Fire Shield) y Seal of Solomon (Equipment); Additional Arm
 * con Human Hands = 3 armas 1H o 1H + 2H por tipo; Gargantuan Size requiere
 * Human Hands, Inhuman Strength y Massive Size; incompatibilidades Wings /
 * Massive Size / Human Hands y Hawk Eyes / Hypnotic Eyes (salvo Two Heads).
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
dom.window.eval(js.slice(0, bootIdx) + '\n;window.__X = { DATA, classifyBattlekitItem, findBattlekitItem, getUnit, allAvailableUpgrades, canAddUnit, classifyUpgrade, effectiveKeywords, effectiveStats: typeof effectiveStats === "function" ? effectiveStats : null, lookupRuleText };');
const X = dom.window.__X;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

const IS = 'iron-sultanate';
const HOW = (models = []) => ({ factionId: IS, variantId: 'house-wisdom', models });
const M = (unitId, extra = {}) => Object.assign({ uid: unitId + Math.random(), unitId, battlekit: [], upgrades: [] }, extra);
const T = X.getUnit(IS, 'takwin-how');
function state(model, itemId, others = []) {
  const wb = HOW(others.concat(model));
  const item = X.findBattlekitItem(IS, itemId, wb);
  return X.classifyBattlekitItem(item, model, T, wb).state;
}
const upState = (model, upId, others = []) => {
  const wb = HOW(others.concat(model));
  const up = X.allAvailableUpgrades(T, wb).find(u => u.id === upId);
  return up ? X.classifyUpgrade(up, model, T, wb).state : 'missing';
};

console.log('\nGroup 1: entrada');
ok(T && T.variantOnly === 'house-wisdom' && T.cost === 40 && T.currency === '👑', 'Takwin Homunculus: 40 👑, solo House of Wisdom');
ok(T && T.stats.movement === '6"/Infantry' && T.stats.ranged === '+0 DICE' && T.stats.melee === '+0 DICE' && T.stats.armour === '0' && T.stats.base === '25mm', 'perfil 6"/Infantry +0/+0, Armour 0, 25mm');
ok(T && T.keywords.includes('SULTANATE') && T.keywords.includes('ARTIFICIAL'), 'SULTANATE, ARTIFICIAL');
ok(T && ['Artificial Life', 'Pummelling Blows', 'Re-creation'].every(a => T.abilities.includes(a)), 'Artificial Life, Pummelling Blows, Re-creation');
ok(/Melee Attack/.test(X.lookupRuleText('Pummelling Blows')) && /40/.test(X.lookupRuleText('Re-creation')), 'Pummelling Blows y Re-creation con texto');
const al = M('jabirean');
ok(!X.canAddUnit(HOW([]), T), 'sin Alchemist no hay Homunculus');
ok(X.canAddUnit(HOW([al]), T), '1 Alchemist → 1 Homunculus');
ok(!X.canAddUnit(HOW([al, M('takwin-how')]), T), 'no más Homunculi que Alchemists');
ok(X.canAddUnit(HOW([al, M('jabirean'), M('takwin-how')]), T), '2 Alchemists → 2 Homunculi');

console.log('\nGroup 2: Battlekit solo con fórmulas');
ok(state(M('takwin-how'), 'jezzail-is') === 'hidden', 'sin fórmulas: sin armas');
ok(state(M('takwin-how'), 'trench-shield-is') === 'hidden', 'sin fórmulas: sin escudo');
const hh = M('takwin-how', { upgrades: ['human-hands'] });
ok(state(hh, 'jezzail-is') === 'available', 'Human Hands: armas a distancia');
ok(state(hh, 'trench-shield-is') === 'available' && state(hh, 'fire-shield-how') === 'available', 'Human Hands: Trench Shield o Fire Shield');
ok(state(hh, 'reinforced-is') === 'hidden', 'Human Hands: sin armadura');
ok(state(hh, 'medikit-is') === 'hidden', 'Human Hands: sin Equipment');
const seal = M('takwin-how', { upgrades: ['seal-of-solomon'] });
ok(state(seal, 'medikit-is') === 'available' && state(seal, 'jezzail-is') === 'hidden', 'Seal of Solomon: Equipment, no armas');

console.log('\nGroup 3: Additional Arm');
const arms = (bk) => M('takwin-how', { upgrades: ['additional-arm', 'human-hands'], battlekit: bk });
const sword = { id: 'sword-is' }, sword2 = { id: 'trench-club-is' }, dag = { id: 'trench-knife-is' }, great = { id: 'great-hammer-is' };
ok(state(arms([sword.id, sword2.id]), dag.id) === 'available', 'Additional Arm: 3.ª arma 1H cuerpo a cuerpo');
ok(state(M('takwin-how', { upgrades: ['human-hands'], battlekit: [sword.id, sword2.id] }), dag.id) === 'disabled', 'sin Additional Arm: máximo 2');
ok(state(arms([sword.id]), great.id) === 'available', 'Additional Arm: 1H + 2H');
ok(state(arms([sword.id, sword2.id]), great.id) === 'disabled', 'Additional Arm: no 2 × 1H + 2H');
ok(state(arms([sword.id, sword2.id]), 'trench-shield-is') === 'available', 'Additional Arm: el escudo ocupa una de las 3 manos de cuerpo a cuerpo');
ok(state(arms([sword.id, sword2.id, 'trench-shield-is']), dag.id) === 'disabled', 'con escudo: máximo 2 armas cuerpo a cuerpo');
ok(state(arms(['trench-shield-is']), great.id) === 'disabled', 'con escudo: sin Shield Combo (no 2H)');

console.log('\nGroup 4: fórmulas y requisitos');
const cost = { 'additional-arm': 15, 'elemental-resistance': 40, 'enslaved-mind': 10, 'gargantuan-size': 20, 'hawk-eyes': 10, 'human-hands': 10, 'hypnotic-eyes': 15, 'inhuman-strength': 15, 'massive-size': 30, 'regenerative-tissue': 25, 'seal-of-solomon': 10, 'startling-speed': 10, 'terrifying-appearance': 10, 'two-heads': 5, 'wings': 30 };
const all = X.allAvailableUpgrades(T, HOW());
Object.entries(cost).forEach(([id, c]) => ok((all.find(u => u.id === id) || {}).cost === c, id + ': ' + c + ' 👑'));
ok(upState(M('takwin-how'), 'gargantuan-size') === 'disabled', 'Gargantuan Size requiere Human Hands, Inhuman Strength y Massive Size');
ok(upState(M('takwin-how', { upgrades: ['human-hands', 'inhuman-strength', 'massive-size'] }), 'gargantuan-size') === 'available', 'Gargantuan Size con sus 3 requisitos');
ok(upState(M('takwin-how', { upgrades: ['wings'] }), 'human-hands') === 'disabled', 'Wings impide Human Hands');
ok(upState(M('takwin-how', { upgrades: ['wings'] }), 'massive-size') === 'disabled', 'Wings impide Massive Size');
ok(upState(M('takwin-how', { upgrades: ['massive-size'] }), 'wings') === 'disabled', 'Massive Size impide Wings');
ok(upState(M('takwin-how', { upgrades: ['hawk-eyes'] }), 'hypnotic-eyes') === 'disabled', 'Hawk Eyes impide Hypnotic Eyes');
ok(upState(M('takwin-how', { upgrades: ['hawk-eyes', 'two-heads'] }), 'hypnotic-eyes') === 'available', 'con Two Heads: Hawk Eyes + Hypnotic Eyes');
const big = M('takwin-how', { upgrades: ['human-hands', 'inhuman-strength', 'massive-size', 'gargantuan-size'] });
const kws = X.effectiveKeywords(big, T);
ok(kws.includes('STRONG') && kws.includes('TOUGH'), 'Inhuman Strength + Massive Size: STRONG y TOUGH');
if (X.effectiveStats) {
  const st = X.effectiveStats(big, T);
  ok(st.base === '60mm' && st.melee === '+1 DICE', 'Gargantuan: base 60mm; Inhuman Strength: Melee +1 DICE');
  const w = X.effectiveStats(M('takwin-how', { upgrades: ['wings'] }), T);
  ok(w.movement === '8"/Flying', 'Wings: 8"/Flying');
}
ok(X.effectiveKeywords(M('takwin-how', { upgrades: ['wings'] }), T).includes('FLYING'), 'Wings: FLYING');
ok(state(big, 'flame-cannon-is') === 'available', 'Gargantuan: puede llevar un arma de Brazen Bull');
ok(state(M('takwin-how', { upgrades: ['human-hands'] }), 'flame-cannon-is') === 'hidden', 'sin Gargantuan: no');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);

