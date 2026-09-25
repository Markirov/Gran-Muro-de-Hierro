// check-syntax.js — extrae el <script> inline de index.html y valida su sintaxis
// con el parser de V8 (sin ejecutarlo). Rápido (<1s): lo usan pre-commit y verify.sh.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const file = process.argv[2] || path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(file, 'utf8');
const re = /<script>([\s\S]*?)<\/script>/g;
let m, n = 0;
while ((m = re.exec(html))) {
  n++;
  const offset = html.slice(0, m.index).split('\n').length - 1;
  try {
    new vm.Script(m[1], { filename: 'index.html' });
  } catch (e) {
    const line = (e.stack.match(/index\.html:(\d+)/) || [])[1];
    console.error(`check-syntax: error en <script> #${n}` +
      (line ? ` (index.html línea ~${Number(line) + offset})` : '') + `: ${e.message}`);
    process.exit(1);
  }
}
if (n === 0) { console.error('check-syntax: no se encontró ningún <script> inline'); process.exit(1); }
console.log(`check-syntax: OK (${n} script inline)`);
