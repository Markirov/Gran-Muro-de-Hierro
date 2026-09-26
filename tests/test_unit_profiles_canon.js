/* Perfiles de unidades frente a Warbands of Trench Crusade 1.0.2
 * (auditoría 2026-09-26). Solo stats, keywords y base que difieren del PDF;
 * la armadura incluida en el perfil se marca como permanente y bloquea
 * comprar más Armour (mismo patrón que Combat Engineers).
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
dom.window.eval(js.slice(0, bootIdx) + '\n;window.__D = DATA; window.__EIA = EQUIPMENT_IMPLICIT_ABILITIES;');
const D = dom.window.__D;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
const U = (fid, id) => D.factions[fid].units.find(u => u.id === id);
const S = (u) => [u.stats.movement, u.stats.ranged, u.stats.melee, u.stats.armour, u.stats.base].join(' ');

console.log('\nGroup 1: stats y base (Warbands 1.0.2)');
ok(S(U('new-antioch', 'combat-engineers')) === '6"/Infantry +0 DICE +1 DICE -2 25mm', 'Combat Engineers: base 25mm');
ok(S(U('new-antioch', 'combat-medic')) === '6"/Infantry +0 DICE +0 DICE -1 25mm', 'Combat Medic: Armour -1, base 25mm');
ok(S(U('trench-pilgrims', 'pilgrim')) === '6"/Infantry +0 DICE +0 DICE 0 25mm', 'Trench Pilgrim: Melee +0 (el +1 es del Martyr Penitent)');
ok(S(U('iron-sultanate', 'janissaries')) === '6"/Infantry +1 DICE +1 DICE 0 32mm', 'Janissaries: base 32mm');
ok(S(U('heretic-legions', 'heretic-priest')) === '6"/Infantry +2 DICE +2 DICE 0 32mm', 'Heretic Priest: +2 DICE / +2 DICE');
ok(S(U('heretic-legions', 'anointed')) === '6"/Infantry +1 DICE +1 DICE -2 32mm', 'Anointed Heavy Infantry: Armour -2');
ok(U('iron-sultanate', 'janofficer-iw').stats.base === '32mm', 'Janissary Officer (Iron Wall): base 32mm como Janissaries');
ok(U('black-grail', 'hounds-bg').stats.base === '30x60mm', 'Hounds of the Black Grail: base 30x60mm');
ok(U('black-grail', 'heralds').stats.base === '40mm', 'Heralds of Beelzebub: base 40mm');

console.log('\nGroup 2: keywords');
ok(U('heretic-legions', 'heretic-priest').keywords.join() === 'HERETIC,ELITE,LEADER,TOUGH', 'Heretic Priest: TOUGH');

console.log('\nGroup 3: armadura incluida en el perfil');
const medic = U('new-antioch', 'combat-medic');
ok((medic.permanentEquipment || []).join() === 'Standard Armour,Gas Mask,Medi-kit,Misericordia', 'Combat Medic: Standard Armour, Gas Mask, Medi-kit, Misericordia');
ok(((medic.battlekitAccess || {}).forbidCategories || []).includes('armour'), 'Combat Medic: no compra Armour');
const ano = U('heretic-legions', 'anointed');
ok((ano.permanentEquipment || []).join() === 'Reinforced Armour,Infernal Brand', 'Anointed: Reinforced Armour + Infernal Brand');
ok(!((ano.battlekitAccess || {}).forbidCategories || []).includes('armour'), 'Anointed: puede comprar más Battlekit (el PDF no lo prohíbe)');

console.log('\nGroup 4: armería sin perfil emparejado en la auditoría');
const arm = (fid, id) => Object.values(D.factions[fid].armoury).flat().find(i => i.id === id);
const ac = arm('trench-pilgrims', 'autocannon-anchor');
ok(ac.type === '2-Handed', 'Autocannon: 2-Handed');
ok(ac.weaponKeywords.join() === '+1 INJURY DICE,AUTOMATIC 3,HEAVY', 'Autocannon: perfil Bursts');
ok(/Full Auto/.test(ac.note || '') && /AUTOMATIC 5/.test(ac.note || '') && /RELOAD/.test(ac.note || '') && /RISKY/.test(ac.note || ''),
   'Autocannon: perfil Full Auto en la nota');
const bird = dom.window.__EIA['Takwin Anqā Bird'];
ok(bird && bird[0].name === 'Cause Confusion' && /Risky/.test(bird[0].desc) && /retirada|retirarse/.test(bird[0].desc),
   'Takwin Anqā Bird: Cause Confusion');

console.log('\nGroup 5: Defenders of the Iron Wall (Warbands 1.0.2)');
const isArm = (id) => arm('iron-sultanate', id);
const kal = isArm('iron-shield-iw');
ok(kal.name === 'Iron Wall Kalkan' && kal.type === 'Shield' && kal.weaponKeywords.join() === 'COVER',
   'Iron Shield → Iron Wall Kalkan: Shield con COVER');
ok(/Othismos/.test(kal.note) && /40mm/.test(kal.note) && !/obstáculo defendido/.test(kal.note), 'Kalkan: regla Othismos');
const ban = isArm('banner-desert-wind-iw');
ok(/Sandstorm/.test(ban.note) && /24"/.test(ban.note) && /-1|restan? 1/.test(ban.note) && !/Flying/.test(ban.note),
   'Banner of Desert Wind: Sandstorm (-1 Movement a 24")');
const anq = isArm('anq-guard-iw');
ok(/40mm/.test(anq.note) && /Impassable/.test(anq.note) && anq.restriction === 'Sultanate Sappers only', 'Anq Guard: base 40mm, Impassable, solo Sappers');
const exc = isArm('explosive-charges-iw');
ok(exc.restriction === 'Silahdar & Sultanate Sappers only · Limit: 1' && /Injury Roll con SHRAPNEL/.test(exc.note), 'Explosive Charges: Silahdar y Sappers; Injury Roll con SHRAPNEL');
const sil = U('iron-sultanate', 'silahdar-iw');
ok(/Alaybozan/.test(sil.note) && /Anq Guard/.test(sil.note) && /Explosive Charges/.test(sil.note), 'Silahdar: Alaybozan, Anq Guard y Explosive Charges');
ok(!/ningún otro Janissary/.test(U('iron-sultanate', 'janofficer-iw').note), 'Janissary Officer: sin restricción inventada');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
