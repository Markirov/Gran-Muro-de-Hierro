/* INFILTRATOR según la revisión de reglas de abril 2026 (beta), canon de mesa
 * (decisión de Marcos, 2026-09-27). Fuente:
 * trenchcrusade.com/trench-wire/rules/infiltrators-rules-update/ (tarjeta
 * Infiltrators-1): si no puede desplegarse como INFILTRATOR, despliega hasta
 * 6" fuera de su zona de despliegue.
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
let html = fs.readFileSync(path.join(ROOT, 'public', 'app.html'), 'utf8');
  const cssContent = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'css', 'app.css'), 'utf8');
  html += '\n<style>\n' + cssContent + '\n</style>\n';
  const JS_DIR_ALL = path.resolve(__dirname, '..', 'public', 'js');
  const jsContentAll = fs.readdirSync(JS_DIR_ALL).filter(x => x.endsWith('.js')).map(x => fs.readFileSync(path.join(JS_DIR_ALL, x), 'utf8')).join('\n');
  html += '\n<script>\n' + jsContentAll + '\n</script>\n';
const JS_DIR = path.resolve(__dirname, '..', 'public', 'js');
const jsFiles = fs.readdirSync(JS_DIR).filter(f => f.endsWith('.js')).sort();
const js = jsFiles.map(f => fs.readFileSync(path.join(JS_DIR, f), 'utf8')).join('\n');
const bootIdx = js.search(/\nfunction boot\(\)/);
const dom = new JSDOM(html.replace('</body>', '<script>' + js + '</script></body>').replace(/<script[\s\S]*?<\/script>/g, ''), { runScripts: 'outside-only', url: 'http://localhost/' });
dom.window.alert = () => {};
dom.window.eval(js.slice(0, bootIdx) + '\n;window.__X = { KEYWORD_GLOSSARY, ABILITY_LIBRARY, KEYWORD_LIBRARY: typeof KEYWORD_LIBRARY !== "undefined" ? KEYWORD_LIBRARY : {} };');
const X = dom.window.__X;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

console.log('\nGroup 1: glosario');
const g = X.KEYWORD_GLOSSARY.find(e => e.key === 'INFILTRATOR') || {};
ok(/abril 2026/.test(g.src || ''), 'fuente: revisión de abril 2026 (beta)');
ok(/6" fuera de su zona de despliegue/.test(g.text || '') && /8" o más/.test(g.text || '') && /Line of Sight/.test(g.text || ''), 'texto nuevo: si no puede, hasta 6" fuera de su zona');
ok(/normalmente en su zona/.test(g.prev || ''), 'conserva el texto anterior (prev)');

console.log('\nGroup 2: biblioteca de keywords');
const k = String(X.KEYWORD_LIBRARY['INFILTRATOR'] || '');
const a = (X.ABILITY_LIBRARY['INFILTRATOR'] || {}).summary || '';
ok(/6"/.test(k) && /8"/.test(k), 'KEYWORD_LIBRARY: resumen con la opción de 6"');
ok(/6"/.test(a) && /8"/.test(a), 'ABILITY_LIBRARY: resumen con la opción de 6"');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);

