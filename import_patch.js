const fs = require('fs');
let content = fs.readFileSync('app/lib/limit_validation.ts', 'utf8');
const imports = \import { DATA } from '../data/01_trench_crusade_game_data';
import { unitForbiddenByVariant, getActiveVariant, variantUnitOverride } from './cost_calculation';
\;
content = content.replace('/* ======================================================================', imports + '\n/* ======================================================================');
fs.writeFileSync('app/lib/limit_validation.ts', content);
