/* Sincronización con Firebase (decisión de Marcos, 2026-09-28: todo a
 * Firebase). La nube y el navegador se fusionan banda a banda (gana la más
 * reciente por updatedAt); los borrados dejan marca para no resucitar en otro
 * dispositivo; los índices se reconstruyen desde las bandas fusionadas.
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const js = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/)[1];
const bootIdx = js.search(/\nfunction boot\(\)/);
const dom = new JSDOM(html.replace(/<script[\s\S]*?<\/script>/g, ''), { runScripts: 'outside-only', url: 'http://localhost/' });
dom.window.alert = () => {};
dom.window.eval(js.slice(0, bootIdx) + '\n;window.__X = { FIREBASE_CONFIG, isFirebaseConfigured, serializeAppState, mergeAppStates: typeof mergeAppStates === "function" ? mergeAppStates : null, applyMergedState: typeof applyMergedState === "function" ? applyMergedState : null, persistWarband, deleteWarband, loadIndex, persistCampaign, deleteCampaignStore, loadCampaignIndex };');
const X = dom.window.__X;
const LS = dom.window.localStorage;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

console.log('\nGroup 1: configuración');
ok(X.isFirebaseConfigured() && X.FIREBASE_CONFIG.projectId === 'murodehierrodelsultanato', 'Firebase configurado (murodehierrodelsultanato)');
ok(!/getAnalytics|firebase-analytics/.test(html), 'sin Firebase Analytics (la app no recoge datos)');
ok(!/data-config-action="github"/.test(html), 'el menú ya no ofrece el backup de GitHub');

console.log('\nGroup 2: fusión');
ok(typeof X.mergeAppStates === 'function', 'mergeAppStates existe');
const wb = (id, t, name) => ({ id, name: name || id, factionId: 'new-antioch', models: [], updatedAt: t });
const local = { version: 1, warbands: [wb('a', '2026-09-28T10:00:00Z', 'A local'), wb('b', '2026-09-28T09:00:00Z'), wb('solo-local', '2026-09-28T08:00:00Z')],
  campaigns: [{ id: 'c1', name: 'C1', warbandIds: [], battles: [], updatedAt: '2026-09-28T08:00:00Z' }], settings: { 'wf.ui.bandaSubtab': 'roster' }, deleted: { warbands: {}, campaigns: {} } };
const remote = { version: 1, warbands: [wb('a', '2026-09-28T09:00:00Z', 'A nube'), wb('b', '2026-09-28T11:00:00Z', 'B nube'), wb('solo-nube', '2026-09-28T07:00:00Z'), wb('borrada', '2026-09-28T07:00:00Z')],
  campaigns: [], settings: { 'wf.ui.bandaSubtab': 'variantes', 'wf-tour-seen': '1' }, deleted: { warbands: {}, campaigns: {} } };
local.deleted.warbands['borrada'] = '2026-09-28T12:00:00Z';
const M = X.mergeAppStates ? X.mergeAppStates(local, remote) : { warbands: [], campaigns: [], settings: {}, deleted: { warbands: {} } };
const byId = (id) => M.warbands.find(w => w.id === id) || {};
ok(byId('a').name === 'A local' && byId('b').name === 'B nube', 'gana la versión más reciente de cada banda');
ok(!!byId('solo-local').id && !!byId('solo-nube').id, 'se conservan las bandas que solo están en un lado');
ok(!byId('borrada').id && M.deleted.warbands['borrada'], 'una banda borrada no resucita desde la nube');
ok(M.campaigns.length === 1 && M.campaigns[0].id === 'c1', 'campañas fusionadas');
ok(M.settings['wf.ui.bandaSubtab'] === 'roster' && M.settings['wf-tour-seen'] === '1', 'ajustes: los del dispositivo mandan; los que faltan vienen de la nube');
const later = { warbands: [wb('borrada', '2026-09-28T13:00:00Z', 'recreada')], campaigns: [], settings: {}, deleted: { warbands: {}, campaigns: {} } };
ok(!!(X.mergeAppStates ? X.mergeAppStates(later, M) : { warbands: [] }).warbands.find(w => w.id === 'borrada'), 'una banda editada después del borrado sí se conserva');

console.log('\nGroup 3: navegador');
LS.clear();
X.persistWarband(wb('x', null, 'X'));
X.persistWarband(wb('y', null, 'Y'));
X.deleteWarband('y');
const S = X.serializeAppState();
ok(S.warbands.length === 1 && S.deleted && S.deleted.warbands['y'], 'borrar una banda deja marca en el estado serializado');
X.persistCampaign({ id: 'k', name: 'K', warbandIds: [], battles: [] });
X.deleteCampaignStore('k');
ok(X.serializeAppState().deleted.campaigns['k'], 'borrar una campaña deja marca');
if (X.applyMergedState) X.applyMergedState(M);
ok(X.loadIndex().map(e => e.id).sort().join() === 'a,b,solo-local,solo-nube,x', 'índice reconstruido: bandas fusionadas más las del dispositivo');
ok(LS.getItem('warband-forge-v1:borrada') === null && X.loadIndex().every(e => e.name), 'aplicar no escribe bandas borradas; índice con nombres');
ok(X.loadCampaignIndex().some(e => e.id === 'c1'), 'índice de campañas reconstruido');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
