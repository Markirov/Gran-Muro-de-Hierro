/* Textos de reglas frente a Warbands of Trench Crusade 1.0.2 y el Digital
 * Rulebook 1.0.2 (revisión completa pedida por Marcos, 2026-09-26).
 * Sin textos vagos ("consultar reglas") ni efectos inventados.
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
dom.window.eval(js.slice(0, bootIdx) + '\n;window.__X = { A: ABILITY_LIBRARY, DATA, lookupRuleText };');
const X = dom.window.__X;
const A = (k) => (X.A[k] && X.A[k].summary) || '';

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

console.log('\nGroup 1: ABILITY_LIBRARY sin textos vagos');
const vague = Object.keys(X.A).filter(k => /consultar|consulta el rulebook|reglas exactas/i.test(A(k)));
ok(vague.length === 0, 'ninguna habilidad remite a "consultar reglas" (' + vague.join(', ') + ')');

console.log('\nGroup 2: habilidades corregidas (Warbands 1.0.2)');
ok(/BLESSING MARKER/.test(A('God is With Us! ACTION')) && /6"/.test(A('God is With Us! ACTION')), 'God is With Us!: 1 BLESSING MARKER a 6"');
ok(!/Risky/.test(A('Set Mine ACTION')) && /\+2 DICE/.test(A('Set Mine ACTION')), 'Set Mine: Success Roll (no Risky) con +2 DICE');
ok(!/\+2 DICE/.test(A('Fortify ACTION')) && /COVER/.test(A('Fortify ACTION')), 'Fortify: Risky sin +2 DICE');
ok(/levantan/.test(A('Enforced Orthodoxy ACTION')) && /\+1 DICE/.test(A('Enforced Orthodoxy ACTION')), 'Enforced Orthodoxy: levanta a los Down a 8"');
ok(/Martyrdom Device/.test(A('Awaited')) && /Morale/.test(A('Awaited')), 'Awaited: no cuenta para Morale');
ok(/\+5/.test(A('Light Skirmishers')), 'Light Skirmishers: +5 cada uno (no gratis)');
ok(!/\+2 DICE/.test(A('Puppet Master ACTION')) && /D6"/.test(A('Puppet Master ACTION')), 'Puppet Master: Risky sin +2, mueve D6"');
ok(/GAS/.test(A('Abiotic Life')), 'Abiotic Life: solo contra GAS');
ok(/ELITE/.test(A('Law of Hell')) && /libertad/.test(A('Law of Hell')), 'Law of Hell: libertad al matar un ELITE');
ok(/Shoot ACTION/.test(A('Six-armed Monstrosity')) && /Off-Hand/.test(A('Six-armed Monstrosity')), 'Six-armed Monstrosity: Shoot y Fight por arma');
ok(/Chainsaw Mouth/.test(A('Assault Beast')) && /RISKY/.test(A('Assault Beast')), 'Assault Beast: dos armas RISKY');
ok(/NEGATE FEAR/.test(A('Iron Capirote')) && /NEGATE SHRAPNEL/.test(A('Iron Capirote')), 'Iron Capirote: NEGATE FEAR y NEGATE SHRAPNEL');
ok(!/cuerpo a cuerpo/.test(A('Mubarizun')), 'Mubarizun: todos sus ataques, no solo cuerpo a cuerpo');
ok(['Wrath', 'Envy', 'Lust', 'Pride', 'Sloth', 'Gluttony', 'Greed'].every(p => A('Demonic Aura').includes(p)), 'Demonic Aura: los 7 Pecados');
ok(/Bullet of the Guided Path/.test(A('Ammunition Sacrament ACTION')), 'Ammunition Sacrament: los 3 Sacramentos');
ok(/Climb|trepa/.test(A('Agile')) && /Dash/.test(A('Agile')), 'Agile: Climb, Jump, Diving Charge y Dash');
ok(/Glory/.test(A('Mercenary')) && /facción/.test(A('Mercenary')), 'Mercenary: reglas especiales de mercenarios');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
