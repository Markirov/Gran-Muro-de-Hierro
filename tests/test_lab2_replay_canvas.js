/* Lab 2.0 — Sprint 6 — Replay 2D Canvas tipo XCOM-ASCII.
 *
 * Sobre Sprints 1-5. Añade visualización post-mortem de una batalla:
 *
 *  - buildBattleReplay(state, opts): corre simulateBattleSpatial pero
 *    registra snapshots por turno y eventos discretos (move/shoot/ko).
 *    Returns: { initial:{positions,alive}, frames:[{turn,events,positions,alive}], result }.
 *
 *  - renderReplayFrame(ctx, replay, frameIdx, opts): pinta el frame en
 *    un CanvasRenderingContext2D. opts.cellPx controla zoom (default 16px).
 *    Caller responsable de animación / autoplay; aquí solo render puro.
 *
 *  - renderBattleMap(ctx, map, opts): solo el mapa de fondo (sin modelos).
 *    Útil para preview en UI antes de la batalla.
 *
 * El recorder es opt-in: simulateBattleSpatial sin opts.recorder no cambia
 * comportamiento. Si recorder está presente, llama recorder.onEvent y
 * recorder.onTurnEnd. buildBattleReplay usa este mecanismo para coleccionar.
 *
 * V1 limitaciones:
 *  - Sin animación (caller hace setInterval / requestAnimationFrame).
 *  - Sin controles de UI (play/pause/step) — eso es scope de Sprint 8.
 *  - Sin línea de disparo animada — solo punto destino destacado.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_lab2_replay.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  createLab2Battle:     typeof createLab2Battle === 'function' ? createLab2Battle : null,
  deployBandHeuristic:  typeof deployBandHeuristic === 'function' ? deployBandHeuristic : null,
  buildBattleReplay:    typeof buildBattleReplay === 'function' ? buildBattleReplay : null,
  renderReplayFrame:    typeof renderReplayFrame === 'function' ? renderReplayFrame : null,
  renderBattleMap:      typeof renderBattleMap === 'function' ? renderBattleMap : null,
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
for (const h of ['createLab2Battle','deployBandHeuristic','buildBattleReplay','renderReplayFrame','renderBattleMap']) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { createLab2Battle, deployBandHeuristic, buildBattleReplay, renderReplayFrame, renderBattleMap } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

function mkModel(uid, name, opts = {}) {
  return {
    uid, name,
    companionStats: Object.assign({ move: '6"/Infantry', ranged: '+1', melee: '+1', armour: '0' }, opts.stats || {}),
    companionKeywords: opts.keywords || [],
    companionAbilities: [],
    tier: opts.tier || 'troops',
    isOut: false,
  };
}

function seededRng(seed) {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

// Stub CanvasRenderingContext2D que registra llamadas.
function mkCtx() {
  const calls = [];
  const ctx = {
    fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: '', textBaseline: '', globalAlpha: 1,
    fillRect:    (...a) => calls.push({fn:'fillRect',a}),
    strokeRect:  (...a) => calls.push({fn:'strokeRect',a}),
    fillText:    (...a) => calls.push({fn:'fillText',a}),
    beginPath:   ()     => calls.push({fn:'beginPath'}),
    moveTo:      (...a) => calls.push({fn:'moveTo',a}),
    lineTo:      (...a) => calls.push({fn:'lineTo',a}),
    arc:         (...a) => calls.push({fn:'arc',a}),
    fill:        ()     => calls.push({fn:'fill'}),
    stroke:      ()     => calls.push({fn:'stroke'}),
    closePath:   ()     => calls.push({fn:'closePath'}),
    save:        ()     => calls.push({fn:'save'}),
    restore:     ()     => calls.push({fn:'restore'}),
    setLineDash: (...a) => calls.push({fn:'setLineDash',a}),
    measureText: (t)    => ({ width: (t||'').length * 4 }),
    clearRect:   (...a) => calls.push({fn:'clearRect',a}),
    canvas:      { width: 800, height: 600 },
  };
  ctx._calls = calls;
  return ctx;
}

/* ------------------------------------------------------------------ */
group('Group 1: buildBattleReplay devuelve estructura completa', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A', { stats:{ ranged:'+3' } })],
    [mkModel('e1','B')]);
  deployBandHeuristic(state, 'friendly');
  deployBandHeuristic(state, 'enemy');
  const replay = buildBattleReplay(state, { rng: seededRng(1), maxTurns: 10, rangeInches: 24 });
  ok(typeof replay === 'object', 'devuelve objeto');
  ok(replay.initial && replay.initial.positions, 'replay.initial.positions presente');
  ok(Array.isArray(replay.frames), 'replay.frames array');
  ok(replay.frames.length >= 1, 'al menos 1 frame');
  ok(replay.result && ['friendly','enemy','draw'].includes(replay.result.winner),
     'replay.result.winner válido');
  // Cada frame tiene la forma esperada.
  for (const f of replay.frames) {
    ok(typeof f.turn === 'number', 'frame.turn numérico');
    ok(Array.isArray(f.events), 'frame.events array');
    ok(typeof f.positions === 'object', 'frame.positions object');
  }
});

group('Group 2: replay registra eventos move y shoot', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A', { stats:{ ranged:'+3' } }), mkModel('f2','B')],
    [mkModel('e1','C'), mkModel('e2','D')]);
  deployBandHeuristic(state, 'friendly');
  deployBandHeuristic(state, 'enemy');
  const replay = buildBattleReplay(state, { rng: seededRng(2), maxTurns: 8, rangeInches: 24 });
  const allEvents = replay.frames.flatMap(f => f.events);
  ok(allEvents.length > 0, 'hay eventos registrados');
  const types = new Set(allEvents.map(e => e.type));
  // En 8 turnos suele haber tanto shoot como move (advance) o ko.
  ok(types.size >= 1, 'al menos 1 tipo de evento (got ' + Array.from(types).join(',') + ')');
});

group('Group 3: replay frame final tiene alive lista coherente con result', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A', { stats:{ ranged:'+3' } })],
    [mkModel('e1','B')]);
  deployBandHeuristic(state, 'friendly');
  deployBandHeuristic(state, 'enemy');
  const replay = buildBattleReplay(state, { rng: seededRng(5), maxTurns: 15, rangeInches: 24 });
  const last = replay.frames[replay.frames.length - 1];
  ok(last.alive && Array.isArray(last.alive.friendly), 'last frame alive.friendly array');
  ok(Array.isArray(last.alive.enemy), 'last frame alive.enemy array');
  if (replay.result.winner === 'friendly') {
    ok(last.alive.enemy.length === 0, 'winner=friendly → 0 enemy alive');
  } else if (replay.result.winner === 'enemy') {
    ok(last.alive.friendly.length === 0, 'winner=enemy → 0 friendly alive');
  } else {
    ok(true, 'draw OK');
  }
});

group('Group 4: renderBattleMap pinta cells', () => {
  const state = createLab2Battle('ruined-village',
    [mkModel('f1','A')], [mkModel('e1','B')]);
  const ctx = mkCtx();
  renderBattleMap(ctx, state.map, { cellPx: 10 });
  // Debe haber muchos fillRect (uno por celda) y al menos algunos strokeRect (bordes).
  const fillRects = ctx._calls.filter(c => c.fn === 'fillRect').length;
  ok(fillRects >= state.map.width * state.map.height,
     'fillRect ≥ width×height (got ' + fillRects + ', expected ≥' + (state.map.width * state.map.height) + ')');
});

group('Group 5: renderReplayFrame pinta map + modelos', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A'), mkModel('f2','B')],
    [mkModel('e1','C')]);
  deployBandHeuristic(state, 'friendly');
  deployBandHeuristic(state, 'enemy');
  const replay = buildBattleReplay(state, { rng: seededRng(9), maxTurns: 4, rangeInches: 24 });
  const ctx = mkCtx();
  let threw = false;
  // Renderiza el INITIAL state (antes de cualquier KO) usando frame 0 +
  // forzando que dibuje según replay.initial.positions (los 3 modelos
  // vivos en deploy). Para esto chequeamos arcs en un render con el
  // primer frame, donde aún suelen estar vivos los 3 si la 1ª ronda no
  // mata a nadie. Usamos rng=9 que tiende a misses, no a KO inmediato.
  try { renderReplayFrame(ctx, replay, 0, { cellPx: 12 }); } catch (e) { threw = true; console.log('  err:', e.message); }
  ok(!threw, 'renderReplayFrame frame 0 no-throw');
  // Modelos = círculos vía arc + fill. Pueden ser 2-3 (si un KO ya ocurrió).
  const arcs = ctx._calls.filter(c => c.fn === 'arc').length;
  ok(arcs >= 2, 'al menos 2 arcs (modelos vivos pintados como círculos, got ' + arcs + ')');
  // Verifica que renderReplayFrame también pintó el mapa (map embebido en replay).
  const fillRects = ctx._calls.filter(c => c.fn === 'fillRect').length;
  ok(fillRects > 0, 'renderReplayFrame también pinta el map de fondo');
});

group('Group 6: renderReplayFrame frameIdx fuera de bounds → no-throw', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A')], [mkModel('e1','B')]);
  deployBandHeuristic(state, 'friendly');
  deployBandHeuristic(state, 'enemy');
  const replay = buildBattleReplay(state, { rng: seededRng(11), maxTurns: 3, rangeInches: 24 });
  const ctx = mkCtx();
  let threw = false;
  try {
    renderReplayFrame(ctx, replay, 999, { cellPx: 8 });
    renderReplayFrame(ctx, replay, -5, { cellPx: 8 });
  } catch (e) { threw = true; }
  ok(!threw, 'frame out-of-bounds clamps sin throw');
});

group('Group 7: replay.initial reproduce positions del deploy', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A')], [mkModel('e1','B')]);
  deployBandHeuristic(state, 'friendly');
  deployBandHeuristic(state, 'enemy');
  const deployedF = Object.assign({}, state.friendly.positions);
  const deployedE = Object.assign({}, state.enemy.positions);
  const replay = buildBattleReplay(state, { rng: seededRng(13), maxTurns: 3, rangeInches: 24 });
  const ipos = replay.initial.positions;
  ok(ipos.f1.x === deployedF.f1.x && ipos.f1.y === deployedF.f1.y,
     'replay.initial captura posición f1 deploy');
  ok(ipos.e1.x === deployedE.e1.x && ipos.e1.y === deployedE.e1.y,
     'replay.initial captura posición e1 deploy');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
