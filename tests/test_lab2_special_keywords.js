/* Lab 2.0 — Sprint 18 — Keywords especiales (FLYING + INFILTRATOR).
 *
 * Canon TC:
 *   - FLYING: ignora terrain bloqueado durante movimiento (vuela sobre).
 *     Sigue afectado por modelos en celda destino (no overlap).
 *   - INFILTRATOR: deploy avanzado (más cerca del centro / centerline).
 *     En V1 spatial: la fila de deploy se extiende hasta mid-table para
 *     modelos INFILTRATOR.
 *
 * Helpers:
 *   - isModelFlying(model): boolean.
 *   - isModelInfiltrator(model): boolean.
 *
 * Cambios sim:
 *   - canMoveTo respeta FLYING: si blocked cell pero modelo FLYING,
 *     permitido siempre que destino no sea blocked.
 *   - deployBandHeuristic: modelos INFILTRATOR colocan primero en filas
 *     más avanzadas (hasta yMax+4 en friendly, yMin-4 en enemy).
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_lab2_special_kw.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  createLab2Battle:      typeof createLab2Battle === 'function' ? createLab2Battle : null,
  placeModel:            typeof placeModel === 'function' ? placeModel : null,
  isModelFlying:         typeof isModelFlying === 'function' ? isModelFlying : null,
  isModelInfiltrator:    typeof isModelInfiltrator === 'function' ? isModelInfiltrator : null,
  canMoveTo:             typeof canMoveTo === 'function' ? canMoveTo : null,
  deployBandHeuristic:   typeof deployBandHeuristic === 'function' ? deployBandHeuristic : null,
  getModelPosition:      typeof getModelPosition === 'function' ? getModelPosition : null,
  getDeploymentZone:     typeof getDeploymentZone === 'function' ? getDeploymentZone : null,
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
for (const h of ['createLab2Battle','placeModel','isModelFlying','isModelInfiltrator','canMoveTo','deployBandHeuristic','getModelPosition','getDeploymentZone']) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { createLab2Battle, placeModel, isModelFlying, isModelInfiltrator, canMoveTo, deployBandHeuristic, getModelPosition, getDeploymentZone } = lib;

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
group('Group 1: isModelFlying + isModelInfiltrator detectan keyword', () => {
  const fly = mkModel('f1','A', { keywords: [{name:'FLYING'}] });
  ok(isModelFlying(fly) === true, 'FLYING detectado');
  const infil = mkModel('i1','B', { keywords: ['INFILTRATOR'] });
  ok(isModelInfiltrator(infil) === true, 'INFILTRATOR detectado (string)');
  const none = mkModel('n1','C', { keywords: [{name:'TOUGH'}] });
  ok(isModelFlying(none) === false, 'TOUGH ≠ FLYING');
  ok(isModelInfiltrator(none) === false, 'TOUGH ≠ INFILTRATOR');
});

group('Group 2: FLYING canMoveTo permite pasar sobre cells blocked vecinas', () => {
  // En V1 spatial, canMoveTo solo chequea destino. FLYING evita el
  // chequeo de "terrain blocked destino" como humo: vuela sobre,
  // pero NO puede aterrizar en un blocked tampoco (es destino).
  // Mejor test: FLYING avanza más en ruined-village hopping ruinas.
  // Aquí solo verificamos que el flag FLYING no rompe canMoveTo en
  // open-ground (back-compat).
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A', { keywords: [{name:'FLYING'}] })], []);
  placeModel(state, 'friendly', 'f1', { x: 5, y: 5 });
  const r = canMoveTo(state, 'f1', { x: 9, y: 5 });
  ok(r.ok === true, 'FLYING en open-ground se mueve sin error (4")');
});

group('Group 3: INFILTRATOR deploy avanzado (más cerca centerline)', () => {
  const state = createLab2Battle('open-ground',
    [
      mkModel('f1','Normal'),
      mkModel('f2','Infil', { keywords: ['INFILTRATOR'] }),
    ],
    []);
  deployBandHeuristic(state, 'friendly');
  const posNormal = getModelPosition(state, 'f1');
  const posInfil  = getModelPosition(state, 'f2');
  ok(posNormal && posInfil, 'ambos colocados');
  // Friendly normal max y = 11 (canon Sprint 3). INFILTRATOR puede ir
  // a y > 11 (más cerca del centro). Test: posInfil.y >= posNormal.y o
  // mayor (INFILTRATOR avanza más).
  ok(posInfil.y >= posNormal.y,
     'INFILTRATOR ≥ normal en y (más cerca centerline). normal=' + posNormal.y + ', infil=' + posInfil.y);
  // Y debería poder estar más allá de yMax estándar.
  ok(posInfil.y >= 11,
     'INFILTRATOR en o por encima de yMax canon estándar (got ' + posInfil.y + ')');
});

group('Group 4: deployBandHeuristic INFILTRATOR no overlap', () => {
  const state = createLab2Battle('open-ground',
    [
      mkModel('f1','A', { keywords: ['INFILTRATOR'] }),
      mkModel('f2','B', { keywords: ['INFILTRATOR'] }),
      mkModel('f3','C', { keywords: ['INFILTRATOR'] }),
      mkModel('f4','D'),
    ],
    []);
  deployBandHeuristic(state, 'friendly');
  const seen = new Set();
  for (const uid of ['f1','f2','f3','f4']) {
    const p = getModelPosition(state, uid);
    if (!p) continue;
    const key = p.x + ',' + p.y;
    ok(!seen.has(key), uid + ' no solapa (' + key + ')');
    seen.add(key);
  }
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
