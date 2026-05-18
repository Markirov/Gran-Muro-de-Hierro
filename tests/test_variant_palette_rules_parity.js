/* Roadmap media prio — Paridad VARIANT_PALETTES vs VARIANT_FACTION_RULES.
 *
 * Toda variante con reglas faccionales (entry en VARIANT_FACTION_RULES) debe
 * tener su paleta correspondiente (entry en VARIANT_PALETTES). Permite la
 * dirección inversa (paleta sin reglas explícitas — la paleta sola es válida
 * porque la facción base provee las reglas comunes).
 *
 * Cierra inconsistencia detectada en roadmap:
 * - new-antioch:red-brigade (reglas Wear and Tear + No Retreat, sin paleta)
 * - black-grail:great-hegemon (regla Dirge, sin paleta)
 * - black-grail:great-hunger (regla The Great Hunger, sin paleta)
 *
 * Verifica también que cada paleta:
 * - Apunta a ORNAMENT existente en ORNAMENT_FUNCTIONS
 * - Define FRAME, VARIANT (mínimo necesario para frame/badge canvas)
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_variant_parity.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  VARIANT_PALETTES: typeof VARIANT_PALETTES !== 'undefined' ? VARIANT_PALETTES : null,
  VARIANT_FACTION_RULES: typeof VARIANT_FACTION_RULES !== 'undefined' ? VARIANT_FACTION_RULES : null,
  ORNAMENT_FUNCTIONS: typeof ORNAMENT_FUNCTIONS !== 'undefined' ? ORNAMENT_FUNCTIONS : null,
};
`;
const stub = `
const localStorage = { _d: {}, getItem(k){return this._d[k]||null;}, setItem(k,v){this._d[k]=String(v);}, removeItem(k){delete this._d[k];}, clear(){this._d={};} };
let lastAlert = null; function alert(msg){ lastAlert = msg; }
function fakeEl(){ return { style:{}, classList:{add(){},remove(){},toggle(){},contains(){return false;}}, addEventListener(){}, removeEventListener(){}, appendChild(){}, querySelectorAll(){return [];}, querySelector(){return null;}, setAttribute(){}, getAttribute(){return null;}, innerHTML:'', textContent:'', value:'', children:[], dataset:{}, click(){}, focus(){}, blur(){}, dispatchEvent(){}, cloneNode(){return fakeEl();}, parentNode:{ replaceChild(){} } }; }
const window = { addEventListener(){}, removeEventListener(){}, location:{search:''}, navigator:{userAgent:''}, matchMedia(){return {matches:false,addEventListener(){},addListener(){}};}, requestAnimationFrame(fn){return 0;}, setTimeout(){return 0;}, clearTimeout(){} };
const document = { addEventListener(){}, removeEventListener(){}, querySelectorAll(){return [];}, querySelector(){return null;}, getElementById(){return fakeEl();}, createElement: fakeEl, body:fakeEl(), documentElement:fakeEl() };
const setTimeout = (fn, ms) => 0;
const clearTimeout = () => {};
`;
fs.writeFileSync(TMP, stub + moduleCode);

const lib = require(TMP);
for (const h of ['VARIANT_PALETTES','VARIANT_FACTION_RULES','ORNAMENT_FUNCTIONS']) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing en módulo'); process.exit(1); }
}
const { VARIANT_PALETTES, VARIANT_FACTION_RULES, ORNAMENT_FUNCTIONS } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: cada VARIANT_FACTION_RULES key tiene su VARIANT_PALETTES', () => {
  const ruleKeys = Object.keys(VARIANT_FACTION_RULES);
  ok(ruleKeys.length > 0, 'hay reglas definidas');
  const missing = ruleKeys.filter(k => !VARIANT_PALETTES[k]);
  if (missing.length > 0) {
    console.log('    Faltan paletas para: ' + missing.join(', '));
  }
  ok(missing.length === 0, 'todas las variantes con reglas tienen paleta');
});

group('Group 2: cierres específicos de inconsistencia roadmap', () => {
  ok(!!VARIANT_PALETTES['new-antioch:red-brigade'],
     'paleta new-antioch:red-brigade definida');
  ok(!!VARIANT_PALETTES['black-grail:great-hegemon'],
     'paleta black-grail:great-hegemon definida');
  ok(!!VARIANT_PALETTES['black-grail:great-hunger'],
     'paleta black-grail:great-hunger definida');
});

group('Group 3: paletas nuevas con campos mínimos', () => {
  const required = ['FRAME','VARIANT','ORNAMENT'];
  const newKeys = [
    'new-antioch:red-brigade',
    'black-grail:great-hegemon',
    'black-grail:great-hunger',
  ];
  for (const k of newKeys) {
    const p = VARIANT_PALETTES[k];
    if (!p) continue;
    for (const f of required) {
      ok(p[f] != null, k + ' tiene ' + f);
    }
  }
});

group('Group 4: ORNAMENT referenciado existe en ORNAMENT_FUNCTIONS', () => {
  for (const [key, palette] of Object.entries(VARIANT_PALETTES)) {
    if (!palette.ORNAMENT) continue;
    ok(typeof ORNAMENT_FUNCTIONS[palette.ORNAMENT] === 'function',
       key + ' ORNAMENT="' + palette.ORNAMENT + '" registrado');
  }
});

group('Group 5: paleta Red Brigade tiene paleta roja (canon soviético)', () => {
  const p = VARIANT_PALETTES['new-antioch:red-brigade'];
  if (!p) { ok(false, 'paleta inexistente'); return; }
  // VARIANT debe ser un tono rojo intenso (R>120, G<60, B<60 — rojo grimdark).
  const v = p.VARIANT;
  ok(Array.isArray(v) && v.length === 3, 'VARIANT es RGB triplet');
  if (Array.isArray(v) && v.length === 3) {
    ok(v[0] > 120 && v[1] < 80 && v[2] < 80,
       'VARIANT en rango rojo (canon Red Brigade)');
  }
});

group('Group 6: paletas Black Grail variantes usan tono plague/visceral', () => {
  const hegemon = VARIANT_PALETTES['black-grail:great-hegemon'];
  const hunger = VARIANT_PALETTES['black-grail:great-hunger'];
  ok(hegemon && hegemon.VARIANT, 'hegemon VARIANT presente');
  ok(hunger && hunger.VARIANT, 'hunger VARIANT presente');
  // Diferenciación: hegemon (Dirge, Plague) vs hunger (Antipope, blood/red).
  if (hegemon && hunger && Array.isArray(hegemon.VARIANT) && Array.isArray(hunger.VARIANT)) {
    const same = hegemon.VARIANT.join(',') === hunger.VARIANT.join(',');
    ok(!same, 'paletas hegemon y hunger NO idénticas (diferenciación visual)');
  }
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
