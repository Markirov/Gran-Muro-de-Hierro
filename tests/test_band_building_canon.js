/* Creación de bandas frente al Rulebook y Warbands of Trench Crusade 1.0.2:
 * Battlekit Limits (CUMBERSOME + STRONG, HELD), máximo 6 ELITE y
 * mercenarios (0-1, facciones que pueden contratarlos).
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
dom.window.eval(js.slice(0, bootIdx) + '\n;window.__X = { DATA, classifyBattlekitItem, findBattlekitItem, canAddUnit, canAddUnitWithWarning, getUnit };');
const X = dom.window.__X;
const { DATA } = X;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

const NA = 'new-antioch';
const wbOf = (factionId, models = []) => ({ factionId, variantId: null, models });
const item = (id) => X.findBattlekitItem(NA, id);
const naUnits = DATA.factions[NA].units;
const troop = naUnits.find(u => u.tier === 'troops' && !(u.battlekitAccess && (u.battlekitAccess.weaponLimits || u.battlekitAccess.forbidden)));
const strongTroop = Object.assign({}, troop, { keywords: (troop.keywords || []).concat('STRONG') });
const state = (it, bk, unit = troop) => {
  const model = { uid: 'm1', unitId: unit.id, battlekit: bk };
  const wb = wbOf(NA, [model]);
  return X.classifyBattlekitItem(it, model, unit, wb).state;
};

console.log('\nGroup 1: CUMBERSOME ignora STRONG');
ok(state(item('sword-na'), ['great-hammer-na'], strongTroop) === 'available', 'STRONG: Great Hammer (2H) + Sword/Axe permitido');
ok(state(item('sword-na'), ['polearm-na'], strongTroop) === 'disabled', 'STRONG: Polearm (CUMBERSOME) + Sword/Axe bloqueado');
ok(state(item('polearm-na'), ['sword-na'], strongTroop) === 'disabled', 'STRONG: Sword/Axe + Polearm (CUMBERSOME) bloqueado');

console.log('\nGroup 2: HELD = un arma 1H o un escudo');
const pistol = DATA.factions[NA].armoury.ranged.find(i => i.type === '1-Handed' && !i.restriction);
ok(state(item('sword-na'), ['music-na']) === 'available', 'HELD + 1 arma 1H permitido');
ok(state(item('sword-na'), ['music-na', 'sword-na']) !== 'available', 'HELD + 2 armas 1H melee bloqueado');
ok(!pistol || state(pistol, ['music-na', 'sword-na']) === 'disabled', 'HELD + arma melee + arma a distancia bloqueado');
ok(state(item('music-na'), ['sword-na', pistol ? pistol.id : 'sword-na']) === 'disabled', 'Añadir HELD con 2 armas ya equipadas bloqueado');

console.log('\nGroup 3: máximo 6 ELITE');
const elite = naUnits.find(u => u.tier === 'elite' && !(u.limit && /^1$|^0-1$/.test(u.limit)) ) || naUnits.find(u => u.tier === 'elite');
const eliteUnlimited = Object.assign({}, elite, { limit: null });
const sixElites = Array.from({ length: 6 }, (_, i) => ({ uid: 'e' + i, unitId: elite.id, battlekit: [] }));
ok(!X.canAddUnit(wbOf(NA, sixElites), eliteUnlimited), 'con 6 ELITE no se puede reclutar un 7.º');
ok(X.canAddUnit(wbOf(NA, sixElites.slice(0, 5)), eliteUnlimited), 'con 5 ELITE sí');
ok(X.canAddUnitWithWarning(wbOf(NA, sixElites), eliteUnlimited).canAdd === false, 'canAddUnitWithWarning también bloquea el 7.º ELITE');

console.log('\nGroup 4: mercenarios');
const M = Object.fromEntries(DATA.mercenaries.map(m => [m.id, m]));
DATA.mercenaries.forEach(m => ok(m.limit === '0-1', m.name + ': 0-1'));
const can = (fid, mid, models = []) => X.canAddUnit(wbOf(fid, models), M[mid]);
ok(can('new-antioch', 'combat-biologist') && can('iron-sultanate', 'combat-biologist') && !can('trench-pilgrims', 'combat-biologist'), 'Combat Biologist: New Antioch e Iron Sultanate');
ok(can('trench-pilgrims', 'antitank-comm') && !can('iron-sultanate', 'antitank-comm'), 'Anti-Tank Hunter: New Antioch y Trench Pilgrims');
ok(can('heretic-legions', 'goetic-warlock') && can('court-serpent', 'goetic-warlock') && !can('black-grail', 'goetic-warlock'), 'Goetic Warlock: Heretic Legions y The Court');
ok(can('iron-sultanate', 'mamluk-faris') && !can('heretic-legions', 'mamluk-faris'), 'Mamluk Faris: New Antioch e Iron Sultanate');
ok(can('trench-pilgrims', 'ammo-monk') && !can('black-grail', 'ammo-monk'), 'Ammo Monk: New Antioch y Trench Pilgrims');
ok(can('trench-pilgrims', 'observer') && !can('iron-sultanate', 'observer'), 'Observer: New Antioch y Trench Pilgrims');
ok(['new-antioch', 'trench-pilgrims', 'iron-sultanate', 'heretic-legions', 'black-grail', 'court-serpent'].every(f => can(f, 'scripture-guardian')), 'Scripture Guardian: cualquier banda');
ok(can('black-grail', 'sin-eater') && can('heretic-legions', 'sin-eater') && !can('new-antioch', 'sin-eater'), 'Sin Eater: bandas Fallen');
ok(can('trench-pilgrims', 'st-cosmas') && !can('new-antioch', 'st-cosmas'), 'Sister of Saint Cosmas: solo Trench Pilgrims');
ok(can('new-antioch', 'witchburner') && !can('court-serpent', 'witchburner'), 'Witchburner: New Antioch y Trench Pilgrims');
ok(!can('new-antioch', 'observer', [{ uid: 'o', unitId: 'observer', battlekit: [] }]), 'segundo Observer bloqueado (0-1)');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
