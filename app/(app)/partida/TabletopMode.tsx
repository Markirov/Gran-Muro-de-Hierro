'use client';
import { useState } from 'react';
import { getUnit, effectiveUnitName, displayAbilitiesForCard, findBattlekitItem, effectiveStats, getActiveVariant } from '../../lib/cost_calculation';
import { DATA } from '../../data/01_trench_crusade_game_data';

export function TabletopMode({ session, wb, onUpdate, onClose }: any) {
  const models = wb.models;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showExtraMarkers, setShowExtraMarkers] = useState(false);

  if (!models || models.length === 0) return null;

  const model = models[currentIndex];
  const st = session.modelStates[model.uid] || {};
  
  // Set defaults
  const isActivated = !!st.activated;
  const status = st.status || 'up'; // 'up', 'down', 'out'

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

  const advanceTableTurn = () => {
    // Check for unactivated models that are not OUT
    const unactivated = models.some((m: any) => {
      const s = session.modelStates[m.uid] || {};
      return !s.activated && s.status !== 'out';
    });

    if (unactivated) {
      if (!confirm('Hay miniaturas En Pie sin activar. ¿Seguro que quieres pasar de turno? (Se limpiará la activación de todos).')) {
        return;
      }
    }

    // Reset activations, increment turn
    const newStates = { ...session.modelStates };
    models.forEach((m: any) => {
      if (newStates[m.uid]) {
        newStates[m.uid] = { ...newStates[m.uid], activated: false };
      }
    });

    onUpdate({
      ...session,
      turn: (session.turn || 1) + 1,
      modelStates: newStates
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

  const getStatusColor = () => {
    if (status === 'out') return 'border-red-900 bg-red-900/20 opacity-70';
    if (status === 'down') return 'border-orange-700 bg-orange-900/30 opacity-90';
    if (isActivated) return 'border-[#5c3a21] bg-[#1a0f0a] opacity-80';
    return 'border-[#b8863c] bg-[#2a1610]';
  };

  const abilities = displayAbilitiesForCard(model, unit) || [];
  
  // Find item by name across faction armoury (for permanentEquipment)
  const findItemByName = (name: string) => {
    const faction = DATA.factions.find((f: any) => f.id === wb.factionId);
    if (!faction || !faction.armoury) return null;
    
    // Check normal armoury categories
    for (const cat of Object.values(faction.armoury)) {
      if (!Array.isArray(cat)) continue;
      const found = cat.find((i: any) => i.name.toLowerCase() === name.toLowerCase());
      if (found) return found;
    }
    
    // Check variant overrides if applicable
    const variant = getActiveVariant(wb);
    if (variant && variant.armouryOverrides) {
      for (const cat of Object.values(variant.armouryOverrides)) {
         if (!Array.isArray(cat)) continue;
         const found = cat.find((i: any) => i.name.toLowerCase() === name.toLowerCase());
         if (found) return found;
      }
    }
    
    return null;
  };

  const battlekitEquip = (model.battlekit || []).map((id: string) => findBattlekitItem(wb.factionId, id, wb)).filter(Boolean);
  
  const permEquip = (unit?.permanentEquipment || []).map((p: string) => {
    const cleanName = p.split(' (')[0]; // Handle "Reinforced Armour (85👑) ó Machine Armour (95👑)" etc.
    const it = findItemByName(cleanName) || findItemByName(p);
    return it || { name: p };
  });

  // Combine, deduping by name just in case
  const allEquip = [...permEquip, ...battlekitEquip];
  const uniqueEquipMap = new Map();
  allEquip.forEach(eq => {
    if (eq.name && !uniqueEquipMap.has(eq.name)) {
      uniqueEquipMap.set(eq.name, eq);
    }
  });
  const equipment = Array.from(uniqueEquipMap.values());
  const spent = st.spent || [];
  
  const stats = effectiveStats(model, unit, wb);
  
  // Calculate total armor dynamically
  let totalArmour = parseInt(stats.armour) || 0;
  equipment.forEach((eq: any) => {
    if (eq.weaponKeywords) {
      eq.weaponKeywords.forEach((kw: string) => {
        const match = String(kw).match(/-(\d+)\s+INJURY MODIFIER/i);
        if (match) {
          totalArmour += parseInt(match[1], 10);
        }
      });
    }
  });
  
  // Calculate Movement (halved if DOWN)
  let displayMov = stats.movement;
  if (status === 'down') {
    const baseMov = parseInt(stats.movement) || 0;
    displayMov = Math.ceil(baseMov / 2) + ' (' + stats.movement + ')';
  }

  const renderMarkerRow = (label: string, field: string) => {
    const current = st[field] || 0;
    return (
      <div className="flex items-center justify-between mb-3 last:mb-0">
        <span className="text-xs uppercase tracking-widest text-[#9e9178] font-bold w-1/3">{label}</span>
        <div className="flex gap-1 flex-1 justify-end">
          {[0, 1, 2, 3, 4, 5, 6].map(num => (
            <button
              key={num}
              onClick={() => updateModel({ [field]: num })}
              className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded font-serif text-lg transition-all ${
                current === num 
                  ? field === 'bloodMarkers' ? 'bg-red-900/80 text-white border border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-[#b8863c] text-[#1a0f0a] border border-[#e2d4b7] shadow-[0_0_8px_rgba(184,134,60,0.5)]'
                  : 'bg-[#1a0f0a] text-[#7a6a58] border border-[#3a2110] hover:border-[#b8863c]/50'
              }`}
            >
              {num}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0503] flex flex-col font-sans text-[#e2d4b7] overflow-hidden">
      
      {/* HEADER TOP BAR */}
      <div className="flex justify-between items-center p-3 border-b border-[#3a2110] bg-[#1a0f0a] shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[#b8863c] font-serif uppercase tracking-widest text-sm md:text-base">
            Modo Mesa
          </span>
          <span className="text-[10px] md:text-xs text-[#9e9178] bg-black/50 px-2 py-1 rounded border border-[#3a2110]">
            {currentIndex + 1} / {models.length}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#2a1610] rounded border border-[#5c3a21] overflow-hidden">
            <span className="px-2 py-1 text-xs font-bold text-[#b8863c] border-r border-[#5c3a21] bg-black/30">
              Turno {session.turn || 1}
            </span>
            <button onClick={advanceTableTurn} className="px-3 py-1 text-xs text-[#e2d4b7] hover:bg-[#5c3a21] uppercase tracking-wider font-bold transition-colors">
              Pasar ▸
            </button>
          </div>
          <button onClick={onClose} className="text-[#b8863c] text-2xl leading-none px-2 active:scale-90 transition-transform">✕</button>
        </div>
      </div>

      {/* CONTENT PORTION */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 flex flex-col gap-3 md:gap-4">
        
        {/* MODEL IDENTIFICATION & STATUS BLOCK */}
        <div className={`p-3 md:p-4 border-2 rounded-xl ${getStatusColor()} transition-colors shrink-0 shadow-lg`}>
          <div className="flex flex-col mb-4">
            <h2 className="font-serif text-2xl md:text-3xl m-0 text-[#b8863c] drop-shadow-md leading-tight">
              {displayName}
            </h2>
            <div className="text-[#9e9178] text-[10px] md:text-xs uppercase tracking-widest mt-1">
              {effName}
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            {/* Action Row */}
            <button 
              onClick={() => updateModel({ activated: !isActivated })} 
              className={`w-full py-3 rounded-lg font-bold uppercase tracking-widest text-sm transition-all border-2 ${
                isActivated 
                  ? 'bg-[#1a0f0a] text-[#b8863c] border-[#b8863c] shadow-[0_0_10px_rgba(184,134,60,0.2)]' 
                  : 'bg-[#b8863c] text-[#1a0f0a] border-[#e2d4b7] shadow-[0_0_15px_rgba(184,134,60,0.4)]'
              }`}
            >
              {isActivated ? '✓ Activado' : 'No Activado'}
            </button>
            
            {/* State Row */}
            <div className="flex gap-2">
              <button onClick={() => updateModel({ status: 'up' })} className={`flex-1 py-2 rounded font-bold uppercase text-xs border ${status === 'up' ? 'bg-green-800/40 text-green-400 border-green-500/50 shadow-[inset_0_0_10px_rgba(74,222,128,0.2)]' : 'bg-black/40 text-[#9e9178] border-[#3a2110]'}`}>En Pie</button>
              <button onClick={() => updateModel({ status: 'down' })} className={`flex-1 py-2 rounded font-bold uppercase text-xs border ${status === 'down' ? 'bg-orange-800/60 text-orange-400 border-orange-500/50 shadow-[inset_0_0_10px_rgba(251,146,60,0.2)]' : 'bg-black/40 text-[#9e9178] border-[#3a2110]'}`}>Down</button>
              <button onClick={() => updateModel({ status: 'out' })} className={`flex-1 py-2 rounded font-bold uppercase text-xs border ${status === 'out' ? 'bg-red-900/60 text-red-400 border-red-500/50 shadow-[inset_0_0_10px_rgba(248,113,113,0.2)]' : 'bg-black/40 text-[#9e9178] border-[#3a2110]'}`}>Fuera</button>
            </div>
          </div>
        </div>

        {/* STATS STRIP (4 blocks only: MOV, RNG, MEL, ARM) */}
        {stats && (
          <div className="bg-[#0a0503] border border-[#3a2110] rounded-xl p-2 grid grid-cols-4 gap-2 shrink-0">
             {['movement', 'ranged', 'melee', 'armour'].map(k => (
                <div key={k} className="flex flex-col items-center justify-center bg-[#1a0f0a] py-2 rounded border border-[#2a1610] relative overflow-hidden">
                  {k === 'movement' && status === 'down' && <div className="absolute inset-0 bg-orange-900/20"></div>}
                  <span className="text-[9px] md:text-[10px] uppercase text-[#7a6a58] tracking-widest relative z-10">{k === 'movement' ? 'Mov' : k === 'ranged' ? 'Rng' : k === 'melee' ? 'Mel' : 'Arm'}</span>
                  <span className={`font-serif font-bold text-lg md:text-xl mt-1 relative z-10 ${k === 'movement' && status === 'down' ? 'text-orange-400' : 'text-[#b8863c]'}`}>
                    {k === 'movement' ? displayMov : k === 'armour' ? totalArmour : stats[k] || '-'}
                  </span>
                </div>
              ))}
          </div>
        )}

        {/* MARKERS SECTION */}
        <div className="bg-[#1a0f0a] border border-[#3a2110] rounded-xl p-3 shrink-0">
          {renderMarkerRow('Blood', 'bloodMarkers')}
          
          <button 
            onClick={() => setShowExtraMarkers(!showExtraMarkers)}
            className="w-full text-center py-2 mt-2 text-xs uppercase tracking-widest text-[#7a6a58] bg-[#0a0503] rounded border border-[#2a1610] flex items-center justify-center gap-2"
          >
            <span>{showExtraMarkers ? 'Ocultar' : 'Mostrar'} Blessing / Infection</span>
            <span className="text-[10px]">{showExtraMarkers ? '▲' : '▼'}</span>
          </button>
          
          {showExtraMarkers && (
            <div className="mt-4 pt-4 border-t border-[#3a2110]/50 space-y-4">
              {renderMarkerRow('Blessing', 'blessingMarkers')}
              {renderMarkerRow('Infection', 'infectionMarkers')}
            </div>
          )}
        </div>

        {/* EQUIPMENT & ABILITIES LIST */}
        <div className="flex-1 flex flex-col gap-3">
          {equipment.length > 0 && (
            <div className="bg-[#1a0f0a] border border-[#3a2110] rounded-xl overflow-hidden">
              <div className="bg-[#2a1610] px-3 py-2 border-b border-[#3a2110] text-xs font-bold text-[#b8863c] uppercase tracking-wider">Equipo y Armas</div>
              <div className="p-3 space-y-3">
                {equipment.map((eq: any, i: number) => {
                  const isOneShot = eq.rules && eq.rules.some((r: any) => String(r.name).toLowerCase().includes('single use') || String(r.name).toLowerCase().includes('one use'));
                  const isSpent = spent.includes(eq.name);
                  return (
                    <div key={i} className={`border-b border-[#3a2110]/50 pb-3 last:border-0 last:pb-0 ${isSpent ? 'opacity-50' : ''}`}>
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <div className="font-bold text-[#e2d4b7] text-sm md:text-base">{eq.name}</div>
                          <div className="text-[10px] md:text-xs text-[#7a6a58]">
                            {[eq.range && `Alcance: ${eq.range}`, eq.dice && `Dados: ${eq.dice}`, eq.injury && `Daño: ${eq.injury}`].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                        {isOneShot && (
                          <button 
                            onClick={() => toggleSpent(eq.name)}
                            className={`text-[10px] md:text-xs px-2 py-1 rounded uppercase tracking-widest border font-bold ${isSpent ? 'bg-red-900/30 text-red-500 border-red-900/50' : 'bg-[#b8863c] text-[#1a0f0a] border-[#e2d4b7]'}`}
                          >
                            {isSpent ? 'Gastado' : 'Usar'}
                          </button>
                        )}
                      </div>
                      <div className="text-xs md:text-sm text-[#9e9178] leading-relaxed">
                        {eq.rules && eq.rules.map((r: any, j: number) => (
                          <div key={j} className="mt-1"><strong className="text-[#b8863c]">{r.name}</strong>: {r.desc}</div>
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
              <div className="bg-[#2a1610] px-3 py-2 border-b border-[#3a2110] text-xs font-bold text-[#b8863c] uppercase tracking-wider">Habilidades y Rasgos</div>
              <div className="p-3 space-y-3">
                {abilities.map((ab: any, i: number) => {
                  const isSpent = spent.includes(ab.name);
                  const isOneShot = String(ab.desc).toLowerCase().includes('once per game');
                  return (
                    <div key={i} className={`border-b border-[#3a2110]/50 pb-3 last:border-0 last:pb-0 ${isSpent ? 'opacity-50' : ''}`}>
                      <div className="flex justify-between items-start mb-1">
                        <strong className="text-[#b8863c] text-sm md:text-base">{ab.name}</strong>
                        {isOneShot && (
                          <button 
                            onClick={() => toggleSpent(ab.name)}
                            className={`text-[10px] md:text-xs px-2 py-1 rounded uppercase tracking-widest border font-bold ${isSpent ? 'bg-red-900/30 text-red-500 border-red-900/50' : 'bg-[#b8863c] text-[#1a0f0a] border-[#e2d4b7]'}`}
                          >
                            {isSpent ? 'Gastado' : 'Usar'}
                          </button>
                        )}
                      </div>
                      <div className="text-xs md:text-sm text-[#9e9178] leading-relaxed">{ab.desc}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FIXED NAVIGATION FOOTER */}
      <div className="p-3 md:p-4 bg-[#1a0f0a] border-t border-[#3a2110] flex justify-between gap-3 shrink-0 pb-6 md:pb-8 shadow-[0_-5px_15px_rgba(0,0,0,0.5)]">
        <button 
          onClick={() => setCurrentIndex((c) => (c - 1 + models.length) % models.length)}
          className="flex-1 bg-[#2a1610] border border-[#5c3a21] py-4 rounded-xl text-[#b8863c] font-bold text-base md:text-lg active:bg-[#5c3a21] active:scale-95 transition-all"
        >
          ← Anterior
        </button>
        <button 
          onClick={() => setCurrentIndex((c) => (c + 1) % models.length)}
          className="flex-1 bg-[#2a1610] border border-[#5c3a21] py-4 rounded-xl text-[#b8863c] font-bold text-base md:text-lg active:bg-[#5c3a21] active:scale-95 transition-all shadow-[0_0_15px_rgba(92,58,33,0.5)]"
        >
          Siguiente →
        </button>
      </div>
    </div>
  );
}
