/* Glosario canon de keywords (2026-09-26, petición de Marcos).
 * Fuente: Keyword Glossary de Trench-Crusade-Digital-Rulebook-1.0.1.pdf
 * (pp.52-57) + erratas de Changelog-1.0.2.pdf + Rules-Commentaries-1.0.2.pdf.
 * `text` = versión vigente (1.0.1 + erratas 1.0.2); `prev` = texto 1.0.1 si
 * cambió (null si la keyword es nueva en 1.0.2). Textos en español, resumidos.
 * El glosario manda: modo mesa, tooltips y tarjetas leen de él.
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
W.eval(js.slice(0, bootIdx) + '\n;window.__lib = { DATA, WEAPON_KEYWORD_LIBRARY, KEYWORD_LIBRARY,' +
  ' KEYWORD_GLOSSARY: typeof KEYWORD_GLOSSARY !== "undefined" ? KEYWORD_GLOSSARY : null,' +
  ' glossaryEntryFor: typeof glossaryEntryFor === "function" ? glossaryEntryFor : null, lookupRuleText };');
const L = W.__lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
if (!L.KEYWORD_GLOSSARY || !L.glossaryEntryFor) { console.log('  ✗ faltan KEYWORD_GLOSSARY / glossaryEntryFor'); process.exit(1); }
const G = L.KEYWORD_GLOSSARY;
const byKey = (k) => G.find(e => e.key === k);
const T = (k) => L.lookupRuleText(k);

console.log('\nGroup 1: cobertura del Keyword Glossary 1.0.1 + nuevas de 1.0.2');
const V101 = ['+/- DICE', '+/- INJURY DICE', '+/- INJURY MODIFIER', 'ACTION', 'ARMOUR PIERCING', 'ARTIFICIAL', 'ASSAULT',
  'AUTOMATIC (X)', 'BLACK GRAIL', 'BLAST (X")', 'BLESSED X', 'BLESSING MARKER', 'BLOCK', 'BLOOD MARKER', 'CONSUMABLE',
  'COVER', 'CRITICAL', 'CUMBERSOME', 'DEMONIC', 'ELITE', 'FEAR', 'FIRE', 'FIRETEAM', 'FLAMETHROWER', 'GAS', 'GOLEM',
  'HEAVY', 'HERETIC', 'HELD', 'IGNORE ARMOUR', 'IGNORE [MODIFIER]', 'IMPERVIOUS', 'INFECTION MARKERS', 'INFILTRATOR',
  'LEADER', 'NEW ANTIOCH', 'NEGATE [KEYWORD]', 'PILGRIM', 'PISTOL', 'RELOAD', 'RISKY', 'SCATTER', 'SHOTGUN', 'SHRAPNEL',
  'SKIRMISHER', 'STRONG', 'SULTANATE', 'THE COURT', 'TOUGH'];
const NEW102 = ['AMMUNITION (X)', 'CLEAVE (X)', 'DANGEROUS TERRAIN', 'DEADLY', 'DEPLOYABLE', 'DIFFICULT TERRAIN', 'FLYING',
  'IMPASSABLE TERRAIN', 'MINED', 'REGENERATE (X)'];
ok(V101.every(k => byKey(k)), 'las 49 keywords de 1.0.1 (' + V101.filter(k => !byKey(k)).join(', ') + ')');
ok(NEW102.every(k => byKey(k) && byKey(k).prev === null), 'las 10 nuevas de 1.0.2 marcadas prev = null (' +
  NEW102.filter(k => !byKey(k) || byKey(k).prev !== null).join(', ') + ')');
ok(V101.every(k => byKey(k) && byKey(k).prev !== null), 'las de 1.0.1 no están marcadas como nuevas');
ok(G.every(e => /^(Efecto|Etiqueta)$/.test(e.type) && e.text.length > 15 && e.src), 'tipo, texto y fuente en todas');
const CHANGED = ['ARMOUR PIERCING', 'AUTOMATIC (X)', 'BLAST (X")', 'FIRETEAM', 'RISKY', 'SCATTER', 'SKIRMISHER', 'STRONG'];
ok(CHANGED.every(k => typeof byKey(k).prev === 'string' && byKey(k).prev !== byKey(k).text),
   'las cambiadas por el Changelog 1.0.2 guardan su texto 1.0.1 (' + CHANGED.filter(k => typeof byKey(k).prev !== 'string').join(', ') + ')');

console.log('\nGroup 2: efectos canon (antes mal descritos en la app)');
ok(/3D6/.test(T('DEADLY')), 'DEADLY: Injury Roll con 3D6');
ok(/3D6/.test(T('DEADLY 1')), 'DEADLY 1 → misma regla');
ok(/ataques cuerpo a cuerpo/.test(T('CLEAVE 2')) && /X = 2/.test(T('CLEAVE 2')), 'CLEAVE 2: X ataques cuerpo a cuerpo (X = 2)');
ok(/BLOOD MARKER extra/.test(T('FIRE')) && /BLOOD MARKER extra/.test(T('GAS')) && /BLOOD MARKER extra/.test(T('SHRAPNEL')),
   'FIRE / GAS / SHRAPNEL: 1 BLOOD MARKER extra');
ok(/Out of Action/.test(T('TOUGH')) && /Down/.test(T('TOUGH')), 'TOUGH: primer Out of Action → Down');
ok(/activación termina/.test(T('RELOAD')), 'RELOAD: termina la activación');
ok(/automátic/.test(T('FLAMETHROWER')) && /Critical/.test(T('FLAMETHROWER')), 'FLAMETHROWER: éxito automático, sin Critical');
ok(/-1 DICE/.test(T('FEAR')) && /inmunes/.test(T('FEAR')), 'FEAR: -1 DICE en cuerpo a cuerpo; inmunes entre sí');
ok(/HEAVY/.test(T('STRONG')) && /2 manos/.test(T('STRONG')), 'STRONG: ignora HEAVY y arma de 2 manos a 1');
ok(/Long Range/.test(T('SHOTGUN')) && /-1 INJURY DICE/.test(T('SHOTGUN')), 'SHOTGUN: -1 INJURY DICE a Long Range');
ok(/automáticamente|Success automático/.test(T('FLAMETHROWER')), 'FLAMETHROWER sin Success Roll');
ok(/2"/.test(T('BLAST 2"')) && /radio/.test(T('BLAST 2"')), 'BLAST 2" usa la regla BLAST con X = 2"');
ok(/Cover/.test(T('IGNORE COVER')) && /Long Range/.test(T('IGNORE LONG RANGE')), 'IGNORE X usa IGNORE [MODIFIER]');
ok(/FIRE/.test(T('NEGATE FIRE')) && /Efecto/.test(T('NEGATE FIRE')), 'NEGATE X usa NEGATE [KEYWORD]');
ok(T('ARMOUR-PIERCING') === T('ARMOUR PIERCING'), 'ARMOUR-PIERCING con guion = ARMOUR PIERCING');
ok(/-1 DICE/.test(T('+1 DICE')) === false && /Success Roll/.test(T('+1 DICE')), '+1 DICE usa +/- DICE');

console.log('\nGroup 3: las librerías de la app leen del glosario');
ok(L.WEAPON_KEYWORD_LIBRARY['CLEAVE 2'].summary === T('CLEAVE 2'), 'WEAPON_KEYWORD_LIBRARY["CLEAVE 2"] sincronizado');
ok(L.WEAPON_KEYWORD_LIBRARY['DEADLY'].summary === T('DEADLY'), 'WEAPON_KEYWORD_LIBRARY["DEADLY"] sincronizado');
ok(L.KEYWORD_LIBRARY['TOUGH'] === T('TOUGH') && L.KEYWORD_LIBRARY['FEAR'] === T('FEAR'), 'KEYWORD_LIBRARY TOUGH / FEAR sincronizados');

console.log('\nGroup 4: reglas especiales de armas corregidas (Warbands of TC)');
ok(/6"/.test(T('High Trajectory')) && !/Line of Sight: el objetivo no necesita/.test(T('High Trajectory')), 'High Trajectory: mínimo 6", no ignora LoS');
ok(/BLAST 3"/.test(T('Overcharge')) && /RELOAD/.test(T('Overcharge')) && /BLOOD MARKER/.test(T('Overcharge')), 'Overcharge completo');
ok(/6"/.test(T('Cloud of Gas')) && /sin Success Roll|no se hace Success Roll/.test(T('Cloud of Gas')), 'Cloud of Gas: todos a 6", sin Success Roll');

ok(/2 manos/.test(T('Shield Combo')) && /ambos/.test(T('Shield Combo')), 'Shield Combo: escudo + arma de 2 manos si ambos la tienen');
ok(/antes de poder comprar/.test(T('Bayonet Lug')), 'Bayonet Lug: requisito para comprar Bayonet');
ok(/no es una estipulación/.test(T('Unique')), 'Unique marcado como etiqueta no canon');

console.log('\nGroup 5: sin keywords huérfanas en armería y modelos');
const used = new Set();
for (const f of Object.values(L.DATA.factions)) {
  for (const items of Object.values(f.armoury || {})) for (const it of items || []) (it.weaponKeywords || []).forEach(k => used.add(k));
  for (const u of (f.units || [])) (u.keywords || []).forEach(k => used.add(k));
}
// Keywords de facción/tipo que no están en los PDF de reglas disponibles (no se inventa texto).
const NO_PDF = new Set(['CAVALRY', 'ALCHEMIST']);
const orphan = [...used].filter(k => !NO_PDF.has(k) && !T(k));
ok(orphan.length === 0, 'toda keyword usada tiene texto (' + (orphan.join(' | ') || 'ninguna') + ')');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
