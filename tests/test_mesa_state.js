/* Modo mesa — lógica pura de sesión + persistencia.
 * PLAN: tracking/plans/PLAN_2026-09-25_modo-mesa.md (sección 2).
 * Evalúa el script previo a boot() dentro de jsdom y usa Bandas/Caza2.json.
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const js = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/)[1];
const bootIdx = js.search(/\nfunction boot\(\)/);
const dom = new JSDOM(html.replace(/<script[\s\S]*?<\/script>/g, ''), { runScripts: 'outside-only', url: 'http://localhost/' });
const w = dom.window;
w.alert = () => {}; w.confirm = () => true;

const NAMES = ['newTableSession', 'syncTableSession', 'getTableModelState', 'toggleTableActivated',
  'adjustTableBlood', 'setTableStatus', 'toggleTableEffect', 'toggleTableSpent', 'advanceTableTurn',
  'tableActivationCount', 'getTableEffectCodes', 'loadTableSession', 'saveTableSession', 'clearTableSession',
  'importCompanionWarband'];
w.eval(js.slice(0, bootIdx) + '\n;window.__lib = {' +
  NAMES.map(n => `${n}: typeof ${n} === 'function' ? ${n} : null`).join(',') + '};');
const L = w.__lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

const missing = NAMES.filter(n => !L[n]);
if (missing.length) { console.log('  ✗ faltan: ' + missing.join(', ')); process.exit(1); }

const wb = L.importCompanionWarband(JSON.parse(fs.readFileSync(path.join(ROOT, 'Bandas', 'Caza2.json'), 'utf8')));
const uids = wb.models.map(m => m.uid);
const [u0, u1, u2] = uids;

console.log('\nGroup 1: newTableSession');
let s = L.newTableSession(wb);
ok(s.v === 1 && s.warbandId === wb.id && s.turn === 1, 'v1, warbandId, turno 1');
ok(typeof s.startedAt === 'string' && s.startedAt.length > 0, 'startedAt');
ok(uids.every(u => s.models[u]), 'estado para cada uid');
const d = s.models[u0];
ok(d.activated === false && d.blood === 0 && d.status === 'up' && d.effects.length === 0 && d.spent.length === 0,
   'estado por defecto: no activado, 0 sangre, en pie, sin efectos ni usos');

console.log('\nGroup 2: activación');
L.toggleTableActivated(s, u0);
ok(s.models[u0].activated === true, 'toggle → activado');
L.toggleTableActivated(s, u0);
ok(s.models[u0].activated === false, 'toggle de nuevo → no activado');

console.log('\nGroup 3: blood markers');
L.adjustTableBlood(s, u0, +1); L.adjustTableBlood(s, u0, +1);
ok(s.models[u0].blood === 2, '+1 +1 → 2');
L.adjustTableBlood(s, u0, -5);
ok(s.models[u0].blood === 0, 'nunca por debajo de 0');

console.log('\nGroup 4: estado de combate');
L.setTableStatus(s, u0, 'down');
ok(s.models[u0].status === 'down', 'down');
L.setTableStatus(s, u0, 'zombi');
ok(s.models[u0].status === 'down', 'valor inválido ignorado');
L.setTableStatus(s, u0, 'out');
ok(s.models[u0].status === 'out', 'out');

console.log('\nGroup 5: efectos y usos');
L.toggleTableEffect(s, u1, 'BLES'); L.toggleTableEffect(s, u1, 'FEAR');
ok(s.models[u1].effects.join() === 'BLES,FEAR', 'dos efectos activos');
L.toggleTableEffect(s, u1, 'BLES');
ok(s.models[u1].effects.join() === 'FEAR', 'toggle quita BLES');
L.toggleTableSpent(s, u1, 'Grenade');
ok(s.models[u1].spent.includes('Grenade'), 'uso gastado');
L.toggleTableSpent(s, u1, 'Grenade');
ok(!s.models[u1].spent.includes('Grenade'), 'toggle recupera el uso');

console.log('\nGroup 6: pasar turno solo limpia activaciones');
L.toggleTableActivated(s, u1); L.toggleTableActivated(s, u2);
L.adjustTableBlood(s, u1, 3); L.toggleTableEffect(s, u1, 'AIM'); L.toggleTableSpent(s, u1, 'Grenade');
L.advanceTableTurn(s);
ok(s.turn === 2, 'turno 2');
ok(uids.every(u => s.models[u].activated === false), 'todas desactivadas');
ok(s.models[u1].blood === 3 && s.models[u1].effects.includes('AIM') && s.models[u1].spent.includes('Grenade'),
   'sangre, efectos y usos intactos');
ok(s.models[u0].status === 'out', 'estado de combate intacto');

console.log('\nGroup 7: contador de activaciones');
L.toggleTableActivated(s, u1);
let c = L.tableActivationCount(s, wb);
ok(c.total === uids.length - 1, `total excluye Fuera de combate (${c.total})`);
ok(c.activated === 1, 'una activada');
L.toggleTableActivated(s, u0); // u0 está fuera: activarlo no cuenta
c = L.tableActivationCount(s, wb);
ok(c.activated === 1, 'activaciones de modelos Fuera no cuentan');

console.log('\nGroup 8: getTableModelState y sync');
ok(L.getTableModelState(s, 'no-existe').status === 'up', 'uid desconocido → estado por defecto');
const wb2 = JSON.parse(JSON.stringify(wb));
wb2.models.push({ ...wb2.models[0], uid: 'nuevo_uid' });
wb2.models = wb2.models.filter(m => m.uid !== u2);
L.syncTableSession(s, wb2);
ok(s.models['nuevo_uid'] && s.models['nuevo_uid'].status === 'up', 'modelo nuevo con estado limpio');
ok(!!s.models[u2], 'modelo quitado no se borra (por si vuelve)');
c = L.tableActivationCount(s, wb2);
ok(c.total === wb2.models.filter(m => L.getTableModelState(s, m.uid).status !== 'out').length, 'contador solo sobre modelos presentes');

console.log('\nGroup 9: getTableEffectCodes');
ok(L.getTableEffectCodes({}).join() === 'BLES,AIM,MEM,FEAR,CHARGED,OTRO', 'lista base del battletracker');
ok(L.getTableEffectCodes({ hasElementalMastery: true }).join() === 'BLES,AIM,MEM,FEAR,CHARGED,OTRO,FIRE,GAS,SHRAPNEL',
   'Maestro de Elementos añade FIRE, GAS, SHRAPNEL');

console.log('\nGroup 10: persistencia');
const store = { _d: {}, getItem(k) { return k in this._d ? this._d[k] : null; }, setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; } };
L.saveTableSession(s, store);
ok(!!store._d['wf-mesa-' + wb.id], 'guarda en wf-mesa-<id banda>');
const back = L.loadTableSession(wb, store);
ok(back.turn === s.turn && back.models[u1].blood === 3, 'round-trip conserva turno y estado');
store._d['wf-mesa-' + wb.id] = JSON.stringify({ ...s, v: 99 });
ok(L.loadTableSession(wb, store).turn === 1, 'versión desconocida → sesión nueva');
store._d['wf-mesa-' + wb.id] = JSON.stringify({ ...s, warbandId: 'otra' });
ok(L.loadTableSession(wb, store).turn === 1, 'sesión de otra banda → sesión nueva');
store._d['wf-mesa-' + wb.id] = '{roto';
ok(L.loadTableSession(wb, store).turn === 1, 'JSON corrupto → sesión nueva');
L.saveTableSession(s, store);
L.clearTableSession(wb, store);
ok(!store._d['wf-mesa-' + wb.id], 'clear borra la sesión');
ok(L.loadTableSession(wb, store).turn === 1, 'tras clear → turno 1');
const broken = { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); }, removeItem() { throw new Error('bloqueado'); } };
let threw = false;
try { L.saveTableSession(s, broken); L.loadTableSession(wb, broken); L.clearTableSession(wb, broken); } catch (e) { threw = true; }
ok(!threw, 'storage que lanza no rompe nada');
ok(L.saveTableSession(s, broken) === false, 'save devuelve false si no pudo guardar');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
