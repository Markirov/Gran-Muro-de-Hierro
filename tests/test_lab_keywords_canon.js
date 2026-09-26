/* Motor del Lab frente al Keyword Glossary del Rulebook 1.0.2
 * (decisión de Marcos 2026-09-26: "arréglalo").
 * FEAR, TOUGH, FIRE/GAS/SHRAPNEL, NEGATE X, DEADLY, CLEAVE X, AUTOMATIC X,
 * RELOAD y FLAMETHROWER. Las tiradas se interceptan para que sea determinista.
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const js = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/)[1];
const bootIdx = js.search(/\nfunction boot\(\)/);
const dom = new JSDOM(html.replace(/<script[\s\S]*?<\/script>/g, ''), { runScripts: 'outside-only', url: 'http://localhost/' });
const W = dom.window;
W.alert = () => {};
W.eval(js.slice(0, bootIdx));

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

const mk = (o = {}) => Object.assign({ name: 'M', rangedDice: 0, meleeDice: 0, bloodMarkers: 0, armour: 0,
  keywords: new Set(), weapons: [], isOut: false, isDown: false }, o);
const wp = (kws, o = {}) => Object.assign({ name: 'W', isRanged: false, range: 0, diceMod: 0, injuryDice: 0, injuryMod: 0,
  keywords: new Set(kws) }, o);
const orig = { SR: W.successRollWithBlessing_lab, IR: W.injuryRoll_lab, cover: W.applyTerrainCoverModifier, rnd: W.Math.random };
W.applyTerrainCoverModifier = () => 0;
let srCalls = [], irCalls = [], irResult = 'NO_EFFECT';
W.successRollWithBlessing_lab = (a, d, r) => { srCalls.push(d); return 'SUCCESS'; };
W.injuryRoll_lab = (dice, mod, armour, bypass, deadly) => { irCalls.push({ dice, deadly: !!deadly }); return irResult; };
const reset = (res = 'NO_EFFECT') => { srCalls = []; irCalls = []; irResult = res; };

console.log('\nGroup 1: FEAR');
reset();
W.resolveMelee_lab(mk(), mk({ fear: true, keywords: new Set(['FEAR']) }), wp([]), true);
ok(srCalls.length === 1 && srCalls[0] === -1, 'ataque cuerpo a cuerpo contra FEAR: -1 DICE, sin perder el ataque (' + srCalls + ')');
reset();
W.resolveMelee_lab(mk(), mk({ fear: true, keywords: new Set(['FEAR']) }), wp([]), false);
ok(srCalls[0] === -1, 'también sin cargar');
reset();
W.resolveMelee_lab(mk({ fear: true, keywords: new Set(['FEAR']) }), mk({ fear: true, keywords: new Set(['FEAR']) }), wp([]), true);
ok(srCalls[0] === 0, 'un modelo con FEAR es inmune a FEAR');
reset();
W.resolveMelee_lab(mk({ keywords: new Set(['NEGATE FEAR']) }), mk({ fear: true, keywords: new Set(['FEAR']) }), wp([]), true);
ok(srCalls[0] === 0, 'NEGATE FEAR ignora el -1 DICE');
reset();
W.resolveRanged_lab(mk(), mk({ fear: true, keywords: new Set(['FEAR']) }), wp([], { isRanged: true, range: 24 }), []);
ok(srCalls[0] === 0, 'FEAR no afecta a disparos');

console.log('\nGroup 2: TOUGH');
reset('OUT');
const t1 = mk({ tough: true, keywords: new Set(['TOUGH']) });
W.applyInjury_lab(mk(), t1, wp([]), false, true, [t1]);
ok(irCalls[0].dice === 0, 'TOUGH ya no quita INJURY DICE (' + irCalls[0].dice + ')');
ok(!t1.isOut && t1.isDown, 'primer Out of Action → Down');
W.applyInjury_lab(mk(), t1, wp([]), false, true, [t1]);
ok(t1.isOut, 'segundo Out of Action → fuera');

console.log('\nGroup 3: FIRE / GAS / SHRAPNEL y NEGATE');
for (const k of ['FIRE', 'GAS', 'SHRAPNEL']) {
  reset('NO_EFFECT');
  const t = mk();
  W.applyInjury_lab(mk(), t, wp([k], { isRanged: true }), false, false, [t]);
  ok(t.bloodMarkers === 1 && irCalls[0].dice === 0, k + ': 1 BLOOD MARKER extra aunque la Injury Roll no tenga efecto');
  reset('NO_EFFECT');
  const n = mk({ keywords: new Set(['NEGATE ' + k]) });
  W.applyInjury_lab(mk(), n, wp([k], { isRanged: true }), false, false, [n]);
  ok(n.bloodMarkers === 0 && irCalls[0].dice === 0, 'NEGATE ' + k + ': sin marcador extra y sin -1 INJURY DICE');
}
reset('BLOOD');
const fb = mk();
W.applyInjury_lab(mk(), fb, wp(['FIRE'], { isRanged: true }), false, false, [fb]);
ok(fb.bloodMarkers === 2, 'FIRE + herida leve: 1 + 1 extra');
reset('NO_EFFECT');
const wg = mk({ wrathOfGod: true });
W.applyInjury_lab(mk(), wg, wp(['FIRE'], { isRanged: true }), false, false, [wg]);
ok(wg.bloodMarkers === 0, 'Wrath of God también bloquea el marcador extra');

console.log('\nGroup 4: DEADLY');
reset('BLOOD');
const d1 = mk();
W.applyInjury_lab(mk(), d1, wp(['DEADLY']), false, true, [d1]);
ok(irCalls[0].deadly === true, 'DEADLY: Injury Roll con 3D6');
ok(d1.bloodMarkers === 1, 'DEADLY ya no añade BLOOD MARKER extra');
reset();
const r3 = W.rollDicePool_lab(0, 3);
ok(r3 && r3.dice.length === 3, 'rollDicePool_lab(mod, 3) se queda con 3 dados');

console.log('\nGroup 5: CLEAVE (X) y AUTOMATIC (X)');
reset();
W.resolveMelee_lab(mk(), mk(), wp(['CLEAVE 3']), false);
ok(srCalls.length === 3, 'CLEAVE 3 → 3 ataques (' + srCalls.length + ')');
reset();
W.resolveMelee_lab(mk(), mk(), wp(['CLEAVE 2']), false);
ok(srCalls.length === 2, 'CLEAVE 2 → 2 ataques');
reset();
W.resolveRanged_lab(mk(), mk(), wp(['AUTOMATIC 5'], { isRanged: true, range: 48 }), []);
ok(srCalls.length === 5, 'AUTOMATIC 5 → 5 ataques (' + srCalls.length + ')');

console.log('\nGroup 6: RELOAD');
reset();
const rl = mk();
W.resolveRanged_lab(rl, mk(), wp(['RELOAD'], { isRanged: true, range: 24 }), []);
ok(rl._activationEnded === true, 'RELOAD: la activación termina tras el ataque');
const nr = mk();
W.resolveRanged_lab(nr, mk(), wp([], { isRanged: true, range: 24 }), []);
ok(!nr._activationEnded, 'sin RELOAD la activación sigue');

console.log('\nGroup 7: FLAMETHROWER');
reset('NO_EFFECT');
const tgt = mk(), others = [mk(), mk(), mk(), mk(), mk(), mk()];
W.resolveRanged_lab(mk(), tgt, wp(['FLAMETHROWER'], { isRanged: true, range: 8 }), [tgt, ...others]);
ok(srCalls.length === 0, 'FLAMETHROWER: sin Success Roll');
ok(irCalls.length === 1, 'FLAMETHROWER: solo el objetivo (sin objetivos extra) → ' + irCalls.length + ' Injury Rolls');

W.successRollWithBlessing_lab = orig.SR; W.injuryRoll_lab = orig.IR; W.applyTerrainCoverModifier = orig.cover;
console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
