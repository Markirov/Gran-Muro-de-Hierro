/* Test: Sorcerer cast cycle wired en activateModel_lab.
 *
 * Sorcerer con casts disponibles lanza un hechizo en lugar de
 * ataque normal en phases ranged. Prioridad: curse-armour si el
 * target no está cursed ya; skip-activation si no skipNextActivation
 * ya.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_sorcerer.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  activateModel_lab,
  attachSorcerer,
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
const { activateModel_lab, attachSorcerer } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

function mkModel(name) {
  return {
    name,
    isOut: false, isDown: false, bloodMarkers: 0,
    rangedDice: 1, meleeDice: 1, armour: 0,
    weapons: [{ name:'Test Weapon', isRanged:true, range:18, diceMod:0, injuryDice:0, injuryMod:0, keywords:new Set() }],
    keywords: new Set(),
    _stats: { kills:0, dmgDealt:0, dmgReceived:0, turnsSurvived:0 },
    _terrain: 'mixed',
  };
}

/* ------------------------------------------------------------------ */
group('Group 1: Sorcerer lanza Curse of Worms en mid phase', () => {
  const sor = mkModel('Sorcerer');
  attachSorcerer(sor, ['Curse of Worms']);
  const enemy = mkModel('Enemy'); enemy.armour = 0;
  const beforeCasts = sor.castsRemaining;
  activateModel_lab(sor, [sor], [enemy], 'mid');
  ok(sor.castsRemaining === beforeCasts - 1, 'castsRemaining -= 1');
  ok(enemy.cursed === true, 'enemy cursed flag set');
  ok(enemy.armour === -1, 'enemy armour reducido por curse (0 → -1)');
  ok(sor._stats.spellsCast === 1, '_stats.spellsCast = 1');
});

group('Group 2: sin casts → fall through a ataque normal', () => {
  const sor = mkModel('Sorcerer');
  attachSorcerer(sor, ['Curse of Worms']);
  sor.castsRemaining = 0;
  const enemy = mkModel('Enemy');
  activateModel_lab(sor, [sor], [enemy], 'mid');
  ok(!enemy.cursed, 'sin cast → enemy NO cursed');
  ok(sor.castsRemaining === 0, 'casts sigue 0');
  ok(!sor._stats.spellsCast || sor._stats.spellsCast === 0, 'spellsCast = 0');
});

group('Group 3: target ya cursed → busca otro spell o pasa', () => {
  const sor = mkModel('Sorcerer');
  attachSorcerer(sor, ['Curse of Worms', 'Whispers of the Serpent']);
  const enemy = mkModel('Enemy');
  enemy.cursed = true;   // ya cursed
  enemy.armour = -1;
  const beforeArmour = enemy.armour;
  activateModel_lab(sor, [sor], [enemy], 'mid');
  // No re-aplica curse (target ya cursed) — debe usar Whispers o saltarse.
  ok(enemy.armour === beforeArmour, 'no aplica curse 2da vez (armour intacto)');
  // Verifica que algo se hizo (skipNextActivation o cast)
  const didSomething = sor._stats.spellsCast > 0 || enemy.skipNextActivation === true;
  ok(didSomething, 'usó algún spell alternativo (Whispers) o ataque normal');
});

group('Group 4: non-Sorcerer ignora cast loop', () => {
  const m = mkModel('Trooper');
  // No attachSorcerer call → m.isSorcerer undefined
  const enemy = mkModel('Enemy');
  activateModel_lab(m, [m], [enemy], 'mid');
  ok(!m.spellsCast, 'no cast counter en no-sorcerer');
  ok(!enemy.cursed, 'enemy no cursed');
});

group('Group 5: engagement phase → no cast', () => {
  const sor = mkModel('Sorcerer');
  attachSorcerer(sor, ['Curse of Worms']);
  const enemy = mkModel('Enemy');
  enemy.armour = 0;
  const beforeCasts = sor.castsRemaining;
  activateModel_lab(sor, [sor], [enemy], 'engagement');
  // En engagement, el sorcerer no lanza hechizos (no la idea canónica).
  ok(sor.castsRemaining === beforeCasts, 'casts intactos en engagement');
  ok(!enemy.cursed, 'enemy no cursed');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
