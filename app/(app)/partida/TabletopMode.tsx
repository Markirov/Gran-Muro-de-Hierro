'use client';
import { useState, useRef, useEffect } from 'react';
import { getUnit, effectiveUnitName, displayAbilitiesForCard, findBattlekitItem, effectiveStats, calculateTotalArmour, findArmouryItemByName, effectiveKeywords } from '../../lib/cost_calculation';
import { KEYWORD_LIBRARY } from '../../data/04_keyword_library';
import { WEAPON_KEYWORD_LIBRARY } from '../../data/05_weapon_keyword_library';
import { ABILITY_LIBRARY } from '../../data/02_ability_library';

export function TabletopMode({ session, wb, onUpdate, onClose }: any) {
  const models = wb.models;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showExtraMarkers, setShowExtraMarkers] = useState(false);
  
  // Touch handlers for swipe
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const count = models?.length || 0;

  // Un solo scroll: la página de fondo no se mueve mientras el overlay está abierto.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // ←/→ cambian de miniatura (salvo escribiendo en un campo).
  useEffect(() => {
    if (!count) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); setCurrentIndex((c) => (c + 1) % count); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setCurrentIndex((c) => (c - 1 + count) % count); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [count]);

  if (!models || models.length === 0) return null;

  const model = models[currentIndex];
  const st = session.modelStates[model.uid] || {};
  
  // Set defaults
  const isActivated = !!st.activated;
  const status = st.status || 'up'; // 'up', 'down', 'out'

  const unit = getUnit(wb.factionId, model.unitId);
  const effName = effectiveUnitName(model, unit);
  const displayName = model.name || effName || '(Sin nombre)';
  
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
      if (!confirm('Aún hay miniaturas sin activar (o sin marcar como activadas). ¿Pasar turno de todas formas?')) return;
    }

    // Reset all activated statuses
    const newStates = { ...session.modelStates };
    models.forEach((m: any) => {
      newStates[m.uid] = { ...(newStates[m.uid] || {}), activated: false };
    });
    
    onUpdate({
      ...session,
      modelStates: newStates,
      turn: (session.turn || 1) + 1
    });
  };

  const setStatus = (s: string) => updateModel({ status: s });
  const setBlood = (n: number) => updateModel({ blood: n });
  const setInfection = (n: number) => updateModel({ infection: n });
  const setBlessing = (n: number) => updateModel({ blessing: n });
  const toggleSpent = (name: string) => {
    const arr = st.spent || [];
    if (arr.includes(name)) updateModel({ spent: arr.filter((x: string) => x !== name) });
    else updateModel({ spent: [...arr, name] });
  };

  const statusColor = (s: string) => {
    if (status === s) {
      if (s === 'up') return 'bg-[#b8863c] text-[#1a0f0a] border-[#e2d4b7]';
      if (s === 'down') return 'bg-orange-600 text-white border-orange-300';
      if (s === 'out') return 'bg-red-800 text-white border-red-400';
    }
    return 'bg-[#2a1610] text-[#7a6a58] border-[#3a2110]';
  };

  const getMarkerClass = (val: number, current: number, colorStart: string) => {
    if (val === current) return `${colorStart} text-white font-bold border-white/50 scale-110 z-10 shadow-lg`;
    if (val < current) return `${colorStart}/80 text-white border-transparent`;
    return 'bg-[#2a1610] text-[#5c3a21] border-[#3a2110]';
  };

  const renderRadioRow = (label: string, current: number, setter: (v: number) => void, colorClass: string) => (
    <div className="flex flex-col mb-4">
      <div className="text-[10px] md:text-xs uppercase tracking-widest text-[#7a6a58] font-bold mb-1.5">{label}</div>
      <div className="flex w-full">
        {[0,1,2,3,4,5,6].map(i => (
          <button
            key={i}
            onClick={() => setter(i)}
            className={`flex-1 aspect-square md:h-10 md:w-auto flex items-center justify-center border-y border-l last:border-r text-xs md:text-sm transition-all ${getMarkerClass(i, current || 0, colorClass)}`}
            style={i === 0 ? { borderTopLeftRadius: '0.375rem', borderBottomLeftRadius: '0.375rem' } : i === 6 ? { borderTopRightRadius: '0.375rem', borderBottomRightRadius: '0.375rem' } : {}}
          >
            {i}
          </button>
        ))}
      </div>
    </div>
  );

  const getActivatorClass = () => {
    if (status === 'out') return 'border-red-900/50 bg-red-900/10 opacity-50 cursor-not-allowed';
    if (isActivated) return 'border-[#5c3a21] bg-[#1a0f0a] opacity-80 text-[#7a6a58]';
    return 'border-[#b8863c] bg-[#2a1610] text-[#b8863c] shadow-[0_0_10px_rgba(184,134,60,0.2)]';
  };

  const abilities = displayAbilitiesForCard(model, unit) || [];
  const modelKeywords = effectiveKeywords(model, unit, wb) || [];
  
  const battlekitEquip = (model.battlekit || []).map((id: string) => findBattlekitItem(wb.factionId, id, wb)).filter(Boolean);
  const permEquip = (unit?.permanentEquipment || []).map((p: string) => {
    const cleanName = p.split(' (')[0];
    const it = findArmouryItemByName(cleanName, wb) || findArmouryItemByName(p, wb);
    return it || { name: p };
  });

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
  const totalArmour = calculateTotalArmour(model, unit, wb);
  
  // Calculate Movement (halved if DOWN)
  let displayMov = stats.movement;
  if (status === 'down') {
    const baseMov = parseInt(stats.movement) || 0;
    displayMov = Math.ceil(baseMov / 2) + '\" (' + stats.movement + ')';
  }

  // --- SEPARATE WEAPONS VS EQUIPMENT ---
  const weapons = equipment.filter((e:any) => /weapon/i.test(e.type || '') || /grenade/i.test(e.type || ''));
  const otherEquip = equipment.filter((e:any) => !/weapon/i.test(e.type || '') && !/grenade/i.test(e.type || ''));

  // Has STRONG?
  const hasStrong = modelKeywords.includes('STRONG') || abilities.some((a:any) => a.name === 'STRONG' || a.name === 'NEGATE HEAVY');

  // Unified abilities list: keywords + abilities
  
  const unifiedAbilities: any[] = [];
  modelKeywords.forEach((kw: string) => {
     if (KEYWORD_LIBRARY[kw]) {
       unifiedAbilities.push({ name: kw, desc: KEYWORD_LIBRARY[kw] });
     } else {
       unifiedAbilities.push({ name: kw, desc: '' });
     }
  });
  abilities.forEach((ab: any) => {
     let desc = ab.desc;
     if (!desc && ABILITY_LIBRARY[ab.name]) desc = ABILITY_LIBRARY[ab.name].summary;
     unifiedAbilities.push({ name: ab.name, desc: desc || '' });
  });
  // Deduplicate unified abilities by name
  const dedupedAbilities: any[] = [];
  const seenAb = new Set();
  unifiedAbilities.forEach((ab: any) => {
    const kn = String(ab.name).toUpperCase();
    if (!seenAb.has(kn)) {
      seenAb.add(kn);
      dedupedAbilities.push({ ...ab, name: String(ab.name).toUpperCase() }); // Render ALL CAPS
    }
  });

  // Resolve weapon keywords with parameters like AMMUNITION (+1 DICE)
  const resolveWeaponKeyword = (kw: string) => {
    if (WEAPON_KEYWORD_LIBRARY[kw]) return WEAPON_KEYWORD_LIBRARY[kw].summary;
    // Try regex matching
    if (kw.startsWith('AMMUNITION (')) {
       return 'La pieza se usa en la siguiente partida del modelo. Al desplegarlo, eliges 1 arma a distancia que gana la keyword indicada hasta el final de la partida.';
    }
    return '';
  };

  const handleTouchStart = (e: any) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: any) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      // Swipe left -> Next
      setCurrentIndex((c) => (c + 1) % models.length);
    } else if (distance < -minSwipeDistance) {
      // Swipe right -> Prev
      setCurrentIndex((c) => (c - 1 + models.length) % models.length);
    }

    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0503] flex flex-col h-[100dvh] w-full overflow-hidden"
         onTouchStart={handleTouchStart}
         onTouchMove={handleTouchMove}
         onTouchEnd={handleTouchEnd}
    >
      {/* TOP HEADER */}
      <div className="bg-[#1a0f0a] border-b border-[#3a2110] px-4 py-3 flex justify-between items-center shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="text-[#b8863c] font-serif text-lg md:text-xl">Modo Mesa</div>
          <div className="text-[10px] md:text-xs px-2 py-1 bg-[#2a1610] text-[#7a6a58] rounded border border-[#3a2110]">
            Turno {session.turn || 1}
          </div>
          <button 
            onClick={advanceTableTurn}
            className="text-[10px] md:text-xs uppercase tracking-widest text-[#9e9178] hover:text-[#b8863c] border border-[#3a2110] px-2 py-1 rounded"
          >
            Pasar Turno
          </button>
        </div>
        <button onClick={onClose} className="text-[#7a6a58] hover:text-white p-2 border border-transparent hover:border-[#3a2110] rounded">
          ✕
        </button>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
      <div className="w-full max-w-3xl mx-auto p-4 pb-20">
        {/* MODEL IDENTIFICATION */}
        <div className="flex justify-between items-end mb-4 border-b border-[#3a2110]/50 pb-2">
          <div>
            <div className="font-serif text-3xl md:text-4xl text-[#e2d4b7]">{displayName}</div>
            {displayName !== effName && (
              <div className="text-[#b8863c] text-sm mt-1 uppercase tracking-widest font-bold">{effName}</div>
            )}
          </div>
          <div className="text-right">
            <button 
              onClick={() => {
                if (status === 'out') return;
                updateModel({ activated: !isActivated });
              }}
              className={`px-4 py-2 rounded uppercase tracking-widest font-bold text-xs md:text-sm border transition-all ${getActivatorClass()}`}
              disabled={status === 'out'}
            >
              {status === 'out' ? 'Baja' : isActivated ? 'Activado' : 'No Activado'}
            </button>
          </div>
        </div>

        {/* STATUS BUTTONS */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setStatus('up')} className={`flex-1 py-2 text-xs md:text-sm font-bold uppercase tracking-widest rounded border transition-all ${statusColor('up')}`}>
            En Pie
          </button>
          <button onClick={() => setStatus('down')} className={`flex-1 py-2 text-xs md:text-sm font-bold uppercase tracking-widest rounded border transition-all ${statusColor('down')}`}>
            Down
          </button>
          <button onClick={() => setStatus('out')} className={`flex-1 py-2 text-xs md:text-sm font-bold uppercase tracking-widest rounded border transition-all ${statusColor('out')}`}>
            Fuera
          </button>
        </div>

        {/* STATS ROW */}
        <div className="grid grid-cols-4 gap-2 mb-8">
          {['movement', 'ranged', 'melee', 'armour'].map(k => (
            <div key={k} className="bg-[#1a0f0a] border border-[#3a2110] rounded p-2 md:p-3 text-center flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
              {k === 'movement' && status === 'down' && <div className="absolute inset-0 bg-orange-900/20"></div>}
              <span className="text-[9px] md:text-[10px] uppercase text-[#7a6a58] tracking-widest relative z-10">{k === 'movement' ? 'Mov' : k === 'ranged' ? 'Rng' : k === 'melee' ? 'Mel' : 'Arm'}</span>
              <span className={`font-serif font-bold text-lg md:text-xl mt-1 relative z-10 ${k === 'movement' && status === 'down' ? 'text-orange-400' : 'text-[#b8863c]'}`}>
                {k === 'movement' ? displayMov : k === 'armour' ? totalArmour : stats[k] || '-'}
              </span>
            </div>
          ))}
        </div>

        {/* MARKERS */}
        <div className="mb-8">
          {renderRadioRow('Blood Markers', st.blood || 0, setBlood, 'bg-red-800')}
          
          {showExtraMarkers ? (
            <div className="animate-fadeIn">
              {renderRadioRow('Infection Markers', st.infection || 0, setInfection, 'bg-green-800')}
              {renderRadioRow('Blessing Markers', st.blessing || 0, setBlessing, 'bg-yellow-600')}
              <button 
                onClick={() => setShowExtraMarkers(false)}
                className="text-[10px] uppercase text-[#7a6a58] hover:text-[#b8863c] w-full text-center py-2 border-t border-[#3a2110] mt-2"
              >
                ▲ Ocultar Infección/Bendición
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowExtraMarkers(true)}
              className="text-[10px] uppercase text-[#7a6a58] hover:text-[#b8863c] w-full text-center py-2 border-y border-[#3a2110]"
            >
              ▼ Mostrar Infección/Bendición
            </button>
          )}
        </div>

        {/* --- ARMAS --- */}
        {weapons.length > 0 && (
          <div className="mb-6">
            <div className="text-[10px] uppercase text-[#7a6a58] tracking-widest mb-2 font-bold px-1">Armas</div>
            <div className="space-y-3">
              {weapons.map((w: any, i: number) => {
                const hand = w.type?.toLowerCase().includes('2-handed') ? '2H' 
                           : w.type?.toLowerCase().includes('1-handed') ? '1H'
                           : w.type?.toLowerCase().includes('pistol') ? 'Pistol'
                           : w.type?.toLowerCase().includes('grenade') ? 'Granada' : '';
                return (
                  <div key={i} className="border border-[#3a2110] rounded bg-[#0a0503] p-3 shadow-sm">
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="font-serif font-bold text-[#e2d4b7] text-lg uppercase">{w.name}</span>
                      <span className="text-[#b8863c] text-[10px] md:text-xs">
                         {[hand, w.range && w.range !== '-' ? w.range : ''].filter(Boolean).join(' · ')}
                      </span>
                    </div>
                    <ul className="text-xs md:text-sm text-[#9e9178] leading-relaxed space-y-2">
                      {/* Standard Keywords */}
                      {w.weaponKeywords && w.weaponKeywords.map((kw: string, kwi: number) => {
                        let isAttenuated = false;
                        if (kw === 'HEAVY' && hasStrong) isAttenuated = true;
                        
                        const desc = resolveWeaponKeyword(kw);
                        return (
                          <li key={kwi} className={`pl-4 relative ${isAttenuated ? 'opacity-40 line-through' : ''}`}>
                            <span className="absolute left-0 text-[#b8863c] top-[0.1em] text-[10px]">●</span>
                            <span className="font-serif text-[#b8863c] uppercase mr-1">{kw}</span> 
                            {desc ? `— ${desc}` : ''}
                          </li>
                        );
                      })}
                      {/* Custom Rules */}
                      {w.rules && w.rules.map((r: any, ri: number) => (
                        <li key={`r-${ri}`} className="pl-4 relative">
                          <span className="absolute left-0 text-[#b8863c] top-[0.1em] text-[10px]">●</span>
                          <span className="font-serif text-[#b8863c] uppercase mr-1">{r.name}</span> 
                          — {r.desc}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- EQUIPO --- */}
        {otherEquip.length > 0 && (
          <div className="mb-6">
            <div className="text-[10px] uppercase text-[#7a6a58] tracking-widest mb-2 font-bold px-1">Equipo</div>
            <div className="space-y-3">
              {otherEquip.map((eq: any, i: number) => {
                const isOneShot = (eq.weaponKeywords && eq.weaponKeywords.some((kw: string) => /consumable/i.test(kw))) ||
                  (eq.rules && eq.rules.some((r: any) => String(r.name).toLowerCase().includes('single use') || String(r.name).toLowerCase().includes('one use')));
                const isSpent = spent.includes(eq.name);
                
                return (
                  <div key={i} className={`border border-[#3a2110] rounded bg-[#0a0503] p-3 shadow-sm ${isSpent ? 'opacity-50' : ''}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-baseline gap-2">
                        <span className="font-serif font-bold text-[#e2d4b7] text-lg uppercase">{eq.name}</span>
                        <span className="text-[#b8863c] text-[10px] md:text-xs">{eq.type || 'Equipment'}</span>
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
                    <ul className="text-xs md:text-sm text-[#9e9178] leading-relaxed space-y-2">
                      {eq.weaponKeywords && eq.weaponKeywords.map((kw: string, kwi: number) => {
                        const desc = resolveWeaponKeyword(kw);
                        return (
                          <li key={kwi} className="pl-4 relative">
                            <span className="absolute left-0 text-[#b8863c] top-[0.1em] text-[10px]">●</span>
                            <span className="font-serif text-[#b8863c] uppercase mr-1">{kw}</span> 
                            {desc ? `— ${desc}` : ''}
                          </li>
                        );
                      })}
                      {eq.rules && eq.rules.map((r: any, ri: number) => (
                        <li key={`r-${ri}`} className="pl-4 relative">
                          <span className="absolute left-0 text-[#b8863c] top-[0.1em] text-[10px]">●</span>
                          <span className="font-serif text-[#b8863c] uppercase mr-1">{r.name}</span> 
                          — {r.desc}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- HABILIDADES --- */}
        {dedupedAbilities.length > 0 && (
          <div className="mb-6">
            <div className="text-[10px] uppercase text-[#7a6a58] tracking-widest mb-2 font-bold px-1">Habilidades</div>
            <ul className="text-xs md:text-sm text-[#9e9178] leading-relaxed space-y-2">
              {dedupedAbilities.map((ab: any, i: number) => (
                <li key={i} className="pl-4 relative">
                  <span className="absolute left-0 text-[#b8863c] top-[0.1em] text-[10px]">●</span>
                  <span className="font-serif text-[#b8863c] mr-1">{ab.name}</span> 
                  {ab.desc ? `— ${ab.desc}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      </div>

      {/* FIXED NAVIGATION FOOTER (CAROUSEL DOTS) */}
      <div className="p-4 bg-[#0a0503] border-t border-[#3a2110] flex justify-center gap-3 shrink-0 pb-6 md:pb-8 shadow-[0_-5px_15px_rgba(0,0,0,0.5)] h-16 items-center">
         {models.map((m: any, i: number) => (
            <button 
              key={i} 
              onClick={() => setCurrentIndex(i)}
              className={`w-3 h-3 rounded-full border border-[#b8863c] transition-all ${i === currentIndex ? 'bg-[#b8863c] scale-125' : 'bg-transparent'}`}
            />
         ))}
      </div>
    </div>
  );
}
