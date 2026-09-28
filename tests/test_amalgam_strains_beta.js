/* Amalgam y Strains según la revisión de reglas de abril 2026 (beta), canon de
 * mesa (decisión de Marcos, 2026-09-27). Fuente:
 * trenchcrusade.com/trench-wire/rules/amalgam-and-strains-rules-update/
 * (tarjetas Black-Grail-1..5). Decisiones de Marcos: Fly Thralls fuera del
 * catálogo base (solo The Great Hunger); las Strains también en Dirge; 2ª Strain
 * si el resto de la banda vale 1000 👑 o más.
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
dom.window.eval(js.slice(0, bootIdx) + '\n;window.__X = { DATA, ABILITY_LIBRARY, EQUIPMENT_IMPLICIT_ABILITIES, getUnit, getUnitWithVariant, effectiveStats, effectiveKeywords, effectiveAbilities, classifyUpgrade, allAvailableUpgrades, buildModelCardData, isUnitAvailable: typeof isUnitAvailable === "function" ? isUnitAvailable : null, getAvailableUnits: typeof getAvailableUnits === "function" ? getAvailableUnits : null };');
const X = dom.window.__X;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

const BG = X.DATA.factions['black-grail'];
const unit = (id) => BG.units.find(u => u.id === id) || {};
const all = Object.values(BG.armoury).flat();
const item = (name) => all.find(i => i.name === name) || {};

console.log('\nGroup 1: Grail Thralls y Strains');
const gt = unit('grail-thralls');
ok(gt.cost === 25 && gt.stats.movement === '5"/Infantry' && gt.abilities.join() === 'Overwhelming Horde,Undead Fortitude', 'Grail Thralls 25 👑, 5", Overwhelming Horde y Undead Fortitude');
const strains = (gt.upgrades || []).filter(u => u.perModelGroup === 'grail-strain');
const S = (n) => strains.find(u => u.name === n) || {};
ok(strains.map(u => u.name + ' ' + u.cost).join() === 'Bolgias Gut 10,Hellfly Host 0,Leech Grip 7,Tapeworm Throng 10', '4 Strains con su coste');
ok(S('Hellfly Host').statOverride.movement === '6"/Flying' && S('Hellfly Host').addsKeywords.includes('FLYING') && S('Hellfly Host').removesAbilities.includes('Undead Fortitude'), 'Hellfly Host: 6"/Flying, FLYING, sin Undead Fortitude');
ok(S('Leech Grip').statOverride.melee === '+0 DICE', 'Leech Grip: Melee +0');
ok((S('Bolgias Gut').addsAbilities || []).includes('Burst ACTION') && (S('Tapeworm Throng').addsAbilities || []).includes('Tapeworm Throng') && (S('Leech Grip').addsAbilities || []).includes('Leech Grip'), 'habilidades de las Strains');
['Burst ACTION', 'Leech Grip', 'Tapeworm Throng'].forEach(n => ok(!!(X.ABILITY_LIBRARY[n] && X.ABILITY_LIBRARY[n].summary), 'texto de ' + n));

console.log('\nGroup 2: máximo de Strains por Thrall');
const thrall = { uid: 't1', unitId: 'grail-thralls', upgrades: ['bg-strain-leech-grip'], battlekit: [] };
const poor = { factionId: 'black-grail', models: [thrall] };
ok(X.classifyUpgrade(S('Bolgias Gut'), thrall, gt, poor).state === 'disabled', 'banda pequeña: 1 Strain como máximo');
// 7 modelos de 150 👑 (valor fijado como en las bandas importadas de Companion) = 1050.
const rich = { factionId: 'black-grail', models: [thrall].concat(Array.from({ length: 7 }, (_, i) => ({ uid: 'k' + i, unitId: 'plague-knights', upgrades: [], battlekit: [], companionCost: 150 }))) };
const mid = { factionId: 'black-grail', models: [thrall].concat(Array.from({ length: 6 }, (_, i) => ({ uid: 'k' + i, unitId: 'plague-knights', upgrades: [], battlekit: [], companionCost: 150 }))) };
ok(X.classifyUpgrade(S('Bolgias Gut'), thrall, gt, mid).state === 'disabled', 'resto de la banda 900 👑: sigue en 1');
ok(X.classifyUpgrade(S('Bolgias Gut'), thrall, gt, rich).state === 'available', 'resto de la banda ≥ 1000 👑: segunda Strain');
thrall.upgrades.push('bg-strain-bolgias-gut');
ok(X.classifyUpgrade(S('Tapeworm Throng'), thrall, gt, rich).state === 'disabled', 'nunca más de 2');
const hf = { uid: 'h', unitId: 'grail-thralls', upgrades: ['bg-strain-hellfly-host'], battlekit: [] };
const wbH = { factionId: 'black-grail', models: [hf] };
ok(X.effectiveStats(hf, gt, wbH).movement === '6"/Flying' && X.effectiveKeywords(hf, gt, wbH).includes('FLYING') && !X.effectiveAbilities(hf, gt, wbH).includes('Undead Fortitude'), 'motor: Thrall con Hellfly Host vuela sin Undead Fortitude');

console.log('\nGroup 3: Fly Thralls y variantes');
const ft = unit('thralls');
ok(ft.variantOnly === 'great-hunger', 'Fly Thralls solo en The Great Hunger');
const dirge = { factionId: 'black-grail', variantId: 'great-hegemon', models: [] };
const gtDirge = X.getUnitWithVariant(dirge, 'grail-thralls');
ok(X.allAvailableUpgrades(gtDirge, dirge).some(u => u.perModelGroup === 'grail-strain'), 'Dirge: los Bereaved pueden comprar Strains');

console.log('\nGroup 4: Amalgam');
const am = unit('amalgam');
ok(am.cost === 150 && am.limit === '0-1', 'Amalgam 0-1, 150 👑');
ok(am.stats.movement === '5"/Infantry' && am.stats.ranged === '+0 DICE' && am.stats.melee === '+1 DICE' && am.stats.armour === '-1' && am.stats.base === '60mm', 'perfil 5" · +0 · +1 · -1 · 60mm');
ok(am.keywords.join() === 'BLACK GRAIL,FEAR,NEGATE GAS,TOUGH', 'keywords sin STRONG');
ok(am.abilities.join() === 'Absorb,Corpulent,Curse on Creation,Trample ACTION,Unstoppable', 'habilidades nuevas');
ok(am.battlekitAccess && am.battlekitAccess.forbidden === true && (am.permanentEquipment || []).join() === 'Gluttonous Arsenal', 'siempre Gluttonous Arsenal y ningún otro Battlekit');
const ga = item('Gluttonous Arsenal');
ok(ga.type === 'Special' && ga.range === 'Melee/16"' && (ga.weaponKeywords || []).join() === 'ASSAULT,AUTOMATIC 3,CLEAVE 3' && /Amalgam only/.test(ga.restriction), 'Gluttonous Arsenal: Special, Melee/16", ASSAULT, AUTOMATIC 3, CLEAVE 3');
ok((X.EQUIPMENT_IMPLICIT_ABILITIES['Gluttonous Arsenal'] || []).some(a => a.name === 'Putrid Spray'), 'Putrid Spray');
const bh = (am.upgrades || []).find(u => u.name === 'Bombardment Horde') || {};
ok(bh.cost === 20 && bh.statOverride && bh.statOverride.ranged === '+1 DICE' && bh.statOverride.melee === '+0 DICE', 'Vile Corpus Bombardment Horde 20 👑 (+1 DICE / +0 DICE)');
['Absorb', 'Corpulent', 'Curse on Creation', 'Unstoppable', 'Bombardment Horde'].forEach(n => ok(!!(X.ABILITY_LIBRARY[n] && X.ABILITY_LIBRARY[n].summary), 'texto de ' + n));
const amM = { uid: 'a', unitId: 'amalgam', upgrades: [], battlekit: [] };
const card = X.buildModelCardData(amM, { id: 'w', factionId: 'black-grail', models: [amM] });
ok(card.weapons.some(w => w.name === 'Gluttonous Arsenal'), 'la ficha muestra el Gluttonous Arsenal como arma');

console.log('\nGroup 5: Blessings of Beelzebub');
const bb = item('Blessings of Beelzebub');
ok(bb.cost === 9 && bb.currency === '☼' && /Lord of Tumours only/.test(bb.restriction) && /Limit: 1/.test(bb.restriction), 'Glory Item 9 ☼, Lord of Tumours only, Limit: 1');
ok((X.EQUIPMENT_IMPLICIT_ABILITIES['Blessings of Beelzebub'] || []).some(a => a.name === 'Favoured Strain'), 'Favoured Strain');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
