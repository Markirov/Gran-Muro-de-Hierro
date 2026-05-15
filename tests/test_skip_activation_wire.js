/* Test: applySkipActivation wired en activateModel_lab.
 *
 * Modelo con skipNextActivation=true al inicio de su activación se
 * salta el turno entero. El flag se consume (false post). Sin alive
 * enemies test no es posible — pero podemos verificar que el helper
 * está siendo invocado dentro de activateModel_lab via grep.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_skip_wire.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  activateModel_lab: typeof activateModel_lab === 'function' ? activateModel_lab : null,
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
const { activateModel_lab } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: activateModel_lab consume skipNextActivation', () => {
  const model = {
    name: 'Test',
    isOut: false, isDown: false, bloodMarkers: 0,
    rangedDice: 0, meleeDice: 0,
    weapons: [],
    keywords: new Set(),
    skipNextActivation: true,
    _stats: { kills:0, dmgDealt:0, dmgReceived:0, turnsSurvived:0 },
    _terrain: 'mixed',
  };
  const enemy = {
    name: 'Enemy', isOut: false, isDown: false, bloodMarkers: 0,
    rangedDice: 0, meleeDice: 0, weapons: [], keywords: new Set(),
    _stats: { kills:0, dmgDealt:0, dmgReceived:0, turnsSurvived:0 },
    _terrain: 'mixed',
  };
  activateModel_lab(model, [model], [enemy], 'mid');
  ok(model.skipNextActivation === false, 'flag consumido (false)');
  ok(model._stats.skipped === 1, '_stats.skipped incrementado');
  ok(enemy.bloodMarkers === 0, 'enemigo sin daño (modelo no actuó)');
});

group('Group 2: activación normal sin flag', () => {
  const model = {
    name: 'Test',
    isOut: false, isDown: false, bloodMarkers: 0,
    rangedDice: 0, meleeDice: 0,
    weapons: [],
    keywords: new Set(),
    _stats: { kills:0, dmgDealt:0, dmgReceived:0, turnsSurvived:0 },
    _terrain: 'mixed',
  };
  const enemy = {
    name: 'Enemy', isOut: false, isDown: false, bloodMarkers: 0,
    rangedDice: 0, meleeDice: 0, weapons: [], keywords: new Set(),
    _stats: { kills:0, dmgDealt:0, dmgReceived:0, turnsSurvived:0 },
    _terrain: 'mixed',
  };
  activateModel_lab(model, [model], [enemy], 'mid');
  ok(model._stats.skipped === undefined || model._stats.skipped === 0,
     'sin skip counter incrementado');
});

group('Group 3: 2ª activación post-skip funciona normal', () => {
  const model = {
    name: 'Test',
    isOut: false, isDown: false, bloodMarkers: 0,
    rangedDice: 0, meleeDice: 0,
    weapons: [],
    keywords: new Set(),
    skipNextActivation: true,
    _stats: { kills:0, dmgDealt:0, dmgReceived:0, turnsSurvived:0 },
    _terrain: 'mixed',
  };
  const enemy = {
    name: 'Enemy', isOut: false, isDown: false, bloodMarkers: 0,
    rangedDice: 0, meleeDice: 0, weapons: [], keywords: new Set(),
    _stats: { kills:0, dmgDealt:0, dmgReceived:0, turnsSurvived:0 },
    _terrain: 'mixed',
  };
  activateModel_lab(model, [model], [enemy], 'mid');
  ok(model._stats.skipped === 1, '1ª activación skipped');
  // 2ª activación: skipNextActivation ya es false → modelo activa
  activateModel_lab(model, [model], [enemy], 'mid');
  ok(model._stats.skipped === 1, '2ª activación: counter sin cambio (modelo activó)');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
