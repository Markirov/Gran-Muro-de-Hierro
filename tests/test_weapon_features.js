const { 
  formatRange, 
  getWeaponHand, 
  extractWeaponCombatModifiers, 
  getModelSpecialAmmunition, 
  isAmmunitionApplicableToWeapon, 
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

console.log('\n--- Test 1: formatRange ---');
ok(formatRange('24"') === '24"', '24" se formatea como 24"');
ok(formatRange('24""') === '24"', '24"" (doble comilla) se corrige a 24"');
ok(formatRange('12"/Melee') === '12"/Melee', '12"/Melee se preserva');
ok(formatRange('Melee') === 'Melee', 'Melee se preserva');
ok(formatRange('-') === '-', '- se preserva');

console.log('\n--- Test 2: getWeaponHand & STRONG ---');
const w2H = { type: '2-Handed', range: 'Melee', weaponKeywords: [] };
ok(getWeaponHand(w2H, false).label === '2H', '2-Handed sin STRONG es 2H');
ok(getWeaponHand(w2H, true).effective1HWithStrong === true, '2-Handed CaC con STRONG es effective1H');
ok(getWeaponHand(w2H, true).label === '1H (STRONG)', 'Etiqueta con STRONG es 1H (STRONG)');

const wPistol = { type: '1-Handed', range: '12"/Melee', weaponKeywords: ['PISTOL'] };
ok(getWeaponHand(wPistol).isPistol === true, 'Pistol identificada');
ok(getWeaponHand(wPistol).label === 'Pistol', 'Etiqueta Pistol');

const wCumbersome = { type: '2-Handed', range: 'Melee', weaponKeywords: ['CUMBERSOME'] };
ok(getWeaponHand(wCumbersome, true).effective1HWithStrong === false, 'CUMBERSOME no se beneficia de STRONG para 1H');

console.log('\n--- Test 3: extractWeaponCombatModifiers ---');
const greatSword = { name: 'Great Sword', weaponKeywords: ['+1 INJURY MODIFIER', 'HEAVY', 'CRITICAL'] };
const gsMods = extractWeaponCombatModifiers(greatSword);
ok(gsMods.injuryModifiers.includes('+1 INJURY MODIFIER'), 'Extrae +1 INJURY MODIFIER');
ok(gsMods.tacticalKeywords.includes('HEAVY'), 'Conserva HEAVY en keywords');
ok(gsMods.tacticalKeywords.includes('CRITICAL'), 'Conserva CRITICAL en keywords');

const shotgun = { name: 'Shotgun', weaponKeywords: ['+1 DICE', 'SHOTGUN', 'ASSAULT'] };
const sgMods = extractWeaponCombatModifiers(shotgun);
ok(sgMods.attackModifiers.includes('+1 DICE'), 'Extrae +1 DICE de ataque');

const flamer = { name: 'Flamethrower', weaponKeywords: ['-1 INJURY DICE', 'FIRE', 'IGNORE ARMOUR'] };
const flMods = extractWeaponCombatModifiers(flamer);
ok(flMods.injuryModifiers.includes('-1 INJURY DICE'), 'Extrae -1 INJURY DICE');

console.log('\n--- Test 4: Special Ammunition Detection & Application ---');
const dummyModel = {
  battlekit: ['ap-bullets-test']
};
const dummyWb = {
  factionId: 'new-antioch'
};
// Simular findBattlekitItem
const rifle = { name: 'Rifle', range: '24"', type: '2-Handed' };
const club = { name: 'Club', range: 'Melee', type: '1-Handed' };
ok(isAmmunitionApplicableToWeapon(rifle) === true, 'Munición aplica a rifle a distancia');
ok(isAmmunitionApplicableToWeapon(club) === false, 'Munición NO aplica a garrote melee');
ok(isAmmunitionApplicableToWeapon(wPistol) === true, 'Munición aplica a pistola (incluso en Melee, Errata Q4)');

console.log('\n--- Test 5: Tactical Rule Notes (Canon 1.0.2) ---');
ok(getTacticalRuleNote('RELOAD').includes('concluye') && getTacticalRuleNote('RELOAD').includes('activación'), 'RELOAD recuerda que concluye la activación');
ok(getTacticalRuleNote('AUTOMATIC 2').includes('disparar hasta 2 tiros'), 'AUTOMATIC explica penalización acumulativa');
ok(getTacticalRuleNote('ASSAULT').includes('Dash') || getTacticalRuleNote('ASSAULT').includes('Cargar'), 'ASSAULT explica tiro tras movimiento rápido');
ok(getTacticalRuleNote('PISTOL').includes('Melee'), 'PISTOL recuerda uso en cuerpo a cuerpo');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
