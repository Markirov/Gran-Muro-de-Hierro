/* Test subfacciones y variantes: Artillery Witch Battery >= 1000, Cradle Thralls field strength,
 * Sorcerer & Hell Knights free spells, Sin of Envy foreign armoury, etc.
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
let html = fs.readFileSync(path.join(ROOT, 'public', 'app.html'), 'utf8');
const JS_DIR = path.resolve(__dirname, '..', 'public', 'js');
const jsFiles = fs.readdirSync(JS_DIR).filter(f => f.endsWith('.js')).sort();
const js = jsFiles.map(f => fs.readFileSync(path.join(JS_DIR, f), 'utf8')).join('\n');
const bootIdx = js.search(/\nfunction boot\(\)/);
const dom = new JSDOM(html.replace('</body>', '<script>' + js + '</script></body>').replace(/<script[\s\S]*?<\/script>/g, ''), { runScripts: 'outside-only', url: 'http://localhost/' });
dom.window.alert = () => {};
dom.window.eval(js.slice(0, bootIdx) + '\n;window.__X = { DATA, ABILITY_LIBRARY, canAddUnit, getUnit, countFieldStrength, isExemptFromFieldStrength, foreignArmouryItems, findBattlekitItem, getActiveVariant };');
const X = dom.window.__X;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

console.log('\n--- Test 1: Cradle Thralls Field Strength Exemption ---');
const ct = X.getUnit('black-grail', 'cradle-thralls-gh');
ok(ct && ct.exemptFromFieldStrength === true, 'cradle-thralls-gh has exemptFromFieldStrength = true');
ok(X.isExemptFromFieldStrength({ unitId: 'cradle-thralls-gh' }, ct) === true, 'isExemptFromFieldStrength is true for cradle thralls');

const wbBG = {
  factionId: 'black-grail',
  variantId: 'great-hunger',
  models: [
    { uid: 'm1', unitId: 'corpse-guards' },
    { uid: 'm2', unitId: 'cradle-thralls-gh' },
    { uid: 'm3', unitId: 'cradle-thralls-gh' }
  ]
};
ok(X.countFieldStrength(wbBG) === 1, 'countFieldStrength is 1 despite having 3 models because 2 are Cradle Thralls');

console.log('\n--- Test 2: Artillery Witch Battery (>= 1000 👑 limit) ---');
const aw = X.getUnit('heretic-legions', 'art-witch');
ok(aw && aw.limit === '0-1', 'Artillery Witch base limit is 0-1');

// Warband worth under 1000:
const wbHL_low = {
  factionId: 'heretic-legions',
  models: [
    { uid: 'w1', unitId: 'art-witch' },
    { uid: 't1', unitId: 'heretic-troopers' }
  ]
};
ok(!X.canAddUnit(wbHL_low, aw), 'Under 1000 ducats, cannot add 2nd Artillery Witch');

// Warband worth >= 1000:
const wbHL_high = {
  factionId: 'heretic-legions',
  models: [
    { uid: 'w1', unitId: 'art-witch' },
    // 10 Anointed (90 ducats each) = 900 ducats + 100 art-witch = 1000 ducats
    ...Array(10).fill(0).map((_, i) => ({ uid: 'a' + i, unitId: 'anointed', battlekit: [] }))
  ]
};
ok(X.canAddUnit(wbHL_high, aw), 'At >= 1000 ducats, can add 2nd Artillery Witch (limit expands to 0-2)');

// Warband in naval-raiders caps at 1 even if >= 1000:
const wbHL_naval = {
  factionId: 'heretic-legions',
  variantId: 'naval-raiders',
  models: [
    { uid: 'w1', unitId: 'art-witch' },
    ...Array(10).fill(0).map((_, i) => ({ uid: 'a' + i, unitId: 'anointed', battlekit: [] }))
  ]
};
ok(!X.canAddUnit(wbHL_naval, aw), 'In Naval Raiders, Artillery Witch is capped at 0-1 override regardless of value');

console.log('\n--- Test 3: Free Spells in Court of the Seven-Headed Serpent ---');
const sorcerer = X.getUnit('court-serpent', 'sorcerer');
ok(sorcerer && sorcerer.abilities.includes('Blessing of the Serpent Moon ACTION'), 'Sorcerer includes Blessing of the Serpent Moon ACTION');
ok(X.ABILITY_LIBRARY['Blessing of the Serpent Moon ACTION'] && X.ABILITY_LIBRARY['Blessing of the Serpent Moon ACTION'].type === 'action', 'Blessing of the Serpent Moon ACTION in ABILITY_LIBRARY');

const hellKnights = X.getUnit('court-serpent', 'hell-knights');
ok(hellKnights && hellKnights.abilities.includes('Blood Magic'), 'Hell Knights include Blood Magic');
ok(X.ABILITY_LIBRARY['Blood Magic'] && X.ABILITY_LIBRARY['Blood Magic'].type === 'passive', 'Blood Magic in ABILITY_LIBRARY');

console.log('\n--- Test 4: Sin of Envy (Envious Eyes) Foreign Armoury ---');
const wbEnvy = {
  factionId: 'court-serpent',
  variantId: 'sin-envy',
  models: []
};
const envyVariant = X.getActiveVariant(wbEnvy);
ok(envyVariant && Array.isArray(envyVariant.foreignArmoury), 'Sin of Envy has foreignArmoury array');
const fArmouries = X.foreignArmouryItems(wbEnvy);
ok(fArmouries.length >= 5, 'Sin of Envy exposes at least 5 other faction armouries');
const naItems = fArmouries.find(fa => fa.factionId === 'new-antioch');
ok(naItems && naItems.items.some(i => i.id === 'shotgun-na'), 'Envious Eyes allows acquiring New Antioch weapons (Shotgun)');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
