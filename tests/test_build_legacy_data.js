/* scripts/build-legacy-data.js genera los módulos 12/14/20/21/22 de public/js
 * a partir de app/lib/*.ts. app.html los carga como scripts clásicos, así que
 * la salida no puede llevar `import` ni `export` de ES (rompían verify.sh y
 * el navegador tras cada `npm run build`).
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

const build = require(path.join(ROOT, 'scripts', 'build-legacy-data.js'));

console.log('\nGroup 1: toLegacyScript');
ok(typeof build.toLegacyScript === 'function', 'exporta toLegacyScript');
const toLegacy = build.toLegacyScript || ((s) => s);
const sample = "import { DATA } from '../data/x';\nimport { a, b } from './y';\n\nexport function f() { return 1; }\nexport const K = 2;\n";
const out = toLegacy(sample);
ok(!/^\s*import\s/m.test(out), 'quita las líneas import');
ok(!/^\s*export\s/m.test(out), 'quita los export');
ok(/^\/\/ @ts-nocheck/.test(out), 'empieza por // @ts-nocheck');
ok(/function f\(\)/.test(out) && /const K = 2/.test(out), 'conserva las declaraciones');

console.log('\nGroup 2: app/lib genera scripts clásicos válidos');
for (const f of (build.LIB_FILES || [])) {
  const src = fs.readFileSync(path.join(ROOT, 'app', 'lib', f), 'utf8');
  let valid = true;
  try { new vm.Script(toLegacy(src), { filename: f }); } catch (e) { valid = false; }
  ok(valid, f + ' compila como script clásico');
}
ok((build.LIB_FILES || []).length === 5, 'cubre los 5 módulos de app/lib');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
