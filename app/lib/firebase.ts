import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, deleteField } from 'firebase/firestore';
import {
  sanitizeForFirestore,
  readLocalSnapshot,
  applySyncSnapshotLocally,
  mergeEntityList,
  mergeDeletedMarks
} from './sync_engine';

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBYu_vNIewXBSFWwCnBkGesUmnE5DxMkls",
  authDomain: "murodehierrodelsultanato.firebaseapp.com",
  projectId: "murodehierrodelsultanato",
  storageBucket: "murodehierrodelsultanato.firebasestorage.app",
  messagingSenderId: "213214152556",
  appId: "1:213214152556:web:79e32c4d3ee9afd7fed549",
};

// Initialize Firebase only once
const app = !getApps().length ? initializeApp(FIREBASE_CONFIG) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    if (result.user) {
      await syncUserCloudAndLocal(result.user.uid);
    }
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
}

export async function logout() {
  return signOut(auth);
}

// Guarda una banda en la colección 'users/{uid}'
export async function saveWarbandToCloud(uid: string, warbandId: string, warbandData: any) {
  try {
    const userDocRef = doc(db, 'users', uid);
    const sanitizedData = sanitizeForFirestore(warbandData);
    sanitizedData.cloudUpdatedAt = new Date().toISOString();

    await setDoc(userDocRef, {
      warbands: {
        [warbandId]: sanitizedData
      }
    }, { merge: true });
    return true;
  } catch (error) {
    console.error("Error saving warband to cloud:", error);
    return false;
  }
}

// Elimina una banda de Firestore y anota la marca de borrado
export async function deleteWarbandFromCloud(uid: string, warbandId: string) {
  try {
    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, {
      warbands: {
        [warbandId]: deleteField()
      },
      deleted: {
        warbands: {
          [warbandId]: new Date().toISOString()
        }
      }
    }, { merge: true });
    return true;
  } catch (error) {
    console.error("Error deleting warband from cloud:", error);
    return false;
  }
}

// Guarda una campaña en Firestore
export async function saveCampaignToCloud(uid: string, campaignId: string, campaignData: any) {
  try {
    const userDocRef = doc(db, 'users', uid);
    const sanitizedData = sanitizeForFirestore(campaignData);
    sanitizedData.cloudUpdatedAt = new Date().toISOString();

    await setDoc(userDocRef, {
      campaigns: {
        [campaignId]: sanitizedData
      }
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving campaign to cloud:', error);
    return false;
  }
}

// Elimina una campaña de Firestore y anota la marca de borrado
export async function deleteCampaignFromCloud(uid: string, campaignId: string) {
  try {
    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, {
      campaigns: {
        [campaignId]: deleteField()
      },
      deleted: {
        campaigns: {
          [campaignId]: new Date().toISOString()
        }
      }
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error deleting campaign from cloud:', error);
    return false;
  }
}

// Carga todas las bandas y campañas del usuario desde Firestore
export async function fetchUserCloudState(uid: string) {
  try {
    const userDocRef = doc(db, 'users', uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (error) {
    console.error("Error fetching cloud state:", error);
    return null;
  }
}

/**
 * Sincronización bidireccional completa entre el navegador local y Firestore
 */
export async function syncUserCloudAndLocal(uid: string): Promise<{
  success: boolean;
  warbandsCount?: number;
  campaignsCount?: number;
  error?: string;
}> {
  try {
    const localSnapshot = readLocalSnapshot();
    const cloudState = await fetchUserCloudState(uid);

    const remoteWbs = cloudState?.warbands ? Object.values(cloudState.warbands) : [];
    const remoteCmps = cloudState?.campaigns ? Object.values(cloudState.campaigns) : [];
    const remoteDeleted = cloudState?.deleted || { warbands: {}, campaigns: {} };

    // 1. Fusionar marcas de borrado
    const mergedDeleted = mergeDeletedMarks(localSnapshot.deleted, remoteDeleted);

    // 2. Fusionar bandas
    const { merged: mergedWbs, updatedDeleted: delAfterWbs } = mergeEntityList(
      localSnapshot.warbands,
      remoteWbs,
      mergedDeleted.warbands
    );

    // 3. Fusionar campañas
    const { merged: mergedCmps, updatedDeleted: delAfterCmps } = mergeEntityList(
      localSnapshot.campaigns,
      remoteCmps,
      mergedDeleted.campaigns
    );

    const finalDeleted = {
      warbands: delAfterWbs,
      campaigns: delAfterCmps
    };

    // 4. Aplicar al navegador y reconstruir índices
    applySyncSnapshotLocally({
      warbands: mergedWbs,
      campaigns: mergedCmps,
      deleted: finalDeleted
    });

    // 5. Persistir el estado sincronizado en Firestore
    const userDocRef = doc(db, 'users', uid);
    const cloudPayload: any = {
      warbands: {},
      campaigns: {},
      deleted: finalDeleted,
      lastSyncAt: new Date().toISOString()
    };
    for (const wb of mergedWbs) {
      if (wb && wb.id) cloudPayload.warbands[wb.id] = sanitizeForFirestore(wb);
    }
    for (const cmp of mergedCmps) {
      if (cmp && cmp.id) cloudPayload.campaigns[cmp.id] = sanitizeForFirestore(cmp);
    }

    await setDoc(userDocRef, cloudPayload);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('warband-forge-synced', {
        detail: {
          warbandsCount: mergedWbs.length,
          campaignsCount: mergedCmps.length,
          timestamp: Date.now()
        }
      }));
    }

    return {
      success: true,
      warbandsCount: mergedWbs.length,
      campaignsCount: mergedCmps.length
    };
  } catch (error) {
    console.error("Error syncing cloud and local state:", error);
    return {
      success: false,
      error: String(error)
    };
  }
}
