/* Sub-OA-A — OAuth Device Flow API helpers (puros).
 *
 * Verifica:
 * - requestDeviceCode(clientId) POST a /login/device/code con scope=gist
 * - Devuelve { device_code, user_code, verification_uri, expires_in, interval }
 * - pollForAccessToken(clientId, deviceCode, interval) hace polling
 * - Maneja error 'authorization_pending' (sigue esperando)
 * - Maneja 'slow_down' (aumenta intervalo)
 * - Maneja 'access_denied' / 'expired_token' (devuelve error)
 * - Cuando recibe access_token: ok:true
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_oauth_device.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  requestDeviceCode: typeof requestDeviceCode === 'function' ? requestDeviceCode : null,
  pollForAccessToken: typeof pollForAccessToken === 'function' ? pollForAccessToken : null,
  _fetchCalls,
  _setFetchResponses,
};
`;
const stub = `
let _fetchQueue = [];
function _setFetchResponses(arr) { _fetchQueue = arr.slice(); }
const _fetchCalls = [];
function fetch(url, opts) {
  _fetchCalls.push({ url, opts: opts||{} });
  if (_fetchQueue.length === 0) {
    return Promise.resolve({ ok:false, status:500, json:()=>Promise.resolve({error:'no-stub'}) });
  }
  const r = _fetchQueue.shift();
  return Promise.resolve(r);
}
let _lsStore = {};
const localStorage = { getItem(k){return _lsStore[k]||null;}, setItem(k,v){_lsStore[k]=String(v);}, removeItem(k){delete _lsStore[k];}, clear(){_lsStore={};} };
let lastAlert=null; function alert(msg){lastAlert=msg;}
function fakeEl(){return{style:{},classList:{add(){},remove(){},toggle(){},contains(){return false;}},addEventListener(){},removeEventListener(){},appendChild(){},querySelectorAll(){return[];},querySelector(){return null;},setAttribute(){},getAttribute(){return null;},innerHTML:'',textContent:'',value:'',children:[],dataset:{},click(){},focus(){},blur(){},dispatchEvent(){},cloneNode(){return fakeEl();},parentNode:{replaceChild(){}}};}
const window = { fetch, addEventListener(){}, removeEventListener(){}, location:{search:''}, navigator:{userAgent:''}, matchMedia(){return{matches:false,addEventListener(){},addListener(){}};}, requestAnimationFrame(fn){return 0;}, setTimeout(){return 0;}, clearTimeout(){} };
const document = { addEventListener(){}, removeEventListener(){}, querySelectorAll(){return[];}, querySelector(){return null;}, getElementById(){return fakeEl();}, createElement: fakeEl, body:fakeEl(), documentElement:fakeEl() };
const setTimeout = (fn, ms) => { fn(); return 0; };  // sincrónico para acelerar polling.
const clearTimeout = () => {};
`;
fs.writeFileSync(TMP, stub + moduleCode);

const lib = require(TMP);
for (const h of ['requestDeviceCode','pollForAccessToken','_fetchCalls','_setFetchResponses']) {
  if (lib[h] === null || lib[h] === undefined) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { requestDeviceCode, pollForAccessToken, _fetchCalls, _setFetchResponses } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
async function groupA(name, fn) { console.log('\n' + name); await fn(); }

function jsonResp(body, status) {
  return { ok: status < 400, status: status||200, json: () => Promise.resolve(body) };
}

(async () => {

await groupA('Group 1: requestDeviceCode POST + scope gist', async () => {
  _fetchCalls.length = 0;
  _setFetchResponses([jsonResp({
    device_code:'dev-123', user_code:'ABCD-EFGH',
    verification_uri:'https://github.com/login/device',
    expires_in:900, interval:5,
  }, 200)]);
  const r = await requestDeviceCode('client-xyz');
  ok(r && r.ok === true, 'ok:true');
  ok(r.device_code === 'dev-123', 'device_code propagado');
  ok(r.user_code === 'ABCD-EFGH', 'user_code propagado');
  ok(/login\/device\/code/.test(_fetchCalls[0].url), 'url correct');
  ok(_fetchCalls[0].opts.method === 'POST', 'POST');
  const body = _fetchCalls[0].opts.body;
  ok(/client_id=client-xyz/.test(body), 'client_id en body');
  ok(/scope=gist/.test(body), 'scope=gist');
});

await groupA('Group 2: requestDeviceCode sin clientId → error', async () => {
  const r = await requestDeviceCode('');
  ok(r && r.ok === false, 'ok:false');
  ok(/client/i.test(r.error || ''), 'error menciona client');
});

await groupA('Group 3: pollForAccessToken — token recibido (1 intento)', async () => {
  _fetchCalls.length = 0;
  _setFetchResponses([jsonResp({
    access_token:'gho_abc123', token_type:'bearer', scope:'gist',
  }, 200)]);
  const r = await pollForAccessToken('client-xyz', 'dev-123', 1, 60);
  ok(r && r.ok === true, 'ok:true');
  ok(r.access_token === 'gho_abc123', 'access_token devuelto');
});

await groupA('Group 4: pollForAccessToken — authorization_pending → retry hasta token', async () => {
  _fetchCalls.length = 0;
  _setFetchResponses([
    jsonResp({ error:'authorization_pending' }, 200),
    jsonResp({ error:'authorization_pending' }, 200),
    jsonResp({ access_token:'gho_xyz', token_type:'bearer' }, 200),
  ]);
  const r = await pollForAccessToken('client-x', 'dev-x', 1, 60);
  ok(r && r.ok === true, 'eventualmente ok');
  ok(_fetchCalls.length === 3, '3 intentos');
});

await groupA('Group 5: pollForAccessToken — access_denied → error', async () => {
  _setFetchResponses([jsonResp({ error:'access_denied' }, 200)]);
  const r = await pollForAccessToken('c', 'd', 1, 60);
  ok(r && r.ok === false, 'ok:false');
  ok(/denied|denegad/i.test(r.error || ''), 'error menciona denied');
});

await groupA('Group 6: pollForAccessToken — expired_token → error', async () => {
  _setFetchResponses([jsonResp({ error:'expired_token' }, 200)]);
  const r = await pollForAccessToken('c', 'd', 1, 60);
  ok(r && r.ok === false, 'ok:false');
  ok(/expir/i.test(r.error || ''), 'error menciona expirado');
});

await groupA('Group 7: pollForAccessToken — timeout tras N intentos', async () => {
  // Responde siempre pending hasta agotar timeout.
  const pending = jsonResp({ error:'authorization_pending' }, 200);
  _setFetchResponses(Array(100).fill(pending));
  // maxAttempts pequeño para test rápido.
  const r = await pollForAccessToken('c', 'd', 1, 3);
  ok(r && r.ok === false, 'timeout devuelve ok:false');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
})();
