/* Test for Fase 5.1: Exploration option picker (modal + helpers)
 *
 * Most canon discoveries have multiple options (e.g., Moonshine Stash:
 * Distribute / Destroy / Sell). The wizard's Exploration step in 4.5
 * just listed them; this subfase lets the user pick one. The picked
 * option is stored on the discovery record so subsequent subphases
 * (5.3) can apply its effect to the warband.
 *
 * Scope:
 *   - optionIsAllowedFor(opt, factionId): pure helper. True if the
 *     option has no faction restriction OR the warband's faction is
 *     in factionsAllowed.
 *   - pickExplorationOption(disc, optionId): mutates disc, sets
 *     chosenOptionId AND stores a snapshot in chosenOption for later
 *     replay/serialization. Idempotent — picking the same option
 *     twice is a no-op; picking a different one overwrites.
 *   - DOM presence of modal-exploration-option.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_fase5_1.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  optionIsAllowedFor: typeof optionIsAllowedFor === 'function' ? optionIsAllowedFor : null,
  pickExplorationOption: typeof pickExplorationOption === 'function' ? pickExplorationOption : null,
};
`;
const stub = `
const localStorage = { _d: {}, getItem(k){return this._d[k]||null;}, setItem(k,v){this._d[k]=String(v);}, removeItem(k){delete this._d[k];}, clear(){this._d={};} };
let lastAlert = null;
function alert(msg){ lastAlert = msg; }
function fakeEl(){ return { style:{}, classList:{add(){},remove(){},toggle(){},contains(){return false;}}, addEventListener(){}, removeEventListener(){}, appendChild(){}, querySelectorAll(){return [];}, querySelector(){return null;}, setAttribute(){}, getAttribute(){return null;}, innerHTML:'', textContent:'', value:'', children:[], dataset:{}, click(){}, focus(){}, blur(){}, dispatchEvent(){}, cloneNode(){return fakeEl();}, parentNode:{ replaceChild(){} } }; }
const window = { addEventListener(){}, removeEventListener(){}, location:{search:''}, navigator:{userAgent:''}, matchMedia(){return {matches:false,addEventListener(){},addListener(){}};}, requestAnimationFrame(fn){return 0;} };
const document = { addEventListener(){}, removeEventListener(){}, querySelectorAll(){return [];}, querySelector(){return fakeEl();}, getElementById(){return fakeEl();}, createElement(){return fakeEl();}, body:fakeEl(), documentElement:fakeEl() };
`;
fs.writeFileSync(TMP, stub + moduleCode);

const lib = require(TMP);
const { optionIsAllowedFor, pickExplorationOption } = lib;

if (!optionIsAllowedFor) { console.error('✗ optionIsAllowedFor not exported'); process.exit(1); }
if (!pickExplorationOption) { console.error('✗ pickExplorationOption not exported'); process.exit(1); }

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: optionIsAllowedFor — no restriction = always allowed', () => {
  ok(optionIsAllowedFor({ id:'x', label:'X' }, 'new-antioch') === true, 'option without restriction is allowed');
  ok(optionIsAllowedFor({ id:'x', label:'X' }, null) === true, 'null factionId is allowed for unrestricted option');
  ok(optionIsAllowedFor({ id:'x', label:'X' }, undefined) === true, 'undefined factionId is allowed for unrestricted option');
});

group('Group 2: optionIsAllowedFor — factionsAllowed list', () => {
  const opt = { id:'distribute', restriction:{ factionsAllowed:['new-antioch','trench-pilgrims'] } };
  ok(optionIsAllowedFor(opt, 'new-antioch') === true, 'allowed faction returns true');
  ok(optionIsAllowedFor(opt, 'trench-pilgrims') === true, 'second allowed faction returns true');
  ok(optionIsAllowedFor(opt, 'heretic-legions') === false, 'disallowed faction returns false');
  ok(optionIsAllowedFor(opt, null) === false, 'null factionId with restriction returns false');
});

group('Group 3: optionIsAllowedFor — degenerate inputs', () => {
  ok(optionIsAllowedFor(null, 'new-antioch') === false, 'null option → false');
  ok(optionIsAllowedFor({ restriction:{} }, 'new-antioch') === true, 'empty restriction = no restriction → true');
  ok(optionIsAllowedFor({ restriction:{ factionsAllowed:[] } }, 'new-antioch') === false, 'empty factionsAllowed list → no faction is allowed');
});

/* ------------------------------------------------------------------ */
group('Group 4: pickExplorationOption — sets chosenOptionId', () => {
  const disc = {
    warbandId: 'wb_x',
    result: {
      kind: 'discovery',
      entry: { name:'Test', options:[
        { id:'sell', label:'Sell', description:'+30 👑', effect:{kind:'add-ducats',amount:30} },
        { id:'destroy', label:'Destroy', description:'+1 XP a ELITES', effect:{kind:'grant-xp-to-elites',xp:1,maxModels:2} },
      ]},
    },
  };
  pickExplorationOption(disc, 'sell');
  ok(disc.chosenOptionId === 'sell', 'chosenOptionId stored');
  ok(disc.chosenOption && disc.chosenOption.id === 'sell', 'chosenOption snapshot stored');
  ok(disc.chosenOption.effect && disc.chosenOption.effect.amount === 30, 'snapshot preserves effect data');
});

group('Group 5: pickExplorationOption — overwrites previous pick', () => {
  const disc = {
    warbandId: 'wb_x',
    result: {
      kind: 'discovery',
      entry: { name:'Test', options:[
        { id:'a', label:'A' },
        { id:'b', label:'B' },
      ]},
    },
  };
  pickExplorationOption(disc, 'a');
  ok(disc.chosenOptionId === 'a', 'first pick: a');
  pickExplorationOption(disc, 'b');
  ok(disc.chosenOptionId === 'b', 'overwrite: b');
  ok(disc.chosenOption.id === 'b', 'snapshot updated');
});

group('Group 6: pickExplorationOption — unknown id is a no-op', () => {
  const disc = {
    warbandId:'wb_x',
    result:{ kind:'discovery', entry:{ options:[{id:'a',label:'A'}] } },
  };
  pickExplorationOption(disc, 'nonexistent');
  ok(disc.chosenOptionId === undefined, 'unknown id leaves chosenOptionId unset');
  ok(disc.chosenOption === undefined, 'unknown id leaves chosenOption unset');
});

group('Group 7: pickExplorationOption — defensive against malformed input', () => {
  let threw = false;
  try { pickExplorationOption(null, 'a'); } catch (e) { threw = true; }
  ok(!threw, 'null disc does not throw');

  threw = false;
  try { pickExplorationOption({}, 'a'); } catch (e) { threw = true; }
  ok(!threw, 'empty disc does not throw');

  threw = false;
  try { pickExplorationOption({result:{kind:'pillaged'}}, 'a'); } catch (e) { threw = true; }
  ok(!threw, 'pillaged disc does not throw');
});

/* ------------------------------------------------------------------ */
group('Group 8: DOM markup present', () => {
  ok(html.includes('id="modal-exploration-option"'), 'modal-exploration-option exists in HTML');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
