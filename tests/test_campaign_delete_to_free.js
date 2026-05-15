/* Test for Fase 8 (CLAUDE.md P3/10): campaign deletion converts battles
 *
 * When a campaign is deleted, its battles should not vanish — they
 * become FreeBattle entries on each participating warband so XP,
 * fechas, opponent and trauma history are preserved.
 *
 * Scope:
 *   - convertCampaignBattlesToFreeBattles(c): pure. Returns a map
 *     { [warbandId]: [FreeBattle, ...] } with one FreeBattle per
 *     (battle × participant). origin tagged 'free-from-campaign'.
 *   - deleteCampaignWithConversion(c): applies the conversion +
 *     deletes the campaign store. Smoke-tested via the helper only;
 *     the full delete flow goes through localStorage.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_fase8.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  convertCampaignBattlesToFreeBattles: typeof convertCampaignBattlesToFreeBattles === 'function' ? convertCampaignBattlesToFreeBattles : null,
};
`;
const stub = `
const localStorage = { _d: {}, getItem(k){return this._d[k]||null;}, setItem(k,v){this._d[k]=String(v);}, removeItem(k){delete this._d[k];}, clear(){this._d={};} };
let lastAlert = null;
function alert(msg){ lastAlert = msg; }
function fakeEl(){ return { style:{}, classList:{add(){},remove(){},toggle(){},contains(){return false;}}, addEventListener(){}, removeEventListener(){}, appendChild(){}, querySelectorAll(){return [];}, querySelector(){return null;}, setAttribute(){}, getAttribute(){return null;}, innerHTML:'', textContent:'', value:'', children:[], dataset:{}, click(){}, focus(){}, blur(){}, dispatchEvent(){}, cloneNode(){return fakeEl();}, parentNode:{ replaceChild(){} } }; }
const window = { addEventListener(){}, removeEventListener(){}, location:{search:''}, navigator:{userAgent:''}, matchMedia(){return {matches:false,addEventListener(){},addListener(){}};}, requestAnimationFrame(fn){return 0;}, setTimeout(){return 0;}, clearTimeout(){} };
const document = { addEventListener(){}, removeEventListener(){}, querySelectorAll(){return [];}, querySelector(){return fakeEl();}, getElementById(){return fakeEl();}, createElement(){return fakeEl();}, body:fakeEl(), documentElement:fakeEl() };
const setTimeout = (fn, ms) => 0;
const clearTimeout = () => {};
`;
fs.writeFileSync(TMP, stub + moduleCode);

const lib = require(TMP);
const { convertCampaignBattlesToFreeBattles } = lib;

if (!convertCampaignBattlesToFreeBattles) {
  console.error('✗ convertCampaignBattlesToFreeBattles not exported');
  process.exit(1);
}

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

function mockCampaign() {
  return {
    id:'cmp_t', name:'Crucible', warbandIds:['wb_a','wb_b'],
    battles: [
      {
        id:'btl_1', date:'2026-03-05', scenario:'hold-the-line', notes:'turn 4 nail-biter',
        participants:[
          {
            warbandId:'wb_a', result:'win', ducatsEarned:50, gloryEarned:1,
            modelOutcomes:[
              { modelUid:'m1', participated:true, outOfAction:false, kills:2, feats:0 },
              { modelUid:'m2', participated:true, outOfAction:true,  kills:0, feats:0, injury:{id:'old-wound', name:'Old Wound'} },
            ],
          },
          {
            warbandId:'wb_b', result:'loss', ducatsEarned:20, gloryEarned:0,
            modelOutcomes:[
              { modelUid:'n1', participated:true, outOfAction:false, kills:0, feats:1 },
            ],
          },
        ],
      },
      {
        id:'btl_2', date:'2026-03-12', scenario:'hunt-heroes', notes:'',
        participants:[
          { warbandId:'wb_a', result:'draw', ducatsEarned:30, gloryEarned:0, modelOutcomes:[] },
          { warbandId:'wb_b', result:'draw', ducatsEarned:30, gloryEarned:0, modelOutcomes:[] },
        ],
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
group('Group 1: empty / degenerate input', () => {
  ok(typeof convertCampaignBattlesToFreeBattles(null) === 'object', 'null → object');
  ok(Object.keys(convertCampaignBattlesToFreeBattles(null)).length === 0, 'null → empty map');
  ok(Object.keys(convertCampaignBattlesToFreeBattles({})).length === 0, 'empty → empty');
  ok(Object.keys(convertCampaignBattlesToFreeBattles({battles:[]})).length === 0,
     'no battles → empty');
});

/* ------------------------------------------------------------------ */
group('Group 2: one battle, two warbands', () => {
  const c = mockCampaign();
  const map = convertCampaignBattlesToFreeBattles(c);
  ok(Array.isArray(map['wb_a']), 'wb_a has list');
  ok(Array.isArray(map['wb_b']), 'wb_b has list');
  ok(map['wb_a'].length === 2, 'wb_a got both battles');
  ok(map['wb_b'].length === 2, 'wb_b got both battles');
});

/* ------------------------------------------------------------------ */
group('Group 3: FreeBattle shape preserved', () => {
  const c = mockCampaign();
  const map = convertCampaignBattlesToFreeBattles(c);
  const fb = map['wb_a'][0];
  ok(fb.origin === 'free-from-campaign', 'origin tag set');
  ok(fb.scenarioId === 'hold-the-line', 'scenarioId preserved');
  ok(fb.result === 'win', 'result preserved');
  ok(fb.loot === 50, 'ducats preserved');
  ok(fb.glory === 1, 'glory preserved');
  ok(fb.notes === 'turn 4 nail-biter', 'notes preserved');
  ok(typeof fb.completedAt === 'string' && fb.completedAt.startsWith('2026-03-05'),
     'completedAt derived from battle date');
});

/* ------------------------------------------------------------------ */
group('Group 4: XP preserved per model outcome', () => {
  const c = mockCampaign();
  const map = convertCampaignBattlesToFreeBattles(c);
  const fb = map['wb_a'][0];
  // m1: survived + 2 kills = 3 XP
  ok(fb.xpAwarded.m1 === 3, 'm1 XP=3');
  // m2: OoA, no kills = 0 → not in map
  ok(!('m2' in fb.xpAwarded), 'm2 (no XP) absent from xpAwarded');
});

/* ------------------------------------------------------------------ */
group('Group 5: trauma preserved', () => {
  const c = mockCampaign();
  const map = convertCampaignBattlesToFreeBattles(c);
  const fb = map['wb_a'][0];
  ok(Array.isArray(fb.traumaResults) && fb.traumaResults.length === 1, 'one trauma');
  ok(fb.traumaResults[0].modelUid === 'm2', 'trauma for m2');
  ok(fb.traumaResults[0].id === 'old-wound', 'trauma id preserved');
});

/* ------------------------------------------------------------------ */
group('Group 6: opponent name derived from other participants', () => {
  const c = mockCampaign();
  const map = convertCampaignBattlesToFreeBattles(c);
  // wb_a's fb should list wb_b as opponent
  ok(map['wb_a'][0].opponent === 'wb_b', 'wb_a fb opponent = wb_b');
  ok(map['wb_b'][0].opponent === 'wb_a', 'wb_b fb opponent = wb_a');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
