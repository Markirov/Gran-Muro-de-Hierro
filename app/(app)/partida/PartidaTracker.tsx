'use client';
import { useState } from 'react';
import { SCENARIOS_CATALOG } from '../../lib/loadout_lab';
import { TabletopMode } from './TabletopMode';

interface Props {
  session: any;
  wb: any; // original warband needed for reinforcement list
  onUpdate: (session: any) => void;
}

export function PartidaTracker({ session, wb, onUpdate }: Props) {
  const sc = SCENARIOS_CATALOG[session.scenarioId];
  const [showTabletop, setShowTabletop] = useState(false);
  
  const updateModel = (uid: string, changes: any) => {
    onUpdate({
      ...session,
      modelStates: {
        ...session.modelStates,
        [uid]: { ...session.modelStates[uid], ...changes }
      }
    });
  };

  const handleStatusChange = (uid: string, status: string) => {
    updateModel(uid, { status });
  };

  const adjustBlood = (uid: string, delta: number) => {
    const current = session.modelStates[uid].bloodMarkers || 0;
    updateModel(uid, { bloodMarkers: Math.max(0, current + delta) });
  };

  const adjustKills = (uid: string, delta: number) => {
    const current = session.modelStates[uid].kills || 0;
    updateModel(uid, { kills: Math.max(0, current + delta) });
  };

  const toggleDeed = (uid: string, deedName: string) => {
    const model = session.modelStates[uid];
    const deeds = [...(model.deedsCompleted || [])];
    if (deeds.includes(deedName)) {
      updateModel(uid, { deedsCompleted: deeds.filter(d => d !== deedName) });
    } else {
      deeds.push(deedName);
      updateModel(uid, { deedsCompleted: deeds });
    }
  };

  // Turn management
  const adjustTurn = (delta: number) => {
    onUpdate({ ...session, turn: Math.max(1, (session.turn || 1) + delta) });
  };

  const endBattle = () => {
    if (confirm('¿Terminar la partida? Esto bloqueará los marcadores.')) {
      onUpdate({ ...session, finished: true });
    }
  };

  const modelsArray = Object.values(session.modelStates || {});

  return (
    <div className="space-y-4">
      {/* Tracker Header */}
      <div className="bg-[#1a0f0a] border border-[#5c3a21] rounded p-4 flex justify-between items-start">
        <div>
          <h2 className="text-[#b8863c] font-bold text-xl">{sc?.name || session.scenarioId}</h2>
          <p className="text-[#9e9178] text-sm mt-1">{sc?.summary}</p>
          <div className="flex gap-4 mt-3">
            <div className="bg-[#2a1610] px-3 py-1 rounded text-[#e2d4b7] text-sm">
              Tu VP: 
              <input 
                type="number" 
                value={session.vps?.you || 0}
                onChange={e => onUpdate({ ...session, vps: { ...session.vps, you: parseInt(e.target.value) || 0 }})}
                className="w-12 ml-2 bg-transparent border-b border-[#5c3a21] text-center focus:outline-none focus:border-[#b8863c]"
                disabled={session.finished}
              />
            </div>
            <div className="bg-[#2a1610] px-3 py-1 rounded text-[#e2d4b7] text-sm">
              Enemigo VP: 
              <input 
                type="number" 
                value={session.vps?.them || 0}
                onChange={e => onUpdate({ ...session, vps: { ...session.vps, them: parseInt(e.target.value) || 0 }})}
                className="w-12 ml-2 bg-transparent border-b border-[#5c3a21] text-center focus:outline-none focus:border-[#b8863c]"
                disabled={session.finished}
              />
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <div className="bg-[#2a1610] border border-[#5c3a21] rounded flex items-center">
            <button onClick={() => adjustTurn(-1)} disabled={session.finished} className="px-3 py-2 text-[#9e9178] hover:text-[#e2d4b7]">-</button>
            <span className="font-bold text-[#b8863c] w-20 text-center">TURNO {session.turn}</span>
            <button onClick={() => adjustTurn(1)} disabled={session.finished} className="px-3 py-2 text-[#9e9178] hover:text-[#e2d4b7]">+</button>
          </div>
          
          {!session.finished && (
            <div className="flex gap-2">
              <button onClick={() => setShowTabletop(true)} className="bg-[#b8863c] text-[#1a0f0a] border border-[#b8863c] px-4 py-1.5 rounded text-sm font-bold hover:bg-[#e2d4b7] transition-colors">
                📱 Modo Mesa
              </button>
              <button onClick={endBattle} className="bg-red-900/30 text-red-500 border border-red-900/50 px-4 py-1.5 rounded text-sm hover:bg-red-900/50">
                Terminar Partida
              </button>
            </div>
          )}
          {session.finished && (
            <div className="bg-[#5c3a21] text-[#e2d4b7] px-4 py-1.5 rounded text-sm font-bold">
              PARTIDA FINALIZADA
            </div>
          )}
        </div>
      </div>

      {/* Summary / Post-Battle */}
      {session.finished && (
        <div className="bg-[#1a0f0a] border border-[#b8863c] rounded p-4">
          <h3 className="text-[#b8863c] font-bold text-lg mb-2">Resumen y XP</h3>
          <p className="text-[#9e9178] text-sm mb-4">
            La partida ha finalizado. Puedes aplicar la XP obtenida directamente a tu banda (cada Elite recibe +1 XP por participar y +1 por realizar al menos una Glorious Deed).
          </p>
          
          {session.xpApplied ? (
            <div className="text-green-500 font-bold bg-green-900/20 p-2 border border-green-900/50 rounded inline-block">
              ✓ Experiencia Aplicada a la Banda
            </div>
          ) : (
            <button 
              onClick={() => {
                import('../../lib/loadout_lab').then(({ applyBattleXPToWarband }) => {
                  const newWb = JSON.parse(JSON.stringify(wb));
                  const res = applyBattleXPToWarband(session, newWb);
                  if (res.alreadyApplied) {
                    alert('XP ya aplicada');
                    return;
                  }
                  // Guardar banda
                  import('../../lib/storage').then(({ saveWarbandLocallyAndCloud }) => {
                    saveWarbandLocallyAndCloud(newWb.id, newWb);
                  });
                  
                  // Actualizar sesión
                  onUpdate({ ...session, xpApplied: true });
                  alert(`Aplicada ${res.totalXP} XP a ${res.applied} ELITEs.`);
                });
              }}
              className="bg-[#b8863c] text-[#1a0f0a] px-4 py-2 rounded font-bold hover:bg-[#e2d4b7] transition-colors"
            >
              Aplicar XP a la Banda
            </button>
          )}
        </div>
      )}

      {/* Roster Grid */}
      <div className="bg-[#1a0f0a] border border-[#5c3a21] rounded overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#2a1610] border-b border-[#5c3a21] text-[#9e9178] text-xs uppercase">
              <th className="p-3">Modelo</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-center">Blood</th>
              <th className="p-3 text-center">Kills</th>
              <th className="p-3">Glorious Deeds</th>
            </tr>
          </thead>
          <tbody>
            {modelsArray.map((m: any) => (
              <tr key={m.uid} className={`border-b border-[#5c3a21]/50 ${m.status === 'out' ? 'opacity-50 bg-red-900/5' : ''}`}>
                <td className="p-3">
                  <div className="font-bold text-[#e2d4b7]">
                    {m.name} 
                    {m.isLeader && <span className="text-[#b8863c] ml-1" title="Leader">♛</span>}
                    {m.isElite && <span className="text-[#b8863c] ml-1" title="Elite">★</span>}
                  </div>
                  <div className="text-xs text-[#9e9178]">{m.cost} 👑</div>
                </td>
                
                <td className="p-3">
                  <select 
                    value={m.status} 
                    onChange={e => handleStatusChange(m.uid, e.target.value)}
                    disabled={session.finished}
                    className={`text-xs p-1 rounded border ${
                      m.status === 'alive' ? 'bg-[#5c3a21]/30 border-[#b8863c] text-[#e2d4b7]' :
                      m.status === 'down' ? 'bg-yellow-900/30 border-yellow-700 text-yellow-500' :
                      'bg-red-900/30 border-red-800 text-red-500'
                    } focus:outline-none`}
                  >
                    <option value="alive">Normal (Alive)</option>
                    <option value="down">Derribado (Down)</option>
                    <option value="out">Baja (Out of Action)</option>
                  </select>
                </td>
                
                <td className="p-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => adjustBlood(m.uid, -1)} disabled={session.finished || !m.bloodMarkers} className="text-[#9e9178] hover:text-red-500">-</button>
                    <span className={`font-bold w-4 text-center ${m.bloodMarkers > 0 ? 'text-red-500' : 'text-[#9e9178]'}`}>
                      {m.bloodMarkers || 0}
                    </span>
                    <button onClick={() => adjustBlood(m.uid, 1)} disabled={session.finished} className="text-[#9e9178] hover:text-red-500">+</button>
                  </div>
                </td>

                <td className="p-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => adjustKills(m.uid, -1)} disabled={session.finished || !m.kills} className="text-[#9e9178] hover:text-[#e2d4b7]">-</button>
                    <span className={`font-bold w-4 text-center ${m.kills > 0 ? 'text-[#e2d4b7]' : 'text-[#9e9178]'}`}>
                      {m.kills || 0}
                    </span>
                    <button onClick={() => adjustKills(m.uid, 1)} disabled={session.finished} className="text-[#9e9178] hover:text-[#e2d4b7]">+</button>
                  </div>
                </td>

                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {(sc?.deeds || []).map((d: any) => {
                      const isActive = (m.deedsCompleted || []).includes(d.name);
                      return (
                        <button
                          key={d.name}
                          onClick={() => toggleDeed(m.uid, d.name)}
                          disabled={session.finished}
                          className={`text-[0.65rem] px-2 py-0.5 rounded border transition-colors ${
                            isActive 
                              ? 'bg-[#b8863c] border-[#b8863c] text-[#1a0f0a] font-bold' 
                              : 'bg-transparent border-[#5c3a21] text-[#9e9178] hover:border-[#b8863c]'
                          }`}
                          title={d.condition}
                        >
                          {d.name}
                        </button>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {showTabletop && (
        <TabletopMode 
          session={session} 
          wb={wb} 
          onUpdate={onUpdate} 
          onClose={() => setShowTabletop(false)} 
        />
      )}
    </div>
  );
}
