/* Lab 2.0 — Sprint 3 — IA heurística: despliegue + target + action.
 *
 * Construye sobre Sprints 1+2. Añade decisiones automáticas:
 *
 *  - getDeploymentZone(state, side): { xMin, xMax, yMin, yMax }.
 *    Friendly: 12 filas inferiores (y∈[0,11]). Enemy: 12 superiores (y∈[20,31]).
 *  - deployBandHeuristic(state, side): coloca todos los modelos del side
 *    en su zona, sin overlap, sin blocked. ELITE primero en cells más
 *    avanzadas (cerca de centerline), troops detrás.
 *  - chooseTargetHeuristic(state, attackerUid, rangeInches): devuelve el
 *    uid del enemigo "óptimo" — el más cercano con LoS dentro del rango.
 *    null si no hay targets.
 *  - chooseActionHeuristic(state, modelUid, rangeInches): devuelve
 *    { action, targetUid?, movePos? }. Acciones: 'shoot', 'advance', 'hold'.
 *    V1: si hay target en rango+LoS → shoot. Si no, advance hacia enemigo
 *    más cercano. Si está aislado sin enemigos → hold.
 *
 * No charge melee, no minimax. Sprint 4 añade el sim loop completo encima.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_lab2_ai.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  createLab2Battle:       typeof createLab2Battle === 'function' ? createLab2Battle : null,
  placeModel:             typeof placeModel === 'function' ? placeModel : null,
  getDeploymentZone:      typeof getDeploymentZone === 'function' ? getDeploymentZone : null,
  deployBandHeuristic:    typeof deployBandHeuristic === 'function' ? deployBandHeuristic : null,
  chooseTargetHeuristic:  typeof chooseTargetHeuristic === 'function' ? chooseTargetHeuristic : null,
  chooseActionHeuristic:  typeof chooseActionHeuristic === 'function' ? chooseActionHeuristic : null,
  getModelPosition:       typeof getModelPosition === 'function' ? getModelPosition : null,
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
for (const h of ['createLab2Battle','placeModel','getDeploymentZone','deployBandHeuristic','chooseTargetHeuristic','chooseActionHeuristic','getModelPosition']) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { createLab2Battle, placeModel, getDeploymentZone, deployBandHeuristic, chooseTargetHeuristic, chooseActionHeuristic, getModelPosition } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

function mkModel(uid, name, opts = {}) {
  return {
    uid, name,
    companionStats: Object.assign({ move: '6"/Infantry' }, opts.stats || {}),
    companionKeywords: opts.keywords || [],
    companionAbilities: [],
    tier: opts.tier || 'troops',
  };
}

/* ------------------------------------------------------------------ */
group('Group 1: getDeploymentZone bounds canon', () => {
  const state = createLab2Battle('open-ground', [mkModel('f1','A')], [mkModel('e1','B')]);
  const fz = getDeploymentZone(state, 'friendly');
  ok(fz.yMin === 0 && fz.yMax >= 4, 'friendly zona inferior (yMin=0, yMax≥4)');
  ok(fz.yMax < state.map.height / 2,
     'friendly zona < mitad mapa (yMax=' + fz.yMax + ')');
  ok(fz.xMin === 0 && fz.xMax === state.map.width - 1,
     'friendly span horizontal completo');
  const ez = getDeploymentZone(state, 'enemy');
  ok(ez.yMin > state.map.height / 2,
     'enemy zona superior (yMin=' + ez.yMin + ')');
  ok(ez.yMax === state.map.height - 1,
     'enemy yMax = height-1');
});

group('Group 2: deployBandHeuristic coloca todos los modelos', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A'), mkModel('f2','B'), mkModel('f3','C')],
    [mkModel('e1','D'), mkModel('e2','E')]);
  deployBandHeuristic(state, 'friendly');
  deployBandHeuristic(state, 'enemy');
  ok(getModelPosition(state, 'f1') !== null, 'f1 colocado');
  ok(getModelPosition(state, 'f2') !== null, 'f2 colocado');
  ok(getModelPosition(state, 'f3') !== null, 'f3 colocado');
  ok(getModelPosition(state, 'e1') !== null, 'e1 colocado');
  ok(getModelPosition(state, 'e2') !== null, 'e2 colocado');
});

group('Group 3: deployBandHeuristic respeta zona del side', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A'), mkModel('f2','B')],
    [mkModel('e1','C')]);
  deployBandHeuristic(state, 'friendly');
  deployBandHeuristic(state, 'enemy');
  const fz = getDeploymentZone(state, 'friendly');
  const ez = getDeploymentZone(state, 'enemy');
  for (const uid of ['f1','f2']) {
    const p = getModelPosition(state, uid);
    ok(p.y >= fz.yMin && p.y <= fz.yMax,
       uid + ' en zona friendly (y=' + p.y + ' ∈ [' + fz.yMin + ',' + fz.yMax + '])');
  }
  const pe = getModelPosition(state, 'e1');
  ok(pe.y >= ez.yMin && pe.y <= ez.yMax,
     'e1 en zona enemy (y=' + pe.y + ')');
});

group('Group 4: deployBandHeuristic sin overlap', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A'), mkModel('f2','B'), mkModel('f3','C'), mkModel('f4','D')],
    []);
  deployBandHeuristic(state, 'friendly');
  const seen = new Set();
  for (const uid of ['f1','f2','f3','f4']) {
    const p = getModelPosition(state, uid);
    const key = p.x + ',' + p.y;
    ok(!seen.has(key), uid + ' no solapa (got ' + key + ')');
    seen.add(key);
  }
});

group('Group 5: deployBandHeuristic en ruined-village evita blocked', () => {
  const state = createLab2Battle('ruined-village',
    [mkModel('f1','A'), mkModel('f2','B')],
    []);
  deployBandHeuristic(state, 'friendly');
  for (const uid of ['f1','f2']) {
    const p = getModelPosition(state, uid);
    // (10,6) y similares son blocked, pero todas las posiciones de
    // deploy friendly (y∈[0,11]) no deberían ser ruinas en este mapa.
    // Más robusto: verifica que el terrain en la pos es 'open'.
    const cell = state.map.cells[p.y][p.x];
    ok(cell.terrain !== 'blocked',
       uid + ' no en celda blocked (pos ' + p.x + ',' + p.y + ')');
  }
});

group('Group 6: chooseTargetHeuristic devuelve el más cercano con LoS', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1','Sniper')],
    [mkModel('e1','Close'), mkModel('e2','Mid'), mkModel('e3','Far')]);
  placeModel(state, 'friendly', 'f1', { x: 10, y: 10 });
  placeModel(state, 'enemy', 'e1', { x: 14, y: 10 });   // 4"
  placeModel(state, 'enemy', 'e2', { x: 22, y: 10 });   // 12"
  placeModel(state, 'enemy', 'e3', { x: 40, y: 10 });   // 30"
  // Rango 24": e1 y e2 en rango, e3 fuera.
  const tgt = chooseTargetHeuristic(state, 'f1', 24);
  ok(tgt === 'e1', 'devuelve el más cercano (e1)');
  // Rango 3": ningún target.
  const tgt2 = chooseTargetHeuristic(state, 'f1', 3);
  ok(tgt2 === null, 'sin targets en rango → null');
});

group('Group 7: chooseTargetHeuristic salta enemigos sin LoS', () => {
  const state = createLab2Battle('ruined-village',
    [mkModel('f1','Sniper')],
    [mkModel('e1','Blocked'), mkModel('e2','Visible')]);
  // e1 detrás de ruina en (10,6). e2 en línea limpia.
  placeModel(state, 'friendly', 'f1', { x: 5, y: 6 });
  placeModel(state, 'enemy', 'e1', { x: 15, y: 6 });   // LoS bloqueada por (10,6)
  placeModel(state, 'enemy', 'e2', { x: 5, y: 14 });   // LoS limpia (vertical sin ruinas en x=5)
  const tgt = chooseTargetHeuristic(state, 'f1', 30);
  ok(tgt === 'e2', 'salta e1 sin LoS, elige e2');
});

group('Group 8: chooseActionHeuristic decide shoot vs advance', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A')], [mkModel('e1','B')]);
  // f1 con e1 en rango → shoot.
  placeModel(state, 'friendly', 'f1', { x: 10, y: 10 });
  placeModel(state, 'enemy', 'e1', { x: 18, y: 10 });   // 8"
  const a1 = chooseActionHeuristic(state, 'f1', 24);
  ok(a1.action === 'shoot', 'enemigo en rango+LoS → shoot');
  ok(a1.targetUid === 'e1', 'target = e1');

  // f1 muy lejos → advance.
  placeModel(state, 'enemy', 'e1', { x: 40, y: 10 });   // 30"
  const a2 = chooseActionHeuristic(state, 'f1', 24);
  ok(a2.action === 'advance', 'fuera de rango → advance');
  ok(a2.movePos != null, 'devuelve movePos para advance');
  // movePos debe acercar hacia e1.
  const cur = getModelPosition(state, 'f1');
  ok(a2.movePos.x > cur.x, 'advance va hacia +x (donde está e1)');
});

group('Group 9: chooseActionHeuristic hold si no hay enemigos', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A')], []);
  placeModel(state, 'friendly', 'f1', { x: 10, y: 10 });
  const a = chooseActionHeuristic(state, 'f1', 24);
  ok(a.action === 'hold', 'sin enemigos → hold');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
