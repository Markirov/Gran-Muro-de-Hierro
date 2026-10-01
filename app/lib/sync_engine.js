/**
 * sync_engine.js
 * Companion CommonJS para pruebas automatizadas y soporte universal.
 */

const DELETED_MARKS_KEY = 'warband-forge-deleted';

function sanitizeForFirestore(obj) {
  if (obj === undefined) return null;
  return JSON.parse(JSON.stringify(obj, (k, v) => (v === undefined ? null : v)));
}

function mergeEntityList(localList, remoteList, deletedMap) {
  const ts = (x) => String((x && (x.updatedAt || x.cloudUpdatedAt)) || '');
  const map = new Map();

  const allItems = [...(remoteList || []), ...(localList || [])];
  for (const item of allItems) {
    if (!item || !item.id) continue;
    const existing = map.get(item.id);
    if (!existing || ts(item) >= ts(existing)) {
      map.set(item.id, item);
    }
  }

  const merged = [];
  const updatedDeleted = { ...(deletedMap || {}) };

  for (const [id, item] of map.entries()) {
    const delTime = updatedDeleted[id];
    const itemTime = ts(item);

    if (delTime && delTime >= itemTime) {
      continue;
    }

    if (delTime && itemTime > delTime) {
      delete updatedDeleted[id];
    }

    merged.push(item);
  }

  return { merged, updatedDeleted };
}

function mergeDeletedMarks(localMarks, remoteMarks) {
  const result = {
    warbands: {},
    campaigns: {}
  };

  const kinds = ['warbands', 'campaigns'];
  for (const kind of kinds) {
    const loc = (localMarks && localMarks[kind]) || {};
    const rem = (remoteMarks && remoteMarks[kind]) || {};
    const keys = new Set([...Object.keys(loc), ...Object.keys(rem)]);
    for (const key of keys) {
      const tLoc = loc[key] || '';
      const tRem = rem[key] || '';
      result[kind][key] = tLoc >= tRem ? tLoc : tRem;
    }
  }

  return result;
}

function loadDeletedMarksFromStorage() {
  if (typeof localStorage === 'undefined') return { warbands: {}, campaigns: {} };
  try {
    const raw = localStorage.getItem(DELETED_MARKS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      warbands: (parsed && parsed.warbands) || {},
      campaigns: (parsed && parsed.campaigns) || {}
    };
  } catch (e) {
    return { warbands: {}, campaigns: {} };
  }
}

function recordDeletedMarkInStorage(kind, id, timestamp) {
  const marks = loadDeletedMarksFromStorage();
  marks[kind][id] = timestamp || new Date().toISOString();
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(DELETED_MARKS_KEY, JSON.stringify(marks));
    } catch (e) {
      console.error('Error saving deleted marks:', e);
    }
  }
  return marks;
}

function readLocalSnapshot() {
  if (typeof localStorage === 'undefined') {
    return { warbands: [], campaigns: [], deleted: { warbands: {}, campaigns: {} } };
  }

  const warbands = [];
  const campaigns = [];
  const deleted = loadDeletedMarksFromStorage();

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      if (key.startsWith('warband-forge-v1:c_')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const cmp = JSON.parse(raw);
            if (cmp && cmp.id) campaigns.push(cmp);
          } catch (e) {}
        }
      } else if (key.startsWith('warband-forge-v1:') && key !== 'warband-forge-v1:current') {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const wb = JSON.parse(raw);
            if (wb && wb.id) warbands.push(wb);
          } catch (e) {}
        }
      }
    }
  } catch (e) {
    console.error('Error reading local snapshot:', e);
  }

  return { warbands, campaigns, deleted };
}

function applySyncSnapshotLocally(snapshot) {
  if (typeof localStorage === 'undefined') return;

  const wbIndex = [];
  for (const wb of (snapshot.warbands || [])) {
    if (!wb || !wb.id) continue;
    try {
      localStorage.setItem(`warband-forge-v1:${wb.id}`, JSON.stringify(wb));
      wbIndex.push({
        id: wb.id,
        name: wb.name || 'Sin nombre',
        cost: wb.budgetTotal ?? wb.cost ?? (Array.isArray(wb.models) ? wb.models.length * 10 : 0),
        factionId: wb.factionId || '',
        models: Array.isArray(wb.models) ? wb.models.length : 0,
        updatedAt: wb.updatedAt || wb.cloudUpdatedAt || new Date().toISOString()
      });
    } catch (e) {
      console.error(`Error saving warband ${wb.id} locally:`, e);
    }
  }

  const cmpIndex = [];
  for (const cmp of (snapshot.campaigns || [])) {
    if (!cmp || !cmp.id) continue;
    try {
      localStorage.setItem(`warband-forge-v1:c_${cmp.id}`, JSON.stringify(cmp));
      cmpIndex.push({
        id: cmp.id,
        name: cmp.name || 'Sin nombre',
        warbands: Array.isArray(cmp.warbandIds) ? cmp.warbandIds.length : 0,
        battles: Array.isArray(cmp.battles) ? cmp.battles.length : 0,
        updatedAt: cmp.updatedAt || cmp.cloudUpdatedAt || new Date().toISOString()
      });
    } catch (e) {
      console.error(`Error saving campaign ${cmp.id} locally:`, e);
    }
  }

  const delWarbands = (snapshot.deleted && snapshot.deleted.warbands) || {};
  for (const id of Object.keys(delWarbands)) {
    const isPresent = (snapshot.warbands || []).some(w => w.id === id);
    if (!isPresent) {
      localStorage.removeItem(`warband-forge-v1:${id}`);
      if (localStorage.getItem('warband-forge-v1:current') === id) {
        localStorage.removeItem('warband-forge-v1:current');
      }
    }
  }

  const delCampaigns = (snapshot.deleted && snapshot.deleted.campaigns) || {};
  for (const id of Object.keys(delCampaigns)) {
    const isPresent = (snapshot.campaigns || []).some(c => c.id === id);
    if (!isPresent) {
      localStorage.removeItem(`warband-forge-v1:c_${id}`);
    }
  }

  try {
    localStorage.setItem('warband-forge-index', JSON.stringify(wbIndex));
    localStorage.setItem('warband-forge-v1:campaign-index', JSON.stringify(cmpIndex));
    localStorage.setItem(DELETED_MARKS_KEY, JSON.stringify(snapshot.deleted || { warbands: {}, campaigns: {} }));
  } catch (e) {
    console.error('Error writing indexes locally:', e);
  }
}

module.exports = {
  DELETED_MARKS_KEY,
  sanitizeForFirestore,
  mergeEntityList,
  mergeDeletedMarks,
  loadDeletedMarksFromStorage,
  recordDeletedMarkInStorage,
  readLocalSnapshot,
  applySyncSnapshotLocally
};
