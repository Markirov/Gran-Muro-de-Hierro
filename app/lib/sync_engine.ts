/**
 * sync_engine.ts
 * Motor de sincronización bidireccional y persistencia nube (Firebase Firestore)
 * Implementa Last-Write-Wins (LWW) con marcas de borrado (tombstones).
 */

export interface WarbandIndexEntry {
  id: string;
  name: string;
  cost: number;
  factionId: string;
  models: number;
  updatedAt: string;
}

export interface CampaignIndexEntry {
  id: string;
  name: string;
  warbands: number;
  battles: number;
  updatedAt: string;
}

export interface DeletedMarks {
  warbands: Record<string, string>;
  campaigns: Record<string, string>;
}

export interface LocalSyncSnapshot {
  warbands: any[];
  campaigns: any[];
  deleted: DeletedMarks;
}

export interface CloudUserDoc {
  warbands?: Record<string, any>;
  campaigns?: Record<string, any>;
  deleted?: {
    warbands?: Record<string, string>;
    campaigns?: Record<string, string>;
  };
  lastSyncAt?: string;
}

export const DELETED_MARKS_KEY = 'warband-forge-deleted';

export function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) return null;
  return JSON.parse(JSON.stringify(obj, (k, v) => (v === undefined ? null : v)));
}

/**
 * Fusiona dos listas de entidades (bandas o campañas) resolviendo conflictos por updatedAt
 * y respetando marcas de borrado (tombstones).
 */
export function mergeEntityList<T extends { id: string; updatedAt?: string; cloudUpdatedAt?: string }>(
  localList: T[],
  remoteList: T[],
  deletedMap: Record<string, string>
): { merged: T[]; updatedDeleted: Record<string, string> } {
  const ts = (x: any) => String(x?.updatedAt || x?.cloudUpdatedAt || '');
  const map = new Map<string, T>();

  const allItems = [...(remoteList || []), ...(localList || [])];
  for (const item of allItems) {
    if (!item || !item.id) continue;
    const existing = map.get(item.id);
    if (!existing || ts(item) >= ts(existing)) {
      map.set(item.id, item);
    }
  }

  const merged: T[] = [];
  const updatedDeleted: Record<string, string> = { ...(deletedMap || {}) };

  for (const [id, item] of map.entries()) {
    const delTime = updatedDeleted[id];
    const itemTime = ts(item);

    if (delTime && delTime >= itemTime) {
      // El ítem fue borrado después o en el mismo instante de su última edición
      continue;
    }

    if (delTime && itemTime > delTime) {
      // El ítem fue re-editado o recreado tras haber sido borrado; se limpia la marca
      delete updatedDeleted[id];
    }

    merged.push(item);
  }

  return { merged, updatedDeleted };
}

/**
 * Fusiona marcas de borrado locales y remotas quedándose con la más reciente.
 */
export function mergeDeletedMarks(
  localMarks?: Partial<DeletedMarks>,
  remoteMarks?: Partial<DeletedMarks>
): DeletedMarks {
  const result: DeletedMarks = {
    warbands: {},
    campaigns: {}
  };

  const kinds: Array<'warbands' | 'campaigns'> = ['warbands', 'campaigns'];
  for (const kind of kinds) {
    const loc = localMarks?.[kind] || {};
    const rem = remoteMarks?.[kind] || {};
    const keys = new Set([...Object.keys(loc), ...Object.keys(rem)]);
    for (const key of keys) {
      const tLoc = loc[key] || '';
      const tRem = rem[key] || '';
      result[kind][key] = tLoc >= tRem ? tLoc : tRem;
    }
  }

  return result;
}

/**
 * Lee marcas de borrado desde localStorage.
 */
export function loadDeletedMarksFromStorage(): DeletedMarks {
  if (typeof localStorage === 'undefined') return { warbands: {}, campaigns: {} };
  try {
    const raw = localStorage.getItem(DELETED_MARKS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      warbands: parsed?.warbands || {},
      campaigns: parsed?.campaigns || {}
    };
  } catch (e) {
    return { warbands: {}, campaigns: {} };
  }
}

/**
 * Registra una marca de borrado en localStorage.
 */
export function recordDeletedMarkInStorage(kind: 'warbands' | 'campaigns', id: string, timestamp?: string): DeletedMarks {
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

/**
 * Lee el estado local completo (bandas, campañas y marcas de borrado).
 */
export function readLocalSnapshot(): LocalSyncSnapshot {
  if (typeof localStorage === 'undefined') {
    return { warbands: [], campaigns: [], deleted: { warbands: {}, campaigns: {} } };
  }

  const warbands: any[] = [];
  const campaigns: any[] = [];
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

/**
 * Aplica el estado fusionado en localStorage y reconstruye los índices.
 */
export function applySyncSnapshotLocally(snapshot: {
  warbands: any[];
  campaigns: any[];
  deleted: DeletedMarks;
}): void {
  if (typeof localStorage === 'undefined') return;

  // 1. Guardar bandas
  const wbIndex: WarbandIndexEntry[] = [];
  for (const wb of snapshot.warbands) {
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

  // 2. Guardar campañas
  const cmpIndex: CampaignIndexEntry[] = [];
  for (const cmp of snapshot.campaigns) {
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

  // 3. Purgar bandas y campañas borradas de localStorage
  for (const id of Object.keys(snapshot.deleted.warbands || {})) {
    const isPresent = snapshot.warbands.some(w => w.id === id);
    if (!isPresent) {
      localStorage.removeItem(`warband-forge-v1:${id}`);
      if (localStorage.getItem('warband-forge-v1:current') === id) {
        localStorage.removeItem('warband-forge-v1:current');
      }
    }
  }

  for (const id of Object.keys(snapshot.deleted.campaigns || {})) {
    const isPresent = snapshot.campaigns.some(c => c.id === id);
    if (!isPresent) {
      localStorage.removeItem(`warband-forge-v1:c_${id}`);
    }
  }

  // 4. Escribir índices y marcas
  try {
    localStorage.setItem('warband-forge-index', JSON.stringify(wbIndex));
    localStorage.setItem('warband-forge-v1:campaign-index', JSON.stringify(cmpIndex));
    localStorage.setItem(DELETED_MARKS_KEY, JSON.stringify(snapshot.deleted));
  } catch (e) {
    console.error('Error writing indexes locally:', e);
  }
}
