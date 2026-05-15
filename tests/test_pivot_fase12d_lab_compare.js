/* Sub-Fase 12-D PIVOT v2 — Integración Lab: comparar canon vs variante.
 *
 * Verifica:
 * - compareVariantVsCanon(wb, variantId, enemyIds, opts) existe
 * - Aplica overrides al clon, NO muta canon
 * - Invoca runCompare_lab con canon + variantClone
 * - Devuelve {ok:true, result:{resultsA, resultsB, comparison}} o {ok:false, error}
 * - Variante inexistente → error claro
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_pivot_fase12d.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  newWarband: typeof newWarband === 'function' ? newWarband : null,
  createVariant: typeof createVariant === 'function' ? createVariant : null,
  applyVariantOverrides: typeof applyVariantOverrides === 'function' ? applyVariantOverrides : null,
  compareVariantVsCanon: typeof compareVariantVsCanon === 'function' ? compareVariantVsCanon : null,
  runCompare_lab: typeof runCompare_lab === 'function' ? runCompare_lab : null,
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
for (const h of ['newWarband','createVariant','applyVariantOverrides','compareVariantVsCanon','runCompare_lab']) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { newWarband, createVariant, compareVariantVsCanon } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

function buildBand() {
  const wb = newWarband('iron-sultanate');
  wb.models = [
    { uid:'mod1', name:'Silahdar', unitId:'silahdar',
      companionStats:{move:'6"',ranged:'2',melee:'1',armour:'0'},
      companionCost:144, companionKeywords:[{name:'ELITE'}],
      companionEquipment:[], companionAbilities:[],
      battlekit:['halberd-gun'], upgrades:[],
      baseProgression:{ xp:0, advancements:[], scars:[] } },
  ];
  return wb;
}

/* ------------------------------------------------------------------ */
group('Group 1: compareVariantVsCanon función existe + firma', () => {
  ok(typeof compareVariantVsCanon === 'function', 'function exists');
});

group('Group 2: variante inexistente → error claro', () => {
  const wb = buildBand();
  const r = compareVariantVsCanon(wb, 'no-existe', ['newAntioch'], { nBattles: 5 });
  ok(r && r.ok === false, 'devuelve ok:false');
  ok(typeof r.error === 'string' && r.error.length > 0, 'mensaje error');
});

group('Group 3: wb null → error', () => {
  const r = compareVariantVsCanon(null, 'whatever', ['newAntioch'], { nBattles: 1 });
  ok(r && r.ok === false, 'devuelve ok:false');
});

group('Group 4: compareVariantVsCanon con variante válida invoca lab', () => {
  const wb = buildBand();
  const v = createVariant(wb, 'Test');
  v.overrides.push({ type:'add-equipment', modelUid:'mod1', kitId:'bayonet' });
  const r = compareVariantVsCanon(wb, v.id, ['newAntioch'], { nBattles: 3 });
  ok(r && r.ok === true, 'devuelve ok:true');
  ok(r.result && typeof r.result === 'object', 'result objeto');
  ok(Array.isArray(r.result.comparison), 'result.comparison array');
  ok(r.result.comparison.length === 1, '1 enemigo testeado');
});

group('Group 5: canon no muta durante comparación', () => {
  const wb = buildBand();
  const v = createVariant(wb, 'Mutates?');
  v.overrides.push({ type:'remove-equipment', modelUid:'mod1', kitId:'halberd-gun' });
  v.overrides.push({ type:'add-equipment', modelUid:'mod1', kitId:'long-rifle' });
  compareVariantVsCanon(wb, v.id, ['newAntioch'], { nBattles: 2 });
  ok(wb.models[0].battlekit.includes('halberd-gun'), 'canon mantiene halberd-gun');
  ok(!wb.models[0].battlekit.includes('long-rifle'), 'canon NO tiene long-rifle');
});

group('Group 6: enemyIds default si no se pasa', () => {
  const wb = buildBand();
  const v = createVariant(wb, 'NoEnemy');
  v.overrides.push({ type:'add-equipment', modelUid:'mod1', kitId:'bayonet' });
  const r = compareVariantVsCanon(wb, v.id, null, { nBattles: 2 });
  // Permite null/undefined → usa default LAB_ENEMY_OPTIONS o subset razonable.
  ok(r && r.ok === true, 'no falla sin enemyIds');
  ok(Array.isArray(r.result.comparison) && r.result.comparison.length >= 1,
     'al menos 1 enemigo testeado por default');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
