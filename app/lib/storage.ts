import {
  auth,
  saveWarbandToCloud,
  deleteWarbandFromCloud,
  saveCampaignToCloud,
  deleteCampaignFromCloud,
  syncUserCloudAndLocal,
  loginWithGoogle,
  logout
} from './firebase';
import {
  sanitizeForFirestore,
  recordDeletedMarkInStorage,
  loadDeletedMarksFromStorage,
  DELETED_MARKS_KEY
} from './sync_engine';

export { syncUserCloudAndLocal, loginWithGoogle, logout };

export async function saveWarbandLocallyAndCloud(warbandId: string, warbandData: any) {
  // 1. Actualizar updatedAt y sanear
  warbandData.updatedAt = new Date().toISOString();
  const cleanData = sanitizeForFirestore(warbandData);
  
  // 2. Guardar en LocalStorage
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(`warband-forge-v1:${warbandId}`, JSON.stringify(cleanData));
    
    // Si tenía marca de borrado, la limpiamos al haberse editado/guardado de nuevo
    const marks = loadDeletedMarksFromStorage();
    if (marks.warbands[warbandId]) {
      delete marks.warbands[warbandId];
      localStorage.setItem(DELETED_MARKS_KEY, JSON.stringify(marks));
    }

    // 3. Actualizar el índice local
    try {
      const rawIdx = localStorage.getItem('warband-forge-index');
      let idx: any[] = rawIdx ? JSON.parse(rawIdx) : [];
      const existing = idx.find(i => i.id === warbandId);
      const entry = {
        id: warbandId,
        name: cleanData.name || 'Sin nombre',
        cost: cleanData.budgetTotal ?? cleanData.cost ?? 0,
        factionId: cleanData.factionId,
        models: Array.isArray(cleanData.models) ? cleanData.models.length : 0,
        updatedAt: cleanData.updatedAt
      };
      if (existing) {
        Object.assign(existing, entry);
      } else {
        idx.push(entry);
      }
      localStorage.setItem('warband-forge-index', JSON.stringify(idx));
    } catch (e) {
      console.error("Index save error", e);
    }
  }

  // 4. Guardar en Firebase (si está autenticado)
  const user = auth.currentUser;
  if (user) {
    await saveWarbandToCloud(user.uid, warbandId, cleanData);
  }
}

export async function deleteWarbandLocallyAndCloud(warbandId: string) {
  // 1. Registrar marca de borrado (tombstone) para sincronización entre dispositivos
  recordDeletedMarkInStorage('warbands', warbandId);

  // 2. Borrar de LocalStorage
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(`warband-forge-v1:${warbandId}`);
    
    // 3. Actualizar el índice local
    try {
      const rawIdx = localStorage.getItem('warband-forge-index');
      let idx = rawIdx ? JSON.parse(rawIdx) : [];
      idx = idx.filter((i: any) => i.id !== warbandId);
      localStorage.setItem('warband-forge-index', JSON.stringify(idx));
    } catch (e) {
      console.error("Index save error", e);
    }
  }

  // 4. Borrar de Firebase (si está autenticado)
  const user = auth.currentUser;
  if (user) {
    await deleteWarbandFromCloud(user.uid, warbandId);
  }
}

export async function saveCampaignLocallyAndCloud(campaignId: string, campaignData: any) {
  campaignData.updatedAt = new Date().toISOString();
  const cleanData = sanitizeForFirestore(campaignData);

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(`warband-forge-v1:c_${campaignId}`, JSON.stringify(cleanData));

    const marks = loadDeletedMarksFromStorage();
    if (marks.campaigns[campaignId]) {
      delete marks.campaigns[campaignId];
      localStorage.setItem(DELETED_MARKS_KEY, JSON.stringify(marks));
    }

    try {
      const rawIdx = localStorage.getItem('warband-forge-v1:campaign-index');
      let idx: any[] = rawIdx ? JSON.parse(rawIdx) : [];
      const existing = idx.find(i => i.id === campaignId);
      const entry = {
        id: campaignId,
        name: cleanData.name || 'Sin nombre',
        warbands: cleanData.warbandIds?.length || 0,
        battles: cleanData.battles?.length || 0,
        updatedAt: cleanData.updatedAt
      };
      if (existing) {
        Object.assign(existing, entry);
      } else {
        idx.push(entry);
      }
      localStorage.setItem('warband-forge-v1:campaign-index', JSON.stringify(idx));
    } catch (e) {
      console.error(e);
    }
  }

  const user = auth.currentUser;
  if (user) {
    await saveCampaignToCloud(user.uid, campaignId, cleanData);
  }
}

export async function deleteCampaignLocallyAndCloud(campaignId: string) {
  recordDeletedMarkInStorage('campaigns', campaignId);

  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(`warband-forge-v1:c_${campaignId}`);
    try {
      const rawIdx = localStorage.getItem('warband-forge-v1:campaign-index');
      let idx = rawIdx ? JSON.parse(rawIdx) : [];
      idx = idx.filter((i: any) => i.id !== campaignId);
      localStorage.setItem('warband-forge-v1:campaign-index', JSON.stringify(idx));
    } catch (e) {
      console.error(e);
    }
  }

  const user = auth.currentUser;
  if (user) {
    await deleteCampaignFromCloud(user.uid, campaignId);
  }
}
