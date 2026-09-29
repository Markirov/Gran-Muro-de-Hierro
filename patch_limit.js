const fs = require('fs');
let file = 'app/lib/limit_validation.ts';
let c = fs.readFileSync(file, 'utf8');
c = c.replace(
  'import { unitForbiddenByVariant, getActiveVariant, variantUnitOverride } from \'./cost_calculation\';',
  'import { unitForbiddenByVariant, getActiveVariant, variantUnitOverride, getUnit, modelCost } from \'./cost_calculation\';'
);
fs.writeFileSync(file, c);
