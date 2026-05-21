/* Lab 2.0 — Sprint 25 — Patron / Glory items en sim espacial.
 *
 * Hasta Sprint 24, los Glory items (currency='☼' en armoury) se trataban
 * como cualquier equipo en el sim. Algunos son weapons (MG, Sniper Rifle,
 * SMG) y ya se modelan vía _lab2ToAbstractWeapon (Sprint 7). Pero los
 * Glory items NO-weapon (Field Shrine, Holy Relic, Troop Flag, Holy Icon
 * Shield, Combat Helmet, Martyrdom Pills) no aportaban nada en el sim
 * abstracto V1.
 *
 * Sprint 25 V1 simplifica: cualquier modelo con Glory items obtiene un
 * pequeño bonus de hit chance (proxy para los buffs que aportan en mesa).
 * Bonus = 0.05 × min(count, 3) → cap +0.15.
 *
 * Helpers nuevos:
 *  - isGloryItem(eqItem, factionId): boolean. Detecta currency='☼' via
 *    armoury lookup. Items inline sin armoury entry → false (no se
 *    asume nada).
 *  - countGloryItems(model, factionId): suma.
 *  - gloryHitBonus(model, factionId): número entre 0 y 0.15.
 *
 * Aplicación en rollSpatialAttack + rollSpatialMelee: hitChance += bonus.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_lab2_glory.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  isGloryItem:      typeof isGloryItem === 'function' ? isGloryItem : null,
  countGloryItems:  typeof countGloryItems === 'function' ? countGloryItems : null,
  gloryHitBonus:    typeof gloryHitBonus === 'function' ? gloryHitBonus : null,
  rollSpatialAttack: typeof rollSpatialAttack === 'function' ? rollSpatialAttack : null,
  rollSpatialMelee:  typeof rollSpatialMelee === 'function' ? rollSpatialMelee : null,
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
for (const h of ['isGloryItem','countGloryItems','gloryHitBonus','rollSpatialAttack','rollSpatialMelee','createLab2Battle','placeModel']) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { isGloryItem, countGloryItems, gloryHitBonus, rollSpatialAttack, rollSpatialMelee, createLab2Battle, placeModel } = lib;

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
group('Group 1: isGloryItem detecta currency=☼ via armoury', () => {
  // 'Troop Flag' está en NA armoury con currency='☼' (cost:1).
  ok(isGloryItem({ name: 'Troop Flag' }, 'new-antioch') === true,
     'Troop Flag NA → glory');
  // Bolt-Action Rifle es ducados.
  ok(isGloryItem({ name: 'Bolt-Action Rifle' }, 'new-antioch') === false,
     'Bolt-Action Rifle → no glory');
  // Sin factionId → false.
  ok(isGloryItem({ name: 'Anything' }, null) === false,
     'sin factionId → false');
});

group('Group 2: countGloryItems suma items glory', () => {
  const m = mkModel('m1','A', {
    equipment: [
      { name: 'Troop Flag' },
      { name: 'Bolt-Action Rifle' },
      { name: 'Field Shrine' },  // NA glory
    ],
  });
  ok(countGloryItems(m, 'new-antioch') === 2,
     'Troop Flag + Field Shrine = 2 glory items');
});

group('Group 3: gloryHitBonus cap a +0.15', () => {
  // 0 items → 0.
  ok(gloryHitBonus(mkModel('m1','A'), 'new-antioch') === 0, 'sin glory → 0');
  // 1 → 0.05; 2 → 0.10; 3 → 0.15; 4+ → 0.15 (cap).
  const m3 = mkModel('m3','C', {
    equipment: [
      { name: 'Troop Flag' },
      { name: 'Field Shrine' },
      { name: 'Holy Relic' },
    ],
  });
  ok(gloryHitBonus(m3, 'new-antioch') >= 0.10,
     '3 glory items → ≥ 0.10 bonus');
  const m5 = mkModel('m5','D', {
    equipment: [
      { name: 'Troop Flag' }, { name: 'Field Shrine' },
      { name: 'Holy Relic' }, { name: 'Martyrdom Pills' },
      { name: 'Combat Helmet' },  // ducats, no counta
    ],
  });
  const b5 = gloryHitBonus(m5, 'new-antioch');
  ok(b5 <= 0.15001, '4+ glory items capado a 0.15 (got ' + b5 + ', float tolerance)');
});

group('Group 4: rollSpatialAttack hit chance sube con glory items', () => {
  const stateNo = createLab2Battle('open-ground',
    [mkModel('f1','A')], [mkModel('e1','B')]);
  placeModel(stateNo, 'friendly', 'f1', { x: 5, y: 5 });
  placeModel(stateNo, 'enemy', 'e1', { x: 8, y: 5 });
  stateNo.factionId = 'new-antioch';
  const stateGlory = createLab2Battle('open-ground',
    [mkModel('f1','A', { equipment: [
      { name: 'Troop Flag' }, { name: 'Field Shrine' },
    ]})], [mkModel('e1','B')]);
  placeModel(stateGlory, 'friendly', 'f1', { x: 5, y: 5 });
  placeModel(stateGlory, 'enemy', 'e1', { x: 8, y: 5 });
  stateGlory.factionId = 'new-antioch';

  const rNo = rollSpatialAttack(stateNo, 'f1', 'e1', { rng: () => 0.99 });
  const rGl = rollSpatialAttack(stateGlory, 'f1', 'e1', { rng: () => 0.99 });
  ok(rGl.hitChance > rNo.hitChance,
     'modelo con glory items tiene hitChance mayor (' +
     rGl.hitChance.toFixed(2) + ' vs ' + rNo.hitChance.toFixed(2) + ')');
});

group('Group 5: rollSpatialMelee también aplica bonus', () => {
  const stateGlory = createLab2Battle('open-ground',
    [mkModel('f1','A', { equipment: [
      { name: 'Troop Flag' },
    ]})], [mkModel('e1','B')]);
  placeModel(stateGlory, 'friendly', 'f1', { x: 5, y: 5 });
  placeModel(stateGlory, 'enemy', 'e1', { x: 6, y: 5 });
  stateGlory.factionId = 'new-antioch';
  const r = rollSpatialMelee(stateGlory, 'f1', 'e1', { rng: () => 0.99 });
  ok(typeof r.hitChance === 'number' && r.hitChance > 0.55,
     'melee hitChance > base 0.55 (con glory)');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
