/* Test sub-fase F: Goetic Spells minimum integration en sim
 *
 * attachSorcerer(model, repertoire): añade spells + castsRemaining.
 * castSpell(model, spellName, target?): ejecuta + decrementa casts.
 * applyGoeticEffect(target, effectDesc): mutador minimum para 2
 * effect kinds (curse-armour, skip-activation).
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_goetic.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  attachSorcerer: typeof attachSorcerer === 'function' ? attachSorcerer : null,
  castSpell: typeof castSpell === 'function' ? castSpell : null,
  applyGoeticEffect: typeof applyGoeticEffect === 'function' ? applyGoeticEffect : null,
};
`;
const stub = `
const localStorage = { _d: {}, getItem(k){return this._d[k]||null;}, setItem(k,v){this._d[k]=String(v);}, removeItem(k){delete this._d[k];}, clear(){this._d={};} };
let lastAlert = null;
function alert(msg){ lastAlert = msg; }
function fakeEl(){ return { style:{}, classList:{add(){},remove(){},toggle(){},contains(){return false;}}, addEventListener(){}, removeEventListener(){}, appendChild(){}, querySelectorAll(){return [];}, querySelector(){return null;}, setAttribute(){}, getAttribute(){return null;}, innerHTML:'', textContent:'', value:'', children:[], dataset:{}, click(){}, focus(){}, blur(){}, dispatchEvent(){}, cloneNode(){return fakeEl();}, parentNode:{ replaceChild(){} } }; }
const window = { addEventListener(){}, removeEventListener(){}, location:{search:''}, navigator:{userAgent:''}, matchMedia(){return {matches:false,addEventListener(){},addListener(){}};}, requestAnimationFrame(fn){return 0;}, setTimeout(){return 0;}, clearTimeout(){} };
const document = { addEventListener(){}, removeEventListener(){}, querySelectorAll(){return [];}, querySelector(){return fakeEl();}, getElementById(){return fakeEl();}, createElement(){return fakeEl();}, body:fakeEl(), documentElement:fakeEl() };
const setTimeout = (fn, ms) => 0;
const clearTimeout = () => {};
`;
fs.writeFileSync(TMP, stub + moduleCode);

const lib = require(TMP);
const { attachSorcerer, castSpell, applyGoeticEffect } = lib;
if (!attachSorcerer || !castSpell || !applyGoeticEffect) {
  console.error('✗ helpers missing'); process.exit(1);
}

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: attachSorcerer setea repertoire + casts', () => {
  const m = { name:'Court Sorcerer' };
  attachSorcerer(m, ['Curse of Worms', 'Whispers of the Serpent']);
  ok(m.isSorcerer === true, 'isSorcerer flag');
  ok(Array.isArray(m.spells) && m.spells.length === 2, 'spells array length 2');
  ok(typeof m.castsRemaining === 'number' && m.castsRemaining > 0, 'castsRemaining set');
});

group('Group 2: castSpell devuelve effect descriptor', () => {
  const m = { name:'Sorcerer' };
  attachSorcerer(m, ['Curse of Worms']);
  const target = { name:'Enemy', armour: 0 };
  const eff = castSpell(m, 'Curse of Worms', target);
  ok(eff && typeof eff === 'object', 'devuelve effect descriptor');
  ok(eff.kind === 'curse-armour', 'kind = curse-armour');
  ok(typeof eff.amount === 'number', 'amount numérico');
});

group('Group 3: castSpell decrementa casts', () => {
  const m = { name:'Sorcerer' };
  attachSorcerer(m, ['Curse of Worms']);
  const before = m.castsRemaining;
  castSpell(m, 'Curse of Worms', { name:'X' });
  ok(m.castsRemaining === before - 1, 'casts -= 1');
});

group('Group 4: castSpell devuelve null si no casts', () => {
  const m = { name:'Sorcerer' };
  attachSorcerer(m, ['Curse of Worms']);
  m.castsRemaining = 0;
  const eff = castSpell(m, 'Curse of Worms', { name:'X' });
  ok(eff === null, 'sin casts → null');
});

group('Group 5: castSpell unknown spell → null', () => {
  const m = { name:'Sorcerer' };
  attachSorcerer(m, ['Curse of Worms']);
  const eff = castSpell(m, 'Lightning Bolt', { name:'X' });
  ok(eff === null, 'hechizo no en repertoire → null');
});

group('Group 6: applyGoeticEffect — curse-armour reduce armour', () => {
  const target = { name:'Enemy', armour: -1 };
  applyGoeticEffect(target, { kind:'curse-armour', amount: 1 });
  ok(target.armour === -2, 'armour -1 → -2');
  ok(target.cursed === true, 'cursed flag set');
});

group('Group 7: applyGoeticEffect — skip-activation flag', () => {
  const target = { name:'Enemy' };
  applyGoeticEffect(target, { kind:'skip-activation' });
  ok(target.skipNextActivation === true, 'skipNextActivation flag');
});

group('Group 8: defensive', () => {
  let threw = false;
  try { attachSorcerer(null, []); } catch (e) { threw = true; }
  ok(!threw, 'null model no-throw');
  ok(castSpell(null, 'X') === null, 'null model cast → null');
  threw = false;
  try { applyGoeticEffect(null, { kind:'curse-armour' }); } catch (e) { threw = true; }
  ok(!threw, 'null target apply no-throw');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
