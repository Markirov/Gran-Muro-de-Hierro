'use client';
import { useEffect, useState } from 'react';
import { auth, loginWithGoogle, logout, fetchUserCloudState } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        // Auto-sync al loguear
        syncWithCloud(u.uid);
      }
    });
    return () => unsub();
  }, []);

  const syncWithCloud = async (uid: string) => {
    setSyncing(true);
    try {
      const state = await fetchUserCloudState(uid);
      if (state && state.warbands) {
        // Simple merge: si la nube tiene bandas, las guardamos en local
        Object.keys(state.warbands).forEach(id => {
          localStorage.setItem(`warband-forge-v1:${id}`, JSON.stringify(state.warbands[id]));
        });
        
        // Reconstruir el index de bandas localmente (merge simple)
        try {
          const rawIdx = localStorage.getItem('warband-forge-index');
          let localIdx: any[] = rawIdx ? JSON.parse(rawIdx) : [];
          
          Object.keys(state.warbands).forEach(id => {
            const wb = state.warbands[id];
            const existing = localIdx.find(i => i.id === wb.id);
            if (existing) {
              if (new Date(wb.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
                Object.assign(existing, { name: wb.name, cost: wb.cost, factionId: wb.factionId, updatedAt: wb.updatedAt });
              }
            } else {
              localIdx.push({ id: wb.id, name: wb.name, cost: wb.cost, factionId: wb.factionId, updatedAt: wb.updatedAt });
            }
          });
          localStorage.setItem('warband-forge-index', JSON.stringify(localIdx));
        } catch (e) {
          console.error("Index merge failed", e);
        }
      }
    } catch (error) {
      console.error(error);
    }
    setSyncing(false);
  };

  return (
    <div className="landing-bg min-h-screen flex flex-col items-center text-[#e2d4b7] font-sans">
      <header className="w-full p-8 text-center border-b border-[#5c3a21] bg-black/50 relative flex justify-between items-center">
        <div className="flex flex-col text-left">
          {user ? (
            <div className="flex flex-col gap-1">
              <div className="text-[#b8863c] font-bold text-sm">👤 {user.displayName}</div>
              <div className="flex gap-2">
                <button 
                  onClick={() => syncWithCloud(user.uid)} 
                  disabled={syncing}
                  className="bg-[#5c3a21] text-[#e2d4b7] px-2 py-1 rounded text-xs hover:bg-[#b8863c] transition-colors"
                >
                  {syncing ? 'Sincronizando...' : '☁ Sync Nube'}
                </button>
                <button 
                  onClick={logout} 
                  className="bg-transparent border border-[#5c3a21] text-[#9e9178] px-2 py-1 rounded text-xs hover:text-[#e2d4b7]"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={loginWithGoogle}
              className="bg-white text-black px-4 py-2 rounded font-bold text-sm flex items-center gap-2 hover:bg-gray-200 transition-colors"
            >
              <span className="text-blue-500">G</span> Iniciar sesión (Sync Nube)
            </button>
          )}
        </div>

        <div className="text-center absolute left-1/2 -translate-x-1/2">
          <h1 className="font-serif text-[#b8863c] uppercase tracking-widest m-0 text-4xl">WARBAND FORGE</h1>
          <span className="text-[#9e9178] text-base uppercase tracking-widest block mt-2">Trench Crusade</span>
        </div>

        <button 
          className="bg-transparent border border-[#5c3a21] text-[#b8863c] text-2xl cursor-pointer p-2 rounded transition-colors hover:bg-[#5c3a21] hover:text-[#e2d4b7]"
          onClick={() => window.location.href = 'app.html?mode=banda&settings=1'}
          title="Configuración"
        >
          ⚙
        </button>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 w-full max-w-4xl p-16 box-border">
        <a href="/bandas" className="bg-[#2a1610] border border-[#5c3a21] rounded p-12 text-center no-underline text-[#b8863c] font-serif uppercase transition-all hover:bg-[#5c3a21] hover:text-[#e2d4b7] hover:-translate-y-1 hover:shadow-xl hover:border-[#b8863c] flex flex-col items-center gap-4">
          <span className="text-6xl opacity-90">⚔</span>
          <h2 className="text-3xl m-0">Bandas</h2>
          <span className="font-sans text-base text-[#9e9178] normal-case tracking-normal">Crear, importar y gestionar tus warbands</span>
        </a>
        <a href="/campana" className="bg-[#2a1610] border border-[#5c3a21] rounded p-12 text-center no-underline text-[#b8863c] font-serif uppercase transition-all hover:bg-[#5c3a21] hover:text-[#e2d4b7] hover:-translate-y-1 hover:shadow-xl hover:border-[#b8863c] flex flex-col items-center gap-4">
          <span className="text-6xl opacity-90">📚</span>
          <h2 className="text-3xl m-0">Campañas</h2>
          <span className="font-sans text-base text-[#9e9178] normal-case tracking-normal">Juega crónicas narrativas y progresión</span>
        </a>
        <a href="/lab" className="bg-[#2a1610] border border-[#5c3a21] rounded p-12 text-center no-underline text-[#b8863c] font-serif uppercase transition-all hover:bg-[#5c3a21] hover:text-[#e2d4b7] hover:-translate-y-1 hover:shadow-xl hover:border-[#b8863c] flex flex-col items-center gap-4">
          <span className="text-6xl opacity-90">🔬</span>
          <h2 className="text-3xl m-0">Lab</h2>
          <span className="font-sans text-base text-[#9e9178] normal-case tracking-normal">Simula batallas y cruza estadísticas</span>
        </a>
        <a href="/partida" className="bg-[#2a1610] border border-[#5c3a21] rounded p-12 text-center no-underline text-[#b8863c] font-serif uppercase transition-all hover:bg-[#5c3a21] hover:text-[#e2d4b7] hover:-translate-y-1 hover:shadow-xl hover:border-[#b8863c] flex flex-col items-center gap-4">
          <span className="text-6xl opacity-90">📋</span>
          <h2 className="text-3xl m-0">Partida</h2>
          <span className="font-sans text-base text-[#9e9178] normal-case tracking-normal">Juega una partida sin afectar a campañas</span>
        </a>
      </div>
    </div>
  );
}
