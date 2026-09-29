'use client';
import { useState } from 'react';
import { 
  getUnit, 
  effectiveStats, 
  effectiveKeywords, 
  allAvailableUpgrades,
  effectiveUnitName,
  armouryItemsForWarband,
  battlekitPurchaseCost,
  classifyUpgrade,
  displayAbilitiesForCard,
  calculateTotalArmour,
  getModelMeleeCapacity,
  getModelRangedCapacity,
  getModelArmourAndShield,
  getModelGearAndGrenades
} from '../../../lib/cost_calculation';
import { classifyBattlekitItem } from '../../../lib/battlekit_legality_engine';
import { KEYWORD_LIBRARY } from '../../../data/04_keyword_library';
import { FACTIONS } from '../../../data/factions';

interface Props {
  wb: any;
  model: any;
  onUpdateModel: (newModel: any) => void;
}

export function ModelDetails({ wb, model, onUpdateModel }: Props) {
  const [selectorOpen, setSelectorOpen] = useState<string | null>(null);

  try {
    if (!model) {
      return (
        <div className="p-8 bg-[#1a0f0a] border border-[#5c3a21] rounded-xl text-[#9e9178] text-sm text-center font-serif">
          Selecciona un modelo del roster para ver sus estadísticas y gestionar su armamento.
        </div>
      );
    }

    const unit = getUnit(wb.factionId, model.unitId);
    if (!unit) {
      return <div className="text-red-500 p-8">Unidad no encontrada en los registros.</div>;
    }

    const effStats = effectiveStats(model, unit, wb);
    const effName = effectiveUnitName(model, unit);
    const baseStats = unit.stats || {};
    const isOverridden = (key: string) => effStats[key] !== baseStats[key];

    const effKeywords = effectiveKeywords(model, unit, wb);
    const allUpgrades = allAvailableUpgrades(unit, wb);
    const activeUpgrades = model.upgrades || [];

    const handleToggleUpgrade = (upId: string) => {
      let ups = [...activeUpgrades];
      if (ups.includes(upId)) ups = ups.filter(id => id !== upId);
      else ups.push(upId);
      onUpdateModel({ ...model, upgrades: ups });
    };

    const handleEquipItem = (itemId: string) => {
      const bk = [...(model.battlekit || [])];
      bk.push(itemId);
      onUpdateModel({ ...model, battlekit: bk });
      setSelectorOpen(null);
    };

    const handleRemoveItem = (itemId: string) => {
      const bk = [...(model.battlekit || [])];
      const idx = bk.indexOf(itemId);
      if (idx !== -1) {
        bk.splice(idx, 1);
        onUpdateModel({ ...model, battlekit: bk });
      }
    };

    const unitAbilities = displayAbilitiesForCard(model, unit).map((a: any) => a.name);
    const faction = FACTIONS.find((f: any) => f.id === wb.factionId);

    // Dynamic Capacity Calculation
    const meleeCap = getModelMeleeCapacity(model, unit, wb);
    const rangedCap = getModelRangedCapacity(model, unit, wb);
    const armourShield = getModelArmourAndShield(model, unit, wb);
    const gearGrenades = getModelGearAndGrenades(model, unit, wb);
    const totalArmour = calculateTotalArmour(model, unit, wb);

    // Sum costs per section
    const sumCost = (list: any[]) => list.reduce((acc, it) => acc + (it.cost || 0), 0);
    const meleeCost = sumCost(meleeCap.items);
    const rangedCost = sumCost(rangedCap.items);
    const armourShieldCost = (armourShield.armour?.cost || 0) + (armourShield.shield?.cost || 0);
    const gearCost = sumCost(gearGrenades.grenades) + sumCost(gearGrenades.gear);

    // Category options helper
    const getSelectorOptions = (category: string) => {
      let rawList: any[] = [];
      if (category === 'melee') rawList = armouryItemsForWarband(wb, 'melee');
      else if (category === 'ranged') {
        rawList = armouryItemsForWarband(wb, 'ranged');
        if (unit.id === 'anchorite-shrine') {
          rawList = [...rawList, ...armouryItemsForWarband(wb, 'anchoriteRanged')];
        }
      } else if (category === 'armour') rawList = armouryItemsForWarband(wb, 'armour');
      else if (category === 'shields') rawList = armouryItemsForWarband(wb, 'shields');
      else if (category === 'grenades') rawList = armouryItemsForWarband(wb, 'grenades');
      else if (category === 'equipment') {
        rawList = armouryItemsForWarband(wb, 'equipment');
        if (unit.id === 'anchorite-shrine') {
          rawList = [...rawList, ...armouryItemsForWarband(wb, 'anchoriteBattlekit')];
        }
      }

      return rawList.map(item => ({
        item,
        cls: classifyBattlekitItem(item, model, unit, wb)
      })).filter(c => c.cls.state !== 'hidden');
    };

    return (
      <div className="flex flex-col h-full w-full custom-scrollbar">
        {/* HEADER FICHA */}
        <div className="bg-gradient-to-br from-[#2a1610] to-[#1a0f0a] border-b border-[#5c3a21] p-6 shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none font-serif text-8xl">
            {faction?.id === 'iron-sultanate' ? '☾' : '✠'}
          </div>
          <div className="relative z-10 flex justify-between items-start">
            <div className="w-full">
              <input 
                type="text" 
                value={model.name || ''}
                onChange={(e) => onUpdateModel({ ...model, name: e.target.value })}
                placeholder={effName}
                className="w-full bg-transparent text-[#b8863c] font-serif text-3xl placeholder-[#b8863c]/50 focus:outline-none focus:border-b border-[#b8863c] transition-all"
              />
              <div className="text-[#9e9178] text-xs uppercase tracking-widest mt-1">
                {effName !== unit.name ? `${effName} (${unit.name})` : effName} 
                <span className="mx-2">•</span> 
                Base: {unit.cost} {unit.currency}
              </div>
            </div>
          </div>

          {/* STATS CANÓNICOS */}
          {unit.stats && (
            <div className="grid grid-cols-5 gap-2 mt-6">
              {['movement', 'ranged', 'melee', 'armour', 'base'].map(k => (
                <div key={k} className="bg-[#0a0503] border border-[#3a2110] rounded-lg p-2 text-center shadow-inner flex flex-col justify-center relative overflow-hidden">
                  <div className="text-[9px] uppercase text-[#7a6a58] tracking-widest z-10">{k === 'movement' ? 'Mov' : k}</div>
                  <div className={`font-serif text-2xl z-10 ${isOverridden(k) ? 'text-[#b8863c] drop-shadow-[0_0_5px_rgba(184,134,60,0.5)]' : 'text-[#e2d4b7]'}`}>
                    {k === 'armour' ? totalArmour : effStats[k]}
                  </div>
                  {/* Icono de fondo */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] text-4xl pointer-events-none">
                    {k === 'movement' && '➦'}
                    {k === 'ranged' && '⌖'}
                    {k === 'melee' && '⚔'}
                    {k === 'armour' && '⛨'}
                    {k === 'base' && '♥'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="p-4 space-y-6">

          {/* KEYWORDS DE LA UNIDAD */}
          {effKeywords.length > 0 && (
            <div>
              <div className="text-[10px] uppercase text-[#7a6a58] tracking-widest font-bold mb-2">Keywords del Modelo</div>
              <div className="flex flex-wrap gap-2">
                {effKeywords.map((k: string) => {
                  const isSpecial = k === 'ELITE' || k === 'LEADER' || k === 'STRONG';
                  const isFromUpgrade = !(unit.keywords || []).includes(k);
                  return (
                    <span 
                      key={k} 
                      title={KEYWORD_LIBRARY[k] || ''}
                      className={`px-3 py-1 text-xs uppercase tracking-wider rounded-full border transition-all ${
                        isSpecial 
                          ? 'bg-gradient-to-r from-[#5c3a21] to-[#3a2110] border-[#b8863c] text-[#e2d4b7] shadow-[0_0_8px_rgba(184,134,60,0.2)]' 
                          : 'bg-[#0a0503] border-[#3a2110] text-[#9e9178]'
                      } ${isFromUpgrade ? 'border-dashed' : ''}`}
                    >
                      {k} {isFromUpgrade && <span className="text-[#b8863c] ml-1">*</span>}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* CONTENEDORES DE CAPACIDAD DE ARMAMENTO (UX DO CRUZADO) */}
          {/* ======================================================== */}

          {unit.noBattlekit ? (
            <div className="p-6 text-center text-[#7a6a58] border border-dashed border-[#5c3a21] bg-[#1a0f0a] rounded-xl font-serif text-lg">
              Esta unidad no tiene acceso a la Armería de banda.
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex justify-between items-center border-b border-[#3a2110] pb-2">
                <span className="font-serif text-[#e2d4b7] text-lg uppercase tracking-wider">Armería & Slots de Capacidad</span>
                <span className="text-xs text-[#b8863c] font-mono">Reglas Canon 1.0.2</span>
              </div>

              {/* GRID 2 COLUMNAS: MELEE & RANGED */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                
                {/* 1. SLOT MELEE */}
                <div className="bg-[#0a0503] border border-[#3a2110] rounded-xl shadow-lg flex flex-col overflow-hidden">
                  <div className="bg-gradient-to-r from-[#2a1610] to-[#0a0503] border-b border-[#3a2110] p-3 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase tracking-widest font-bold text-[#e2d4b7] flex items-center gap-1.5">
                        ⚔️ Melee (Cuerpo a Cuerpo)
                      </span>
                      {meleeCap.isStrong && (
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#b8863c]/20 text-[#b8863c] border border-[#b8863c]/40 font-mono" title="STRONG: 2H cuenta como 1H">
                          STRONG
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 border border-[#3a2110] text-[#b8863c]">
                        {meleeCap.used} / {meleeCap.max} Manos
                      </span>
                      {meleeCost > 0 && (
                        <span className="text-[10px] font-mono bg-red-950/40 text-red-400 px-1.5 py-0.5 rounded border border-red-900/40">
                          {meleeCost} 👑
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 flex-1 flex flex-col justify-between space-y-3">
                    {/* Lista de armas Melee equipadas */}
                    <div className="space-y-2">
                      {meleeCap.items.length === 0 ? (
                        <div className="text-center py-4 border border-dashed border-[#3a2110] rounded-lg text-[#7a6a58] text-xs italic">
                          Sin armas cuerpo a cuerpo
                        </div>
                      ) : (
                        meleeCap.items.map((it: any, i: number) => (
                          <div key={i} className="bg-[#1a0f0a] border border-[#3a2110] rounded-lg p-2.5 flex justify-between items-center shadow-sm">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="font-serif font-bold text-sm text-[#e2d4b7]">{it.name}</span>
                                <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-mono bg-[#2a1610] text-[#b8863c] border border-[#5c3a21]">
                                  {it.type || 'Melee'}
                                </span>
                              </div>
                              <div className="text-[10px] text-[#9e9178] mt-0.5 flex flex-wrap gap-1">
                                {(it.weaponKeywords || []).map((kw: string, kwi: number) => (
                                  <span key={kwi} className="text-[#b8863c]/80">• {kw}</span>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-mono text-[#e2d4b7]">{it.cost} {it.currency}</span>
                              <button 
                                onClick={() => handleRemoveItem(it.id)}
                                className="w-6 h-6 rounded bg-[#2a1610] hover:bg-red-950 text-[#9e9178] hover:text-red-400 border border-[#3a2110] flex items-center justify-center transition-all text-xs"
                                title="Desequipar"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Selector / Botón Añadir */}
                    {selectorOpen === 'melee' ? (
                      <div className="bg-[#0e0705] border border-[#5c3a21] rounded-lg p-3 space-y-2 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in">
                        <div className="flex justify-between items-center border-b border-[#3a2110] pb-1.5 text-[10px] uppercase text-[#7a6a58] tracking-widest font-bold">
                          <span>Elegir Arma Melee</span>
                          <button onClick={() => setSelectorOpen(null)} className="text-red-400 hover:text-white">✕ Cancelar</button>
                        </div>
                        <div className="space-y-1.5">
                          {getSelectorOptions('melee').map(({ item, cls }: any) => {
                            const isEquipped = cls.state === 'equipped';
                            const isDisabled = cls.state === 'disabled';
                            return (
                              <button
                                key={item.id}
                                disabled={isEquipped || isDisabled}
                                onClick={() => handleEquipItem(item.id)}
                                className={`w-full text-left p-2 rounded flex justify-between items-center transition-all text-xs ${
                                  isEquipped 
                                    ? 'bg-[#1a0f0a] border border-[#b8863c]/40 text-[#b8863c] opacity-60' 
                                    : isDisabled 
                                      ? 'bg-[#1a0f0a]/30 border border-red-900/30 text-[#7a6a58] opacity-50 cursor-not-allowed'
                                      : 'bg-[#1a0f0a] hover:bg-[#2a1610] border border-[#3a2110] hover:border-[#b8863c] text-[#e2d4b7]'
                                }`}
                              >
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold">{item.name}</span>
                                    <span className="text-[9px] text-[#7a6a58] uppercase font-mono">({item.type})</span>
                                  </div>
                                  {isDisabled && <span className="text-[9px] text-red-400">⚠ {cls.reason}</span>}
                                  {isEquipped && <span className="text-[9px] text-[#b8863c]">✓ Ya equipada</span>}
                                </div>
                                <span className="font-mono text-xs text-[#b8863c] shrink-0">{item.cost} {item.currency}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div>
                        {meleeCap.isFull ? (
                          <div className="text-[10px] text-center text-[#7a6a58] italic uppercase tracking-widest py-1 border border-[#3a2110] rounded">
                            Capacidad Melee Completa ({meleeCap.max} manos)
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectorOpen('melee')}
                            className="w-full border border-dashed border-[#5c3a21] hover:border-[#b8863c] bg-[#1a0f0a]/60 hover:bg-[#2a1610] text-[#9e9178] hover:text-[#e2d4b7] py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex justify-center items-center gap-1.5"
                          >
                            + {meleeCap.used === 1 ? 'Equipar Arma Secundaria' : 'Equipar Arma Melee'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. SLOT RANGED */}
                <div className="bg-[#0a0503] border border-[#3a2110] rounded-xl shadow-lg flex flex-col overflow-hidden">
                  <div className="bg-gradient-to-r from-[#2a1610] to-[#0a0503] border-b border-[#3a2110] p-3 flex justify-between items-center">
                    <span className="text-xs uppercase tracking-widest font-bold text-[#e2d4b7] flex items-center gap-1.5">
                      🎯 A Distancia (Ranged)
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 border border-[#3a2110] text-[#b8863c]">
                        {rangedCap.used} / {rangedCap.max} Manos
                      </span>
                      {rangedCost > 0 && (
                        <span className="text-[10px] font-mono bg-red-950/40 text-red-400 px-1.5 py-0.5 rounded border border-red-900/40">
                          {rangedCost} 👑
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      {rangedCap.items.length === 0 ? (
                        <div className="text-center py-4 border border-dashed border-[#3a2110] rounded-lg text-[#7a6a58] text-xs italic">
                          Sin armas a distancia
                        </div>
                      ) : (
                        rangedCap.items.map((it: any, i: number) => (
                          <div key={i} className="bg-[#1a0f0a] border border-[#3a2110] rounded-lg p-2.5 flex justify-between items-center shadow-sm">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="font-serif font-bold text-sm text-[#e2d4b7]">{it.name}</span>
                                <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-mono bg-[#2a1610] text-[#b8863c] border border-[#5c3a21]">
                                  {it.range ? `${it.range}"` : it.type}
                                </span>
                              </div>
                              <div className="text-[10px] text-[#9e9178] mt-0.5 flex flex-wrap gap-1">
                                {(it.weaponKeywords || []).map((kw: string, kwi: number) => (
                                  <span key={kwi} className="text-[#b8863c]/80">• {kw}</span>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-mono text-[#e2d4b7]">{it.cost} {it.currency}</span>
                              <button 
                                onClick={() => handleRemoveItem(it.id)}
                                className="w-6 h-6 rounded bg-[#2a1610] hover:bg-red-950 text-[#9e9178] hover:text-red-400 border border-[#3a2110] flex items-center justify-center transition-all text-xs"
                                title="Desequipar"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Selector Ranged */}
                    {selectorOpen === 'ranged' ? (
                      <div className="bg-[#0e0705] border border-[#5c3a21] rounded-lg p-3 space-y-2 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in">
                        <div className="flex justify-between items-center border-b border-[#3a2110] pb-1.5 text-[10px] uppercase text-[#7a6a58] tracking-widest font-bold">
                          <span>Elegir Arma a Distancia</span>
                          <button onClick={() => setSelectorOpen(null)} className="text-red-400 hover:text-white">✕ Cancelar</button>
                        </div>
                        <div className="space-y-1.5">
                          {getSelectorOptions('ranged').map(({ item, cls }: any) => {
                            const isEquipped = cls.state === 'equipped';
                            const isDisabled = cls.state === 'disabled';
                            return (
                              <button
                                key={item.id}
                                disabled={isEquipped || isDisabled}
                                onClick={() => handleEquipItem(item.id)}
                                className={`w-full text-left p-2 rounded flex justify-between items-center transition-all text-xs ${
                                  isEquipped 
                                    ? 'bg-[#1a0f0a] border border-[#b8863c]/40 text-[#b8863c] opacity-60' 
                                    : isDisabled 
                                      ? 'bg-[#1a0f0a]/30 border border-red-900/30 text-[#7a6a58] opacity-50 cursor-not-allowed'
                                      : 'bg-[#1a0f0a] hover:bg-[#2a1610] border border-[#3a2110] hover:border-[#b8863c] text-[#e2d4b7]'
                                }`}
                              >
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold">{item.name}</span>
                                    <span className="text-[9px] text-[#7a6a58] uppercase font-mono">({item.range ? `${item.range}"` : item.type})</span>
                                  </div>
                                  {isDisabled && <span className="text-[9px] text-red-400">⚠ {cls.reason}</span>}
                                  {isEquipped && <span className="text-[9px] text-[#b8863c]">✓ Ya equipada</span>}
                                </div>
                                <span className="font-mono text-xs text-[#b8863c] shrink-0">{item.cost} {item.currency}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div>
                        {rangedCap.isFull ? (
                          <div className="text-[10px] text-center text-[#7a6a58] italic uppercase tracking-widest py-1 border border-[#3a2110] rounded">
                            Capacidad Ranged Completa ({rangedCap.max} manos)
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectorOpen('ranged')}
                            className="w-full border border-dashed border-[#5c3a21] hover:border-[#b8863c] bg-[#1a0f0a]/60 hover:bg-[#2a1610] text-[#9e9178] hover:text-[#e2d4b7] py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex justify-center items-center gap-1.5"
                          >
                            + {rangedCap.used === 1 ? 'Equipar Arma Secundaria' : 'Equipar Arma a Distancia'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* GRID 2 COLUMNAS: ARMADURA & ESCUDOS / EQUIPO & GRANADAS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* 3. SLOT ARMADURA & ESCUDOS */}
                <div className="bg-[#0a0503] border border-[#3a2110] rounded-xl shadow-lg flex flex-col overflow-hidden">
                  <div className="bg-gradient-to-r from-[#2a1610] to-[#0a0503] border-b border-[#3a2110] p-3 flex justify-between items-center">
                    <span className="text-xs uppercase tracking-widest font-bold text-[#e2d4b7] flex items-center gap-1.5">
                      🛡️ Armadura & Escudos
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 border border-[#3a2110] text-[#b8863c]">
                        Total ARM: {totalArmour}
                      </span>
                      {armourShieldCost > 0 && (
                        <span className="text-[10px] font-mono bg-red-950/40 text-red-400 px-1.5 py-0.5 rounded border border-red-900/40">
                          {armourShieldCost} 👑
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 space-y-3">
                    {/* Sub-slot: Armadura */}
                    <div>
                      <div className="text-[10px] uppercase text-[#7a6a58] tracking-widest font-bold mb-1.5">Armadura Corporal</div>
                      {armourShield.armour ? (
                        <div className="bg-[#1a0f0a] border border-[#3a2110] rounded-lg p-2.5 flex justify-between items-center">
                          <div>
                            <div className="font-serif font-bold text-sm text-[#e2d4b7]">{armourShield.armour.name}</div>
                            <div className="text-[10px] text-[#b8863c]">
                              {(armourShield.armour.weaponKeywords || []).join(' · ') || 'Protección corporal'}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-[#e2d4b7]">{armourShield.armour.cost} {armourShield.armour.currency}</span>
                            <button 
                              onClick={() => handleRemoveItem(armourShield.armour.id)}
                              className="w-6 h-6 rounded bg-[#2a1610] hover:bg-red-950 text-[#9e9178] hover:text-red-400 border border-[#3a2110] flex items-center justify-center transition-all text-xs"
                              title="Desequipar armadura"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ) : (
                        selectorOpen === 'armour' ? (
                          <div className="bg-[#0e0705] border border-[#5c3a21] rounded-lg p-2.5 space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                            <div className="flex justify-between items-center text-[10px] uppercase text-[#7a6a58] pb-1 border-b border-[#3a2110]">
                              <span>Elegir Armadura</span>
                              <button onClick={() => setSelectorOpen(null)} className="text-red-400">✕</button>
                            </div>
                            {getSelectorOptions('armour').map(({ item, cls }: any) => (
                              <button
                                key={item.id}
                                disabled={cls.state !== 'available'}
                                onClick={() => handleEquipItem(item.id)}
                                className={`w-full text-left p-1.5 rounded flex justify-between items-center text-xs ${
                                  cls.state === 'available' ? 'bg-[#1a0f0a] hover:bg-[#2a1610] text-[#e2d4b7] border border-[#3a2110]' : 'opacity-40 text-[#7a6a58] border border-transparent'
                                }`}
                              >
                                <span>{item.name}</span>
                                <span className="font-mono text-[#b8863c]">{item.cost} {item.currency}</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectorOpen('armour')}
                            className="w-full border border-dashed border-[#5c3a21] hover:border-[#b8863c] bg-[#1a0f0a]/60 hover:bg-[#2a1610] text-[#9e9178] hover:text-[#e2d4b7] py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
                          >
                            + Equipar Armadura
                          </button>
                        )
                      )}
                    </div>

                    {/* Sub-slot: Escudo */}
                    <div>
                      <div className="text-[10px] uppercase text-[#7a6a58] tracking-widest font-bold mb-1.5">Escudo</div>
                      {armourShield.shield ? (
                        <div className="bg-[#1a0f0a] border border-[#3a2110] rounded-lg p-2.5 flex justify-between items-center">
                          <div>
                            <div className="font-serif font-bold text-sm text-[#e2d4b7]">{armourShield.shield.name}</div>
                            <div className="text-[10px] text-[#b8863c]">
                              {(armourShield.shield.weaponKeywords || []).join(' · ') || 'Escudo defensivo'}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-[#e2d4b7]">{armourShield.shield.cost} {armourShield.shield.currency}</span>
                            <button 
                              onClick={() => handleRemoveItem(armourShield.shield.id)}
                              className="w-6 h-6 rounded bg-[#2a1610] hover:bg-red-950 text-[#9e9178] hover:text-red-400 border border-[#3a2110] flex items-center justify-center transition-all text-xs"
                              title="Desequipar escudo"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ) : (
                        selectorOpen === 'shields' ? (
                          <div className="bg-[#0e0705] border border-[#5c3a21] rounded-lg p-2.5 space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                            <div className="flex justify-between items-center text-[10px] uppercase text-[#7a6a58] pb-1 border-b border-[#3a2110]">
                              <span>Elegir Escudo</span>
                              <button onClick={() => setSelectorOpen(null)} className="text-red-400">✕</button>
                            </div>
                            {getSelectorOptions('shields').map(({ item, cls }: any) => (
                              <button
                                key={item.id}
                                disabled={cls.state !== 'available'}
                                onClick={() => handleEquipItem(item.id)}
                                className={`w-full text-left p-1.5 rounded flex justify-between items-center text-xs ${
                                  cls.state === 'available' ? 'bg-[#1a0f0a] hover:bg-[#2a1610] text-[#e2d4b7] border border-[#3a2110]' : 'opacity-40 text-[#7a6a58] border border-transparent'
                                }`}
                              >
                                <div className="flex flex-col">
                                  <span>{item.name}</span>
                                  {cls.state === 'disabled' && <span className="text-[9px] text-red-400">{cls.reason}</span>}
                                </div>
                                <span className="font-mono text-[#b8863c]">{item.cost} {item.currency}</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectorOpen('shields')}
                            className="w-full border border-dashed border-[#5c3a21] hover:border-[#b8863c] bg-[#1a0f0a]/60 hover:bg-[#2a1610] text-[#9e9178] hover:text-[#e2d4b7] py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
                          >
                            + Equipar Escudo
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. SLOT EQUIPO ADICIONAL & GRANADAS */}
                <div className="bg-[#0a0503] border border-[#3a2110] rounded-xl shadow-lg flex flex-col overflow-hidden">
                  <div className="bg-gradient-to-r from-[#2a1610] to-[#0a0503] border-b border-[#3a2110] p-3 flex justify-between items-center">
                    <span className="text-xs uppercase tracking-widest font-bold text-[#e2d4b7] flex items-center gap-1.5">
                      🎒 Equipo & Granadas
                    </span>
                    {gearCost > 0 && (
                      <span className="text-[10px] font-mono bg-red-950/40 text-red-400 px-1.5 py-0.5 rounded border border-red-900/40">
                        {gearCost} 👑
                      </span>
                    )}
                  </div>

                  <div className="p-3 space-y-3">
                    {/* Granadas */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] uppercase text-[#7a6a58] tracking-widest font-bold">Granadas (Máx. 1 Tipo)</span>
                        {gearGrenades.grenades.length === 0 && selectorOpen !== 'grenades' && (
                          <button onClick={() => setSelectorOpen('grenades')} className="text-[10px] text-[#b8863c] hover:underline uppercase">
                            + Añadir
                          </button>
                        )}
                      </div>
                      {gearGrenades.grenades.length > 0 ? (
                        <div className="space-y-1.5">
                          {gearGrenades.grenades.map((g: any, i: number) => (
                            <div key={i} className="bg-[#1a0f0a] border border-[#3a2110] rounded-lg p-2 flex justify-between items-center text-xs">
                              <div>
                                <span className="font-bold text-[#e2d4b7]">💣 {g.name}</span>
                                <span className="text-[9px] text-[#7a6a58] ml-2">({(g.weaponKeywords || []).slice(0, 3).join(', ')})</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[#b8863c]">{g.cost} {g.currency}</span>
                                <button onClick={() => handleRemoveItem(g.id)} className="text-[#7a6a58] hover:text-red-400 px-1">✕</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : selectorOpen === 'grenades' ? (
                        <div className="bg-[#0e0705] border border-[#5c3a21] rounded-lg p-2.5 space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                          <div className="flex justify-between items-center text-[10px] uppercase text-[#7a6a58] pb-1 border-b border-[#3a2110]">
                            <span>Elegir Tipo de Granada</span>
                            <button onClick={() => setSelectorOpen(null)} className="text-red-400">✕</button>
                          </div>
                          {getSelectorOptions('grenades').map(({ item, cls }: any) => (
                            <button
                              key={item.id}
                              disabled={cls.state !== 'available'}
                              onClick={() => handleEquipItem(item.id)}
                              className={`w-full text-left p-1.5 rounded flex justify-between items-center text-xs ${
                                cls.state === 'available' ? 'bg-[#1a0f0a] hover:bg-[#2a1610] text-[#e2d4b7] border border-[#3a2110]' : 'opacity-40 text-[#7a6a58] border border-transparent'
                              }`}
                            >
                              <span>{item.name}</span>
                              <span className="font-mono text-[#b8863c]">{item.cost} {item.currency}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-2.5 border border-dashed border-[#3a2110] rounded text-[#7a6a58] text-xs italic">
                          Sin granadas
                        </div>
                      )}
                    </div>

                    {/* Objetos y Equipo */}
                    <div className="pt-2 border-t border-[#3a2110]/50">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] uppercase text-[#7a6a58] tracking-widest font-bold">Objetos & Consumibles</span>
                        {selectorOpen !== 'equipment' && (
                          <button onClick={() => setSelectorOpen('equipment')} className="text-[10px] text-[#b8863c] hover:underline uppercase">
                            + Añadir Objeto
                          </button>
                        )}
                      </div>
                      {gearGrenades.gear.length > 0 ? (
                        <div className="space-y-1.5">
                          {gearGrenades.gear.map((it: any, i: number) => (
                            <div key={i} className="bg-[#1a0f0a] border border-[#3a2110] rounded-lg p-2 flex justify-between items-center text-xs">
                              <div>
                                <span className="font-bold text-[#e2d4b7]">{it.name}</span>
                                {it.restriction && <span className="text-[9px] text-[#b8863c] ml-2">({it.restriction})</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[#b8863c]">{it.cost} {it.currency}</span>
                                <button onClick={() => handleRemoveItem(it.id)} className="text-[#7a6a58] hover:text-red-400 px-1">✕</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        selectorOpen !== 'equipment' && (
                          <div className="text-center py-2.5 border border-dashed border-[#3a2110] rounded text-[#7a6a58] text-xs italic">
                            Sin equipo adicional
                          </div>
                        )
                      )}

                      {selectorOpen === 'equipment' && (
                        <div className="bg-[#0e0705] border border-[#5c3a21] rounded-lg p-2.5 space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar mt-2">
                          <div className="flex justify-between items-center text-[10px] uppercase text-[#7a6a58] pb-1 border-b border-[#3a2110]">
                            <span>Elegir Objeto de Equipo</span>
                            <button onClick={() => setSelectorOpen(null)} className="text-red-400">✕</button>
                          </div>
                          {getSelectorOptions('equipment').map(({ item, cls }: any) => (
                            <button
                              key={item.id}
                              disabled={cls.state !== 'available'}
                              onClick={() => handleEquipItem(item.id)}
                              className={`w-full text-left p-1.5 rounded flex justify-between items-center text-xs ${
                                cls.state === 'available' ? 'bg-[#1a0f0a] hover:bg-[#2a1610] text-[#e2d4b7] border border-[#3a2110]' : 'opacity-40 text-[#7a6a58] border border-transparent'
                              }`}
                            >
                              <div className="flex flex-col">
                                <span>{item.name}</span>
                                {cls.state === 'disabled' && <span className="text-[9px] text-red-400">{cls.reason}</span>}
                              </div>
                              <span className="font-mono text-[#b8863c]">{item.cost} {item.currency}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MEJORAS (UPGRADES) */}
          {/* ======================================================== */}
          {allUpgrades.length > 0 && (
            <div className="bg-[#0a0503] border border-[#3a2110] rounded-xl shadow-lg overflow-hidden mt-6">
              <div className="bg-gradient-to-r from-[#2a1610] to-[#0a0503] border-b border-[#3a2110] p-3 flex items-center gap-2">
                <span className="text-[#b8863c] text-lg">★</span>
                <span className="text-xs uppercase tracking-widest font-bold text-[#e2d4b7]">Mejoras (Upgrades)</span>
              </div>
              <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                {allUpgrades.map((up: any) => {
                  const isActive = activeUpgrades.includes(up.id);
                  const upCls = classifyUpgrade(up, model, unit, wb);
                  const upBlocked = !isActive && upCls.state === 'disabled';
                  return (
                    <div 
                      key={up.id} 
                      onClick={() => !upBlocked && handleToggleUpgrade(up.id)}
                      className={`relative p-3 border-2 rounded-lg transition-all cursor-pointer group flex flex-col justify-between ${
                        isActive 
                          ? 'bg-gradient-to-br from-[#2a1610] to-[#1a0f0a] border-[#b8863c] shadow-[0_0_10px_rgba(184,134,60,0.1)]' 
                          : upBlocked 
                            ? 'bg-[#1a0f0a]/50 border-red-900/30 opacity-60 cursor-not-allowed'
                            : 'bg-[#1a0f0a] border-[#3a2110] hover:border-[#b8863c]/50 hover:bg-[#2a1610]'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-1">
                          <div className={`font-bold text-sm ${isActive ? 'text-[#b8863c]' : 'text-[#e2d4b7]'}`}>
                            {up.name} {up._fromVariant && <span className="text-[10px] text-[#b8863c] ml-1 uppercase tracking-widest bg-black/40 px-1 rounded border border-[#3a2110]">Variante</span>}
                          </div>
                          <div className="text-xs font-bold text-[#9e9178] bg-black/30 px-1.5 py-0.5 rounded shadow-inner">
                            +{up.cost} {up.currency}
                          </div>
                        </div>
                        {up.note && <div className="text-[10px] text-[#9e9178] mb-3 leading-tight">{up.note}</div>}
                      </div>
                      
                      <div className="flex justify-between items-center mt-2 border-t border-[#3a2110]/50 pt-2">
                        {upBlocked ? (
                          <span className="text-[10px] text-red-500 uppercase tracking-widest flex items-center gap-1">
                            <span className="text-sm">⚠</span> {upCls.reason}
                          </span>
                        ) : (
                          <span className={`text-[10px] uppercase tracking-widest font-bold ${isActive ? 'text-[#b8863c]' : 'text-[#7a6a58] group-hover:text-[#9e9178]'}`}>
                            {isActive ? '✓ Equipado' : '+ Seleccionar'}
                          </span>
                        )}
                        
                        <div className={`w-3 h-3 rounded-sm border flex items-center justify-center transition-colors ${
                          isActive ? 'bg-[#b8863c] border-[#b8863c]' : 'border-[#5c3a21] bg-black/30'
                        }`}>
                          {isActive && <div className="w-1.5 h-1.5 bg-[#1a0f0a]" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* REGLAS ESPECIALES */}
          {unitAbilities.length > 0 && (
            <div className="mt-4">
              <div className="text-[10px] uppercase text-[#7a6a58] tracking-widest font-bold mb-2 border-b border-[#3a2110] pb-1">Reglas Especiales de la Unidad</div>
              <ul className="text-xs text-[#e2d4b7] space-y-1.5">
                {unitAbilities.map((a: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 bg-[#0a0503] p-2 rounded border border-[#3a2110]">
                    <span className="text-[#b8863c] mt-0.5">✦</span>
                    <span className="font-serif tracking-wide">{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      </div>
    );
  } catch (err: any) {
    console.error('CRASH IN MODELDETAILS:', err);
    return <div className="text-red-500 font-bold p-8">CRASH: {err.message}</div>;
  }
}
