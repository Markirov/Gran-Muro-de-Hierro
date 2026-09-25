/* Modo mesa — bloque de consulta completo (armas, equipo, habilidades).
 * Petición de Marcos 2026-09-25: "cuanta más información, mejor".
 * Solo textos que existan en los datos de Forge (mandato canon: no inventar).
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const js = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/)[1];
const bootIdx = js.search(/\nfunction boot\(\)/);
const dom = new JSDOM(html.replace(/<script[\s\S]*?<\/script>/g, ''), { runScripts: 'outside-only', url: 'http://localhost/' });
const w = dom.window;
w.alert = () => {};
w.eval(js.slice(0, bootIdx) + '\n;window.__lib = { importCompanionWarband, WEAPON_KEYWORD_LIBRARY, KEYWORD_LIBRARY,' +
  ' EQUIPMENT_IMPLICIT_ABILITIES,' +
  ' lookupRuleText: typeof lookupRuleText === "function" ? lookupRuleText : null,' +
  ' buildTableRefData: typeof buildTableRefData === "function" ? buildTableRefData : null };');
const L = w.__lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
if (!L.lookupRuleText || !L.buildTableRefData) { console.log('  ✗ faltan lookupRuleText / buildTableRefData'); process.exit(1); }

const wb = L.importCompanionWarband(JSON.parse(fs.readFileSync(path.join(ROOT, 'Bandas', 'Caza2.json'), 'utf8')));
const byName = (n) => wb.models.find(m => m.name === n);
const find = (list, n) => list.find(x => x.name.toLowerCase() === n.toLowerCase());

console.log('\nGroup 1: lookupRuleText');
ok(L.lookupRuleText('SHRAPNEL') === L.WEAPON_KEYWORD_LIBRARY['SHRAPNEL'].summary, 'keyword de arma');
ok(L.lookupRuleText('ELITE') === L.KEYWORD_LIBRARY['ELITE'], 'keyword de modelo');
ok(L.lookupRuleText('shield combo') === L.WEAPON_KEYWORD_LIBRARY['Shield Combo'].summary, 'insensible a mayúsculas');
ok(L.lookupRuleText('AUTOMATIC 4') === L.WEAPON_KEYWORD_LIBRARY['AUTOMATIC'].summary, 'paramétrica sin entrada exacta → base');
ok(L.lookupRuleText('BLAST 3"') === L.WEAPON_KEYWORD_LIBRARY['BLAST 3"'].summary, 'paramétrica con entrada exacta');
ok(L.lookupRuleText('Pieza Inexistente') === '', 'sin datos → cadena vacía (no se inventa)');

const sil = L.buildTableRefData(byName('Silahdar'), wb);

console.log('\nGroup 2: armas');
const alay = find(sil.weapons, 'Alaybozan');
ok(!!alay, 'Alaybozan presente');
ok(alay && find(alay.rules, 'SHRAPNEL') && find(alay.rules, 'SHRAPNEL').desc.length > 0, 'SHRAPNEL con explicación');
ok(alay && find(alay.rules, 'Shield Combo'), 'restricción Shield Combo convertida en regla explicada');
ok(alay && /12/.test(alay.range) && alay.hand === '2H', 'alcance y manos del arma');
ok(alay && /Sappers only/.test(alay.restriction), 'restricción literal conservada');

console.log('\nGroup 3: equipo');
const names = sil.equipment.map(e => e.name);
ok(['Trench Shield', 'Medi-Kit', 'Alchemist Armour', 'Alchemical Ammunition', 'Anqa Guard'].every(n => names.includes(n)),
   'las 5 piezas de equipo no arma (' + names.join(', ') + ')');
const shield = find(sil.equipment, 'Trench Shield');
ok(shield && find(shield.grants, 'Shield Combo') && find(shield.grants, 'Shield Combo').desc.length > 0, 'Trench Shield concede Shield Combo con texto');
ok(shield && !find(shield.rules, 'Shield Combo'), 'Shield Combo no se repite como regla genérica en el escudo');
ok(shield && find(shield.grants, 'Shield Combo').desc === L.EQUIPMENT_IMPLICIT_ABILITIES['Trench Shield'][0].desc,
   'manda el texto concedido por la pieza');
const alch = find(sil.equipment, 'Alchemist Armour');
ok(alch && find(alch.grants, 'NEGATE FIRE') && find(alch.grants, 'NEGATE GAS'), 'Alchemist Armour concede NEGATE FIRE y NEGATE GAS');
const anqa = find(sil.equipment, 'Anqa Guard');
const offi = L.buildTableRefData(byName('Janissary Officer'), wb);
const reinf = find(offi.equipment, 'Reinforced Armour');
ok(reinf && find(reinf.rules, '-2 INJURY MODIFIER') && find(reinf.rules, '-2 INJURY MODIFIER').desc.length > 0,
   'Reinforced Armour: -2 INJURY MODIFIER explicado');

console.log('\nGroup 3b: nombres de Companion distintos a la armería (verificado contra impresión de Trench Companion)');
const gs = find(sil.weapons, 'Greatsword / Greataxe');
ok(gs && ['+1 INJURY DICE', 'CRITICAL', 'HEAVY'].every(k => find(gs.rules, k)),
   'Greatsword / Greataxe ↔ Great Sword/Axe: +1 INJURY DICE, CRITICAL, HEAVY');
ok(gs && gs.hand === '2H', 'Greatsword a dos manos');
// Defenders of the Iron Wall PDF: HEAVY; Changelog 1.0.2 (p.100) añade DEPLOYABLE.
ok(anqa && find(anqa.rules, 'HEAVY') && find(anqa.rules, 'DEPLOYABLE'), 'Anqa Guard ↔ Anq Guard: HEAVY, DEPLOYABLE');

console.log('\nGroup 3c: datos canon corregidos (Rulebook p.79 / Warbands of TC)');
ok(shield && find(shield.rules, '-1 INJURY MODIFIER') && !find(shield.rules, '-1 INJURY DICE'),
   'Trench Shield: -1 INJURY MODIFIER (no -1 INJURY DICE)');
const alchKw = alch ? alch.rules.concat(alch.grants).map(r => r.name) : [];
ok(['-2 INJURY MODIFIER', 'NEGATE FIRE', 'NEGATE GAS'].every(k => alchKw.includes(k)) && !alchKw.includes('NEGATE SHRAPNEL'),
   'Alchemist Armour: -2 INJURY MODIFIER, NEGATE FIRE, NEGATE GAS (sin NEGATE SHRAPNEL)');
ok(alch && find(alch.grants, 'Protection From Harm') && /FIRE/.test(find(alch.grants, 'Protection From Harm').desc),
   'Alchemist Armour concede Protection From Harm');
ok(alch && !/Inmune a ataques/.test(find(alch.grants, 'NEGATE FIRE').desc), 'NEGATE FIRE con semántica canon (ignora el Efecto)');
ok(anqa && typeof anqa.note === 'string' && anqa.note.length > 20, 'Anqa Guard muestra la nota de reglas de la armería');
const medi = find(sil.equipment, 'Medi-Kit');
ok(medi && find(medi.grants, 'Treat ACTION') && find(medi.grants, 'Treat ACTION').desc.length > 0, 'Medi-Kit concede Treat ACTION con texto');
ok(!find(sil.weapons, 'Greatsword / Greataxe').rules.some(r => r.name === 'Unique' && !/Unique/.test(gs.restriction || '')),
   'sin reglas de restricción ajenas');

console.log('\nGroup 4: habilidades');
const ab = sil.abilities;
ok(!find(ab, 'Shield Combo') && !find(ab, 'NEGATE FIRE') && !find(ab, 'NEGATE GAS'), 'no repite las que concede el equipo');
ok(find(ab, 'ELITE') && find(ab, 'ELITE').desc === L.KEYWORD_LIBRARY['ELITE'], 'ELITE rellenado desde KEYWORD_LIBRARY');
ok(find(ab, 'NEGATE FEAR') && find(ab, 'NEGATE FEAR').desc.length > 0, 'NEGATE FEAR con descripción');
ok(find(ab, 'Siege Jezzail Teams') && find(ab, 'Siege Jezzail Teams').kind === 'factionRule', 'reglas de variante presentes');
ok(find(ab, 'TOUGH') && find(ab, 'LEADER'), 'keywords propias presentes');
ok(ab.every(a => typeof a.desc === 'string'), 'desc siempre string (vacía si no hay dato)');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
