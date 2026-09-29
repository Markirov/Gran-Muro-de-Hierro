const fs = require('fs');

const files = ['cost_calculation.ts', 'limit_validation.ts', 'battlekit_legality_engine.ts', 'battlekit_deltas.ts', 'loadout_lab.ts'];
for (const f of files) {
  const path = 'app/lib/' + f;
  if (!fs.existsSync(path)) continue;
  let c = fs.readFileSync(path, 'utf8');
  c = c.replace('// @ts-nocheck\\n', '// @ts-nocheck\n');
  fs.writeFileSync(path, c);
}
