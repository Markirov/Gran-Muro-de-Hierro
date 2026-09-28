/* The House of Wisdom (Warbands 1.0.2): reglas de creación de banda.
 * Alchemists (1-2, Alchemist Armour Limit 2), Kavasses (hasta 3, pierden
 * Light Skirmisher), Noble Guardians (0-2 Fāris ELITE con la entrada de
 * Janissary), Pride of Jabir (0-3 Lions), Secrets of the House of Wisdom
 * (uno por Alchemist, sin repetir) y su armería (Elixir of Al-Khidr, Fire Shield).
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
dom.window.eval(js.slice(0, bootIdx) + '\n;window.__X = { DATA, classifyBattlekitItem, findBattlekitItem, getUnit, getUnitWithVariant, allAvailableUpgrades, canAddUnit, unitsAvailableForWarband, armouryItemsForWarband, classifyUpgrade: typeof classifyUpgrade === "function" ? classifyUpgrade : null, lookupRuleText, checkUpgradeLegality };');
const X = dom.window.__X;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

const IS = 'iron-sultanate';
const HOW = (models = []) => ({ factionId: IS, variantId: 'house-wisdom', models });
const BASE = (models = []) => ({ factionId: IS, variantId: null, models });
const M = (unitId, extra = {}) => Object.assign({ uid: unitId + Math.random(), unitId, battlekit: [], upgrades: [] }, extra);
const unitIn = (wb, id) => X.getUnitWithVariant(wb, id);
function state(wb, model, itemId) {
  const w = Object.assign({}, wb, { models: wb.models.includes(model) ? wb.models : wb.models.concat(model) });
  const item = X.findBattlekitItem(IS, itemId, w);
  return item ? X.classifyBattlekitItem(item, model, X.getUnit(IS, model.unitId), w).state : 'missing';
}
const upState = (wb, model, upId) => {
  const unit = X.getUnit(IS, model.unitId);
  const up = X.allAvailableUpgrades(unit, wb).find(u => u.id === upId);
  if (!up) return 'missing';
  return X.classifyUpgrade ? X.classifyUpgrade(up, model, unit, wb).state : 'no-fn';
};

console.log('\nGroup 1: unidades y límites');
const alch1 = M('jabirean');
ok(X.canAddUnit(HOW([alch1]), unitIn(HOW([alch1]), 'jabirean')), 'Alchemists: se puede reclutar un 2.º Jabirean');
ok(!X.canAddUnit(HOW([alch1, M('jabirean')]), unitIn(HOW(), 'jabirean')), 'Alchemists: no un 3.º');
ok(!X.canAddUnit(BASE([alch1]), X.getUnit(IS, 'jabirean')), 'Sin variante: Jabirean 0-1');
const lions = [M('lions'), M('lions')];
ok(X.canAddUnit(HOW(lions), unitIn(HOW(), 'lions')), 'Pride of Jabir: 3.er Lion permitido');
ok(!X.canAddUnit(HOW(lions.concat(M('lions'))), unitIn(HOW(), 'lions')), 'Pride of Jabir: no un 4.º');
const faris = X.getUnit(IS, 'faris-how');
ok(faris && faris.variantOnly === 'house-wisdom' && faris.limit === '0-2' && faris.cost === 55, 'Fāris: 0-2, 55 👑, solo House of Wisdom');
ok(faris && faris.keywords.includes('ELITE') && faris.keywords.includes('STRONG') && faris.stats.melee === '+1 DICE', 'Fāris: entrada de Janissary con ELITE');
ok(X.unitsAvailableForWarband(HOW()).some(u => u.id === 'faris-how') && !X.unitsAvailableForWarband(BASE()).some(u => u.id === 'faris-how'), 'Fāris solo en el catálogo de House of Wisdom');

console.log('\nGroup 2: armería');
const a1 = M('jabirean', { battlekit: ['alchemist-armour-is'] });
ok(state(HOW([a1]), M('jabirean'), 'alchemist-armour-is') === 'available', 'Alchemist Armour: Limit 2 (segunda disponible)');
ok(state(BASE([a1]), M('jabirean'), 'alchemist-armour-is') === 'disabled', 'Sin variante: Alchemist Armour Limit 1');
ok(state(HOW(), M('azebs'), 'elixir-how') === 'available', 'Elixir of Al-Khidr disponible');
ok(state(HOW(), M('lions'), 'elixir-how') !== 'available', 'Elixir of Al-Khidr: no para ARTIFICIAL');
ok(state(HOW(), M('azebs'), 'fire-shield-how') === 'available', 'Fire Shield disponible');
ok(state(BASE(), M('azebs'), 'fire-shield-how') === 'hidden', 'Sin variante: sin Fire Shield');
const fire = X.findBattlekitItem(IS, 'fire-shield-how');
ok(fire && fire.cost === 20 && /Shield Combo/.test(fire.restriction) && /Limit: 2/.test(fire.restriction) && fire.weaponKeywords.includes('NEGATE FIRE'), 'Fire Shield: 20 👑, Shield Combo, Limit 2, NEGATE FIRE');

console.log('\nGroup 3: Secrets of the House of Wisdom');
const secrets = { 'how-medicine': 15, 'how-cartography': 20, 'how-takwin-secret': 20, 'how-chemistry': 25, 'how-philosophy': 20 };
const jab = X.getUnit(IS, 'jabirean');
const ups = X.allAvailableUpgrades(jab, HOW());
Object.entries(secrets).forEach(([id, c]) => ok((ups.find(u => u.id === id) || {}).cost === c, id + ': ' + c + ' 👑'));
ok(!X.allAvailableUpgrades(jab, BASE()).some(u => u.id === 'how-medicine'), 'Sin variante: sin Secrets');
const alA = M('jabirean', { upgrades: ['how-medicine'] });
const alB = M('jabirean');
ok(upState(HOW([alA, alB]), alB, 'how-medicine') === 'disabled', 'Un mismo Secret no puede repetirse en la banda');
ok(upState(HOW([alA, alB]), alB, 'how-chemistry') === 'available', 'Otro Secret distinto sí');
ok(state(HOW([alA]), alA, 'medikit-is') !== 'available', 'Medicine: sin Medi-kit');
ok(/School of Medicine/.test(X.lookupRuleText('School of Medicine ACTION')), 'School of Medicine ACTION con texto');

console.log('\nGroup 4: Kavasses');
const kav = [1, 2, 3].map(() => M('azebs', { upgrades: ['kavass'] }));
const az = M('azebs');
ok(upState(HOW(kav.concat(az)), az, 'kavass') === 'disabled', 'Kavass: máximo 3');
ok(upState(HOW(kav.slice(0, 2).concat(az)), az, 'kavass') === 'available', 'Kavass: el 3.º sí');
const azSk = M('azebs', { upgrades: ['azeb-skirmisher'] });
ok(upState(HOW([azSk]), azSk, 'kavass') === 'disabled', 'Kavass pierde Light Skirmisher (incompatibles)');
const k1 = M('azebs', { upgrades: ['kavass'] });
ok(upState(HOW([k1]), k1, 'azeb-skirmisher') === 'disabled', 'Un Kavass no puede comprar Light Skirmisher');

console.log('\nGroup 5: sin Yüzbaşı obligatorio');
ok(!X.checkUpgradeLegality(HOW([M('jabirean')])).some(w => /Yüzbaşı/.test(w)), 'House of Wisdom no exige Yüzbaşı (Private Venture)');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
