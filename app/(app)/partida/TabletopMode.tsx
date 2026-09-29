'use client';
import { useState } from 'react';
import { getUnit, effectiveUnitName } from '../../lib/cost_calculation';

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

  const isActivated = st.status === 'activated';
  const isOut = st.status === 'out';
  const isReady = st.status === 'ready' || !st.status;

  const getStatusColor = () => {
    if (isOut) return 'border-red-900 bg-red-900/20';
    if (isActivated) return 'border-[#5c3a21] bg-[#1a0f0a] opacity-50';
    return 'border-[#b8863c] bg-[#2a1610]';
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0503] flex flex-col font-sans text-[#e2d4b7] overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-[#3a2110] bg-[#1a0f0a]">
        <div className="flex items-center gap-2">
          <span className="text-[#b8863c] font-serif uppercase tracking-widest">Modo Mesa</span>
          <span className="text-xs text-[#9e9178]">({currentIndex + 1} / {models.length})</span>
        </div>
        <button onClick={onClose} className="text-[#b8863c] text-xl px-2">✕</button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-4 overflow-y-auto">
        {/* Model Header */}
        <div className={`p-4 border-2 rounded-xl mb-4 ${getStatusColor()} transition-colors`}>
          <div className="flex justify-between items-start">
            <div>
              <h2 className="font-serif text-3xl m-0 text-[#b8863c]">{displayName}</h2>
              <div className="text-[#9e9178] text-xs uppercase tracking-widest mt-1">
                {effName}
              </div>
            </div>
          </div>
          
          {/* Status Buttons */}
          <div className="flex gap-2 mt-6">
            <button 
              onClick={() => updateModel({ status: 'ready' })}
              className={`flex-1 py-2 rounded font-bold uppercase text-xs ${isReady ? 'bg-green-800 text-white' : 'bg-black/40 text-[#9e9178] border border-[#3a2110]'}`}
            >
              Listo
            </button>
            <button 
              onClick={() => updateModel({ status: 'activated' })}
              className={`flex-1 py-2 rounded font-bold uppercase text-xs ${isActivated ? 'bg-[#5c3a21] text-white' : 'bg-black/40 text-[#9e9178] border border-[#3a2110]'}`}
            >
              Activado
            </button>
            <button 
              onClick={() => updateModel({ status: 'out' })}
              className={`flex-1 py-2 rounded font-bold uppercase text-xs ${isOut ? 'bg-red-800 text-white' : 'bg-black/40 text-[#9e9178] border border-[#3a2110]'}`}
            >
              Fuera
            </button>
          </div>
        </div>

        {/* Tracking Controls */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-[#1a0f0a] border border-[#3a2110] p-4 rounded-xl flex flex-col items-center">
            <span className="text-red-500 font-bold mb-2 uppercase tracking-widest text-xs">Blood Markers</span>
            <div className="flex items-center gap-4">
              <button onClick={() => updateModel({ bloodMarkers: Math.max(0, (st.bloodMarkers || 0) - 1) })} className="w-10 h-10 rounded-full bg-[#2a1610] text-[#e2d4b7] text-xl">-</button>
              <span className="text-3xl font-serif">{st.bloodMarkers || 0}</span>
              <button onClick={() => updateModel({ bloodMarkers: (st.bloodMarkers || 0) + 1 })} className="w-10 h-10 rounded-full bg-red-900/50 text-[#e2d4b7] text-xl border border-red-500/50">+</button>
            </div>
          </div>
          
          <div className="bg-[#1a0f0a] border border-[#3a2110] p-4 rounded-xl flex flex-col items-center">
            <span className="text-gray-400 font-bold mb-2 uppercase tracking-widest text-xs">Kills</span>
            <div className="flex items-center gap-4">
              <button onClick={() => updateModel({ kills: Math.max(0, (st.kills || 0) - 1) })} className="w-10 h-10 rounded-full bg-[#2a1610] text-[#e2d4b7] text-xl">-</button>
              <span className="text-3xl font-serif">{st.kills || 0}</span>
              <button onClick={() => updateModel({ kills: (st.kills || 0) + 1 })} className="w-10 h-10 rounded-full bg-[#2a1610] text-[#e2d4b7] text-xl border border-[#5c3a21]">+</button>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        {unit?.stats && (
          <div className="bg-[#1a0f0a] border border-[#3a2110] rounded-xl p-3 mb-4 grid grid-cols-5 gap-1">
             {['movement', 'ranged', 'melee', 'armour', 'base'].map(k => (
                <div key={k} className="flex flex-col items-center justify-center bg-black/40 py-2 rounded">
                  <span className="text-[9px] uppercase text-[#7a6a58]">{k === 'movement' ? 'Mov' : k}</span>
                  <span className="font-serif text-[#b8863c] font-bold mt-1">
                    {unit.stats[k]}
                  </span>
                </div>
              ))}
          </div>
        )}

        <div className="flex-1"></div>
        
        {/* Navigation */}
        <div className="flex justify-between items-center mt-4 gap-4">
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
    </div>
  );
}
