'use client';
import { useState } from 'react';
import { getUnit, effectiveUnitName, displayAbilitiesForCard, findBattlekitItem } from '../../lib/cost_calculation';

export function TabletopMode({ session, wb, onUpdate, onClose }: any) {
  const models = wb.models;
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!models || models.length === 0) return null;

  const model = models[currentIndex];
  const st = session.modelStates[model.uid] || {};
  const unit = getUnit(wb.factionId, model.unitId);
  const effName = effectiveUnitName(model, unit);
  const displayName = model.name || effName || '(Desconocido)';
  
  const updateModel = (changes: any) => {
    onUpdate({
      ...session,
      modelStates: {
        ...session.modelStates,
        [model.uid]: { ...st, ...changes }
      }
    });
  };

  const toggleSpent = (name: string) => {
    const spent = st.spent || [];
    if (spent.includes(name)) {
      updateModel({ spent: spent.filter((s: string) => s !== name) });
    } else {
      updateModel({ spent: [...spent, name] });
    }
  };

  const isActivated = st.status === 'activated';
  const isOut = st.status === 'out';
  const isReady = st.status === 'ready' || !st.status;

  const getStatusColor = () => {
    if (isOut) return 'border-red-900 bg-red-900/20 opacity-70';
    if (isActivated) return 'border-[#5c3a21] bg-[#1a0f0a] opacity-80';
    return 'border-[#b8863c] bg-[#2a1610]';
  };

  const abilities = displayAbilitiesForCard(model, unit) || [];
  const equipment = (model.battlekit || []).map((id: string) => findBattlekitItem(wb.factionId, id, wb)).filter(Boolean);
  const spent = st.spent || [];

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0503] flex flex-col font-sans text-[#e2d4b7] overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-[#3a2110] bg-[#1a0f0a] shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[#b8863c] font-serif uppercase tracking-widest">Modo Mesa</span>
          <span className="text-xs text-[#9e9178]">({currentIndex + 1} / {models.length})</span>
        </div>
        <button onClick={onClose} className="text-[#b8863c] text-xl px-2 font-bold">✕</button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        
        {/* Header Card */}
        <div className={`p-4 border-2 rounded-xl ${getStatusColor()} transition-colors shrink-0`}>
          <h2 className="font-serif text-3xl m-0 text-[#b8863c]">{displayName}</h2>
          <div className="text-[#9e9178] text-xs uppercase tracking-widest mt-1 mb-4">{effName}</div>
          
          <div className="flex gap-2">
            <button onClick={() => updateModel({ status: 'ready' })} className={`flex-1 py-2 rounded font-bold uppercase text-xs ${isReady ? 'bg-green-800 text-white' : 'bg-black/40 text-[#9e9178] border border-[#3a2110]'}`}>Listo</button>
            <button onClick={() => updateModel({ status: 'activated' })} className={`flex-1 py-2 rounded font-bold uppercase text-xs ${isActivated ? 'bg-[#5c3a21] text-white' : 'bg-black/40 text-[#9e9178] border border-[#3a2110]'}`}>Activado</button>
            <button onClick={() => updateModel({ status: 'out' })} className={`flex-1 py-2 rounded font-bold uppercase text-xs ${isOut ? 'bg-red-800 text-white' : 'bg-black/40 text-[#9e9178] border border-[#3a2110]'}`}>Fuera</button>
          </div>
        </div>

        {/* Tracker Row */}
        <div className="grid grid-cols-2 gap-4 shrink-0">
          <div className="bg-[#1a0f0a] border border-[#3a2110] p-4 rounded-xl flex flex-col items-center">
            <span className="text-red-500 font-bold mb-2 uppercase tracking-widest text-xs">Blood Markers</span>
            <div className="flex items-center gap-4">
              <button onClick={() => updateModel({ bloodMarkers: Math.max(0, (st.bloodMarkers || 0) - 1) })} className="w-10 h-10 rounded-full bg-[#2a1610] text-[#e2d4b7] text-xl">-</button>
              <span className="text-4xl font-serif">{st.bloodMarkers || 0}</span>
              <button onClick={() => updateModel({ bloodMarkers: (st.bloodMarkers || 0) + 1 })} className="w-10 h-10 rounded-full bg-red-900/50 text-red-300 text-xl border border-red-500/50">+</button>
            </div>
          </div>
          <div className="bg-[#1a0f0a] border border-[#3a2110] p-4 rounded-xl flex flex-col items-center">
            <span className="text-gray-400 font-bold mb-2 uppercase tracking-widest text-xs">Kills</span>
            <div className="flex items-center gap-4">
              <button onClick={() => updateModel({ kills: Math.max(0, (st.kills || 0) - 1) })} className="w-10 h-10 rounded-full bg-[#2a1610] text-[#e2d4b7] text-xl">-</button>
              <span className="text-4xl font-serif">{st.kills || 0}</span>
              <button onClick={() => updateModel({ kills: (st.kills || 0) + 1 })} className="w-10 h-10 rounded-full bg-[#2a1610] text-[#e2d4b7] text-xl border border-[#5c3a21]">+</button>
            </div>
          </div>
        </div>

        {/* Stats */}
        {unit?.stats && (
          <div className="bg-[#0a0503] border border-[#3a2110] rounded-xl p-3 grid grid-cols-5 gap-1 shrink-0">
             {['movement', 'ranged', 'melee', 'armour', 'base'].map(k => (
                <div key={k} className="flex flex-col items-center justify-center bg-[#1a0f0a] py-2 rounded border border-[#3a2110]">
                  <span className="text-[9px] uppercase text-[#7a6a58]">{k === 'movement' ? 'Mov' : k}</span>
                  <span className="font-serif text-[#b8863c] font-bold text-lg mt-1">{unit.stats[k]}</span>
                </div>
              ))}
          </div>
        )}

        {/* Reference Data */}
        <div className="flex-1 flex flex-col gap-4">
          {equipment.length > 0 && (
            <div className="bg-[#1a0f0a] border border-[#3a2110] rounded-xl overflow-hidden">
              <div className="bg-[#2a1610] px-3 py-2 border-b border-[#3a2110] text-sm font-bold text-[#b8863c] uppercase tracking-wider">Equipo y Armas</div>
              <div className="p-3 space-y-3">
                {equipment.map((eq: any, i: number) => {
                  const isOneShot = eq.rules && eq.rules.some((r: any) => String(r.name).toLowerCase().includes('single use'));
                  const isSpent = spent.includes(eq.name);
                  return (
                    <div key={i} className="border-b border-[#3a2110]/50 pb-2 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-[#e2d4b7]">{eq.name}</div>
                          <div className="text-xs text-[#7a6a58] mb-1">
                            {[eq.range && `Alcance: ${eq.range}`, eq.dice && `Dados: ${eq.dice}`, eq.injury && `Daño: ${eq.injury}`].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                        {isOneShot && (
                          <button 
                            onClick={() => toggleSpent(eq.name)}
                            className={`text-xs px-2 py-1 rounded uppercase tracking-widest border ${isSpent ? 'bg-red-900/30 text-red-500 border-red-900/50' : 'bg-[#2a1610] text-[#b8863c] border-[#5c3a21]'}`}
                          >
                            {isSpent ? 'Gastado' : 'Usar'}
                          </button>
                        )}
                      </div>
                      <div className="text-sm text-[#9e9178]">
                        {eq.rules && eq.rules.map((r: any, j: number) => (
                          <div key={j}><strong className="text-[#b8863c]">{r.name}</strong>: {r.desc}</div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {abilities.length > 0 && (
            <div className="bg-[#1a0f0a] border border-[#3a2110] rounded-xl overflow-hidden mb-8">
              <div className="bg-[#2a1610] px-3 py-2 border-b border-[#3a2110] text-sm font-bold text-[#b8863c] uppercase tracking-wider">Habilidades</div>
              <div className="p-3 space-y-3">
                {abilities.map((ab: any, i: number) => {
                  const isSpent = spent.includes(ab.name);
                  // Heuristica basica para un-solo-uso si no esta tageada
                  const isOneShot = String(ab.desc).toLowerCase().includes('once per game');
                  return (
                    <div key={i} className="border-b border-[#3a2110]/50 pb-2 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start">
                        <strong className="text-[#b8863c]">{ab.name}</strong>
                        {isOneShot && (
                          <button 
                            onClick={() => toggleSpent(ab.name)}
                            className={`text-xs px-2 py-1 rounded uppercase tracking-widest border ${isSpent ? 'bg-red-900/30 text-red-500 border-red-900/50' : 'bg-[#2a1610] text-[#b8863c] border-[#5c3a21]'}`}
                          >
                            {isSpent ? 'Gastado' : 'Usar'}
                          </button>
                        )}
                      </div>
                      <div className="text-sm text-[#9e9178]">{ab.desc}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="p-4 bg-[#1a0f0a] border-t border-[#3a2110] flex justify-between gap-4 shrink-0 pb-8">
        <button 
          onClick={() => setCurrentIndex((c) => (c - 1 + models.length) % models.length)}
          className="flex-1 bg-[#2a1610] border border-[#5c3a21] py-4 rounded-xl text-[#b8863c] font-bold text-lg active:bg-[#5c3a21]"
        >
          ← Anterior
        </button>
        <button 
          onClick={() => setCurrentIndex((c) => (c + 1) % models.length)}
          className="flex-1 bg-[#2a1610] border border-[#5c3a21] py-4 rounded-xl text-[#b8863c] font-bold text-lg active:bg-[#5c3a21]"
        >
          Siguiente →
        </button>
      </div>
    </div>
  );
}
