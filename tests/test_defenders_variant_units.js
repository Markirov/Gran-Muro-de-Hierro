/* Test suite: Defenders of the Iron Wall variant units (canon PDF).
 *
 * The variant adds units that don't exist in the base Iron Sultanate
 * roster (Sipahi, Silahdar, Janissary Officer) and overrides the Sappers
 * limit (0-2 → 0-4). These are gated by the `variantOnly` field and only
 * appear in the recruit catalogue when the variant is active.
 *
 * Verifies:
 *   - DATA carries the 3 variant units with correct stats/cost.
 *   - The variant carries the Sappers override + Silahdar mandatory.
 *   - unitsAvailableForWarband filters by active variant.
 *   - getUnit still resolves the variant units (for model lookups).
 *   - variantUnitOverride raises the Sappers limit to 0-4.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_defenders.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  DATA, getUnit, unitsAvailableForWarband, variantUnitOverride,
  getActiveVariant, unitForbiddenByVariant,
  classifyBattlekitItem, findBattlekitItem,
};
`;
const stub = `
const localStorage = { _d:{}, getItem(k){return this._d[k]||null;}, setItem(k,v){this._d[k]=String(v);}, removeItem(k){delete this._d[k];}, clear(){this._d={};} };
function alert(){}
function fakeEl(){ return { style:{}, classList:{add(){},remove(){},toggle(){},contains(){return false;}}, addEventListener(){}, appendChild(){}, querySelectorAll(){return[];}, querySelector(){return null;}, dataset:{}, innerHTML:"", textContent:"" }; }
const window={addEventListener(){},matchMedia(){return{matches:false,addEventListener(){}};},requestAnimationFrame(){return 0;}};
const document={addEventListener(){},querySelectorAll(){return[];},querySelector(){return fakeEl();},getElementById(){return fakeEl();},createElement(){return fakeEl();},body:fakeEl(),documentElement:fakeEl()};
`;
fs.writeFileSync(TMP, stub + moduleCode);

const lib = require(TMP);
const { DATA, getUnit, unitsAvailableForWarband, variantUnitOverride,
        getActiveVariant, unitForbiddenByVariant,
        classifyBattlekitItem, findBattlekitItem } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

const IS = DATA.factions['iron-sultanate'];
const defendersWb = { factionId:'iron-sultanate', variantId:'iron-wall-def', models:[] };
const genericWb   = { factionId:'iron-sultanate', variantId:null, models:[] };
const wisdomWb    = { factionId:'iron-sultanate', variantId:'house-wisdom', models:[] };

/* ------------------------------------------------------------------ */
group('Group 1: variant units present in DATA', () => {
  const byId = Object.fromEntries(IS.units.map(u => [u.id, u]));
  ok(!!byId['sipahi-iw'], 'Sipahi unit defined');
  ok(!!byId['silahdar-iw'], 'Silahdar unit defined');
  ok(!!byId['janofficer-iw'], 'Janissary Officer unit defined');

  ok(byId['sipahi-iw'].cost === 110, 'Sipahi cost 110');
  ok(byId['sipahi-iw'].variantOnly === 'iron-wall-def', 'Sipahi gated to iron-wall-def');
  ok(byId['sipahi-iw'].stats.movement === '10"/Cavalry', 'Sipahi uses Mamluk Faris movement');
  ok(byId['sipahi-iw'].equipmentLocked === true, 'Sipahi equipment locked');
  ok(byId['sipahi-iw'].limit === '0-1', 'Sipahi limit 0-1');

  ok(byId['silahdar-iw'].cost === 70, 'Silahdar cost 70');
  ok(byId['silahdar-iw'].keywords.includes('STRONG'), 'Silahdar has STRONG');
  ok(!byId['silahdar-iw'].abilities.includes('Mubarizun'), 'Silahdar lacks Mubarizun');

  ok(byId['janofficer-iw'].keywords.includes('ELITE'), 'Janissary Officer is ELITE');
  ok(byId['janofficer-iw'].limit === '0-2', 'Janissary Officer limit 0-2');
});

/* ------------------------------------------------------------------ */
group('Group 2: variant config (override + mandatory + forbidden)', () => {
  const v = IS.variants.find(x => x.id === 'iron-wall-def');
  ok(!!v, 'iron-wall-def variant exists');
  const sapOv = (v.unitOverrides || []).find(o => o.unitId === 'sappers');
  ok(sapOv && sapOv.overrides.limit === '0-4', 'Sappers override limit 0-4');
  const mand = (v.mandatoryUnits || []).find(m => m.unitId === 'silahdar-iw');
  ok(mand && mand.count === 1 && mand.max === 1, 'Silahdar mandatory 1');
  ok(v.forbiddenUnitIds.includes('janissaries'), 'base Janissaries forbidden');
  ok(v.forbiddenUnitIds.includes('lions'), 'Lions forbidden (Far from Sublime Gate)');
  ok(v.forbiddenUnitIds.includes('yuzbasi'), 'Yuzbasi forbidden');
});

/* ------------------------------------------------------------------ */
group('Group 3: unitsAvailableForWarband — variantOnly gating', () => {
  const defIds = unitsAvailableForWarband(defendersWb).map(u => u.id);
  ok(defIds.includes('sipahi-iw'), 'Defenders catalogue includes Sipahi');
  ok(defIds.includes('silahdar-iw'), 'Defenders catalogue includes Silahdar');
  ok(defIds.includes('janofficer-iw'), 'Defenders catalogue includes Janissary Officer');
  ok(defIds.includes('sappers'), 'Defenders catalogue still includes base Sappers');

  const genIds = unitsAvailableForWarband(genericWb).map(u => u.id);
  ok(!genIds.includes('sipahi-iw'), 'generic Sultanate hides Sipahi');
  ok(!genIds.includes('silahdar-iw'), 'generic Sultanate hides Silahdar');
  ok(genIds.includes('yuzbasi'), 'generic Sultanate still has Yuzbasi');

  const wisIds = unitsAvailableForWarband(wisdomWb).map(u => u.id);
  ok(!wisIds.includes('sipahi-iw'), 'House of Wisdom hides Defenders-only Sipahi');
});

/* ------------------------------------------------------------------ */
group('Group 4: getUnit still resolves variant units', () => {
  ok(getUnit('iron-sultanate', 'sipahi-iw').name === 'Sipahi', 'getUnit finds Sipahi');
  ok(getUnit('iron-sultanate', 'silahdar-iw').name === 'Silahdar', 'getUnit finds Silahdar');
});

/* ------------------------------------------------------------------ */
group('Group 5: variantUnitOverride raises Sappers limit', () => {
  const ov = variantUnitOverride(defendersWb, 'sappers');
  ok(ov && ov.limit === '0-4', 'Defenders: Sappers limit override 0-4');
  ok(variantUnitOverride(genericWb, 'sappers') === null, 'generic: no Sappers override');
});

/* ------------------------------------------------------------------ */
group('Group 6: Iron Wall special armoury present', () => {
  const byId = {};
  for (const cat of Object.values(IS.armoury)) for (const it of cat) byId[it.id] = it;
  const expect = ['grand-cannon-iw','iron-shield-iw','banner-desert-wind-iw',
                  'explosive-charges-iw','anq-guard-iw'];
  for (const id of expect) {
    ok(!!byId[id], `${id} defined`);
    ok(byId[id] && byId[id].variantOnly === 'iron-wall-def', `${id} gated to iron-wall-def`);
  }
  ok(byId['grand-cannon-iw'].cost === 60, 'Grand Cannon 60👑');
  ok(byId['grand-cannon-iw'].weaponKeywords.includes('IGNORE ARMOUR'), 'Grand Cannon IGNORE ARMOUR');
  ok(byId['iron-shield-iw'].cost === 30, 'Iron Shield 30👑');
  ok(byId['anq-guard-iw'].weaponKeywords.includes('HEAVY'), 'Anq Guard HEAVY');
  // findBattlekitItem resolves them regardless of variant (for equipped lookups).
  ok(findBattlekitItem('iron-sultanate','iron-shield-iw').name === 'Iron Shield',
     'findBattlekitItem resolves Iron Shield');
});

group('Group 7: classifyBattlekitItem hides variant armoury off-variant', () => {
  const ironShield = findBattlekitItem('iron-sultanate','iron-shield-iw');
  const bull = getUnit('iron-sultanate','brazen-bull');
  const bullModel = { unitId:'brazen-bull', battlekit:[], upgrades:[], baseProgression:{} };

  // Generic Sultanate band → variant armoury hidden.
  const genCls = classifyBattlekitItem(ironShield, bullModel, bull, genericWb);
  ok(genCls.state === 'hidden', 'generic band: Iron Shield hidden');

  // Defenders band → passes the variant gate (not hidden by variantOnly).
  const defCls = classifyBattlekitItem(ironShield, bullModel, bull, defendersWb);
  ok(defCls.state !== 'hidden' || defCls.reason !== 'Solo variante específica',
     'Defenders band: Iron Shield not hidden by variant gate');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
