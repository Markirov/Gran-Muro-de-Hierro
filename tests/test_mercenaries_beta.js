/* Mercenarios según la revisión de reglas de abril 2026 (beta), canon de mesa
 * (decisión de Marcos, 2026-09-27). Fuente:
 * trenchcrusade.com/trench-wire/rules/mercenaries-rules-update/ (tarjetas
 * Mercenaries-1..6). Decisiones de Marcos: el Scripture Guardian compra sus
 * armas cuerpo a cuerpo con un selector limitado a Melee Weapons; la ficha de
 * un mercenario no lista las reglas de facción/variante de la banda.
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
let html = fs.readFileSync(path.join(ROOT, 'public', 'app.html'), 'utf8');
  const cssContent = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'css', 'app.css'), 'utf8');
  html += '\n<style>\n' + cssContent + '\n</style>\n';
  const JS_DIR_ALL = path.resolve(__dirname, '..', 'public', 'js');
  const jsContentAll = fs.readdirSync(JS_DIR_ALL).filter(x => x.endsWith('.js')).map(x => fs.readFileSync(path.join(JS_DIR_ALL, x), 'utf8')).join('\n');
  html += '\n<script>\n' + jsContentAll + '\n</script>\n';
const JS_DIR = path.resolve(__dirname, '..', 'public', 'js');
const jsFiles = fs.readdirSync(JS_DIR).filter(f => f.endsWith('.js')).sort();
const js = jsFiles.map(f => fs.readFileSync(path.join(JS_DIR, f), 'utf8')).join('\n');
const bootIdx = js.search(/\nfunction boot\(\)/);
const dom = new JSDOM(html.replace('</body>', '<script>' + js + '</script></body>').replace(/<script[\s\S]*?<\/script>/g, ''), { runScripts: 'outside-only', url: 'http://localhost/' });
dom.window.alert = () => {};
dom.window.eval(js.slice(0, bootIdx) + '\n;window.__X = { DATA, ABILITY_LIBRARY, EQUIPMENT_IMPLICIT_ABILITIES, KEYWORD_GLOSSARY, findArmouryItemByName, classifyBattlekitItem, modelCost, buildModelCardData, getUnit };');
const X = dom.window.__X;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

const merc = (id) => X.DATA.mercenaries.find(m => m.id === id) || {};
const kw = (id) => (merc(id).keywords || []).join(', ');
const ab = (id) => (merc(id).abilities || []).join(', ');
const st = (id) => { const s = merc(id).stats || {}; return [s.movement, s.ranged, s.melee, s.armour, s.base].join(' · '); };
const txt = (n) => !!(X.ABILITY_LIBRARY[n] && X.ABILITY_LIBRARY[n].summary);

console.log('\nGroup 1: keyword MERCENARY');
const g = X.KEYWORD_GLOSSARY.find(e => e.key === 'MERCENARY') || {};
ok(g.type === 'Efecto' && /abril 2026/.test(g.src || '') && /Concentrated Attack/.test(g.text || '') && /Battlekit/.test(g.text || ''), 'glosario: MERCENARY (Efecto, beta abril 2026)');
ok(X.DATA.mercenaries.every(m => m.keywords[0] === 'MERCENARY'), 'todos los mercenarios empiezan por MERCENARY');

console.log('\nGroup 2: keywords, contratación y coste');
ok(kw('combat-biologist') === 'MERCENARY, NEGATE FEAR' && merc('combat-biologist').hiredBy.join() === 'new-antioch,iron-sultanate', 'Combat Biologist: NA y SULTANATE');
ok(kw('antitank-comm') === 'MERCENARY, REGENERATE 1, STRONG, TOUGH' && merc('antitank-comm').hiredBy.join() === 'new-antioch,trench-pilgrims', 'Anti-Tank Hunter: NA y PILGRIM');
ok(kw('mamluk-faris') === 'MERCENARY, FIRETEAM, IGNORE OFF-HAND WEAPON' && merc('mamluk-faris').hiredBy.join() === 'new-antioch,iron-sultanate', 'Mamluk Faris: FIRETEAM (Sworn Brethren)');
ok(kw('ammo-monk') === 'MERCENARY' && merc('ammo-monk').hiredBy.join() === 'new-antioch,trench-pilgrims', 'Ammo Monk: MERCENARY');
ok(kw('observer') === 'MERCENARY' && merc('observer').cost === 5 && merc('observer').currency === '☼', 'Observer: 5 ☼');
ok(kw('st-cosmas') === 'MERCENARY, NEGATE FEAR' && merc('st-cosmas').hiredBy.join() === 'trench-pilgrims', 'Sister of Saint Cosmas: PILGRIM');
ok(kw('sin-eater') === 'MERCENARY, DEMONIC, FEAR, STRONG, TOUGH', 'Sin Eater: MERCENARY, DEMONIC, FEAR, STRONG, TOUGH');
const sac = X.ABILITY_LIBRARY['Ammunition Sacrament ACTION'].summary;
ok(/IGNORE COVER/.test(sac) && /IGNORE LONG RANGE/.test(sac) && /AUTOMATIC/.test(sac) && /HEAVY/.test(sac) && /un Sacramento a la vez/.test(sac), 'Ammunition Sacrament: Sacramentos nuevos');
const dv = X.ABILITY_LIBRARY['Devour the Guilty ACTION'].summary;
ok(/REGENERATE 1/.test(dv) && /Goetic/.test(dv) && /Purge ACTION/.test(dv), 'Devour the Guilty: texto nuevo (REGENERATE 1, Goetic Spells, Purge ACTION)');

console.log('\nGroup 3: Scripture Guardian');
const sg = merc('scripture-guardian');
ok(sg.cost === 7 && !sg.hiredBy && st('scripture-guardian') === '6"/Infantry · +2 DICE · +1 DICE · -2 · 40mm', 'perfil 6" · +2 · +1 · -2 · 40mm, cualquier banda');
ok(kw('scripture-guardian') === 'MERCENARY, GOLEM' && ab('scripture-guardian') === 'Slow', 'MERCENARY, GOLEM · Slow');
ok((sg.permanentEquipment || []).join() === 'Reinforced Armour,Combat Helmet,Vengeful Scripture', 'siempre Reinforced Armour, Combat Helmet y Vengeful Scripture');
const vs = X.findArmouryItemByName({ factionId: 'new-antioch' }, 'Vengeful Scripture') || {};
ok(vs.type === 'Special' && vs.range === '18"' && (vs.weaponKeywords || []).join() === 'ASSAULT,IGNORE COVER', 'Vengeful Scripture: Special, 18", ASSAULT, IGNORE COVER');
const vsAb = (X.EQUIPMENT_IMPLICIT_ABILITIES['Vengeful Scripture'] || []).map(a => a.name).join();
ok(vsAb === 'Unmaking,Spoken', 'Vengeful Scripture: Unmaking y Spoken');
const wbSG = { factionId: 'new-antioch', models: [] };
const mSG = { uid: 's', unitId: 'scripture-guardian', upgrades: [], battlekit: [] };
wbSG.models.push(mSG);
const NA = X.DATA.factions['new-antioch'].armoury;
const trenchClub = NA.melee.find(i => /Trench Club/.test(i.name));
const rifle = NA.ranged.find(i => /Rifle/.test(i.name));
const armour = NA.armour[0];
ok(X.classifyBattlekitItem(trenchClub, mSG, sg, wbSG).state === 'available', 'selector: armas cuerpo a cuerpo de la armería de la banda');
ok(X.classifyBattlekitItem(rifle, mSG, sg, wbSG).state === 'hidden' && X.classifyBattlekitItem(armour, mSG, sg, wbSG).state === 'hidden', 'selector: nada que no sea Melee Weapon');
mSG.battlekit.push(trenchClub.id);
const c = X.modelCost(mSG, 'new-antioch', wbSG);
ok(c.glory === 7 && c.ducados === trenchClub.cost, 'coste: 7 ☼ + las armas en 👑');
const card = X.buildModelCardData(mSG, { id: 'w', factionId: 'new-antioch', models: [mSG] });
ok(card.weapons.some(w => w.name === 'Vengeful Scripture'), 'la ficha muestra Vengeful Scripture como arma');

console.log('\nGroup 4: Goetic Warlock');
ok(st('goetic-warlock') === '6"/Infantry · +1 DICE · +1 DICE · -2 · 40mm' && merc('goetic-warlock').cost === 4, 'perfil y 4 ☼');
ok(kw('goetic-warlock') === 'MERCENARY, ARTIFICIAL, DEMONIC, FEAR', 'MERCENARY, ARTIFICIAL, DEMONIC, FEAR');
ok(ab('goetic-warlock') === 'Goetic Portal, Necrotic Gaze, Barbed Embrace, Disturbing Presence', 'Goetic Portal, Necrotic Gaze, Barbed Embrace y Disturbing Presence (sin Iron-Clawed Hands ni Goetic Gaze)');
ok((merc('goetic-warlock').permanentEquipment || []).join() === 'Reinforced Armour,Flaying Iron Claws', 'siempre Reinforced Armour y Flaying Iron Claws');
const fic = X.findArmouryItemByName({ factionId: 'heretic-legions' }, 'Flaying Iron Claws') || {};
ok(fic.type === '2-Handed' && fic.range === 'Melee' && (fic.weaponKeywords || []).join() === 'CLEAVE 2,CRITICAL', 'Flaying Iron Claws: 2-Handed, CLEAVE 2, CRITICAL');
ok(/Cost 2/.test(X.ABILITY_LIBRARY['Goetic Portal'].summary) && /Cost 0/.test(X.ABILITY_LIBRARY['Necrotic Gaze'].summary) && /Wretched/.test(X.ABILITY_LIBRARY['Goetic Portal'].summary), 'Goetic Portal (Cost 2) y Necrotic Gaze (Cost 0)');
ok(/Retreat/.test(X.ABILITY_LIBRARY['Barbed Embrace'].summary) && /activa/i.test(X.ABILITY_LIBRARY['Barbed Embrace'].summary) && txt('Disturbing Presence'), 'Barbed Embrace nuevo y Disturbing Presence');

console.log('\nGroup 5: Witchburner');
const wi = merc('witchburner');
ok(wi.cost === 6 && st('witchburner') === '6"/Infantry · +0 DICE · +2 DICE · -2 · 32mm', 'perfil +0 / +2 y 6 ☼');
ok(kw('witchburner') === 'MERCENARY, ELITE, FEAR, TOUGH, NEGATE DIFFICULT TERRAIN, NEGATE FIRE', 'keywords nuevas');
ok(ab('witchburner') === 'Dignified Conduct, Divine Judgement ACTION, Elitist, Found Guilty', 'Dignified Conduct, Divine Judgement, Elitist y Found Guilty');
ok((wi.permanentEquipment || []).join() === 'Reinforced Armour,Combat Helmet,Gavel of Justice', 'siempre Reinforced Armour, Combat Helmet y Gavel of Justice');
const gj = X.findArmouryItemByName({ factionId: 'trench-pilgrims' }, 'Gavel of Justice') || {};
ok(gj.type === '1-Handed' && (gj.weaponKeywords || []).join() === 'CRITICAL,FIRE', 'Gavel of Justice: 1-Handed, CRITICAL, FIRE');
ok(/18"/.test(X.ABILITY_LIBRARY['Divine Judgement ACTION'].summary) && /Down/.test(X.ABILITY_LIBRARY['Divine Judgement ACTION'].summary), 'Divine Judgement: ataque a 18", Out of Action → Down');
ok(/moverlo/.test(X.ABILITY_LIBRARY['Dignified Conduct'].summary) && txt('Elitist') && txt('Found Guilty'), 'textos de Dignified Conduct, Elitist y Found Guilty');

console.log('\nGroup 6: Sin Eater y ficha');
ok((merc('sin-eater').permanentEquipment || []).join() === 'Tenderiser Maul', 'Sin Eater: siempre Tenderiser Maul');
const tm = X.findArmouryItemByName({ factionId: 'black-grail' }, 'Tenderiser Maul') || {};
ok(tm.type === '2-Handed' && (tm.weaponKeywords || []).join() === '+1 INJURY MODIFIER,HEAVY', 'Tenderiser Maul: 2-Handed, +1 INJURY MODIFIER, HEAVY');
ok((X.EQUIPMENT_IMPLICIT_ABILITIES['Tenderiser Maul'] || []).some(a => a.name === 'Mulch'), 'Mulch');
const mWi = { uid: 'w', unitId: 'witchburner', upgrades: [], battlekit: [] };
const alba = { id: 'a', factionId: 'new-antioch', variantId: 'alba', models: [mWi] };
const cw = X.buildModelCardData(mWi, alba);
const names = (cw.abilities || []).map(a => a.name);
ok(!names.includes('Brave') && !names.includes('Rampant Charge'), 'ficha del mercenario sin reglas de variante de la banda');
ok(names.includes('Unmaking') === false && cw.weapons.some(w => w.name === 'Gavel of Justice'), 'ficha: Gavel of Justice como arma');
const mSE = { uid: 'e', unitId: 'sin-eater', upgrades: [], battlekit: [] };
const cse = X.buildModelCardData(mSE, { id: 'b', factionId: 'black-grail', models: [mSE] });
ok((cse.abilities || []).some(a => a.name === 'Mulch'), 'ficha: Mulch del equipo permanente');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);

