const fs = require('fs');
let file = 'app/lib/loadout_lab.ts';
let c = fs.readFileSync(file, 'utf8');
if (!c.includes('function parseStatToInt')) {
  c = c.replace('export function getModelScoreForLab(', 'function parseStatToInt(v) { if (typeof v === \
