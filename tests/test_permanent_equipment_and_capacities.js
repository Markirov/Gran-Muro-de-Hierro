const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Load environment and engines
const loadFile = (rel) => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

eval(loadFile('public/js/01_trench_crusade_game_data.js') + '\nglobal.DATA = DATA;');
eval(loadFile('public/js/02_ability_library.js') + '\nglobal.ABILITY_LIBRARY = ABILITY_LIBRARY;');
eval(loadFile('public/js/03_keyword_glossary_canon_fuente_nica_de_lo.js') + '\nglobal.KEYWORD_GLOSSARY = KEYWORD_GLOSSARY;');
eval(loadFile('public/js/04_keyword_library.js') + '\nglobal.KEYWORD_LIBRARY = KEYWORD_LIBRARY;');
eval(loadFile('public/js/05_weapon_keyword_library.js') + '\nglobal.WEAPON_KEYWORD_LIBRARY = WEAPON_KEYWORD_LIBRARY;');
eval(loadFile('public/js/06_faction_special_rules_library.js') + '\nglobal.FACTION_RULES_LIBRARY = FACTION_RULES_LIBRARY;');
eval(loadFile('public/js/20_cost_calculation.js'));
eval(loadFile('public/js/21_limit_validation.js'));
eval(loadFile('public/js/22_battlekit_legality_engine.js'));

console.log('=== TEST: PERMANENT EQUIPMENT AND CAPACITY CONTAINERS AUDIT ===\n');

// 1. Combat Engineers (New Antioch)
{
  const wb = { factionId: 'new-antioch', models: [] };
  const unit = getUnit('new-antioch', 'combat-engineers');
  const model = { uid: 'ce-1', unitId: 'combat-engineers', battlekit: [] };
  
  const arm = getModelArmourAndShield(model, unit, wb);
  assert(arm.armour, 'Combat Engineers must have armour resolved');
  assert.strictEqual(arm.armour.name, 'Engineer Body Armour');
  assert.strictEqual(arm.armour.isBuiltIn, true);
  console.log('✓ Combat Engineers has built-in Engineer Body Armour');

  const gear = getModelGearAndGrenades(model, unit, wb);
  assert(gear.gear.some(g => g.name === 'Shovel' && g.isBuiltIn), 'Combat Engineers must have built-in Shovel');
  console.log('✓ Combat Engineers has built-in Shovel');

  assert.strictEqual(modelHasCategoryItem(wb, model, 'armour'), true, 'Combat Engineers already has armour');
  console.log('✓ modelHasCategoryItem recognizes built-in armour');
}

// 2. Combat Medic (New Antioch)
{
  const wb = { factionId: 'new-antioch', models: [] };
  const unit = getUnit('new-antioch', 'combat-medic');
  const model = { uid: 'cm-1', unitId: 'combat-medic', battlekit: [] };
  
  const arm = getModelArmourAndShield(model, unit, wb);
  assert(arm.armour && arm.armour.name === 'Standard Armour', 'Combat Medic has Standard Armour');
  assert.strictEqual(arm.armour.isBuiltIn, true);
  console.log('✓ Combat Medic has built-in Standard Armour');

  const mel = getModelMeleeCapacity(model, unit, wb);
  assert(mel.items.some(it => it.name === 'Misericordia' && it.isBuiltIn), 'Combat Medic has built-in Misericordia');
  console.log('✓ Combat Medic has built-in Misericordia in melee capacity');

  const gear = getModelGearAndGrenades(model, unit, wb);
  assert(gear.gear.some(g => g.name === 'Gas Mask' && g.isBuiltIn), 'Combat Medic has built-in Gas Mask');
  assert(gear.gear.some(g => g.name === 'Medi-kit' && g.isBuiltIn), 'Combat Medic has built-in Medi-kit');
  console.log('✓ Combat Medic has built-in Gas Mask and Medi-kit in gear');
}

// 3. Anointed Heavy Infantry (Heretic Legions)
{
  const wb = { factionId: 'heretic-legions', models: [] };
  const unit = getUnit('heretic-legions', 'anointed');
  const model = { uid: 'an-1', unitId: 'anointed', battlekit: [] };
  
  const arm = getModelArmourAndShield(model, unit, wb);
  assert(arm.armour && arm.armour.name === 'Reinforced Armour', 'Anointed has Reinforced Armour');
  assert.strictEqual(arm.armour.isBuiltIn, true);
  assert.strictEqual(modelHasCategoryItem(wb, model, 'armour'), true, 'Anointed already has armour category filled');
  console.log('✓ Anointed Heavy Infantry has built-in Reinforced Armour and blocks duplicate armour');

  const gear = getModelGearAndGrenades(model, unit, wb);
  assert(gear.gear.some(g => g.name === 'Infernal Brand' && g.isBuiltIn), 'Anointed has built-in Infernal Brand');
  console.log('✓ Anointed Heavy Infantry has built-in Infernal Brand');
}

// 4. Hell Knights (Court of the Seven-Headed Serpent)
{
  const wb = { factionId: 'court-serpent', models: [] };
  const unit = getUnit('court-serpent', 'hell-knights');
  const model = { uid: 'hk-1', unitId: 'hell-knights', battlekit: [] };
  
  const arm = getModelArmourAndShield(model, unit, wb);
  assert(arm.armour && arm.armour.name === 'Infernal Iron Armour', 'Hell Knights has Infernal Iron Armour');
  assert.strictEqual(arm.armour.isBuiltIn, true);
  console.log('✓ Hell Knights has built-in Infernal Iron Armour');
}

// 5. Anchorite Shrine (Trench Pilgrims)
{
  const wb = { factionId: 'trench-pilgrims', variantId: 'st-methodius', models: [] };
  const unit = getUnit('trench-pilgrims', 'anchorite-shrine');
  
  // Case A: Default (no ranged weapon) -> Both Catherine Wheel and Bonebreaker Mace
  const modelA = { uid: 'as-1', unitId: 'anchorite-shrine', battlekit: [] };
  const melA = getModelMeleeCapacity(modelA, unit, wb);
  assert.strictEqual(melA.items.length, 2, 'Default Anchorite Shrine has 2 melee weapons');
  assert(melA.items.some(it => it.name === 'Catherine Wheel'), 'Default has Catherine Wheel');
  assert(melA.items.some(it => it.name === 'Bonebreaker Mace'), 'Default has Bonebreaker Mace');
  assert.strictEqual(melA.used, 2, 'Default Anchorite Shrine uses 2 hands');
  assert.strictEqual(melA.max, 2, 'Default Anchorite Shrine max melee hands is 2');
  console.log('✓ Anchorite Shrine with no ranged weapon has Catherine Wheel + Bonebreaker Mace (2 hands)');

  // Case B: Equips Anchorite Ranged weapon (Anti-Materiel Rifle) -> replaces Catherine Wheel
  const modelB = { uid: 'as-2', unitId: 'anchorite-shrine', battlekit: ['anti-mat-rifle-anchor'] };
  const melB = getModelMeleeCapacity(modelB, unit, wb);
  assert.strictEqual(melB.items.length, 1, 'Anchorite Shrine with ranged weapon replaces Catherine Wheel');
  assert.strictEqual(melB.items[0].name, 'Bonebreaker Mace');
  assert.strictEqual(melB.used, 1, 'Only 1 melee hand used (Bonebreaker Mace)');

  const rngB = getModelRangedCapacity(modelB, unit, wb);
  assert.strictEqual(rngB.items.length, 1, 'Anchorite Shrine has Anti-Materiel Rifle in ranged');
  assert.strictEqual(rngB.used, 1, '1 ranged hand used');
  console.log('✓ Anchorite Shrine replaces Catherine Wheel when Anchorite Ranged weapon is equipped');
}

// 6. Artillery Witch (Heretic Legions) & Hunter of Left-Hand Path (Court)
{
  const wbHL = { factionId: 'heretic-legions', models: [] };
  const unitAW = getUnit('heretic-legions', 'art-witch');
  const modelAW = { uid: 'aw-1', unitId: 'art-witch', battlekit: [] };
  const gearAW = getModelGearAndGrenades(modelAW, unitAW, wbHL);
  assert(gearAW.grenades.some(g => g.name === 'Infernal Bombs' && g.isBuiltIn), 'Artillery Witch has built-in Infernal Bombs');
  console.log('✓ Artillery Witch has built-in Infernal Bombs');

  const wbCo = { factionId: 'court-serpent', models: [] };
  const unitHunter = getUnit('court-serpent', 'hunter-lhp');
  const modelHunter = { uid: 'h-1', unitId: 'hunter-lhp', battlekit: [] };
  const rngHunter = getModelRangedCapacity(modelHunter, unitHunter, wbCo);
  assert(rngHunter.items.some(it => it.name === 'Bow of Lethe' && it.isBuiltIn), 'Hunter of LHP has built-in Bow of Lethe');
  console.log('✓ Hunter of Left-Hand Path has built-in Bow of Lethe');
}

// 7. Mercenaries
{
  const wb = { factionId: 'new-antioch', models: [] };
  const unitGW = DATA.mercenaries.find(m => m.id === 'goetic-warlock');
  const modelGW = { uid: 'gw-1', unitId: 'goetic-warlock', battlekit: [] };
  const armGW = getModelArmourAndShield(modelGW, unitGW, wb);
  assert(armGW.armour && armGW.armour.name === 'Reinforced Armour', 'Goetic Warlock has Reinforced Armour');
  const melGW = getModelMeleeCapacity(modelGW, unitGW, wb);
  assert(melGW.items.some(it => it.name === 'Flaying Iron Claws'), 'Goetic Warlock has Flaying Iron Claws');
  console.log('✓ Goetic Warlock has built-in Reinforced Armour and Flaying Iron Claws');

  const unitSG = DATA.mercenaries.find(m => m.id === 'scripture-guardian');
  const modelSG = { uid: 'sg-1', unitId: 'scripture-guardian', battlekit: [] };
  const armSG = getModelArmourAndShield(modelSG, unitSG, wb);
  assert(armSG.armour && armSG.armour.name === 'Reinforced Armour', 'Scripture Guardian has Reinforced Armour');
  const gearSG = getModelGearAndGrenades(modelSG, unitSG, wb);
  assert(gearSG.gear.some(g => g.name === 'Combat Helmet'), 'Scripture Guardian has Combat Helmet');
  assert.strictEqual(modelHasHeadgear(wb, modelSG), true, 'Scripture Guardian counts as having Headgear');
  console.log('✓ Scripture Guardian has built-in Reinforced Armour, Combat Helmet, and headgear flag');

  const unitSE = DATA.mercenaries.find(m => m.id === 'sin-eater');
  const modelSE = { uid: 'se-1', unitId: 'sin-eater', battlekit: [] };
  const melSE = getModelMeleeCapacity(modelSE, unitSE, wb);
  assert(melSE.items.some(it => it.name === 'Tenderiser Maul'), 'Sin Eater has Tenderiser Maul');
  console.log('✓ Sin Eater has built-in Tenderiser Maul');

  const unitWB = DATA.mercenaries.find(m => m.id === 'witchburner');
  const modelWB = { uid: 'wb-1', unitId: 'witchburner', battlekit: [] };
  const melWB = getModelMeleeCapacity(modelWB, unitWB, wb);
  assert(melWB.items.some(it => it.name === 'Gavel of Justice'), 'Witchburner has Gavel of Justice');
  console.log('✓ Witchburner has built-in Gavel of Justice');
}

console.log('\n=== ALL 14 PERMANENT EQUIPMENT AUDIT CHECKS PASSED ===');
