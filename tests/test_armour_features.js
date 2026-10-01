const {
  extractArmourDefenses,
  getBulkyInfo,
  getModelArmourBreakdown,
  getModelDefensiveImmunities,
  getTacticalRuleNote
} = require('../app/lib/weapon_helpers');

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) {
    console.log('  ✓ ' + msg);
    pass++;
  } else {
    console.log('  ✗ ' + msg);
    fail++;
  }
}

console.log('\n--- Test 1: extractArmourDefenses ---');
const stdArmour = { name: 'Standard Armour', weaponKeywords: ['-1 INJURY MODIFIER'] };
const defStd = extractArmourDefenses(stdArmour);
ok(defStd.injuryModifier === '-1', 'Standard Armour injury modifier es -1');
ok(defStd.modifierNumber === 1, 'Standard Armour valor numérico es 1');
ok(defStd.isShield === false, 'Standard Armour no es escudo');

const alchemistArmour = { name: 'Alchemist Armour', weaponKeywords: ['-2 INJURY MODIFIER', 'NEGATE FIRE', 'NEGATE GAS'] };
const defAlc = extractArmourDefenses(alchemistArmour);
ok(defAlc.injuryModifier === '-2', 'Alchemist Armour injury modifier es -2');
ok(defAlc.defensiveTraits.includes('NEGATE FIRE'), 'Alchemist Armour incluye NEGATE FIRE');
ok(defAlc.defensiveTraits.includes('NEGATE GAS'), 'Alchemist Armour incluye NEGATE GAS');

const fireShield = { name: 'Fire Shield', category: 'shields', weaponKeywords: ['-1 INJURY MODIFIER', 'NEGATE FIRE'] };
const defFireShield = extractArmourDefenses(fireShield);
ok(defFireShield.injuryModifier === '-1', 'Fire Shield injury modifier es -1');
ok(defFireShield.isShield === true, 'Fire Shield es identificado como escudo');
ok(defFireShield.defensiveTraits.includes('NEGATE FIRE'), 'Fire Shield tiene NEGATE FIRE');
ok(defFireShield.defensiveTraits.includes('FLAME REPELLENT'), 'Fire Shield tiene FLAME REPELLENT');

const heavyBallistic = { name: 'Heavy Ballistic Shield', type: 'Shield', weaponKeywords: ['-1 INJURY MODIFIER', 'COVER'] };
const defHB = extractArmourDefenses(heavyBallistic);
ok(defHB.isShield === true, 'Heavy Ballistic Shield es escudo');
ok(defHB.defensiveTraits.includes('COVER'), 'Heavy Ballistic Shield otorga COVER');

const engineerArmour = { name: 'Engineer Body Armour', weaponKeywords: ['-2 INJURY MODIFIER', 'NEGATE SHRAPNEL'] };
const defEng = extractArmourDefenses(engineerArmour);
ok(defEng.defensiveTraits.includes('NEGATE SHRAPNEL'), 'Engineer Body Armour tiene NEGATE SHRAPNEL');

const tankPalanquin = { name: 'Tank Palanquin', weaponKeywords: ['-3 INJURY MODIFIER', 'STRONG'] };
const defTank = extractArmourDefenses(tankPalanquin);
ok(defTank.injuryModifier === '-3', 'Tank Palanquin injury modifier es -3');
ok(defTank.defensiveTraits.includes('BULKY'), 'Tank Palanquin tiene BULKY');
ok(defTank.defensiveTraits.includes('STANDFAST'), 'Tank Palanquin tiene STANDFAST');

console.log('\n--- Test 2: getBulkyInfo (Canon 1.0.2 & Alba) ---');
const stdModel = { battlekit: ['standard-armour'] };
const stdBulky = getBulkyInfo(stdModel, { id: 'trooper' }, { factionId: 'new-antioch' });
ok(stdBulky.isBulky === false, 'Modelo normal no es BULKY');
ok(stdBulky.chargeBonus === 'D6"', 'Carga normal es D6"');

const machineModel = { battlekit: ['machine-armour-na'] };
const machineBulky = getBulkyInfo(machineModel, { id: 'trooper' }, { factionId: 'new-antioch' });
ok(machineBulky.isBulky === true, 'Modelo con Machine Armour es BULKY');
ok(machineBulky.chargeBonus === 'D3"', 'Carga BULKY estándar es D3"');
ok(machineBulky.baseSize === '40mm+', 'Peana mínima 40mm+');

// Alba variant with Celtic Machine Armour
const albaBulky = getBulkyInfo(machineModel, { id: 'trooper' }, { factionId: 'new-antioch', variantId: 'alba' });
ok(albaBulky.isBulky === true, 'Modelo Alba con Machine Armour es BULKY');
ok(albaBulky.isCeltic === true, 'Es Celtic Machine Armour');
ok(albaBulky.chargeBonus === 'D6"', 'Celtic Machine Armour otorga bonificador de carga D6" (excepción canónica)');

// Tank Palanquin
const palanquinModel = { battlekit: ['tank-palanquin'] };
const palanquinBulky = getBulkyInfo(palanquinModel, { id: 'heretic-priest' }, { factionId: 'heretic-legion' });
ok(palanquinBulky.isBulky === true, 'Tank Palanquin es BULKY');
ok(palanquinBulky.baseSize === '50mm', 'Tank Palanquin requiere peana 50mm');
ok(palanquinBulky.chargeBonus === 'D3"', 'Tank Palanquin tiene carga D3"');

console.log('\n--- Test 3: getTacticalRuleNote para rasgos defensivos ---');
ok(getTacticalRuleNote('NEGATE FIRE').includes('fuego'), 'NEGATE FIRE documentado');
ok(getTacticalRuleNote('NEGATE GAS').includes('Gas'), 'NEGATE GAS documentado');
ok(getTacticalRuleNote('NEGATE SHRAPNEL').includes('metralla'), 'NEGATE SHRAPNEL documentado');
ok(getTacticalRuleNote('IMPERVIOUS').includes('tóxicos') || getTacticalRuleNote('IMPERVIOUS').includes('corrupción'), 'IMPERVIOUS documentado');
ok(getTacticalRuleNote('BULKY').includes('D3"'), 'BULKY documentado con D3"');
ok(getTacticalRuleNote('STANDFAST').includes('Minor Hit'), 'STANDFAST documentado con Minor Hit');

console.log('\n--- Test 4: getModelDefensiveImmunities ---');
const gasMaskItem = { name: 'Gas Mask' };
const helmetItem = { name: 'Combat Helmet' };
const dummyUnit = { keywords: ['TOUGH'] };
const imms = getModelDefensiveImmunities({}, dummyUnit, {}, [gasMaskItem, helmetItem, alchemistArmour]);
ok(imms.includes('TOUGH'), 'Incluye TOUGH de la unidad');
ok(imms.includes('NEGATE GAS'), 'Incluye NEGATE GAS de la máscara/alquimista');
ok(imms.includes('NEGATE SHRAPNEL'), 'Incluye NEGATE SHRAPNEL del casco');
ok(imms.includes('NEGATE FIRE'), 'Incluye NEGATE FIRE de la armadura');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
