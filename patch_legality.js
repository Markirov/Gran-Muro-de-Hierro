const fs = require('fs');
let file = 'app/lib/battlekit_legality_engine.ts';
let c = fs.readFileSync(file, 'utf8');
c = c.replace(
  'import { variantArmouryItem, getActiveVariant, effectiveKeywords, activeUpgrades } from \'./cost_calculation\';',
  'import { variantArmouryItem, getActiveVariant, effectiveKeywords, activeUpgrades, findBattlekitItem, getUnit, variantUnitOverride, modelNegatesKeyword } from \'./cost_calculation\';'
);
fs.writeFileSync(file, c);
