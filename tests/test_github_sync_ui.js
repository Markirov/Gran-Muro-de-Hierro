/* Sub-GH-C — UI modal sincronización GitHub Gist.
 *
 * Verifica:
 * - Botón btn-open-github-sync en header
 * - Modal modal-github-sync con campos token + gist-id + status
 * - Botones btn-gh-backup + btn-gh-restore
 * - Link a GitHub settings/tokens correcto
 * - Handlers persisten token/gistId en localStorage
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

const dom = new JSDOM(html, { runScripts: 'outside-only' });
const doc = dom.window.document;

group('Group 1: Botón header y modal presentes', () => {
  ok(!!doc.getElementById('btn-open-github-sync'), 'btn-open-github-sync en header');
  ok(!!doc.getElementById('modal-github-sync'), 'modal-github-sync presente');
  ok(!!doc.getElementById('gh-token'), 'input token');
  ok(!!doc.getElementById('gh-gist-id'), 'input gist id');
  ok(!!doc.getElementById('gh-sync-status'), 'status container');
  ok(!!doc.getElementById('btn-gh-backup'), 'btn backup');
  ok(!!doc.getElementById('btn-gh-restore'), 'btn restore');
});

group('Group 2: Input token tipo password (no visible)', () => {
  const tok = doc.getElementById('gh-token');
  ok(tok && tok.type === 'password', 'type=password');
  ok(tok.getAttribute('autocomplete') === 'off', 'autocomplete off');
});

group('Group 3: Link tutorial GitHub tokens', () => {
  ok(/github\.com\/settings\/tokens\/new\?scopes=gist/.test(html),
     'link tokens/new con scopes=gist');
  ok(/scope.*gist/i.test(html), 'menciona scope gist');
});

group('Group 4: Handlers persisten token/gistId', () => {
  ok(/wf\.gh\.token/.test(html), 'localStorage key wf.gh.token');
  ok(/wf\.gh\.gistId/.test(html), 'localStorage key wf.gh.gistId');
  ok(/wf\.gh\.lastSync/.test(html), 'localStorage key wf.gh.lastSync');
});

group('Group 5: Restore pide confirmación (destructivo)', () => {
  ok(/Restaurar desde GitHub SOBREESCRIBE/.test(html),
     'mensaje confirm explícito sobreescribir');
});

group('Group 6: Backup invoca githubBackup + Restore invoca githubRestore', () => {
  ok(/await githubBackup\(token,\s*gistId\s*\|\|\s*null\)/.test(html), 'backup call');
  ok(/await githubRestore\(token,\s*gistId\)/.test(html), 'restore call');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
