/* Términos generales (GENERAL_TERMS_LIBRARY) y estipulaciones de equipo
 * (STIPULATION_LIBRARY) frente al Digital Rulebook 1.0.2 y Warbands of
 * Trench Crusade 1.0.2 (Armoury Stipulations, Machine Armour).
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
dom.window.eval(js.slice(0, bootIdx) + '\n;window.__X = { G: GENERAL_TERMS_LIBRARY, S: STIPULATION_LIBRARY };');
const X = dom.window.__X;
const G = (k) => (X.G[k] && X.G[k].summary) || '';
const S = (k) => (X.S[k] && X.S[k].summary) || '';

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

console.log('\nGroup 1: tiradas');
ok(/2D6/.test(G('Success Roll')) && /7-11/.test(G('Success Roll')) && !/4\+/.test(G('Success Roll')), 'Success Roll: 2D6, 7-11 Success (no "3 dados a 4+")');
ok(/12\+/.test(G('Critical Success')) && /\+1 INJURY DICE/.test(G('Critical Success')) && !/\+2 INJURY DICE/.test(G('Critical Success')), 'Critical Success: 12+ y +1 INJURY DICE');
ok(/termina/.test(G('Risky Success Roll')) && !/un 1 cuenta/.test(G('Risky Success Roll')), 'Risky: al fallar termina la activación');
ok(/6 BLOOD MARKERS/.test(G('Bloodbath Roll')) && /3D6/.test(G('Bloodbath Roll')) && !/Fireteam/.test(G('Bloodbath Roll')), 'Bloodbath: gastar 6 (3 si Down), 3D6');
ok(/2-6/.test(G('Injury Roll')) && /7-8/.test(G('Injury Roll')) && /9\+/.test(G('Injury Roll')) && /-3/.test(G('Injury Roll')), 'Injury Roll: tabla 2-6 / 7-8 / 9+ y máximo -3');
ok(/12"/.test(G('Charge Bonus')) && /D3/.test(G('Charge Bonus')), 'Charge Bonus: D6 hasta 12" de Movement (D3 con Machine Armour)');

console.log('\nGroup 2: estados y ACTIONS');
ok(/-1 DICE/.test(G('Down')) && /\+1 INJURY DICE/.test(G('Down')) && /mitad/.test(G('Down')), 'Down: -1 DICE, +1 INJURY DICE en melee, se levanta con medio Movement');
ok(/Survival Roll|1-2/.test(G('Out of Action')) && /D66/.test(G('Out of Action')) && !/Captured/.test(G('Out of Action')), 'Out of Action: Troops D6 1-2 muere, ELITE Trauma D66');
ok(/Dash/.test(G('Activation')) && /Shoot/.test(G('Activation')) && !/dos acciones de movimiento/.test(G('Activation')), 'Activation: cada ACTION una vez');
ok(/Risky/.test(G('Dash ACTION')) && !/no puede hacer otras acciones/.test(G('Dash ACTION')), 'Dash: Risky, compatible con Move/Charge/Retreat');
ok(/Medi-kit/.test(G('Treat ACTION')) && /Risky/.test(G('Treat ACTION')) && /BLOOD MARKER/.test(G('Treat ACTION')), 'Treat: Risky; retira 1 BLOOD MARKER o levanta a un Down');
ok(/Minor Hit/.test(G('Standfast')) && !/desplazado/.test(G('Standfast')), 'Standfast: Down → Minor Hit');
ok(/40mm/.test(G('Bulky')) && /D3/.test(G('Bulky')), 'Bulky: base 40mm, sin Trench Shield, Charge Bonus D3');
ok(!X.G['FIRE MARKER'], 'FIRE MARKER no existe en 1.0.2');
ok(!/FIRE MARKER/.test(js), 'nadie referencia FIRE MARKER');

console.log('\nGroup 3: estipulaciones');
ok(/final de la partida/.test(S('Consumable')) && /Roster/.test(S('Consumable')), 'Consumable: se retira del Roster al final de la partida en que se usa');
ok(/reponer|reemplaz/.test(S('Limit: N')), 'Limit: se pueden reponer las perdidas');
ok(/Headgear/.test(Object.keys(X.S).join(' ')) && /más de una pieza/.test(S('Headgear')), 'Headgear: una sola pieza');
ok(!/Mercenar/.test(S('ELITE only')), 'ELITE only: sin la exclusión inventada de Mercenarios');
ok(!/integrada/.test(S('Mech. Heavy Inf. only')), 'MHI only: sin "armadura integrada"');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
