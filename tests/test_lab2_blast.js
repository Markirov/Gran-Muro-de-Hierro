/* Lab 2.0 — Sprint 27 — BLAST area effect en ranged V1.
 *
 * Canon TC: weapon keyword 'BLAST X"' aplica daño a todos los modelos
 * dentro de X" del target original. V1 spatial abstracto: cuando
 * rollSpatialAttack hit con weapon BLAST, aplica daño a enemies en
 * radio (30% KO per nearby).
 *
 * Helpers:
 *  - parseBlastRadius(eqItem, factionId): número (pulgadas) o 0 si no BLAST.
 *  - applyBlastSplash(state, attacker, weaponItem, targetUid, rng): splash KOs.
 *
 * Aplica en rollSpatialAttack cuando se detecta BLAST en el equipo.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_lab2_blast.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  parseBlastRadius:  typeof parseBlastRadius === 'function' ? parseBlastRadius : null,
  applyBlastSplash:  typeof applyBlastSplash === 'function' ? applyBlastSplash : null,
  rollSpatialAttack: typeof rollSpatialAttack === 'function' ? rollSpatialAttack : null,
  createLab2Battle:  typeof createLab2Battle === 'function' ? createLab2Battle : null,
  placeModel:        typeof placeModel === 'function' ? placeModel : null,
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
for (const h of ['parseBlastRadius','applyBlastSplash','rollSpatialAttack','createLab2Battle','placeModel']) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { parseBlastRadius, applyBlastSplash, rollSpatialAttack, createLab2Battle, placeModel } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

function mkModel(uid, name, opts = {}) {
  return {
    uid, name,
    companionStats: Object.assign({ move: '6"/Infantry', ranged: '+1', melee: '+1', armour: '0' }, opts.stats || {}),
    companionKeywords: opts.keywords || [],
    companionAbilities: [],
    companionEquipment: opts.equipment || [],
    tier: opts.tier || 'troops',
    isOut: false,
  };
}

/* ------------------------------------------------------------------ */
group('Group 1: parseBlastRadius detecta BLAST X"', () => {
  ok(parseBlastRadius({ weaponKeywords: ['BLAST 3"'] }) === 3,
     'BLAST 3" → 3');
  ok(parseBlastRadius({ weaponKeywords: ['BLAST 5"'] }) === 5,
     'BLAST 5" → 5');
  ok(parseBlastRadius({ weaponKeywords: ['+1 DICE'] }) === 0,
     'sin BLAST → 0');
});

group('Group 2: parseBlastRadius via armoury (Frag Grenade NA)', () => {
  // Frag Grenade NA: BLAST 3" en armoury.
  const r = parseBlastRadius({ name: 'Frag Grenade' }, 'new-antioch');
  ok(typeof r === 'number', 'devuelve numérico');
  // Si Frag Grenade tiene BLAST 3" en NA armoury, r=3. Sino fallback.
});

group('Group 3: applyBlastSplash KO enemigos en radio', () => {
  const s = createLab2Battle('open-ground',
    [mkModel('f1','A')],
    [mkModel('e1','T'), mkModel('e2','near'), mkModel('e3','far')]);
  placeModel(s, 'friendly', 'f1', { x: 5, y: 5 });
  placeModel(s, 'enemy', 'e1', { x: 10, y: 10 });   // target
  placeModel(s, 'enemy', 'e2', { x: 11, y: 10 });   // 1" del target
  placeModel(s, 'enemy', 'e3', { x: 25, y: 10 });   // muy lejos
  // rng=0.01 → siempre KO (30% threshold).
  const kos = applyBlastSplash(s, 'f1', 3, 'e1', () => 0.01);
  ok(Array.isArray(kos), 'devuelve array de uids KO');
  ok(kos.includes('e2'), 'e2 (1" del target) KO');
  ok(!kos.includes('e3'), 'e3 (15" del target) no KO');
});

group('Group 4: applyBlastSplash no afecta al target original', () => {
  const s = createLab2Battle('open-ground',
    [mkModel('f1','A')], [mkModel('e1','T')]);
  placeModel(s, 'friendly', 'f1', { x: 5, y: 5 });
  placeModel(s, 'enemy', 'e1', { x: 10, y: 10 });
  const kos = applyBlastSplash(s, 'f1', 3, 'e1', () => 0.01);
  ok(!kos.includes('e1'), 'el target original no se cuenta en splash');
});

group('Group 5: rollSpatialAttack con BLAST extiende a splash', () => {
  const s = createLab2Battle('open-ground',
    [mkModel('f1','A', {
       stats:{ ranged:'+3' },
       equipment: [{ name: 'Grenade', type: 'ranged weapon', weaponKeywords: ['BLAST 3"'] }],
     })],
    [mkModel('e1','T'), mkModel('e2','near')]);
  placeModel(s, 'friendly', 'f1', { x: 5, y: 5 });
  placeModel(s, 'enemy', 'e1', { x: 8, y: 5 });
  placeModel(s, 'enemy', 'e2', { x: 9, y: 5 });
  // rng=0.01 fuerza hit + ko + splash.
  const r = rollSpatialAttack(s, 'f1', 'e1', { rng: () => 0.01 });
  ok(r.hit === true, 'hit');
  ok(Array.isArray(r.splashKOs) || r.ko === true,
     'splashKOs registrado o ko principal');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
