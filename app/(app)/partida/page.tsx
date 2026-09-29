'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  listBattleSessions, 
  createBattleSession, 
  saveBattleSession, 
  deleteBattleSession, 
  SCENARIOS_CATALOG 
} from '../../lib/loadout_lab';
import { PartidaLobby } from './PartidaLobby';
import { PartidaTracker } from './PartidaTracker';

export default function PartidaPage() {
  const router = useRouter();
  const [wb, setWb] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any>(null);

  const loadData = () => {
    try {
      const all = listBattleSessions();
      setSessions(all || []);

      const currentId = localStorage.getItem('warband-forge-v1:current');
      if (currentId) {
        const data = localStorage.getItem(`warband-forge-v1:${currentId}`);
        if (data) {
          setWb(JSON.parse(data));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSession = (scenarioId: string) => {
    if (!wb) return;
    try {
      const newSession = createBattleSession({ warband: wb, scenarioId });
      saveBattleSession(newSession);
      loadData();
      setActiveSession(newSession);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleUpdateSession = (updatedSession: any) => {
    saveBattleSession(updatedSession);
    setActiveSession(updatedSession);
    loadData(); // refresh list in background
  };

  const handleDeleteSession = (id: string) => {
    if (confirm('¿Seguro que quieres borrar esta partida?')) {
      deleteBattleSession(id);
      loadData();
      if (activeSession && activeSession.id === id) {
        setActiveSession(null);
      }
    }
  };

  return (
    <div className="max-w-[1100px] mx-auto space-y-4">
      <header className="bg-[#2a1610] border border-[#5c3a21] rounded p-4 flex justify-between items-center mb-6">
        <div>
          <h1 className="text-[#b8863c] font-serif text-2xl m-0 uppercase tracking-wide">
            ⚔️ Seguimiento de Partida
          </h1>
          <div className="text-[#e2d4b7] mt-1 text-sm">
            Tracking en vivo de tu partida: escenario, status de modelos, BLOOD MARKERS, kills, y XP.
          </div>
        </div>
        {activeSession && (
          <button 
            onClick={() => setActiveSession(null)}
            className="bg-[#1a0f0a] text-[#b8863c] border border-[#5c3a21] px-4 py-2 rounded font-bold hover:bg-[#5c3a21] hover:text-[#e2d4b7] transition-colors"
          >
            ← Volver al Lobby
          </button>
        )}
      </header>

      {activeSession ? (
        <PartidaTracker 
          session={activeSession} 
          wb={wb}
          onUpdate={handleUpdateSession} 
        />
      ) : (
        <PartidaLobby 
          wb={wb} 
          sessions={sessions}
          scenarios={SCENARIOS_CATALOG}
          onCreate={handleCreateSession}
          onOpen={setActiveSession}
          onDelete={handleDeleteSession}
        />
      )}
    </div>
  );
}
