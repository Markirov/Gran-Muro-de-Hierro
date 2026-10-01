'use client';
import { useState, useRef, useEffect } from 'react';
import { getUnit, effectiveUnitName, displayAbilitiesForCard, findBattlekitItem, effectiveStats, calculateTotalArmour, findArmouryItemByName, effectiveKeywords } from '../../lib/cost_calculation';
import { glossaryText } from '../../data/03_keyword_glossary_canon_fuente_nica_de_lo';
import { KEYWORD_LIBRARY } from '../../data/04_keyword_library';
import { WEAPON_KEYWORD_LIBRARY } from '../../data/05_weapon_keyword_library';
import { ABILITY_LIBRARY } from '../../data/02_ability_library';
import { 
  formatRange, 
  getWeaponHand, 
  extractWeaponCombatModifiers, 
  getModelSpecialAmmunition, 
  isAmmunitionApplicableToWeapon, 
  getTacticalRuleNote,
  extractArmourDefenses,
  getBulkyInfo,
  getModelArmourBreakdown,
  getModelDefensiveImmunities,
  extractEquipmentDetails
} from '../../lib/weapon_helpers';

export function TabletopMode({ session, wb, onUpdate, onClose }: any) {
  const models = wb.models;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showInfection, setShowInfection] = useState(false);
  const [showBlessing, setShowBlessing] = useState(false);
  const [toughAlert, setToughAlert] = useState<{ modelName: string; factionSymbol: string } | null>(null);
  
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
  
  // Calculate total armor dynamically and breakdowns
  const totalArmour = calculateTotalArmour(model, unit, wb);
  const armourBreakdown = getModelArmourBreakdown(model, unit, wb);
  const bulkyInfo = getBulkyInfo(model, unit, wb);
  const defensiveImmunities = getModelDefensiveImmunities(model, unit, wb, equipment);
  
  // Alba / Celtic Armour: sus armaduras no sufren penalización de movimiento por Down
  const isAlba = wb.variantId === 'alba';
  const hasMachineArmour = (model.battlekit || []).includes('machine-armour-na') || 
                           (model.unitId === 'mech-heavy-inf' && model.costVariant === 'alt') ||
                           equipment.some((e: any) => e.name?.toLowerCase().includes('machine armour') || e.id === 'machine-armour-na');
  const hasArmourItem = (model.battlekit || []).some((k: string) => k.includes('armour')) || 
                        model.unitId === 'mech-heavy-inf' || 
                        equipment.some((e: any) => e.type?.toLowerCase() === 'armour' || e.name?.toLowerCase().includes('armour'));
  const ignoresDownMovementPenalty = (isAlba && hasArmourItem) || hasMachineArmour;

  // Calculate Movement (halved if DOWN, unless immune)
  let displayMov = stats.movement;
  if (status === 'down') {
    if (ignoresDownMovementPenalty) {
      displayMov = stats.movement;
    } else {
      const baseMov = parseInt(stats.movement) || 0;
      displayMov = Math.ceil(baseMov / 2) + '\" (' + stats.movement + ')';
    }
  }

  // --- SEPARATE WEAPONS VS EQUIPMENT ---
  const isWeapon = (e:any) => /handed|weapon|pistol|grenade/i.test(e.type || '') || (!!e.range && e.range !== '-' && !/armour|shield|headgear/i.test(e.type || ''));
  const weapons = equipment.filter((e:any) => isWeapon(e));
  const otherEquip = equipment.filter((e:any) => !isWeapon(e));

  // STRONG (Rulebook 1.0.2): NEGATE HEAVY + arma CaC de 2 manos como si fuera de 1 mano
  const hasStrong = modelKeywords.includes('STRONG') || modelKeywords.includes('NEGATE HEAVY') || abilities.some((a:any) => a.name === 'STRONG' || a.name === 'NEGATE HEAVY');
  // Nota si la keyword de un arma no aplica a este modelo ('' si aplica)
  const keywordInactive = (kw: string) => (kw === 'HEAVY' && hasStrong ? 'STRONG: no aplica' : '');

  // TOUGH (Rulebook 1.0.2): La primera vez que sufre un resultado de Out of Action, se salva y vuelve a En Pie
  const getFactionSymbol = (factionId: string): string => {
    switch (factionId) {
      case 'iron-sultanate': return '☾';
      case 'new-antioch': return '✠';
      case 'trench-pilgrims': return '☦';
      case 'heretic-legion': return '⛧';
      case 'black-grail': return '☣';
      case 'court-seven-headed-serpent': return '🐍';
      default: return '✦';
    }
  };

  const factionSymbol = getFactionSymbol(wb.factionId);
  const hasTough = modelKeywords.includes('TOUGH') || abilities.some((a: any) => String(a.name || a).toUpperCase() === 'TOUGH');
  const toughUsed = !!st.toughUsed;
  const toughActive = hasTough && !toughUsed;

  const handleSetStatus = (s: string) => {
    if (s === 'out' && toughActive) {
      updateModel({
        status: 'up',
        toughUsed: true
      });
      setToughAlert({
        modelName: displayName,
        factionSymbol
      });
      return;
    }
    setStatus(s);
  };

  // Unified abilities list: keywords + abilities
  
  const unifiedAbilities: any[] = [];
  modelKeywords.forEach((kw: string) => {
     const desc = glossaryText(kw) || KEYWORD_LIBRARY[kw] || '';
     unifiedAbilities.push({ name: kw, desc });
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
    const tac = getTacticalRuleNote(kw);
    if (tac) return tac;
    if (WEAPON_KEYWORD_LIBRARY[kw]) return WEAPON_KEYWORD_LIBRARY[kw].summary;
    // Try regex matching
    if (kw.startsWith('AMMUNITION (')) {
       return 'Otorga la keyword indicada a todos los ataques a distancia del modelo (y a pistolas en combate cuerpo a cuerpo).';
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
        <div className="flex gap-2 mb-3">
          <button onClick={() => handleSetStatus('up')} className={`flex-1 py-2 text-xs md:text-sm font-bold uppercase tracking-widest rounded border transition-all ${statusColor('up')}`}>
            En Pie
          </button>
          <button onClick={() => handleSetStatus('down')} className={`flex-1 py-2 text-xs md:text-sm font-bold uppercase tracking-widest rounded border transition-all ${statusColor('down')}`}>
            Down
          </button>
          <button 
            onClick={() => handleSetStatus('out')} 
            className={`flex-1 py-2 text-xs md:text-sm font-bold uppercase tracking-widest rounded border transition-all flex items-center justify-center gap-1.5 ${statusColor('out')}`}
            title={toughActive ? `TOUGH activo (${factionSymbol}): la primera vez que caiga Fuera, se salva e ignora la baja volviendo a En Pie` : undefined}
          >
            <span>Fuera</span>
            {toughActive && (
              <span className="text-sm text-[#b8863c] font-serif font-black" title="TOUGH: La primera vez que caiga Fuera, se salva e ignora la baja">
                {factionSymbol}
              </span>
            )}
          </button>
        </div>

        {/* TOUGH STATUS BADGE */}
        {toughActive && (
          <div className="flex items-center gap-1.5 text-[10px] text-[#b8863c] mb-5 px-1 bg-[#1a0f0a] py-1 px-2 rounded border border-[#5c3a21]/40">
            <span className="text-xs font-serif font-black">{factionSymbol}</span>
            <span className="italic">Regla TOUGH activa: el primer resultado «Fuera» se ignorará automáticamente volviendo a En Pie.</span>
          </div>
        )}
        {hasTough && toughUsed && (
          <div className="flex justify-between items-center text-[10px] text-[#7a6a58] mb-5 px-2 py-1 rounded bg-[#1a0f0a] border border-[#3a2110]">
            <span className="flex items-center gap-1">
              <span className="text-[#b8863c] line-through font-serif">{factionSymbol}</span>
              <span>Regla TOUGH: <strong className="text-red-400">Gastada</strong></span>
            </span>
            <button
              type="button"
              onClick={() => updateModel({ toughUsed: false })}
              className="text-[#9e9178] hover:text-[#b8863c] underline uppercase tracking-wider text-[9px] cursor-pointer"
              title="Restaurar regla TOUGH para esta miniatura"
            >
              Restaurar {factionSymbol}
            </button>
          </div>
        )}

        {/* STATS ROW */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {['movement', 'ranged', 'melee', 'armour'].map(k => (
            <div key={k} className="bg-[#1a0f0a] border border-[#3a2110] rounded p-2 md:p-3 text-center flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
              {k === 'movement' && status === 'down' && !ignoresDownMovementPenalty && <div className="absolute inset-0 bg-orange-900/20"></div>}
              {k === 'movement' && status === 'down' && ignoresDownMovementPenalty && <div className="absolute inset-0 bg-emerald-950/20"></div>}
              <span className="text-[9px] md:text-[10px] uppercase text-[#7a6a58] tracking-widest relative z-10">{k === 'movement' ? 'Mov' : k === 'ranged' ? 'Rng' : k === 'melee' ? 'Mel' : 'Arm'}</span>
              <span className={`font-serif font-bold text-lg md:text-xl mt-1 relative z-10 ${
                k === 'movement' && status === 'down' 
                  ? (ignoresDownMovementPenalty ? 'text-emerald-400' : 'text-orange-400')
                  : 'text-[#b8863c]'
              }`}>
                {k === 'movement' ? displayMov : k === 'armour' ? totalArmour : stats[k] || '-'}
              </span>
              {k === 'movement' && status === 'down' && ignoresDownMovementPenalty && (
                <span className="text-[8px] text-emerald-400/90 font-mono tracking-tight relative z-10">Sin penaliz. Down</span>
              )}
              {k === 'armour' && totalArmour !== '0' && (
                <span 
                  className="text-[8px] text-[#b8863c]/90 font-mono tracking-tight relative z-10 cursor-help"
                  title={armourBreakdown.summary ? `Desglose: ${armourBreakdown.summary}` : 'Modificador restado a la tirada de herida del atacante'}
                >
                  {totalArmour} Herida
                </span>
              )}
            </div>
          ))}
        </div>

        {/* BULKY TRAIT BANNER */}
        {bulkyInfo.isBulky && (
          <div className="flex items-center justify-between gap-1 text-[11px] text-amber-300 mb-3 px-2.5 py-1.5 rounded bg-[#160d08] border border-amber-900/50">
            <div className="flex items-center gap-1.5">
              <span className="font-bold">⚖ BULKY:</span>
              <span className="text-amber-200/90">{bulkyInfo.note}</span>
            </div>
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-700/50 shrink-0">
              Peana {bulkyInfo.baseSize}
            </span>
          </div>
        )}

        {/* DEFENSIVE TRAITS / IMMUNITIES */}
        {defensiveImmunities.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] mb-6 px-2.5 py-1.5 rounded bg-[#120a06] border border-[#3a2110]">
            <span className="text-[#7a6a58] uppercase font-bold tracking-wider mr-1">Defensas:</span>
            {defensiveImmunities.map((imm, idx) => (
              <span 
                key={idx} 
                className="bg-[#2a1610] text-[#e2d4b7] px-1.5 py-0.5 rounded border border-[#5c3a21] font-mono text-[9px] flex items-center gap-1 cursor-help"
                title={getTacticalRuleNote(imm) || imm}
              >
                <span>🛡️</span> {imm}
              </span>
            ))}
          </div>
        )}

        {/* MARKERS */}
        <div className="mb-8">
          {renderRadioRow('Blood Markers', st.blood || 0, setBlood, 'bg-red-800')}
          
          {/* Infección y Bendición: desplegables independientes; abiertos si tienen marcadores */}
          {(showInfection || (st.infection || 0) > 0) && renderRadioRow('Infection Markers', st.infection || 0, setInfection, 'bg-green-800')}
          {!(st.infection > 0) && (
            <button 
              onClick={() => setShowInfection(!showInfection)}
              className="text-[10px] uppercase text-[#7a6a58] hover:text-[#b8863c] w-full text-center py-2 border-t border-[#3a2110]"
            >
              {showInfection ? '▲ Ocultar Infección' : '▼ Mostrar Infección'}
            </button>
          )}
          {(showBlessing || (st.blessing || 0) > 0) && renderRadioRow('Blessing Markers', st.blessing || 0, setBlessing, 'bg-yellow-600')}
          {!(st.blessing > 0) && (
            <button 
              onClick={() => setShowBlessing(!showBlessing)}
              className="text-[10px] uppercase text-[#7a6a58] hover:text-[#b8863c] w-full text-center py-2 border-y border-[#3a2110]"
            >
              {showBlessing ? '▲ Ocultar Bendición' : '▼ Mostrar Bendición'}
            </button>
          )}
        </div>

        {/* --- ARMAS --- */}
        {weapons.length > 0 && (() => {
          const specialAmmos = getModelSpecialAmmunition(model, wb);
          return (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2 px-1">
                <span className="text-[10px] uppercase text-[#7a6a58] tracking-widest font-bold">Armas</span>
                {specialAmmos.length > 0 && (
                  <span className="text-[10px] text-[#b8863c] font-mono flex items-center gap-1 bg-[#1a0f0a] px-2 py-0.5 rounded border border-[#5c3a21]">
                    <span>⌖ Munición activa:</span>
                    <strong className="text-[#e2d4b7]">{specialAmmos.map(a => a.name).join(', ')}</strong>
                  </span>
                )}
              </div>
              <div className="space-y-3">
                {weapons.map((w: any, i: number) => {
                  const hand = w.type?.toLowerCase().includes('2-handed') ? '2H' 
                             : w.type?.toLowerCase().includes('1-handed') ? '1H'
                             : w.type?.toLowerCase().includes('pistol') ? 'Pistol'
                             : w.type?.toLowerCase().includes('grenade') ? 'Granada' : '';
                  const handInfo = getWeaponHand(w, hasStrong);
                  const strongOneHand = hasStrong && hand === '2H' && /melee/i.test(w.range || '');
                  const cleanRange = formatRange(w.range);
                  const mods = extractWeaponCombatModifiers(w);
                  const applicableAmmos = isAmmunitionApplicableToWeapon(w) ? specialAmmos : [];
                  const hasReload = (w.weaponKeywords || []).some((kw: string) => /^reload$/i.test(kw));

                  return (
                    <div key={i} className="border border-[#3a2110] rounded-xl bg-[#0a0503] p-3 shadow-md space-y-2">
                      {/* HEADER ARMA */}
                      <div className="flex flex-wrap justify-between items-start gap-2 border-b border-[#3a2110]/50 pb-2">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-serif font-bold text-[#e2d4b7] text-lg uppercase tracking-wide">{w.name}</span>
                            <span className="text-[9px] md:text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#1a0f0a] text-[#b8863c] border border-[#5c3a21]">
                              {strongOneHand ? (
                                <><span className="line-through opacity-50" title="STRONG: arma CaC de 2 manos como de 1 mano">2H</span> 1H</>
                              ) : handInfo.label}
                            </span>
                            {cleanRange !== '-' && (
                              <span className="text-[9px] md:text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1a0f0a] text-[#9e9178] border border-[#3a2110]">
                                {cleanRange}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* BADGES DE COMBATE (DAÑO, ATAQUE, MUNICIÓN) */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {mods.attackModifiers.map((am, ami) => (
                            <span key={ami} className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/50 text-emerald-300">
                              Ataque {am}
                            </span>
                          ))}
                          {mods.injuryModifiers.map((im, imi) => (
                            <span key={imi} className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-red-950/60 border border-red-500/50 text-red-300">
                              Daño {im}
                            </span>
                          ))}
                          {applicableAmmos.map((ammo, ammi) => (
                            <span key={ammi} className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#2a1610] border border-[#b8863c] text-[#e2d4b7] flex items-center gap-1 shadow-sm">
                              <span className="text-[#b8863c]">⌖ Munición:</span> {ammo.effectKeyword}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* BANNER DE REGLA RELOAD */}
                      {hasReload && (
                        <div className="bg-amber-950/40 border border-amber-600/60 rounded-lg p-2 text-xs text-amber-200 flex items-start gap-2 shadow-inner">
                          <span className="text-amber-400 font-bold text-sm leading-none mt-0.5">⚠</span>
                          <div>
                            <strong className="uppercase tracking-wider font-mono text-amber-300">Regla Canónica RELOAD:</strong> Atacar con este arma concluye la activación de la miniatura inmediatamente tras resolverse la acción de disparo.
                          </div>
                        </div>
                      )}

                      {/* KEYWORDS TÁCTICAS Y REGLAS */}
                      <ul className="text-xs md:text-sm text-[#9e9178] leading-relaxed space-y-1.5 pt-1">
                        {mods.tacticalKeywords.map((kw: string, kwi: number) => {
                          const inactive = keywordInactive(kw);
                          const desc = resolveWeaponKeyword(kw);
                          return (
                            <li key={kwi} className={`pl-4 relative ${inactive ? 'opacity-40' : ''}`}>
                              <span className="absolute left-0 text-[#b8863c] top-[0.1em] text-[10px]">●</span>
                              <span className="font-serif text-[#b8863c] uppercase mr-1">{kw}</span> 
                              {inactive && <span className="italic mr-1">({inactive})</span>}
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
                        {/* Indicador de munición especial si aplica */}
                        {applicableAmmos.map((ammo, ammi) => (
                          <li key={`ammo-${ammi}`} className="pl-4 relative text-[#b8863c]">
                            <span className="absolute left-0 text-[#b8863c] top-[0.1em] text-[10px]">●</span>
                            <span className="font-serif uppercase mr-1">MUNICIÓN ESPECIAL ({ammo.name}):</span>
                            <span className="text-[#e2d4b7]">{ammo.summary}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* --- EQUIPO --- */}
        {otherEquip.length > 0 && (
          <div className="mb-6">
            <div className="text-[10px] uppercase text-[#7a6a58] tracking-widest mb-2 font-bold px-1">Equipo</div>
            <div className="space-y-3">
              {otherEquip.map((eq: any, i: number) => {
                const isOneShot = (eq.weaponKeywords && eq.weaponKeywords.some((kw: string) => /consumable/i.test(kw))) ||
                  (eq.rules && eq.rules.some((r: any) => String(r.name).toLowerCase().includes('single use') || String(r.name).toLowerCase().includes('one use')));
                const isSpent = spent.includes(eq.name);
                
                const armDef = extractArmourDefenses(eq);
                const eqDet = extractEquipmentDetails(eq);
                
                return (
                  <div key={i} className={`border border-[#3a2110] rounded bg-[#0a0503] p-3 shadow-sm ${isSpent ? 'opacity-50' : ''}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-serif font-bold text-[#e2d4b7] text-lg uppercase">{eq.name}</span>
                        <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-[#22120b] text-[#b8863c] font-mono border border-[#4a2a16]">
                          {eqDet.categoryTag}
                        </span>
                        {armDef.injuryModifier && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-800/50">
                            ARM {armDef.injuryModifier}
                          </span>
                        )}
                        {armDef.defensiveTraits.map((tr: string, tri: number) => (
                          <span 
                            key={tri} 
                            className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#22120b] text-[#e2d4b7] border border-[#4a2a16] cursor-help"
                            title={getTacticalRuleNote(tr) || undefined}
                          >
                            🛡️ {tr}
                          </span>
                        ))}
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
                    {eqDet.actionGranted && (
                      <div className="mb-2 p-2 rounded bg-[#160d08] border border-amber-900/50 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-xs text-amber-300 font-bold">
                          <span>⚡</span>
                          <span>{eqDet.actionGranted}:</span>
                        </div>
                        <p className="text-[11px] text-[#e2d4b7] leading-snug">
                          {eqDet.actionDescription}
                        </p>
                      </div>
                    )}
                    {!eqDet.actionGranted && eqDet.summary && (!eq.rules || eq.rules.length === 0) && (
                      <div className="text-xs text-[#9e9178] mb-2 leading-relaxed">
                        {eqDet.summary}
                      </div>
                    )}
                    <ul className="text-xs md:text-sm text-[#9e9178] leading-relaxed space-y-2">
                      {eq.weaponKeywords && eq.weaponKeywords.map((kw: string, kwi: number) => {
                        const inactive = keywordInactive(kw);
                        const desc = resolveWeaponKeyword(kw);
                        return (
                          <li key={kwi} className={`pl-4 relative ${inactive ? 'opacity-40' : ''}`}>
                            <span className="absolute left-0 text-[#b8863c] top-[0.1em] text-[10px]">●</span>
                            <span className="font-serif text-[#b8863c] uppercase mr-1">{kw}</span> 
                            {inactive && <span className="italic mr-1">({inactive})</span>}
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
              {dedupedAbilities.map((ab: any, i: number) => {
                const isToughSpent = String(ab.name).toUpperCase() === 'TOUGH' && toughUsed;
                return (
                  <li key={i} className={`pl-4 relative transition-opacity ${isToughSpent ? 'opacity-40' : ''}`}>
                    <span className={`absolute left-0 top-[0.1em] text-[10px] ${isToughSpent ? 'text-[#7a6a58]' : 'text-[#b8863c]'}`}>●</span>
                    <span className={`font-serif mr-1 ${isToughSpent ? 'text-[#7a6a58] line-through' : 'text-[#b8863c]'}`}>{ab.name}</span>
                    {isToughSpent && <span className="italic text-[10px] text-red-400 font-mono mr-1">(gastado)</span>}
                    {ab.desc ? `— ${ab.desc}` : ''}
                  </li>
                );
              })}
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

      {/* TOUGH ALERT MODAL */}
      {toughAlert && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#1a0f0a] border-2 border-[#b8863c] rounded-xl max-w-sm w-full p-5 text-center shadow-[0_0_30px_rgba(184,134,60,0.3)] space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-[#2a1610] border border-[#b8863c] flex items-center justify-center text-3xl text-[#b8863c] font-serif font-black shadow-inner">
              {toughAlert.factionSymbol}
            </div>
            <div>
              <div className="font-serif text-lg font-bold text-[#e2d4b7] uppercase tracking-wider">
                ¡Regla TOUGH Activada!
              </div>
              <div className="text-xs text-[#b8863c] font-mono mt-0.5">
                Primer resultado Fuera de Combate
              </div>
            </div>
            <p className="text-xs text-[#9e9178] leading-relaxed">
              Es la primera vez que <strong className="text-[#e2d4b7]">{toughAlert.modelName}</strong> sufre un resultado de <strong className="text-red-400">Fuera</strong>. 
              Su resistencia heroica se activa: el símbolo <strong className="text-[#b8863c] font-serif">{toughAlert.factionSymbol}</strong> se retira y la miniatura permanece <strong className="text-[#b8863c]">En Pie</strong>.
            </p>
            <button
              type="button"
              onClick={() => setToughAlert(null)}
              className="w-full py-2.5 bg-[#b8863c] hover:bg-[#c9974d] text-[#1a0f0a] font-bold text-xs uppercase tracking-widest rounded-lg shadow-md transition-all cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
