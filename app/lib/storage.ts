import { auth, saveWarbandToCloud, db } from './firebase';
import { doc, setDoc, deleteField } from 'firebase/firestore';

export async function saveWarbandLocallyAndCloud(warbandId: string, warbandData: any) {
  // Update updatedAt
  warbandData.updatedAt = new Date().toISOString();
  
  // 1. Guardar en LocalStorage
  localStorage.setItem(`warband-forge-v1:${warbandId}`, JSON.stringify(warbandData));
  
  // 2. Actualizar el Index Local
  try {
    const rawIdx = localStorage.getItem('warband-forge-index');
    let idx: any[] = rawIdx ? JSON.parse(rawIdx) : [];
    const existing = idx.find(i => i.id === warbandId);
    if (existing) {
      Object.assign(existing, { 
        name: warbandData.name, 
        cost: warbandData.cost, 
        factionId: warbandData.factionId, 
        updatedAt: warbandData.updatedAt 
      });
    } else {
      idx.push({ 
        id: warbandId, 
        name: warbandData.name, 
        cost: warbandData.cost, 
        factionId: warbandData.factionId, 
        updatedAt: warbandData.updatedAt 
      });
    }
    localStorage.setItem('warband-forge-index', JSON.stringify(idx));
  } catch (e) {
    console.error("Index save error", e);
  }

  // 3. Guardar en Firebase (si está logueado)
  const user = auth.currentUser;
  if (user) {
    await saveWarbandToCloud(user.uid, warbandId, warbandData);
  }
}

export async function deleteWarbandLocallyAndCloud(warbandId: string) {
  // 1. Borrar de LocalStorage
  localStorage.removeItem(`warband-forge-v1:${warbandId}`);
  
  // 2. Actualizar el Index Local
  try {
    const rawIdx = localStorage.getItem('warband-forge-index');
    let idx = rawIdx ? JSON.parse(rawIdx) : [];
    idx = idx.filter((i: any) => i.id !== warbandId);
    localStorage.setItem('warband-forge-index', JSON.stringify(idx));
  } catch (e) {
    console.error("Index save error", e);
  }

  // 3. Borrar de Firebase (si está logueado)
  const user = auth.currentUser;
  if (user) {
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        warbands: {
          [warbandId]: deleteField()
        }
      }, { merge: true });
    } catch (error) {
      console.error("Error deleting warband from cloud:", error);
    }
  }
}
