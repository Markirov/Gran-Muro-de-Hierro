/* Trench Ghosts (Warbands 1.0.2): creación de banda.
 * Barbed Wire Banshee, Enemies of All, Lost Souls, Undead Horror y armería
 * propia (Sarcophagus Mine, Tank Palanquin). Semi-corporeal y Slow and
 * Creeping son reglas de partida.
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'app.html'), 'utf8');
const js = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/)[1];
const bootIdx = js.search(/\nfunction boot\(\)/);
const dom = new JSDOM(html.replace(/<script[\s\S]*?<\/script>/g, ''), { runScripts: 'outside-only', url: 'http://localhost/' });
dom.window.alert = () => {};
dom.window.eval(js.slice(0, bootIdx) + '\n;window.__X = { DATA, classifyBattlekitItem, findBattlekitItem, getUnit, getUnitWithVariant, canAddUnit, modelCost, effectiveKeywords, lookupRuleText };');
const X = dom.window.__X;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

const HL = 'heretic-legions';
const TG = (models = []) => ({ factionId: HL, variantId: 'trench-ghosts', models });
const BASE = (models = []) => ({ factionId: HL, variantId: null, models });
const M = (unitId, bk = [], ups = []) => ({ uid: unitId + Math.random(), unitId, battlekit: bk, upgrades: ups });
function state(wbf, model, itemId, others = []) {
  const wb = wbf(others.concat(model));
  const item = X.findBattlekitItem(HL, itemId, wb);
  if (!item) return 'missing';
  return X.classifyBattlekitItem(item, model, X.getUnit(HL, model.unitId), wb).state;
}
const merc = id => X.DATA.mercenaries.find(m => m.id === id);

console.log('\nGroup 1: unidades');
const bn = X.getUnit(HL, 'banshee-tg');
const ch = X.getUnit(HL, 'chorister');
ok(bn && bn.cost === ch.cost && JSON.stringify(bn.stats) === JSON.stringify(ch.stats), 'Barbed Wire Banshee: mismo perfil y coste que el Chorister');
ok(bn && bn.abilities.includes('Barbed Wire Banshee') && !bn.abilities.includes('Unholy Hymns'), 'Banshee sin Unholy Hymns');
ok(/\+1 INJURY DICE/.test(X.lookupRuleText('Barbed Wire Banshee')), 'Barbed Wire Banshee con texto');
ok(X.canAddUnit(TG(), bn), 'Banshee disponible en Trench Ghosts');
ok(!X.canAddUnit(TG([M('chorister')]), bn), 'Banshee en vez de Chorister (no ambos)');
ok(!X.canAddUnit(TG([M('banshee-tg')]), ch), 'Chorister no si hay Banshee');
ok(!X.canAddUnit(BASE(), bn), 'sin variante: sin Banshee');
ok(!X.canAddUnit(TG(), merc('sin-eater') || merc('scripture-guardian') || X.DATA.mercenaries[0]), 'Enemies of All: sin Mercenarios');
ok(!X.canAddUnit(TG(), X.getUnit(HL, 'war-wolf')) && !X.canAddUnit(TG(), X.getUnit(HL, 'art-witch')), 'Lost Souls: sin ARTIFICIAL (War Wolf, Artillery Witch)');
const an = X.getUnitWithVariant(TG(), 'anointed');
ok(!an.permanentEquipment.includes('Infernal Brand') && an.permanentEquipment.includes('Reinforced Armour') && an.cost === 95, 'Lost Souls: Anointed sin Infernal Brand, 95 👑');
const tr = M('heretic-troopers');
const kw = X.effectiveKeywords(tr, X.getUnit(HL, 'heretic-troopers'), TG([tr]));
ok(['FEAR', 'NEGATE DIFFICULT TERRAIN', 'NEGATE GAS'].every(k => kw.includes(k)), 'Undead Horror: FEAR, NEGATE DIFFICULT TERRAIN, NEGATE GAS');

console.log('\nGroup 2: Battlekit');
ok(state(TG, M('heretic-troopers'), 'soul-contract-hl') === 'hidden', 'Lost Souls: sin Hellbound Soul Contract');
ok(state(TG, M('heretic-troopers'), 'inf-brand-hl') === 'hidden', 'Lost Souls: sin Infernal Brand');
ok(state(BASE, M('heretic-troopers'), 'inf-brand-hl') === 'available', 'sin variante: Infernal Brand disponible');
const sm = X.findBattlekitItem(HL, 'sarcophagus-tg');
ok(sm && sm.cost === 30 && sm.type === 'Armour' && sm.weaponKeywords.includes('-3 INJURY MODIFIER') && sm.weaponKeywords.includes('BLAST 3"') && /Walking Bomb/.test(sm.note), 'Sarcophagus Mine: 30 👑, Armour, -3 INJURY MODIFIER, BLAST 3"');
ok(state(TG, M('heretic-troopers'), 'sarcophagus-tg') === 'available', 'Sarcophagus Mine: Heretic Troopers');
ok(state(TG, M('heretic-priest'), 'sarcophagus-tg') === 'hidden', 'Sarcophagus Mine: no Heretic Priest');
ok(state(TG, M('heretic-troopers'), 'sarcophagus-tg', [M('heretic-troopers', ['sarcophagus-tg']), M('heretic-troopers', ['sarcophagus-tg'])]) === 'disabled', 'Sarcophagus Mine: Limit 2');
ok(state(TG, M('heretic-troopers', ['sarcophagus-tg']), 'sword-hl') === 'disabled', 'Walking Bomb: sin otro Battlekit');
ok(state(TG, M('heretic-troopers', ['sword-hl']), 'sarcophagus-tg') === 'disabled', 'Walking Bomb: no si ya lleva Battlekit');
ok(state(BASE, M('heretic-troopers'), 'sarcophagus-tg') === 'hidden', 'sin variante: sin Sarcophagus Mine');
const tp = X.findBattlekitItem(HL, 'palanquin-tg');
ok(tp && tp.cost === 60 && tp.type === 'Armour' && tp.weaponKeywords.includes('STRONG') && /50mm/.test(tp.note), 'Tank Palanquin: 60 👑, -3 INJURY MODIFIER, STRONG, base 50mm');
ok(state(TG, M('heretic-priest'), 'palanquin-tg') === 'available' && state(TG, M('chorister'), 'palanquin-tg') === 'hidden', 'Tank Palanquin: solo Heretic Priest');
ok(state(TG, M('heretic-priest', ['palanquin-tg']), 'trench-shield-hl') === 'disabled', 'Bulky: sin escudo');
ok(state(TG, M('heretic-priest', ['trench-shield-hl']), 'palanquin-tg') === 'disabled', 'Bulky: no con escudo');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
