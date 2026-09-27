/* Modo mesa alineado con Rulebook / Warbands 1.0.2.
 * - BLESSING MARKERS e INFECTION MARKERS como contadores 0-6 (no chip).
 * - The Infection Spreads: al activar un modelo con INFECTION MARKERS, +1.
 * - Ficha de bandas Forge (sin Companion) con el motor: stats efectivos
 *   (variante + mejoras), keywords y habilidades efectivas, nombres de
 *   mejoras (no ids), armas por categoría de armería, equipo permanente.
 * - Reglas de variante de toda la banda: sin reglas de una sola unidad.
 * - Chips de efecto según el modelo: AIM con Aim ACTION, MEM con Memento
 *   Mori, FEAR con Warrior's Prayer; CHARGED y OTRO siempre.
 * - Battletracker PDF: filas de BLESSING e INFECTION MARKERS, sin BLES.
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const js = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/)[1];
const bootIdx = js.search(/\nfunction boot\(\)/);
const dom = new JSDOM(html.replace(/<script[\s\S]*?<\/script>/g, ''), { runScripts: 'outside-only', url: 'http://localhost/' });
dom.window.alert = () => {};
dom.window.eval(js.slice(0, bootIdx) + '\n;window.__X = { newTableSession, syncTableSession, getTableModelState, setTableBlessing, setTableInfection, toggleTableActivated, advanceTableTurn, getTableEffectCodes, buildModelCardData, getVariantFactionRules, VARIANT_FACTION_RULES, drawTrackerPanelOnCanvas };');
const X = dom.window.__X;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

console.log('\nGroup 1: marcadores');
const wb0 = { id: 'w0', factionId: 'black-grail', models: [{ uid: 'a', unitId: 'plague-knights', battlekit: [], upgrades: [] }] };
const s = X.newTableSession(wb0);
const d = X.getTableModelState(s, 'a');
ok(d.blessing === 0 && d.infection === 0, 'estado inicial: 0 BLESSING y 0 INFECTION');
X.setTableBlessing(s, 'a', 9); ok(s.models.a.blessing === 6, 'BLESSING máx. 6');
X.setTableBlessing(s, 'a', -1); ok(s.models.a.blessing === 0, 'BLESSING mín. 0');
X.setTableInfection(s, 'a', 7); ok(s.models.a.infection === 6, 'INFECTION máx. 6');
ok(!X.getTableEffectCodes({ abilities: [{ name: 'Aim ACTION' }] }).includes('BLES'), 'BLES ya no es un chip de efecto');

console.log('\nGroup 2: The Infection Spreads');
X.setTableInfection(s, 'a', 2);
X.toggleTableActivated(s, 'a');
ok(s.models.a.infection === 3, 'al activar con INFECTION MARKERS: +1');
X.toggleTableActivated(s, 'a');
ok(s.models.a.infection === 2, 'deshacer la activación lo revierte');
X.setTableInfection(s, 'a', 0);
X.toggleTableActivated(s, 'a');
ok(s.models.a.infection === 0, 'sin INFECTION MARKERS no crece');
X.advanceTableTurn(s);
X.setTableInfection(s, 'a', 6);
X.toggleTableActivated(s, 'a');
ok(s.models.a.infection === 6, 'no pasa de 6');

console.log('\nGroup 3: sesiones antiguas');
const old = { v: 1, warbandId: 'w0', turn: 2, models: { a: { activated: false, blood: 1, status: 'up', effects: ['BLES', 'FEAR'], spent: [] } } };
X.syncTableSession(old, wb0);
ok(old.models.a.blessing === 1 && !old.models.a.effects.includes('BLES') && old.models.a.effects.includes('FEAR') && old.models.a.infection === 0, 'migra el chip BLES a 1 BLESSING MARKER');

console.log('\nGroup 4: ficha de banda Forge');
const ma = { uid: 'm', unitId: 'master-assassin-fid', name: 'Hassan', battlekit: ['bow-alamut-fid', 'khanjar-fid', 'hashashin-leaf-fid'], upgrades: ['thunderbolt-alamut'] };
const wbF = { id: 'w1', factionId: 'iron-sultanate', variantId: 'fidai-alamut', models: [ma] };
const c = X.buildModelCardData(ma, wbF);
ok(c.stats.find(x => x.label === 'MOV').value.startsWith('8'), 'MOV con Thunderbolt of Alamut: 8');
ok(c.weapons.map(w => w.name).join() === 'Bow of Alamut,Golden Khanjar', 'armas por categoría de armería');
ok(c.weapons.find(w => w.name === 'Bow of Alamut').hand === '2H' && c.weapons.find(w => w.name === 'Bow of Alamut').range === '40"', 'arma con manos y alcance');
ok(c.battlekit.map(b => b.name).join() === 'Hashashin Leaf', 'equipo aparte');
const names = c.abilities.map(a => a.name);
ok(names.includes('Temporal Assassin') && names.includes('Thunderbolt of Alamut'), 'habilidades de la unidad y de la mejora');
ok(!names.includes('thunderbolt-alamut'), 'sin ids de mejora');
ok(!names.includes('Whirling Dervish'), 'sin reglas de otras unidades');
const kh = { uid: 'k', unitId: 'heretic-priest', battlekit: [], upgrades: [] };
const cK = X.buildModelCardData(kh, { id: 'w2', factionId: 'heretic-legions', variantId: 'avarice-knights', models: [kh] });
ok(cK.abilities.some(a => a.name === 'Price of Greed ACTION') && !cK.abilities.some(a => a.name === 'Puppet Master ACTION'), 'variante: Price of Greed en vez de Puppet Master');
const tg = { uid: 't', unitId: 'heretic-troopers', battlekit: [], upgrades: [] };
const cT = X.buildModelCardData(tg, { id: 'w3', factionId: 'heretic-legions', variantId: 'trench-ghosts', models: [tg] });
ok(['FEAR', 'NEGATE GAS'].every(k => cT.abilities.some(a => a.name === k)), 'variante: keywords de Undead Horror');
const an = { uid: 'x', unitId: 'anointed', battlekit: [], upgrades: [] };
const cA = X.buildModelCardData(an, { id: 'w4', factionId: 'heretic-legions', models: [an] });
ok(cA.battlekit.some(b => b.name === 'Reinforced Armour') && cA.battlekit.some(b => b.name === 'Infernal Brand'), 'equipo permanente en la ficha');

console.log('\nGroup 5: reglas de toda la banda');
const unitOnly = ['Whirling Dervish', 'Lector', 'Loose Formation', 'Rapid Assault', 'Blood of the Lamb', "Hegemon's Will"];
const all = Object.values(X.VARIANT_FACTION_RULES).flat().map(r => r.name);
ok(!unitOnly.some(n => all.includes(n)), 'sin reglas de una sola unidad (' + unitOnly.join(', ') + ')');

console.log('\nGroup 6: chips de efecto según el modelo');
const codes = (abs) => X.getTableEffectCodes({ abilities: abs.map(n => ({ name: n })) }).join();
ok(codes([]) === 'CHARGED,OTRO', 'modelo sin reglas de efecto: CHARGED y OTRO');
ok(codes(['Aim ACTION']) === 'AIM,CHARGED,OTRO', 'Aim ACTION → AIM');
ok(codes(['Memento Mori']) === 'MEM,CHARGED,OTRO', 'Memento Mori → MEM');
ok(codes(["Warrior's Prayer ACTION"]) === 'FEAR,CHARGED,OTRO', "Warrior's Prayer → FEAR hasta fin de turno");
ok(X.getTableEffectCodes({ abilities: [], hasElementalMastery: true }).join() === 'CHARGED,OTRO,FIRE,GAS,SHRAPNEL', 'Mastery of the Elements añade FIRE, GAS, SHRAPNEL');
const sp = { uid: 's', unitId: 'sniper-priests', battlekit: [], upgrades: [] };
ok(X.getTableEffectCodes(X.buildModelCardData(sp, { id: 'w5', factionId: 'new-antioch', models: [sp] })).includes('AIM'), 'Sniper Priest real: AIM');
const wp = { uid: 'p', unitId: 'war-prophet', battlekit: [], upgrades: [] };
const cWP = X.getTableEffectCodes(X.buildModelCardData(wp, { id: 'w6', factionId: 'trench-pilgrims', models: [wp] }));
ok(cWP.includes('MEM') && !cWP.includes('AIM'), 'War Prophet real: MEM sin AIM');

console.log('\nGroup 7: battletracker PDF');
function panelTexts(card) {
  const texts = [];
  const ctx = new Proxy({}, { get: (t, k) => k === 'fillText' ? (txt) => texts.push(txt) : (k in t ? t[k] : () => ({ width: 10 })), set: (t, k, v) => { t[k] = v; return true; } });
  X.drawTrackerPanelOnCanvas(ctx, 0, 0, 1000, 1160, card);
  return texts;
}
const tPlain = panelTexts(X.buildModelCardData(an, { id: 'w4', factionId: 'heretic-legions', models: [an] }));
ok(tPlain.includes('BLESSING MARKERS') && tPlain.includes('INFECTION MARKERS'), 'filas de BLESSING e INFECTION MARKERS');
ok(!tPlain.includes('BLES'), 'sin casilla BLES');
ok(!tPlain.includes('AIM') && tPlain.includes('CHARGED') && tPlain.includes('OTRO'), 'efectos filtrados por modelo');
const tSP = panelTexts(X.buildModelCardData(sp, { id: 'w5', factionId: 'new-antioch', models: [sp] }));
ok(tSP.includes('AIM'), 'Sniper Priest: AIM en el PDF');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
