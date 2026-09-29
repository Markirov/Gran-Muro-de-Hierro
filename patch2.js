const fs = require('fs');
['app/lib/battlekit_deltas.ts', 'app/lib/loadout_lab.ts'].forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('import { DATA }')) {
    content = content.replace('/* ===', 'import { DATA } from \'../data/01_trench_crusade_game_data\';\n\n/* ===');
    fs.writeFileSync(file, content);
  }
});
