'use client';
import { useEffect, useState, useCallback } from 'react';
import { auth, loginWithGoogle, logout, syncUserCloudAndLocal } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

export function AuthSyncButton() {
  const [user, setUser] = useState<User | null>(null);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const handleSync = useCallback(async (uid?: string) => {
    const targetUid = uid || user?.uid;
    if (!targetUid || syncing) return;

    setSyncing(true);
    setSyncStatus('idle');
    try {
      const res = await syncUserCloudAndLocal(targetUid);
      if (res.success) {
        setSyncStatus('success');
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        setLastSyncTime(timeStr);
      } else {
        setSyncStatus('error');
      }
    } catch (e) {
      console.error('Error during cloud sync:', e);
      setSyncStatus('error');
    } finally {
      setSyncing(false);
    }
  }, [user?.uid, syncing]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        handleSync(u.uid);
      } else {
        setSyncStatus('idle');
      }
    });
    return () => unsub();
  }, [handleSync]);

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (e) {
      console.error('Login failed:', e);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setSyncStatus('idle');
    } catch (e) {
      console.error('Logout failed:', e);
    }
  };

  if (!user) {
    return (
      <button
        onClick={handleLogin}
        type="button"
        className="bg-[#2a1610] hover:bg-[#3d2017] text-[#e2d4b7] hover:text-white border border-[#b8863c] px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-sm cursor-pointer"
        title="Inicia sesión con Google para sincronizar tus bandas y campañas en la nube"
      >
        <span className="text-[#4285F4] font-black text-sm">G</span>
        <span className="hidden sm:inline">Iniciar Sesión (Nube)</span>
        <span className="sm:hidden">Nube</span>
      </button>
    );
  }

  const displayName = user.displayName || user.email?.split('@')[0] || 'Cruzado';

  return (
    <div className="flex items-center gap-2 bg-[#1a0f0a]/90 border border-[#5c3a21] rounded-lg px-2.5 py-1 text-xs">
      <div className="flex items-center gap-1.5">
        {user.photoURL ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={user.photoURL}
            alt={displayName}
            className="w-5 h-5 rounded-full border border-[#b8863c]/50 object-cover"
          />
        ) : (
          <span className="text-sm">👤</span>
        )}
        <span className="text-[#b8863c] font-bold max-w-[100px] sm:max-w-[140px] truncate" title={user.email || displayName}>
          {displayName}
        </span>
      </div>

      <div className="h-3.5 w-px bg-[#5c3a21] mx-0.5" />

      {/* Botón de sincronización */}
      <button
        onClick={() => handleSync()}
        disabled={syncing}
        type="button"
        className={`px-2 py-0.5 rounded flex items-center gap-1.5 transition-all cursor-pointer font-medium ${
          syncing
            ? 'bg-[#3a2110] text-[#b8863c] animate-pulse'
            : syncStatus === 'error'
            ? 'bg-red-950/60 border border-red-700/60 text-red-300 hover:bg-red-900/60'
            : 'bg-[#2a1610] hover:bg-[#5c3a21] text-[#e2d4b7] border border-[#5c3a21]'
        }`}
        title={
          syncing
            ? 'Sincronizando con Firestore...'
            : syncStatus === 'error'
            ? 'Error al sincronizar con la nube. Pulsa para reintentar.'
            : lastSyncTime
            ? `Sincronizado a las ${lastSyncTime}. Pulsa para sincronizar ahora.`
            : 'Sincronizar bandas y campañas con Firestore'
        }
      >
        <span className={syncing ? 'animate-spin' : ''}>
          {syncing ? '🔄' : syncStatus === 'error' ? '⚠️' : '☁'}
        </span>
        <span className="hidden md:inline">
          {syncing ? 'Sincronizando' : syncStatus === 'error' ? 'Reintentar' : 'Sync'}
        </span>
      </button>

      {/* Botón cerrar sesión */}
      <button
        onClick={handleLogout}
        type="button"
        className="text-[#8c7866] hover:text-[#e2d4b7] px-1 py-0.5 rounded text-xs transition-colors cursor-pointer"
        title="Cerrar sesión"
      >
        ✕
      </button>
    </div>
  );
}
