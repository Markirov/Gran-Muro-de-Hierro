/* Roadmap baja prio — Paletas faccionales pendientes.
 *
 * Trench Pilgrims (3 variantes), Heretic Legions (3 variantes),
 * The Court (7 Sins). Total: 13 paletas nuevas.
 *
 * Verifica:
 * - Cada variante canon definida en DATA tiene paleta en VARIANT_PALETTES.
 * - Ornament referenciado existe en ORNAMENT_FUNCTIONS.
 * - Alias 'court-serpent' presente en FACTION_PALETTES + FACTION_PLACEHOLDERS
 *   (factionId real en DATA = 'court-serpent', no 'the-court').
 * - Sins comparten ornamento `seven_headed_serpent` pero cada uno tiene
 *   color VARIANT propio (diferenciación visual entre sins).
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_palettes_remaining.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  VARIANT_PALETTES: typeof VARIANT_PALETTES !== 'undefined' ? VARIANT_PALETTES : null,
  FACTION_PALETTES: typeof FACTION_PALETTES !== 'undefined' ? FACTION_PALETTES : null,
  FACTION_PLACEHOLDERS: typeof FACTION_PLACEHOLDERS !== 'undefined' ? FACTION_PLACEHOLDERS : null,
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
for (const h of ['VARIANT_PALETTES','FACTION_PALETTES','FACTION_PLACEHOLDERS','ORNAMENT_FUNCTIONS']) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { VARIANT_PALETTES, FACTION_PALETTES, FACTION_PLACEHOLDERS, ORNAMENT_FUNCTIONS } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

const PILGRIMS = ['sacred-affliction','st-methodius','tenth-plague'];
const HERETICS = ['trench-ghosts','avarice-knights','naval-raiders'];
const SINS = ['sin-wrath','sin-envy','sin-lust','sin-pride','sin-sloth','sin-gluttony','sin-greed'];

/* ------------------------------------------------------------------ */
group('Group 1: Trench Pilgrims variants (3) tienen paleta', () => {
  for (const v of PILGRIMS) {
    const key = 'trench-pilgrims:' + v;
    const p = VARIANT_PALETTES[key];
    ok(!!p, key + ' definida');
    if (p) {
      ok(!!p.FRAME, key + ' tiene FRAME');
      ok(!!p.VARIANT, key + ' tiene VARIANT');
      ok(!!p.ORNAMENT, key + ' tiene ORNAMENT');
      ok(typeof ORNAMENT_FUNCTIONS[p.ORNAMENT] === 'function',
         key + ' ORNAMENT "' + p.ORNAMENT + '" registrado');
    }
  }
});

group('Group 2: Heretic Legions variants (3) tienen paleta', () => {
  for (const v of HERETICS) {
    const key = 'heretic-legions:' + v;
    const p = VARIANT_PALETTES[key];
    ok(!!p, key + ' definida');
    if (p) {
      ok(!!p.FRAME, key + ' tiene FRAME');
      ok(!!p.VARIANT, key + ' tiene VARIANT');
      ok(!!p.ORNAMENT, key + ' tiene ORNAMENT');
      ok(typeof ORNAMENT_FUNCTIONS[p.ORNAMENT] === 'function',
         key + ' ORNAMENT "' + p.ORNAMENT + '" registrado');
    }
  }
});

group('Group 3: The Court 7 Sins tienen paleta (factionId real court-serpent)', () => {
  for (const v of SINS) {
    const key = 'court-serpent:' + v;
    const p = VARIANT_PALETTES[key];
    ok(!!p, key + ' definida');
    if (p) {
      ok(!!p.VARIANT, key + ' tiene VARIANT');
      ok(p.ORNAMENT === 'seven_headed_serpent',
         key + ' usa ornamento canon de The Court');
    }
  }
});

group('Group 4: Cada Sin tiene VARIANT color único', () => {
  const colors = new Set();
  for (const v of SINS) {
    const p = VARIANT_PALETTES['court-serpent:' + v];
    if (p && Array.isArray(p.VARIANT)) colors.add(p.VARIANT.join(','));
  }
  ok(colors.size === SINS.length, 'los 7 sins tienen VARIANT diferenciado entre sí');
});

group('Group 5: Alias court-serpent en FACTION_PALETTES + FACTION_PLACEHOLDERS', () => {
  ok(!!FACTION_PALETTES['court-serpent'],
     'FACTION_PALETTES["court-serpent"] presente (alias de the-court)');
  ok(Array.isArray(FACTION_PLACEHOLDERS['court-serpent']) &&
     FACTION_PLACEHOLDERS['court-serpent'].length >= 3,
     'FACTION_PLACEHOLDERS["court-serpent"] poblado ≥3');
});

group('Group 6: Total entradas VARIANT_PALETTES ≥ 24', () => {
  // 8 existentes + 3 ya añadidas (red-brigade, great-hegemon, great-hunger)
  // + 13 nuevas (3 pilgrims + 3 heretics + 7 sins) = 24.
  const count = Object.keys(VARIANT_PALETTES).length;
  ok(count >= 24, 'cuenta ≥24 (got ' + count + ')');
});

group('Group 7: ornamentos sacred_affliction + naval_raider registrados', () => {
  // Sub-pruebas adicionales: ornamentos específicos esperados.
  const expectedOrnaments = [
    'thorn_crown',       // sacred-affliction
    'orthodox_cross',    // st-methodius
    'lamb_skull',        // tenth-plague
    'ghost_mask',        // trench-ghosts
    'coin_stack',        // avarice-knights
    'anchor_skull',      // naval-raiders
  ];
  for (const orn of expectedOrnaments) {
    ok(typeof ORNAMENT_FUNCTIONS[orn] === 'function',
       'ornamento ' + orn + ' registrado');
  }
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
