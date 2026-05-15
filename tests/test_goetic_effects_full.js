/* Test: applyGoeticEffect kinds adicionales.
 *
 * Antes solo 'curse-armour' y 'skip-activation'. Ahora expandido a:
 * - 'self-heal-blood': caster bloodMarkers -1.
 * - 'grant-cover': target ally gain grantedCover flag.
 * - 'ranged-attack': target sufre ataque directo (BLOOD/DOWN/OUT).
 * - 'area-blast': target + 1-2 enemies adicionales BLOOD.
 * - 'summon-wretched': band gana 1 wretched temporal.
 * - 'revive-friend': allies OoA → 1 vuelve (Risky 50%).
 *
 * Algunos efectos usan Math.random — tests stochastic donde aplica.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_goetic_full.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = { applyGoeticEffect };
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
const { applyGoeticEffect } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: self-heal-blood', () => {
  const caster = { bloodMarkers: 3 };
  applyGoeticEffect(caster, { kind:'self-heal-blood' });
  ok(caster.bloodMarkers === 2, '3 → 2');

  const at0 = { bloodMarkers: 0 };
  applyGoeticEffect(at0, { kind:'self-heal-blood' });
  ok(at0.bloodMarkers === 0, '0 → 0 (no negativo)');
});

group('Group 2: grant-cover', () => {
  const ally = { name:'Ally' };
  applyGoeticEffect(ally, { kind:'grant-cover' });
  ok(ally.grantedCover === true, 'grantedCover flag set');
});

group('Group 3: ranged-attack direct hit', () => {
  // Stochastic: 50 ataques, contar daño en target.
  let hits = 0;
  for (let i = 0; i < 50; i++) {
    const target = { bloodMarkers:0, isDown:false, isOut:false, armour:0 };
    applyGoeticEffect(target, { kind:'ranged-attack', dice: 4, range: 24, keywords:['IGNORE ARMOUR','FIRE'] });
    if (target.bloodMarkers > 0 || target.isDown || target.isOut) hits++;
  }
  ok(hits >= 15, `≥15/50 ataques causan daño (got ${hits})`);
});

group('Group 4: area-blast', () => {
  const target = { bloodMarkers:0, _band: null };
  const others = [
    { bloodMarkers:0, isOut:false },
    { bloodMarkers:0, isOut:false },
    { bloodMarkers:0, isOut:false },
  ];
  target._band = [target, ...others];
  let primaryHits = 0, secondaryHits = 0;
  for (let i = 0; i < 50; i++) {
    const t = { bloodMarkers:0, _band: target._band };
    applyGoeticEffect(t, { kind:'area-blast', range: 18 });
    if (t.bloodMarkers > 0) primaryHits++;
  }
  ok(primaryHits >= 15, `target primario sufre daño en ≥15/50 (got ${primaryHits})`);
});

group('Group 5: summon-wretched añade modelo a banda', () => {
  const caster = { _band: [{ name:'Caster' }] };
  applyGoeticEffect(caster, { kind:'summon-wretched' });
  ok(caster._band.length === 2, '_band ahora tiene 2 modelos');
  const wretched = caster._band.find(m => /wretched/i.test(m.name || ''));
  ok(!!wretched, 'modelo Wretched añadido');
  ok(wretched.temporary === true, 'flag temporary set');
});

group('Group 6: revive-friend — ally OoA puede volver', () => {
  // Stochastic: 30 intentos. Si al menos 1 ally vuelve, pass.
  let revives = 0;
  for (let i = 0; i < 30; i++) {
    const caster = { _band: null };
    const fallen = { name:'Fallen', isOut:true, bloodMarkers: 6, isDown:false };
    caster._band = [caster, fallen];
    applyGoeticEffect(caster, { kind:'revive-friend', risky:true });
    if (fallen.isOut === false) revives++;
  }
  // Risky 50% — ≥5 revives en 30 tries es razonable.
  ok(revives >= 5, `≥5/30 revives (got ${revives})`);
});

group('Group 7: defensive', () => {
  let threw = false;
  try { applyGoeticEffect(null, { kind:'self-heal-blood' }); } catch (e) { threw = true; }
  ok(!threw, 'null target no-throw');
  try { applyGoeticEffect({}, null); } catch (e) { threw = true; }
  ok(!threw, 'null effect no-throw');
  try { applyGoeticEffect({}, { kind:'unknown-kind' }); } catch (e) { threw = true; }
  ok(!threw, 'unknown kind no-throw');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
