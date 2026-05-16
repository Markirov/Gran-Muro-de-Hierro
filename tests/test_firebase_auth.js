/* Sub-FB — Firebase Auth + Firestore wrappers.
 *
 * Verifica:
 * - isFirebaseConfigured() detecta config válida vs vacía
 * - firebaseInit retorna error si no configurado
 * - firebaseSaveState / firebaseLoadState requieren usuario auth
 * - UI modal modal-firebase-login + secciones
 * - Botón "☁ Tu cuenta" en header + handlers
 * - FIREBASE_CONFIG constante presente como placeholder
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_firebase.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  FIREBASE_CONFIG: typeof FIREBASE_CONFIG !== 'undefined' ? FIREBASE_CONFIG : null,
  isFirebaseConfigured: typeof isFirebaseConfigured === 'function' ? isFirebaseConfigured : null,
  firebaseInit: typeof firebaseInit === 'function' ? firebaseInit : null,
  firebaseSaveState: typeof firebaseSaveState === 'function' ? firebaseSaveState : null,
  firebaseLoadState: typeof firebaseLoadState === 'function' ? firebaseLoadState : null,
  firebaseCurrentUser: typeof firebaseCurrentUser === 'function' ? firebaseCurrentUser : null,
};
`;
const stub = `
let lsStore = {};
const localStorage = { getItem(k){return lsStore[k]||null;}, setItem(k,v){lsStore[k]=String(v);}, removeItem(k){delete lsStore[k];}, clear(){lsStore={};}, key(i){return Object.keys(lsStore)[i]||null;}, get length(){return Object.keys(lsStore).length;} };
let lastAlert=null; function alert(msg){lastAlert=msg;}
function fakeEl(){return{style:{},classList:{add(){},remove(){},toggle(){},contains(){return false;}},addEventListener(){},removeEventListener(){},appendChild(){},querySelectorAll(){return[];},querySelector(){return null;},setAttribute(){},getAttribute(){return null;},innerHTML:'',textContent:'',value:'',children:[],dataset:{},click(){},focus(){},blur(){},dispatchEvent(){},cloneNode(){return fakeEl();},parentNode:{replaceChild(){}}};}
const window={addEventListener(){},removeEventListener(){},location:{search:''},navigator:{userAgent:''},matchMedia(){return{matches:false,addEventListener(){},addListener(){}};},requestAnimationFrame(fn){return 0;},setTimeout(){return 0;},clearTimeout(){}};
const document={addEventListener(){},removeEventListener(){},querySelectorAll(){return[];},querySelector(){return null;},getElementById(){return fakeEl();},createElement:fakeEl,body:fakeEl(),documentElement:fakeEl()};
const setTimeout=(fn,ms)=>0; const clearTimeout=()=>{};
`;
fs.writeFileSync(TMP, stub + moduleCode);

const lib = require(TMP);
for (const h of ['FIREBASE_CONFIG','isFirebaseConfigured','firebaseInit','firebaseSaveState','firebaseLoadState','firebaseCurrentUser']) {
  if (!lib[h] && lib[h] !== null) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { FIREBASE_CONFIG, isFirebaseConfigured, firebaseInit, firebaseSaveState, firebaseLoadState, firebaseCurrentUser } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }
async function groupA(name, fn) { console.log('\n' + name); await fn(); }

(async () => {

group('Group 1: FIREBASE_CONFIG placeholder presente', () => {
  ok(typeof FIREBASE_CONFIG === 'object', 'objeto');
  ok('apiKey' in FIREBASE_CONFIG, 'apiKey field');
  ok('projectId' in FIREBASE_CONFIG, 'projectId field');
});

group('Group 2: isFirebaseConfigured detecta placeholder vacío', () => {
  ok(isFirebaseConfigured() === false, 'config vacía → false');
});

group('Group 3: helpers existen pero rechazan sin auth', () => {
  ok(typeof firebaseInit === 'function', 'firebaseInit');
  ok(typeof firebaseSaveState === 'function', 'firebaseSaveState');
  ok(typeof firebaseLoadState === 'function', 'firebaseLoadState');
  ok(firebaseCurrentUser() === null, 'currentUser null sin login');
});

await groupA('Group 4: firebaseInit sin config → error claro', async () => {
  const r = await firebaseInit();
  ok(r.ok === false, 'ok:false');
  ok(/no configurad/i.test(r.error || ''), 'error menciona configurado');
});

await groupA('Group 5: firebaseSaveState sin auth → error', async () => {
  const r = await firebaseSaveState();
  ok(r.ok === false, 'ok:false');
  ok(/auten/i.test(r.error || ''), 'error menciona autenticado');
});

await groupA('Group 6: firebaseLoadState sin auth → error', async () => {
  const r = await firebaseLoadState();
  ok(r.ok === false, 'ok:false');
});

group('Group 7: UI modal + botón en DOM', () => {
  const dom = new JSDOM(html, { runScripts: 'outside-only' });
  const doc = dom.window.document;
  ok(!!doc.getElementById('modal-firebase-login'), 'modal-firebase-login');
  ok(!!doc.getElementById('btn-open-account'), 'btn-open-account header');
  ok(!!doc.getElementById('btn-fb-login-google'), 'btn-fb-login-google');
  ok(!!doc.getElementById('btn-fb-logout'), 'btn-fb-logout');
  ok(!!doc.getElementById('btn-fb-force-sync'), 'btn force sync');
  ok(!!doc.getElementById('btn-fb-pull-now'), 'btn pull');
  ok(!!doc.getElementById('fb-login-signed-out'), 'sección sign-out');
  ok(!!doc.getElementById('fb-login-signed-in'), 'sección sign-in');
});

group('Group 8: copy clave UI', () => {
  ok(/Continuar con Google/.test(html), 'CTA "Continuar con Google"');
  ok(/Tu cuenta/.test(html), 'header "Tu cuenta"');
  ok(/sincronicen autom[áa]ticamente/i.test(html), 'menciona sync automático');
  ok(/Tus datos viven en tu cuenta personal/.test(html), 'tagline privacidad');
});

group('Group 9: Setup doc para Marcos en código', () => {
  ok(/console\.firebase\.google\.com/.test(html), 'link consola Firebase');
  ok(/Sign-in method.*Google/.test(html), 'instrucción Google provider');
  ok(/Firestore Rules/.test(html), 'reglas Firestore');
  ok(/Enable Device Flow|Add project/.test(html), 'instrucción crear proyecto');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
})();
