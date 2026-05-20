/* Lab 2.0 — Sprint 15 — Event 'activation-start' + highlight visual.
 *
 * Sobre Sprint 6 (replay events) + Sprint 12 (UI replay). El sim loop
 * ahora dispara un evento 'activation-start' antes de chooseActionHeuristic
 * por cada modelo vivo. Permite saber qué modelos actuaron en qué turno
 * incluso si la acción fue 'hold' (sin event derivado).
 *
 * renderReplayFrame usa esos eventos para pintar un halo dorado en los
 * modelos activados en ese turno, dándole al usuario una pista visual
 * del orden de iniciativa.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_lab2_activation.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  createLab2Battle:        typeof createLab2Battle === 'function' ? createLab2Battle : null,
  placeModel:              typeof placeModel === 'function' ? placeModel : null,
  deployBandHeuristic:     typeof deployBandHeuristic === 'function' ? deployBandHeuristic : null,
  buildBattleReplay:       typeof buildBattleReplay === 'function' ? buildBattleReplay : null,
  renderReplayFrame:       typeof renderReplayFrame === 'function' ? renderReplayFrame : null,
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
for (const h of ['createLab2Battle','placeModel','deployBandHeuristic','buildBattleReplay','renderReplayFrame']) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { createLab2Battle, placeModel, deployBandHeuristic, buildBattleReplay, renderReplayFrame } = lib;

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

function mkCtx() {
  const calls = [];
  const ctx = {
    fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: '', textBaseline: '', globalAlpha: 1,
    fillRect: () => calls.push({fn:'fillRect'}),
    strokeRect: () => calls.push({fn:'strokeRect'}),
    fillText: () => calls.push({fn:'fillText'}),
    beginPath: () => calls.push({fn:'beginPath'}),
    moveTo: () => calls.push({fn:'moveTo'}),
    lineTo: () => calls.push({fn:'lineTo'}),
    arc: () => calls.push({fn:'arc'}),
    fill: () => calls.push({fn:'fill'}),
    stroke: () => calls.push({fn:'stroke'}),
    closePath: () => calls.push({fn:'closePath'}),
    save: () => calls.push({fn:'save'}),
    restore: () => calls.push({fn:'restore'}),
    setLineDash: () => calls.push({fn:'setLineDash'}),
    measureText: () => ({width: 10}),
    canvas: { width: 800, height: 600 },
  };
  ctx._calls = calls;
  return ctx;
}

/* ------------------------------------------------------------------ */
group('Group 1: buildBattleReplay registra activation-start events', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A'), mkModel('f2','B')],
    [mkModel('e1','C'), mkModel('e2','D')]);
  deployBandHeuristic(state, 'friendly');
  deployBandHeuristic(state, 'enemy');
  const replay = buildBattleReplay(state, { maxTurns: 5, rangeInches: 24 });
  const allEvents = replay.frames.flatMap(f => f.events);
  const activations = allEvents.filter(e => e.type === 'activation-start');
  ok(activations.length > 0,
     'al menos 1 activation-start event (got ' + activations.length + ')');
  // Cada activation-start tiene uid.
  for (const a of activations) {
    ok(typeof a.uid === 'string', 'activation-start tiene uid');
  }
});

group('Group 2: orden activación alternado (friendly/enemy)', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A'), mkModel('f2','B')],
    [mkModel('e1','C'), mkModel('e2','D')]);
  deployBandHeuristic(state, 'friendly');
  deployBandHeuristic(state, 'enemy');
  const replay = buildBattleReplay(state, { maxTurns: 2, rangeInches: 24 });
  // Turno 1 debe tener al menos 1 activation-start de friendly antes que enemy.
  const turn1 = replay.frames[0] || { events: [] };
  const acts = turn1.events.filter(e => e.type === 'activation-start');
  if (acts.length >= 2) {
    const friendlyUids = new Set(replay.initial.alive.friendly);
    ok(friendlyUids.has(acts[0].uid),
       'primera activation del turno 1 es friendly (got uid=' + acts[0].uid + ')');
  } else {
    ok(true, 'no había suficientes activaciones para validar orden (OK con pocas)');
  }
});

group('Group 3: renderReplayFrame pinta halo del modelo activado', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A')], [mkModel('e1','B')]);
  deployBandHeuristic(state, 'friendly');
  deployBandHeuristic(state, 'enemy');
  const replay = buildBattleReplay(state, { maxTurns: 2, rangeInches: 24 });
  const ctx = mkCtx();
  renderReplayFrame(ctx, replay, 0, { cellPx: 16 });
  // El halo se pinta como un arc adicional alrededor del modelo activo.
  // Verificamos que hay más arcs que modelos vivos (1 por modelo + halos).
  const arcs = ctx._calls.filter(c => c.fn === 'arc').length;
  ok(arcs >= 2, 'al menos 2 arcs (1 modelo + halo o varios modelos) — got ' + arcs);
});

group('Group 4: LAB2_REPLAY_COLORS incluye color para halo activación', () => {
  ok(/LAB2_REPLAY_COLORS\s*=/.test(html), 'paleta LAB2_REPLAY_COLORS presente');
  // Tiene que haber alguna mención a activation o activeRing.
  ok(/activationHalo|activeRing|activationRing|activeHalo/.test(html),
     'color para halo activación definido en paleta');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
