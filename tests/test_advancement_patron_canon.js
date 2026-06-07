/* Test suite: Advancement Roll canon data + Patron catalog.
 *
 * Covers:
 *   - PATRON_CATALOG: 8 canon Patrons (Digital Rulebook p.86-93), each
 *     with 6 skills + faction restrictions.
 *   - patronsForFaction / patronById helpers.
 *   - Skill Tables (Melee/Ranged/Stealth/Wildcard) canon correctness
 *     (p.106-109): 2 and 12 = Patron Skill, roll 7 = Proficiency, and
 *     a spot-check of canonical skill names per table.
 *
 * The interactive modal (openAdvancementRollModal) is DOM-driven and not
 * unit-tested here; its data dependencies are what this suite locks down.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_adv_patron.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  PATRON_CATALOG, patronsForFaction, patronById, CAMPAIGN_TABLES,
  resolveAdvancementSkill,
  newWarband: typeof newWarband === 'function' ? newWarband : null,
};
`;
const stub = `
const localStorage = { _d: {}, getItem(k){return this._d[k]||null;}, setItem(k,v){this._d[k]=String(v);}, removeItem(k){delete this._d[k];}, clear(){this._d={};} };
function alert(){}
function fakeEl(){ return { style:{}, classList:{add(){},remove(){},toggle(){},contains(){return false;}}, addEventListener(){}, appendChild(){}, querySelectorAll(){return [];}, querySelector(){return null;}, dataset:{}, innerHTML:'', textContent:'' }; }
const window = { addEventListener(){}, matchMedia(){return {matches:false,addEventListener(){}};}, requestAnimationFrame(){return 0;} };
const document = { addEventListener(){}, querySelectorAll(){return [];}, querySelector(){return fakeEl();}, getElementById(){return fakeEl();}, createElement(){return fakeEl();}, body:fakeEl(), documentElement:fakeEl() };
`;
fs.writeFileSync(TMP, stub + moduleCode);

const lib = require(TMP);
const { PATRON_CATALOG, patronsForFaction, patronById, CAMPAIGN_TABLES,
        resolveAdvancementSkill, newWarband } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: PATRON_CATALOG — 8 canon Patrons', () => {
  const ids = Object.keys(PATRON_CATALOG);
  ok(ids.length === 8, '8 patrons defined');
  const expected = ['temporal-lord','warrior-saint','learned-saint','infernal-noble',
                    'sublime-gate','order-of-the-fly','mammon','antipope-of-avignon'];
  for (const id of expected) ok(!!PATRON_CATALOG[id], `patron ${id} present`);
});

group('Group 2: each Patron has 6 skills + valid factions', () => {
  for (const [id, p] of Object.entries(PATRON_CATALOG)) {
    ok(Array.isArray(p.skills) && p.skills.length === 6, `${id} has 6 skills`);
    ok(Array.isArray(p.factions) && p.factions.length >= 1, `${id} has faction restriction`);
    ok(p.skills.every(s => s.name && s.summary), `${id} skills have name+summary`);
  }
});

group('Group 3: faction restrictions match canon', () => {
  ok(PATRON_CATALOG['temporal-lord'].factions.join() === 'new-antioch', 'Temporal Lord = NA only');
  ok(PATRON_CATALOG['sublime-gate'].factions.join() === 'iron-sultanate', 'Sublime Gate = IS only');
  ok(PATRON_CATALOG['warrior-saint'].factions.includes('trench-pilgrims') &&
     PATRON_CATALOG['warrior-saint'].factions.includes('new-antioch'), 'Warrior Saint = TP + NA');
  ok(PATRON_CATALOG['infernal-noble'].factions.includes('heretic-legions') &&
     PATRON_CATALOG['infernal-noble'].factions.includes('court-serpent'), 'Infernal Noble = HL + Court');
  ok(PATRON_CATALOG['antipope-of-avignon'].factions.join() === 'black-grail', 'Antipope = BG only');
});

/* ------------------------------------------------------------------ */
group('Group 4: patronsForFaction', () => {
  const na = patronsForFaction('new-antioch').map(p => p.id).sort();
  ok(na.join() === ['temporal-lord','warrior-saint','learned-saint'].sort().join(),
     'New Antioch → Temporal Lord, Warrior Saint, Learned Saint');
  const is = patronsForFaction('iron-sultanate').map(p => p.id);
  ok(is.length === 1 && is[0] === 'sublime-gate', 'Iron Sultanate → Sublime Gate only');
  const bg = patronsForFaction('black-grail').map(p => p.id).sort();
  ok(bg.join() === ['order-of-the-fly','antipope-of-avignon'].sort().join(),
     'Black Grail → Order of the Fly + Antipope');
  const court = patronsForFaction('court-serpent').map(p => p.id).sort();
  ok(court.join() === ['infernal-noble','mammon'].sort().join(),
     'Court → Infernal Noble + Mammon');
  ok(patronsForFaction(null).length === 0, 'null faction → empty');
  ok(patronsForFaction('nonexistent').length === 0, 'unknown faction → empty');
});

group('Group 5: patronById', () => {
  ok(patronById('mammon').name === 'Mammon', 'mammon → Mammon');
  ok(patronById('nope') === null, 'unknown → null');
  ok(patronById(null) === null, 'null → null');
});

/* ------------------------------------------------------------------ */
group('Group 6: Skill Tables canon (p.106-109)', () => {
  const tbls = CAMPAIGN_TABLES.skillTables;
  ok(!!tbls.melee && !!tbls.ranged && !!tbls.stealth && !!tbls.wildcard, '4 tables present');
  for (const [id, t] of Object.entries(tbls)) {
    const rolls = t.entries.map(e => e.roll);
    // 2..12 inclusive
    for (let r = 2; r <= 12; r++) ok(rolls.includes(r), `${id} has roll ${r}`);
    const get = (r) => t.entries.find(e => e.roll === r);
    ok(get(2).name === 'Patron Skill', `${id} roll 2 = Patron Skill`);
    ok(get(12).name === 'Patron Skill', `${id} roll 12 = Patron Skill`);
  }
});

group('Group 7: canonical skill names spot-check', () => {
  const get = (tbl, r) => CAMPAIGN_TABLES.skillTables[tbl].entries.find(e => e.roll === r);
  ok(get('melee', 7).name === 'Melee Proficiency', 'Melee 7 = Melee Proficiency');
  ok(get('melee', 7).mechanicalEffect === 'melee+1', 'Melee Proficiency = melee+1');
  ok(get('ranged', 7).name === 'Ranged Proficiency', 'Ranged 7 = Ranged Proficiency');
  ok(get('ranged', 7).mechanicalEffect === 'ranged+1', 'Ranged Proficiency = ranged+1');
  ok(get('stealth', 11).name === 'Dodge', 'Stealth 11 = Dodge');
  ok(get('wildcard', 11).name === 'War Stories', 'Wildcard 11 = War Stories');
  ok(get('wildcard', 3).name === 'War-Luck', 'Wildcard 3 = War-Luck');
  ok(get('wildcard', 8).name === 'Show Off', 'Wildcard 8 = Show Off');
  ok(get('wildcard', 10).name === 'Glory Hound', 'Wildcard 10 = Glory Hound');
  ok(get('melee', 8).name === 'Strength of Samson', 'Melee 8 = Strength of Samson');
  ok(get('melee', 8).mechanicalEffect === 'gain-keyword:STRONG', 'Samson grants STRONG');
});

/* ------------------------------------------------------------------ */
group('Group 8: resolveAdvancementSkill — skip-rule + Patron gating', () => {
  // Normal roll, nothing known → returns the rolled skill.
  ok(resolveAdvancementSkill('melee', 7, [], true).name === 'Melee Proficiency',
     'roll 7 melee → Melee Proficiency');

  // Known skill → skips to next lower non-Patron.
  const r = resolveAdvancementSkill('melee', 7, ['Melee Proficiency'], true);
  ok(r.name !== 'Melee Proficiency' && r.name !== 'Patron Skill', 'known → skips to another skill');

  // Patron allowed: roll 2/12 returns the Patron Skill entry.
  ok(resolveAdvancementSkill('ranged', 2, [], true).name === 'Patron Skill',
     'roll 2, patron allowed → Patron Skill');
  ok(resolveAdvancementSkill('ranged', 12, [], true).name === 'Patron Skill',
     'roll 12, patron allowed → Patron Skill');

  // Patron blocked (free): roll 2/12 skips to a non-Patron skill.
  const lo = resolveAdvancementSkill('ranged', 2, [], false);
  ok(lo && lo.name !== 'Patron Skill', 'roll 2, free → skipped to non-Patron skill');
  const hi = resolveAdvancementSkill('ranged', 12, [], false);
  ok(hi && hi.name !== 'Patron Skill', 'roll 12, free → skipped to non-Patron skill');

  // Default (no flag) allows Patron.
  ok(resolveAdvancementSkill('stealth', 2, []).name === 'Patron Skill',
     'default → Patron allowed');

  // Unknown table → null.
  ok(resolveAdvancementSkill('nope', 7, [], true) === null, 'unknown table → null');
});

group('Group 9: newWarband carries patronId', () => {
  if (!newWarband) { ok(false, 'newWarband exported'); return; }
  const wb = newWarband('new-antioch');
  ok(wb.patronId === null, 'new warband patronId = null');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
