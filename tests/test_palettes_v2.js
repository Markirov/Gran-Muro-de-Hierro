/* Verifica SPEC v2: paletas RGB arrays + ids canon + variantes activas. */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_palettes_v2.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  FACTION_PALETTES, VARIANT_PALETTES, getFactionPalette, getVariantFactionRules,
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
const { FACTION_PALETTES, VARIANT_PALETTES, getFactionPalette, getVariantFactionRules } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: 6 facciones base SPEC v2', () => {
  const expected = ['new-antioch','trench-pilgrims','iron-sultanate','heretic-legions','black-grail','the-court'];
  for (const f of expected) {
    ok(!!FACTION_PALETTES[f], f + ' presente');
  }
});

group('Group 2: paletas en arrays RGB [R,G,B]', () => {
  const p = FACTION_PALETTES['new-antioch'];
  ok(Array.isArray(p.FRAME), 'FRAME es array');
  ok(p.FRAME.length === 3, 'FRAME tiene 3 elementos');
  ok(typeof p.FRAME[0] === 'number', 'FRAME[0] numérico');
  ok(p.FRAME[0] === 95 && p.FRAME[1] === 25 && p.FRAME[2] === 25, 'NA FRAME = [95,25,25]');
});

group('Group 3: claves UPPER + nuevas STAT_HEADER_COLOR/SECTION_COLOR/NARRATIVE_COLOR', () => {
  const p = FACTION_PALETTES['iron-sultanate'];
  ok('ORNAMENT' in p, 'ORNAMENT (upper)');
  ok('STAT_HEADER_COLOR' in p, 'STAT_HEADER_COLOR');
  ok('SECTION_COLOR' in p, 'SECTION_COLOR');
  ok('NARRATIVE_COLOR' in p, 'NARRATIVE_COLOR');
  ok(p.ORNAMENT === 'crescent', 'IS ORNAMENT = crescent');
});

group('Group 4: ornamentos canon v2', () => {
  ok((FACTION_PALETTES['new-antioch']||{}).ORNAMENT === 'papal_cross', 'NA papal_cross');
  ok((FACTION_PALETTES['trench-pilgrims']||{}).ORNAMENT === 'iron_cross_rough', 'TP iron_cross_rough');
  ok((FACTION_PALETTES['iron-sultanate']||{}).ORNAMENT === 'crescent', 'IS crescent');
  ok((FACTION_PALETTES['heretic-legions']||{}).ORNAMENT === 'inverted_star', 'HL inverted_star');
  ok((FACTION_PALETTES['black-grail']||{}).ORNAMENT === 'fly_cross', 'BG fly_cross');
  ok((FACTION_PALETTES['the-court']||{}).ORNAMENT === 'seven_headed_serpent', 'TC seven_headed_serpent');
});

group('Group 5: 8 variantes activas v2', () => {
  const expected = [
    'new-antioch:papal-states',
    'new-antioch:alba',
    'new-antioch:prussia',
    'new-antioch:eire-rangers',
    'new-antioch:abyssinia',
    'iron-sultanate:fidai-alamut',
    'iron-sultanate:house-wisdom',
    'iron-sultanate:iron-wall-def',
  ];
  for (const k of expected) {
    ok(!!VARIANT_PALETTES[k], k + ' presente');
  }
});

group('Group 6: Alba azul Saltire (no rojo)', () => {
  const alba = VARIANT_PALETTES['new-antioch:alba'];
  ok(alba.ORNAMENT === 'thistle', 'Alba ORNAMENT = thistle');
  // FRAME azul: [34, 72, 122] aprox.
  ok(Array.isArray(alba.FRAME) && alba.FRAME[2] > alba.FRAME[0],
     `Alba FRAME es azul (B > R, got [${alba.FRAME.join(',')}])`);
});

group('Group 7: ornamentos custom canon v2 nuevos', () => {
  const v = VARIANT_PALETTES;
  ok((v['new-antioch:papal-states']||{}).ORNAMENT === 'crossed_keys', 'crossed_keys');
  ok((v['new-antioch:prussia']||{}).ORNAMENT === 'prussian_eagle', 'prussian_eagle');
  ok((v['new-antioch:eire-rangers']||{}).ORNAMENT === 'irish_harp', 'irish_harp');
  ok((v['new-antioch:abyssinia']||{}).ORNAMENT === 'lion_of_judah', 'lion_of_judah');
  ok((v['iron-sultanate:fidai-alamut']||{}).ORNAMENT === 'jambiya', 'jambiya');
  ok((v['iron-sultanate:house-wisdom']||{}).ORNAMENT === 'astrolabe', 'astrolabe');
  ok((v['iron-sultanate:iron-wall-def']||{}).ORNAMENT === 'fortified_tower', 'fortified_tower');
});

group('Group 8: getFactionPalette devuelve override correcto', () => {
  const p = getFactionPalette({ factionId:'new-antioch', variantId:'alba' });
  ok(p.ORNAMENT === 'thistle', 'Alba ORNAMENT en merge');
  ok(p.FRAME[0] === 34, 'Alba FRAME[0] = 34 (azul)');

  const p2 = getFactionPalette({ factionId:'iron-sultanate', variantId:'iron-wall-def' });
  ok(p2.ORNAMENT === 'fortified_tower', 'DefIron ORNAMENT = fortified_tower');

  const fb = getFactionPalette({ factionId:'inexistent' });
  ok(fb.ORNAMENT === 'papal_cross', 'fallback NA');
});

group('Group 9: VARIANT_FACTION_RULES Alba SPEC v2', () => {
  const r = getVariantFactionRules({ factionId:'new-antioch', variantId:'alba' });
  ok(Array.isArray(r), 'Alba rules array');
  ok(r.some(x => /bagpipes/i.test(x.name)), 'incluye Bagpipes');
  ok(r.some(x => /hold the line/i.test(x.name)), 'incluye Hold the Line');
  ok(r.some(x => /rampant charge/i.test(x.name)), 'incluye Rampant Charge');
});

/* Group 10: regresión bug House of Wisdom — key VARIANT_PALETTES
 * estaba mal escrita ('house-of-wisdom') y nunca se aplicaba. variantId
 * canónico = 'house-wisdom' (sin 'of'). Ver línea 5396 def + 7395 mapping. */
group('Group 10: House of Wisdom variant key bug regression', () => {
  const wbHoW = { factionId:'iron-sultanate', variantId:'house-wisdom' };
  const p = getFactionPalette(wbHoW);
  ok(p.ORNAMENT === 'astrolabe',
     'House of Wisdom resuelve a ORNAMENT=astrolabe (no crescent base)');
  // VARIANT verde HoW [32,105,75] — no naranja base IS [155,88,32].
  ok(Array.isArray(p.VARIANT) && p.VARIANT[0] === 32 && p.VARIANT[1] === 105 && p.VARIANT[2] === 75,
     'House of Wisdom VARIANT=[32,105,75] (verde, no naranja base)');

  // Cross-check: toda key en VARIANT_PALETTES usa variantId canónico.
  // Previene typo silencioso al añadir variantes futuras.
  const KNOWN_VARIANT_IDS = ['papal-states','alba','prussia','eire-rangers','abyssinia',
    'red-brigade','fidai-alamut','house-wisdom','iron-wall-def',
    'great-hegemon','great-hunger',
    // Trench Pilgrims (3).
    'sacred-affliction','st-methodius','tenth-plague',
    // Heretic Legions (3 variantes).
    'trench-ghosts','avarice-knights','naval-raiders',
    // The Court — 7 Sins.
    'sin-wrath','sin-envy','sin-lust','sin-pride','sin-sloth','sin-gluttony','sin-greed'];
  for (const key of Object.keys(VARIANT_PALETTES)) {
    const vid = key.split(':')[1];
    ok(KNOWN_VARIANT_IDS.includes(vid),
       'VARIANT_PALETTES key "' + key + '" usa variantId canon "' + vid + '"');
  }
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
