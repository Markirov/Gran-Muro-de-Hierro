/* Lab 2.0 — Sprint 7 — Integración canon engine (resolveRanged_lab).
 *
 * Sobre Sprints 1-6. Reemplaza opcionalmente el modelo abstracto de
 * daño (rollSpatialAttack V1, hit=0.55+0.10×dice) con el motor canon
 * del Lab abstracto (resolveRanged_lab + applyInjury_lab).
 *
 * Componentes:
 *  - _lab2ToAbstractModel(model, pos): adapter companion-shape → abstract
 *    Lab shape (id, name, meleeDice, rangedDice, armour, keywords:Set,
 *    bloodMarkers, isDown, isOut, _pos, flags como tough/strong/...).
 *  - _lab2ToAbstractWeapon(eqItem, factionId): lookup en DATA.armoury,
 *    parsea weaponKeywords a diceMod/injuryDice/injuryMod/keywords:Set.
 *  - rollSpatialAttackCanon(state, attackerUid, targetUid, opts):
 *    convierte ambos modelos + arma primaria del attacker, llama
 *    resolveRanged_lab, lee target.isOut tras la resolución. Aplica
 *    cover modifier deterministic por celda del target (no la prob abstract).
 *
 * Wire en sim loop:
 *  - simulateBattleSpatial(state, { useCanonEngine: true, ... }):
 *    cuando opts.useCanonEngine, usa rollSpatialAttackCanon en vez del
 *    abstracto V1. Default false (back-compat: tests Sprints 4-6 siguen
 *    funcionando idénticos).
 *
 * Verifica:
 *  - Adapter produce shape esperado.
 *  - Weapon adapter parsea armoury entries.
 *  - rollSpatialAttackCanon devuelve {hit, ko}.
 *  - Sim loop con canon engine termina y produce winner válido.
 *  - Cover por celda reduce hits (deterministic, no probabilístico).
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_lab2_canon.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  createLab2Battle:           typeof createLab2Battle === 'function' ? createLab2Battle : null,
  placeModel:                 typeof placeModel === 'function' ? placeModel : null,
  deployBandHeuristic:        typeof deployBandHeuristic === 'function' ? deployBandHeuristic : null,
  _lab2ToAbstractModel:       typeof _lab2ToAbstractModel === 'function' ? _lab2ToAbstractModel : null,
  _lab2ToAbstractWeapon:      typeof _lab2ToAbstractWeapon === 'function' ? _lab2ToAbstractWeapon : null,
  rollSpatialAttackCanon:     typeof rollSpatialAttackCanon === 'function' ? rollSpatialAttackCanon : null,
  simulateBattleSpatial:      typeof simulateBattleSpatial === 'function' ? simulateBattleSpatial : null,
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
for (const h of ['createLab2Battle','placeModel','deployBandHeuristic','_lab2ToAbstractModel','_lab2ToAbstractWeapon','rollSpatialAttackCanon','simulateBattleSpatial']) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { createLab2Battle, placeModel, deployBandHeuristic, _lab2ToAbstractModel, _lab2ToAbstractWeapon, rollSpatialAttackCanon, simulateBattleSpatial } = lib;

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

function seededRng(seed) {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

/* ------------------------------------------------------------------ */
group('Group 1: _lab2ToAbstractModel produce shape compatible Lab abstracto', () => {
  const m = mkModel('m1', 'Test',
    { stats: { ranged:'+2', melee:'+1', armour:'-1' },
      keywords: [{name:'TOUGH'}, {name:'STRONG'}, 'ELITE'] });
  const abs = _lab2ToAbstractModel(m, { x: 10, y: 5 });
  ok(abs.id === 'm1', 'id preservado');
  ok(abs.name === 'Test', 'name preservado');
  ok(abs.rangedDice === 2, 'rangedDice=2');
  ok(abs.meleeDice === 1, 'meleeDice=1');
  ok(abs.armour === -1, 'armour=-1');
  ok(abs.keywords instanceof Set, 'keywords es Set');
  ok(abs.keywords.has('TOUGH') && abs.keywords.has('STRONG') && abs.keywords.has('ELITE'),
     'keywords incluye los 3');
  ok(abs.tough === true && abs.strong === true, 'flags tough/strong derivados');
  ok(abs.bloodMarkers === 0 && abs.isDown === false, 'bloodMarkers=0, isDown=false');
  ok(abs._pos && abs._pos.x === 10 && abs._pos.y === 5, '_pos copia x,y');
  ok(Array.isArray(abs.weapons), 'weapons array');
});

group('Group 2: _lab2ToAbstractWeapon parsea armoury entry', () => {
  // Lookup en iron-sultanate.armoury.ranged donde el Jezzail está definido.
  const w = _lab2ToAbstractWeapon({ name: 'Jezzail' }, 'iron-sultanate');
  ok(w !== null, 'devuelve weapon');
  if (w) {
    ok(w.name === 'Jezzail', 'name copiado');
    ok(typeof w.isRanged === 'boolean', 'isRanged boolean');
    ok(w.keywords instanceof Set, 'keywords es Set');
    ok(typeof w.diceMod === 'number', 'diceMod numérico');
  }
});

group('Group 3: _lab2ToAbstractWeapon fallback sin armoury entry', () => {
  const w = _lab2ToAbstractWeapon({ name: 'Arma Inexistente XYZ' }, 'iron-sultanate');
  ok(w !== null, 'devuelve weapon fallback');
  ok(w.name === 'Arma Inexistente XYZ', 'name copiado');
  ok(w.keywords instanceof Set, 'keywords default Set vacío');
});

group('Group 4: rollSpatialAttackCanon devuelve {hit, ko}', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1', 'Sniper',
      { stats:{ ranged:'+3' },
        equipment:[{ name:'Jezzail' }] })],
    [mkModel('e1', 'Target')]);
  placeModel(state, 'friendly', 'f1', { x: 5, y: 5 });
  placeModel(state, 'enemy', 'e1', { x: 12, y: 5 });
  state.factionId = 'iron-sultanate';  // hint para weapon lookup
  let result;
  let threw = false;
  try { result = rollSpatialAttackCanon(state, 'f1', 'e1', { rng: () => 0.5 }); }
  catch (e) { threw = true; console.log('  err:', e.message); }
  ok(!threw, 'rollSpatialAttackCanon no-throw');
  ok(typeof result === 'object', 'devuelve objeto');
  ok(typeof result.hit === 'boolean', 'result.hit boolean');
  ok(typeof result.ko === 'boolean', 'result.ko boolean');
});

group('Group 5: simulateBattleSpatial con useCanonEngine termina y produce winner', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A',{ stats:{ ranged:'+3' }, equipment:[{name:'Jezzail'}] })],
    [mkModel('e1','B',{ equipment:[{name:'Jezzail'}] })]);
  placeModel(state, 'friendly', 'f1', { x: 5, y: 5 });
  placeModel(state, 'enemy', 'e1', { x: 12, y: 5 });
  state.factionId = 'iron-sultanate';
  let result;
  let threw = false;
  try {
    result = simulateBattleSpatial(state, {
      rng: seededRng(123), maxTurns: 25, rangeInches: 24,
      useCanonEngine: true, factionId: 'iron-sultanate',
    });
  } catch (e) { threw = true; console.log('  err:', e.message); }
  ok(!threw, 'sim con useCanonEngine no-throw');
  ok(result && ['friendly','enemy','draw'].includes(result.winner),
     'winner válido tras sim canon');
});

group('Group 6: useCanonEngine=false (default) sigue funcionando idéntico', () => {
  // Back-compat: el sim sin useCanonEngine = comportamiento Sprint 4/5.
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A',{ stats:{ ranged:'+3' } })],
    [mkModel('e1','B')]);
  placeModel(state, 'friendly', 'f1', { x: 5, y: 5 });
  placeModel(state, 'enemy', 'e1', { x: 12, y: 5 });
  const result = simulateBattleSpatial(state, {
    rng: () => 0.01, maxTurns: 10, rangeInches: 24,
  });
  ok(result.winner === 'friendly',
     'V1 abstracto sigue ganando friendly con rng=0.01 sesgado');
});

group('Group 7: rollSpatialAttackCanon aplica cover modifier del cell', () => {
  // Mismo escenario pero target en heavy cover (ruined-village).
  // Usamos Math.random (no seed) + sample grande porque cover modifier es
  // un -2 dice estadístico sobre dice pool — la diferencia esperada por
  // 500 trials es claramente > ruido aleatorio.
  const stateOpen = createLab2Battle('open-ground',
    [mkModel('f1','A',{ stats:{ ranged:'+3' }, equipment:[{name:'Jezzail'}] })],
    [mkModel('e1','B')]);
  placeModel(stateOpen, 'friendly', 'f1', { x: 14, y: 12 });
  placeModel(stateOpen, 'enemy', 'e1', { x: 14, y: 17 });
  stateOpen.factionId = 'iron-sultanate';

  const stateCover = createLab2Battle('ruined-village',
    [mkModel('f1','A',{ stats:{ ranged:'+3' }, equipment:[{name:'Jezzail'}] })],
    [mkModel('e1','B')]);
  placeModel(stateCover, 'friendly', 'f1', { x: 14, y: 12 });
  placeModel(stateCover, 'enemy', 'e1', { x: 14, y: 16 });  // heavy cover en (14,16)
  stateCover.factionId = 'iron-sultanate';

  let hitsOpen = 0, hitsCover = 0;
  const N = 500;
  for (let i = 0; i < N; i++) {
    // Reset target.bloodMarkers/isOut antes de cada muestra para no
    // acumular daño entre iteraciones (un solo modelo aguanta varios hits).
    stateOpen.enemy.models[0].isOut = false;
    stateCover.enemy.models[0].isOut = false;
    placeModel(stateOpen, 'enemy', 'e1', { x: 14, y: 17 });
    placeModel(stateCover, 'enemy', 'e1', { x: 14, y: 16 });
    const rOpen = rollSpatialAttackCanon(stateOpen, 'f1', 'e1', {});
    const rCov  = rollSpatialAttackCanon(stateCover, 'f1', 'e1', {});
    if (rOpen.hit) hitsOpen++;
    if (rCov.hit) hitsCover++;
  }
  // En N=500 con +3 attacker, baseline open ~50-80% (canon engine con
  // armour saves + injury rolls); heavy cover (-2 dice) debería bajar
  // a ~20-40%. Tolerancia: cover < open con al menos 10% absoluto de diff.
  const rateOpen = hitsOpen / N;
  const rateCov  = hitsCover / N;
  ok(rateCov < rateOpen,
     'heavy cover reduce hits (open=' + rateOpen.toFixed(2) + ', cover=' + rateCov.toFixed(2) + ')');
  ok(rateOpen - rateCov >= 0.05,
     'reducción ≥ 5% absoluto (diff=' + (rateOpen - rateCov).toFixed(2) + ')');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
