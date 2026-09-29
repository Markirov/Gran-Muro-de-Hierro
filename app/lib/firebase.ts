import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

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
    
    // Primero, obtenemos el estado actual
    const snap = await getDoc(userDocRef);
    let data = snap.exists() ? snap.data() : { warbands: {} };
    
    if (!data.warbands) data.warbands = {};
    data.warbands[warbandId] = {
      ...warbandData,
      cloudUpdatedAt: new Date().toISOString()
    };
    
    await setDoc(userDocRef, data, { merge: true });
    return true;
  } catch (error) {
    console.error("Error saving warband to cloud:", error);
    return false;
  }
}

// Carga todas las bandas del usuario desde Firestore
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


// Guarda una campana
export async function saveCampaignToCloud(uid, campaignId, campaignData) {
  try {
    const userDocRef = doc(db, 'users', uid);
    const snap = await getDoc(userDocRef);
    let data = snap.exists() ? snap.data() : { campaigns: {} };
    if (!data.campaigns) data.campaigns = {};
    data.campaigns[campaignId] = { ...campaignData, cloudUpdatedAt: new Date().toISOString() };
    await setDoc(userDocRef, data, { merge: true });
    return true;
  } catch (error) {
    console.error('Error', error);
    return false;
  }
}
