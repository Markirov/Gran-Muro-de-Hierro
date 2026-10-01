/**
 * test_next_firebase_sync.js
 * Verificación exhaustiva del motor de sincronización bidireccional (sync_engine)
 * y persistencia en Firebase / LocalStorage.
 */

const {
  DELETED_MARKS_KEY,
  sanitizeForFirestore,
  mergeEntityList,
  mergeDeletedMarks,
  loadDeletedMarksFromStorage,
  recordDeletedMarkInStorage,
  readLocalSnapshot,
  applySyncSnapshotLocally
} = require('../app/lib/sync_engine.js');

let pass = 0;
let fail = 0;

function ok(cond, msg) {
  if (cond) {
    console.log('  ✓ ' + msg);
    pass++;
  } else {
    console.error('  ✗ ' + msg);
    fail++;
  }
}

// Mock localStorage para Node.js
const mockStorage = {};
global.localStorage = {
  getItem: (k) => (k in mockStorage ? mockStorage[k] : null),
  setItem: (k, v) => { mockStorage[k] = String(v); },
  removeItem: (k) => { delete mockStorage[k]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
  key: (i) => Object.keys(mockStorage)[i] || null,
  get length() { return Object.keys(mockStorage).length; }
};

console.log('\n--- Group 1: Sanitización para Firestore ---');
{
  const input = {
    id: 'wb_1',
    name: 'Banda Santa',
    cost: 700,
    undefVal: undefined,
    nested: {
      a: 1,
      b: undefined,
      c: [1, undefined, null, 'ok']
    }
  };
  const sanitized = sanitizeForFirestore(input);
  ok(sanitized.undefVal === null, 'convierte campos undefined a null para no romper Firestore');
  ok(sanitized.nested.b === null, 'convierte propiedades anidadas undefined a null');
  ok(sanitized.nested.c[1] === null, 'convierte elementos undefined en arrays a null');
  ok(sanitized.nested.c[3] === 'ok' && sanitized.cost === 700, 'preserva datos válidos');
}

console.log('\n--- Group 2: Fusión de marcas de borrado (Tombstones) ---');
{
  const localMarks = {
    warbands: { 'wb_a': '2026-10-01T01:00:00Z', 'wb_b': '2026-10-01T03:00:00Z' },
    campaigns: { 'c_1': '2026-10-01T02:00:00Z' }
  };
  const remoteMarks = {
    warbands: { 'wb_a': '2026-10-01T02:00:00Z', 'wb_c': '2026-10-01T01:00:00Z' },
    campaigns: { 'c_1': '2026-10-01T01:00:00Z' }
  };

  const merged = mergeDeletedMarks(localMarks, remoteMarks);
  ok(merged.warbands['wb_a'] === '2026-10-01T02:00:00Z', 'gana la marca más reciente (wb_a remoto)');
  ok(merged.warbands['wb_b'] === '2026-10-01T03:00:00Z', 'se preserva marca local exclusiva (wb_b)');
  ok(merged.warbands['wb_c'] === '2026-10-01T01:00:00Z', 'se preserva marca remota exclusiva (wb_c)');
  ok(merged.campaigns['c_1'] === '2026-10-01T02:00:00Z', 'gana la marca local más reciente en campañas');
}

console.log('\n--- Group 3: Fusión de entidades (LWW + Tombstones) ---');
{
  const localWbs = [
    { id: 'wb_1', name: 'Banda 1 Local Reciente', updatedAt: '2026-10-01T05:00:00Z' },
    { id: 'wb_2', name: 'Banda 2 Local Antigua', updatedAt: '2026-10-01T01:00:00Z' },
    { id: 'wb_local_only', name: 'Banda Solo Local', updatedAt: '2026-10-01T02:00:00Z' },
    { id: 'wb_deleted_old', name: 'Banda Borrada Antes', updatedAt: '2026-10-01T01:00:00Z' },
    { id: 'wb_recreated', name: 'Banda Recreada', updatedAt: '2026-10-01T06:00:00Z' }
  ];

  const remoteWbs = [
    { id: 'wb_1', name: 'Banda 1 Remota Antigua', updatedAt: '2026-10-01T03:00:00Z' },
    { id: 'wb_2', name: 'Banda 2 Remota Reciente', updatedAt: '2026-10-01T04:00:00Z' },
    { id: 'wb_remote_only', name: 'Banda Solo Remota', updatedAt: '2026-10-01T02:30:00Z' }
  ];

  const deletedMarks = {
    'wb_deleted_old': '2026-10-01T02:00:00Z',
    'wb_recreated': '2026-10-01T04:00:00Z'
  };

  const { merged, updatedDeleted } = mergeEntityList(localWbs, remoteWbs, deletedMarks);

  const findWb = (id) => merged.find(w => w.id === id);

  ok(findWb('wb_1')?.name === 'Banda 1 Local Reciente', 'gana la versión local si es más reciente');
  ok(findWb('wb_2')?.name === 'Banda 2 Remota Reciente', 'gana la versión remota si es más reciente');
  ok(findWb('wb_local_only') !== undefined, 'banda solo existente en local se mantiene para subida');
  ok(findWb('wb_remote_only') !== undefined, 'banda solo existente en remoto se incorpora al dispositivo');
  ok(findWb('wb_deleted_old') === undefined, 'banda con borrado posterior a su última edición se elimina');
  ok(findWb('wb_recreated')?.name === 'Banda Recreada', 'banda reeditada tras la marca de borrado se preserva');
  ok(updatedDeleted['wb_recreated'] === undefined, 'la marca de borrado se limpia si la banda fue recreada con posterioridad');
  ok(updatedDeleted['wb_deleted_old'] !== undefined, 'la marca de borrado se mantiene para la banda borrada');
}

console.log('\n--- Group 4: Aplicación y lectura en almacenamiento local ---');
{
  localStorage.clear();

  const testSnapshot = {
    warbands: [
      { id: 'wb_alpha', name: 'Alpha Warband', budgetTotal: 850, factionId: 'iron-sultanate', models: [{ name: 'M1' }, { name: 'M2' }], updatedAt: '2026-10-01T05:00:00Z' },
      { id: 'wb_beta', name: 'Beta Detachment', budgetTotal: 600, factionId: 'new-antioch', models: [{ name: 'M1' }], updatedAt: '2026-10-01T04:00:00Z' }
    ],
    campaigns: [
      { id: 'cmp_1', name: 'Campaña de Malta', warbandIds: ['wb_alpha'], battles: [{ id: 'b1' }], updatedAt: '2026-10-01T03:00:00Z' }
    ],
    deleted: {
      warbands: { 'wb_old_dead': '2026-10-01T02:00:00Z' },
      campaigns: {}
    }
  };

  // Pre-seed an obsolete item that should be deleted
  localStorage.setItem('warband-forge-v1:wb_old_dead', JSON.stringify({ id: 'wb_old_dead', name: 'Dead' }));
  localStorage.setItem('warband-forge-v1:current', 'wb_old_dead');

  applySyncSnapshotLocally(testSnapshot);

  // Verificaciones en storage
  ok(localStorage.getItem('warband-forge-v1:wb_alpha') !== null, 'wb_alpha guardada en localStorage');
  ok(localStorage.getItem('warband-forge-v1:wb_beta') !== null, 'wb_beta guardada en localStorage');
  ok(localStorage.getItem('warband-forge-v1:c_cmp_1') !== null, 'campaña guardada en localStorage con prefijo c_');
  ok(localStorage.getItem('warband-forge-v1:wb_old_dead') === null, 'wb_old_dead purgada del localStorage');
  ok(localStorage.getItem('warband-forge-v1:current') === null, 'current purgado al ser borrado');

  // Comprobar índice de bandas reconstruido
  const rawWbIdx = localStorage.getItem('warband-forge-index');
  ok(rawWbIdx !== null, 'índice de bandas generado');
  const wbIdx = JSON.parse(rawWbIdx);
  ok(wbIdx.length === 2, 'índice contiene exactamente 2 bandas');
  ok(wbIdx.find(w => w.id === 'wb_alpha')?.cost === 850, 'coste correcto en índice de bandas');
  ok(wbIdx.find(w => w.id === 'wb_alpha')?.models === 2, 'número de miniaturas correcto en índice');

  // Comprobar índice de campañas reconstruido
  const rawCmpIdx = localStorage.getItem('warband-forge-v1:campaign-index');
  ok(rawCmpIdx !== null, 'índice de campañas generado');
  const cmpIdx = JSON.parse(rawCmpIdx);
  ok(cmpIdx.length === 1 && cmpIdx[0].id === 'cmp_1', 'índice de campañas contiene cmp_1');
  ok(cmpIdx[0].warbands === 1 && cmpIdx[0].battles === 1, 'métricas de campaña correctas');

  // Leer snapshot completo desde storage
  const readBack = readLocalSnapshot();
  ok(readBack.warbands.length === 2, 'readLocalSnapshot lee correctamente las 2 bandas');
  ok(readBack.campaigns.length === 1, 'readLocalSnapshot lee correctamente la campaña');
  ok(readBack.deleted.warbands['wb_old_dead'] !== undefined, 'readLocalSnapshot preserva marcas de borrado');
}

console.log('\n--- Group 5: Registro de borrado manual ---');
{
  recordDeletedMarkInStorage('warbands', 'wb_target', '2026-10-01T07:00:00Z');
  const marks = loadDeletedMarksFromStorage();
  ok(marks.warbands['wb_target'] === '2026-10-01T07:00:00Z', 'recordDeletedMarkInStorage registra la fecha exacta en localStorage');
}

console.log(`\n========================================`);
console.log(`Resultado: ${pass} ✓ pasados, ${fail} ✗ fallados`);
console.log(`========================================\n`);

if (fail > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
