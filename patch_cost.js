const fs = require('fs');
let file = 'app/lib/cost_calculation.ts';
let c = fs.readFileSync(file, 'utf8');
c = c.replace(
  'import { unitCountInWarband } from \'./limit_validation\';',
  'import { unitCountInWarband } from \'./limit_validation\';\nimport { getArmouryCategory, getWeaponLimits, countModelMeleeWeapons, countModelRangedWeapons, checkWeaponSlots } from \'./battlekit_legality_engine\';'
);
fs.writeFileSync(file, c);
