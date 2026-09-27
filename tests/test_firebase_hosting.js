/* Firebase Hosting (decisión de Marcos, 2026-09-28: la app se sirve desde
 * Firebase y se despliega a mano desde el PC; GitHub Pages se desactiva).
 * Solo se publica la app (index.html y sus imágenes), nunca el repo entero.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
const read = (f) => { try { return fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch (e) { return ''; } };

console.log('\nGroup 1: proyecto y hosting');
let rc = {}, fj = {};
try { rc = JSON.parse(read('.firebaserc')); } catch (e) {}
try { fj = JSON.parse(read('firebase.json')); } catch (e) {}
ok(rc.projects && rc.projects.default === 'murodehierrodelsultanato', '.firebaserc apunta a murodehierrodelsultanato');
const h = fj.hosting || {};
ok(h.public === 'dist', 'hosting publica solo la carpeta dist');
ok(/^dist\/?$/m.test(read('.gitignore')), 'dist no se versiona');
const hdr = JSON.stringify(h.headers || []);
ok(/index\.html/.test(hdr) && /no-cache/.test(hdr), 'index.html sin caché (cada despliegue se ve al momento)');

console.log('\nGroup 2: despliegue');
const dep = read('scripts/deploy.sh');
ok(/verify\.sh/.test(dep), 'el despliegue pasa antes verify.sh');
ok(/cp[^\n]*index\.html[^\n]*dist/.test(dep) && /wwi-placeholders/.test(dep), 'copia index.html y las imágenes a dist');
ok(/firebase deploy --only hosting,firestore:rules/.test(dep), 'despliega hosting y reglas de Firestore');

console.log('\nGroup 3: reglas de Firestore');
const rules = read('firestore.rules');
ok(fj.firestore && fj.firestore.rules === 'firestore.rules', 'firebase.json usa firestore.rules');
ok(/match \/users\/\{uid\}/.test(rules) && /request\.auth\.uid == uid/.test(rules), 'cada usuario solo lee y escribe su documento');
ok(!/allow read, write: if true/.test(rules), 'sin acceso abierto');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
