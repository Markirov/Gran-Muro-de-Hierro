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
  getModelGearAndGrenades,
  unitCostAltAllowed
} from '../../../lib/cost_calculation';
import { classifyBattlekitItem } from '../../../lib/battlekit_legality_engine';
import { KEYWORD_LIBRARY } from '../../../data/04_keyword_library';
import { ABILITY_LIBRARY } from '../../../data/02_ability_library';
import { glossaryText } from '../../../data/03_keyword_glossary_canon_fuente_nica_de_lo';
import { WEAPON_KEYWORD_LIBRARY } from '../../../data/05_weapon_keyword_library';
import { FACTIONS } from '../../../data/factions';
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
  extractEquipmentDetails
} from '../../../lib/weapon_helpers';

function getArmouryTabNames(factionId: string) {
  switch (factionId) {
    case 'iron-sultanate':
      return { equipped: 'Armería', shop: 'Bazar', iconEquipped: '🛡️', iconShop: '🪙' };
    case 'new-antioch':
      return { equipped: 'Arsenal', shop: 'Intendencia', iconEquipped: '🎖️', iconShop: '📦' };
    case 'trench-pilgrims':
      return { equipped: 'Relicario', shop: 'Ofrendas', iconEquipped: '☦️', iconShop: '🕯️' };
    case 'heretic-legions':
      return { equipped: 'Arsenal Profano', shop: 'Pacto Negro', iconEquipped: '⚔️', iconShop: '🩸' };
    case 'black-grail':
      return { equipped: 'Osario', shop: 'Festín del Grial', iconEquipped: '☣️', iconShop: '🫀' };
    case 'court-serpent':
      return { equipped: 'Cámara del Tormento', shop: 'Bazar de Almas', iconEquipped: '🐍', iconShop: '💎' };
    default:
      return { equipped: 'Armería', shop: 'Bazar', iconEquipped: '🛡️', iconShop: '🪙' };
  }
}

interface Props {
  wb: any;
  model: any;
  onUpdateModel: (newModel: any) => void;
  onRemoveModel?: (uid: string) => void;
}

export function ModelDetails({ wb, model, onUpdateModel, onRemoveModel }: Props) {
  const [selectorOpen, setSelectorOpen] = useState<string | null>(null);
  const [armouryTab, setArmouryTab] = useState<'equipped' | 'shop'>('equipped');
  const isShop = armouryTab === 'shop';

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
      return (
        <div className="p-6 bg-[#1a0f0a] border border-[#5c3a21] rounded-xl text-[#e2d4b7] space-y-4 m-4">
          <div className="flex justify-between items-start border-b border-[#5c3a21] pb-3">
            <div>
              <h3 className="font-serif text-2xl text-[#b8863c] uppercase tracking-wide">
                {model.name || 'Unidad Importada'}
              </h3>
              <p className="text-xs text-[#9e9178] uppercase tracking-widest mt-1">
                Identificador: {model.unitId || 'Personalizado / No canónico'}
              </p>
            </div>
            {onRemoveModel && (
              <button
                onClick={() => onRemoveModel(model.uid)}
                className="text-red-400 hover:text-red-200 border border-red-800/60 bg-red-950/40 px-3 py-1.5 rounded text-xs uppercase tracking-wider font-bold transition-all cursor-pointer"
              >
                Eliminar
              </button>
            )}
          </div>
          <p className="text-sm text-[#9e9178]">
            Esta miniatura proviene de una importación de Trench Companion o un catálogo externo y no está vinculada directamente a una entrada canónica de {wb.factionId}.
          </p>
          {model.companionStats && (
            <div className="grid grid-cols-4 gap-2 bg-[#0a0503] p-3 rounded border border-[#3a2110] text-center font-mono">
              <div><span className="text-[10px] text-[#7a6a58] block uppercase">MOV</span>{model.companionStats.move || '—'}</div>
              <div><span className="text-[10px] text-[#7a6a58] block uppercase">MEL</span>{model.companionStats.melee || '—'}</div>
              <div><span className="text-[10px] text-[#7a6a58] block uppercase">DIS</span>{model.companionStats.ranged || '—'}</div>
              <div><span className="text-[10px] text-[#7a6a58] block uppercase">BLI</span>{model.companionStats.armour || '—'}</div>
            </div>
          )}
          {model.battlekit?.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs text-[#b8863c] uppercase font-bold tracking-widest block">Equipo Equipado:</span>
              <ul className="text-xs text-[#e2d4b7] list-disc list-inside">
                {model.battlekit.map((k: string, idx: number) => (
                  <li key={idx}>{k}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    const effStats = effectiveStats(model, unit, wb);
    const effName = effectiveUnitName(model, unit);
    const baseStats = unit.stats || {};
    const isOverridden = (key: string) => effStats[key] !== baseStats[key];

    const effKeywords = effectiveKeywords(model, unit, wb);
    const allUpgrades = allAvailableUpgrades(unit, wb);
    const activeUpgrades = model.upgrades || [];

    const handleToggleUpgrade = (upId: string) => {
      if (!isShop) return;
      let ups = [...activeUpgrades];
      if (ups.includes(upId)) ups = ups.filter(id => id !== upId);
      else ups.push(upId);
      onUpdateModel({ ...model, upgrades: ups });
    };

    const handleEquipItem = (itemId: string) => {
      if (unit.id === 'mech-heavy-inf') {
        if (itemId === 'machine-armour-na') {
          onUpdateModel({ ...model, costVariant: 'alt' });
          setSelectorOpen(null);
          return;
        }
        if (itemId === 'reinforced-armour-na') {
          onUpdateModel({ ...model, costVariant: 'base' });
          setSelectorOpen(null);
          return;
        }
      }
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

    const getKeywordDesc = (k: string): string => {
      const gloss = glossaryText(k);
      if (gloss) return gloss;
      if ((KEYWORD_LIBRARY as any)[k]) return (KEYWORD_LIBRARY as any)[k];
      if ((ABILITY_LIBRARY as any)[k]?.summary) return (ABILITY_LIBRARY as any)[k].summary;
      return '';
    };

    const getAbilityDesc = (name: string): string => {
      if (!name) return '';
      if ((ABILITY_LIBRARY as any)[name]?.summary) return (ABILITY_LIBRARY as any)[name].summary;
      if ((ABILITY_LIBRARY as any)[name + ' ACTION']?.summary) return (ABILITY_LIBRARY as any)[name + ' ACTION'].summary;
      const gloss = glossaryText(name);
      if (gloss) return gloss;
      if ((KEYWORD_LIBRARY as any)[name]) return (KEYWORD_LIBRARY as any)[name];
      const cleanName = name.replace(/\s+ACTION$/i, '');
      const matchKey = Object.keys(ABILITY_LIBRARY).find(k => 
        k.toLowerCase() === name.toLowerCase() || 
        k.toLowerCase() === cleanName.toLowerCase() || 
        k.toLowerCase().startsWith(cleanName.toLowerCase())
      );
      if (matchKey && (ABILITY_LIBRARY as any)[matchKey]?.summary) return (ABILITY_LIBRARY as any)[matchKey].summary;
      return '';
    };

    const getWeaponKeywordDesc = (kw: string): string => {
      const gloss = glossaryText(kw);
      if (gloss) return gloss;
      if ((WEAPON_KEYWORD_LIBRARY as any)[kw]?.summary) return (WEAPON_KEYWORD_LIBRARY as any)[kw].summary;
      if (kw.startsWith('AMMUNITION (')) {
        return 'La pieza se usa en la siguiente partida del modelo. Al desplegarlo, eliges 1 arma a distancia que gana la keyword indicada hasta el final de la partida.';
      }
      return '';
    };

    const unitAbilities = (displayAbilitiesForCard(model, unit) || []).map((a: any) => {
      const name = typeof a === 'string' ? a : a.name;
      let desc = (typeof a === 'object' && a.desc) ? a.desc : getAbilityDesc(name);
      return { name, desc: desc || '' };
    });
    const faction = FACTIONS.find((f: any) => f.id === wb.factionId);
    const tabNames = getArmouryTabNames(wb.factionId);
    const upgradesToDisplay = isShop
      ? allUpgrades
      : allUpgrades.filter(up => activeUpgrades.includes(up.id));

    // Dynamic Capacity Calculation
    const meleeCap = getModelMeleeCapacity(model, unit, wb);
    const rangedCap = getModelRangedCapacity(model, unit, wb);
    const armourShield = getModelArmourAndShield(model, unit, wb);
    const gearGrenades = getModelGearAndGrenades(model, unit, wb);
    const totalArmour = calculateTotalArmour(model, unit, wb);
    const armourBreakdown = getModelArmourBreakdown(model, unit, wb);
    const bulkyInfo = getBulkyInfo(model, unit, wb, armourShield.armour);
    const specialAmmos = getModelSpecialAmmunition(model, wb);

    // Sum costs per section
    const sumCost = (list: any[]) => list.reduce((acc, it) => acc + (it.cost || 0), 0);
    const meleeCost = meleeCap.items.reduce((acc: number, it: any) => acc + battlekitPurchaseCost(wb, it, model), 0);
    const rangedCost = sumCost(rangedCap.items);
    const armourShieldCost = (armourShield.armour?.cost || 0) + (armourShield.shield?.cost || 0);
    const gearCost = sumCost(gearGrenades.grenades) + sumCost(gearGrenades.gear);

    // Section presence for read-only Armería view
    const hasMelee = meleeCap.items.length > 0;
    const hasRanged = rangedCap.items.length > 0;
    const hasArmourShield = !!(armourShield.armour || armourShield.shield || (armourShield.permanentEquipment && armourShield.permanentEquipment.length > 0));
    const hasGearGrenades = gearGrenades.grenades.length > 0 || gearGrenades.gear.length > 0;
    const hasAnyEquipment = hasMelee || hasRanged || hasArmourShield || hasGearGrenades;

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
      <div className="flex flex-col h-full w-full min-h-0 overflow-hidden">
        {/* HEADER FICHA */}
        <div className="bg-gradient-to-br from-[#2a1610] to-[#1a0f0a] border-b border-[#5c3a21] p-5 shrink-0 relative overflow-hidden shadow-md z-10">
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
                Base: {(model.costVariant === 'alt' && unit.costAlt) ? unit.costAlt : unit.cost} {unit.currency}
              </div>
            </div>
          </div>

          {/* STATS CANÓNICOS */}
          {unit.stats && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] uppercase text-[#7a6a58] tracking-widest font-bold">Atributos</span>
                {onRemoveModel && (
                  <button
                    onClick={() => onRemoveModel(model.uid)}
                    className="text-[11px] font-bold text-red-400 hover:text-red-200 bg-red-950/40 hover:bg-red-900/80 border border-red-900/60 hover:border-red-500 px-3 py-1 rounded transition-all uppercase tracking-wider flex items-center gap-1 shadow-sm"
                    title="Eliminar miniatura de la banda"
                  >
                    🗑️ Despedir Miniatura
                  </button>
                )}
              </div>
              <div className="grid grid-cols-5 gap-2">
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
            </div>
          )}
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6 min-h-0">

          {/* KEYWORDS DE LA UNIDAD */}
          {effKeywords.length > 0 && (
            <div>
              <div className="text-[10px] uppercase text-[#7a6a58] tracking-widest font-bold mb-2">Keywords del Modelo</div>
              <div className="flex flex-wrap gap-2">
                {effKeywords.map((k: string) => {
                  const isSpecial = k === 'ELITE' || k === 'LEADER' || k === 'STRONG';
                  const isFromUpgrade = !(unit.keywords || []).includes(k);
                  const desc = getKeywordDesc(k);
                  return (
                    <span 
                      key={k} 
                      title={desc || undefined}
                      className={`px-3 py-1 text-xs uppercase tracking-wider rounded-full border transition-all cursor-help ${
                        isSpecial 
                          ? 'bg-gradient-to-r from-[#5c3a21] to-[#3a2110] border-[#b8863c] text-[#e2d4b7] shadow-[0_0_8px_rgba(184,134,60,0.2)]' 
                          : 'bg-[#0a0503] border-[#3a2110] text-[#9e9178] hover:border-[#5c3a21]'
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
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#3a2110] pb-2">
                <div className="flex items-center gap-3">
                  <span className="font-serif text-[#e2d4b7] text-lg uppercase tracking-wider">
                    {armouryTab === 'equipped' ? tabNames.equipped : tabNames.shop} & Slots de Capacidad
                  </span>
                  <span className="text-xs text-[#b8863c] font-mono">Reglas Canon 1.0.2</span>
                </div>

                {/* BOTONES TABS: ARMERÍA (EQUIPADO) / BAZAR (COMPRAR) */}
                <div className="flex items-center bg-[#0a0503] p-1 rounded-lg border border-[#3a2110] shadow-inner">
                  <button
                    type="button"
                    onClick={() => { setArmouryTab('equipped'); setSelectorOpen(null); }}
                    className={`px-3 py-1 rounded text-xs uppercase tracking-wider font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      armouryTab === 'equipped'
                        ? 'bg-[#5c3a21] text-[#e2d4b7] shadow-md border border-[#b8863c]'
                        : 'text-[#9e9178] hover:text-[#e2d4b7] hover:bg-[#1a0f0a]'
                    }`}
                    title={`Ver solo el equipamiento actualmente asignado (${tabNames.equipped})`}
                  >
                    <span>{tabNames.iconEquipped}</span>
                    <span>{tabNames.equipped}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setArmouryTab('shop')}
                    className={`px-3 py-1 rounded text-xs uppercase tracking-wider font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      armouryTab === 'shop'
                        ? 'bg-[#b8863c] text-[#1a0f0a] shadow-md font-black'
                        : 'text-[#9e9178] hover:text-[#b8863c] hover:bg-[#1a0f0a]'
                    }`}
                    title={`Comprar y gestionar equipamiento (${tabNames.shop})`}
                  >
                    <span>{tabNames.iconShop}</span>
                    <span>{tabNames.shop}</span>
                  </button>
                </div>
              </div>

              {!isShop && !hasAnyEquipment ? (
                <div className="p-8 text-center bg-[#0a0503] border border-dashed border-[#5c3a21] rounded-xl flex flex-col items-center justify-center space-y-3">
                  <div className="text-3xl opacity-60">🛡️</div>
                  <div className="font-serif text-[#e2d4b7] text-base">Esta miniatura no porta equipo adicional asignado</div>
                  <p className="text-xs text-[#9e9178] max-w-md">
                    En el {tabNames.shop} puedes comprar y asignar armas cuerpo a cuerpo, a distancia, armaduras, escudos y consumibles de campaña.
                  </p>
                  <button
                    type="button"
                    onClick={() => setArmouryTab('shop')}
                    className="mt-2 px-4 py-2 bg-[#b8863c] hover:bg-[#c9974d] text-[#1a0f0a] font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <span>{tabNames.iconShop}</span>
                    <span>Abrir {tabNames.shop}</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  
                  {/* 1. SLOT MELEE */}
                  {(isShop || hasMelee) && (
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
                        <div className="space-y-2">
                          {meleeCap.items.length === 0 ? (
                            <div className="text-center py-4 border border-dashed border-[#3a2110] rounded-lg text-[#7a6a58] text-xs italic">
                              Sin armas cuerpo a cuerpo
                            </div>
                          ) : (
                            meleeCap.items.map((it: any, i: number) => {
                              const handInfo = getWeaponHand(it, meleeCap.isStrong);
                              const cleanRange = formatRange(it.range);
                              const mods = extractWeaponCombatModifiers(it);
                              const applicableAmmos = isAmmunitionApplicableToWeapon(it) ? specialAmmos : [];
                              const hasReload = (it.weaponKeywords || []).some((kw: string) => /^reload$/i.test(kw));

                              return (
                                <div key={i} className="bg-[#1a0f0a] border border-[#3a2110] rounded-lg p-2.5 flex justify-between items-center shadow-sm">
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-serif font-bold text-sm text-[#e2d4b7]">{it.name}</span>
                                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-mono bg-[#2a1610] text-[#b8863c] border border-[#5c3a21]">
                                        {handInfo.label}
                                      </span>
                                      {cleanRange !== '-' && cleanRange !== 'Melee' && (
                                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-mono bg-[#1a0f0a] text-[#9e9178] border border-[#3a2110]">
                                          {cleanRange}
                                        </span>
                                      )}
                                      {it.isBuiltIn && (
                                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#2a1610] text-[#b8863c] font-mono border border-[#5c3a21]">
                                          Innata
                                        </span>
                                      )}
                                      {mods.attackModifiers.map(m => (
                                        <span key={m} className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/50 text-emerald-300">
                                          Atq {m}
                                        </span>
                                      ))}
                                      {mods.injuryModifiers.map(m => (
                                        <span key={m} className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-red-950/60 border border-red-500/50 text-red-300">
                                          Daño {m}
                                        </span>
                                      ))}
                                      {applicableAmmos.map(a => (
                                        <span key={a.id} className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#2a1610] border border-[#b8863c] text-[#e2d4b7] flex items-center gap-1">
                                          <span className="text-[#b8863c]">⌖</span> {a.effectKeyword}
                                        </span>
                                      ))}
                                      {hasReload && (
                                        <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-500/50 text-amber-300" title="Atacar con este arma concluye la activación">
                                          RELOAD
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-[#9e9178] mt-0.5 flex flex-wrap gap-1">
                                      {mods.tacticalKeywords.map((kw: string, kwi: number) => {
                                        const kwDesc = getWeaponKeywordDesc(kw);
                                        return (
                                          <span 
                                            key={kwi} 
                                            title={kwDesc || undefined}
                                            className="text-[#b8863c]/80 hover:text-[#b8863c] cursor-help"
                                          >
                                            • {kw}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {(() => {
                                      if (it.isBuiltIn) {
                                        return (
                                          <span className="text-xs font-mono text-[#7a6a58]">
                                            {it.displayCost || 'Base'}
                                          </span>
                                        );
                                      }
                                      const actualCost = battlekitPurchaseCost(wb, it, model);
                                      const hasDiscount = actualCost < it.cost;
                                      return (
                                        <span className="text-xs font-mono text-[#e2d4b7] flex items-center gap-1.5">
                                          {hasDiscount && (
                                            <span className="line-through text-[#7a6a58] text-[10px]">{it.cost}</span>
                                          )}
                                          <span className={hasDiscount ? 'text-[#b8863c] font-bold' : ''}>
                                            {actualCost} {it.currency}
                                          </span>
                                          {hasDiscount && (
                                            <span className="text-[8px] bg-[#2a1610] text-[#b8863c] px-1 py-0.5 rounded border border-[#5c3a21]">Cold Steel</span>
                                          )}
                                        </span>
                                      );
                                    })()}
                                    {isShop && !it.isBuiltIn && (
                                      <button 
                                        onClick={() => handleRemoveItem(it.id)}
                                        className="w-6 h-6 rounded bg-[#2a1610] hover:bg-red-950 text-[#9e9178] hover:text-red-400 border border-[#3a2110] flex items-center justify-center transition-all text-xs"
                                        title="Desequipar"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Selector / Botón Añadir (Solo en modo Bazar) */}
                        {isShop && (
                          selectorOpen === 'melee' ? (
                            <div className="bg-[#0e0705] border border-[#5c3a21] rounded-lg p-3 space-y-2 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in">
                              <div className="flex justify-between items-center border-b border-[#3a2110] pb-1.5 text-[10px] uppercase text-[#7a6a58] tracking-widest font-bold">
                                <span>Elegir Arma Melee</span>
                                <button onClick={() => setSelectorOpen(null)} className="text-red-400 hover:text-white">✕ Cancelar</button>
                              </div>
                              <div className="space-y-1.5">
                                {getSelectorOptions('melee').map(({ item, cls }: any) => {
                                  const isEquipped = cls.state === 'equipped';
                                  const isDisabled = cls.state === 'disabled';
                                  const itemHand = getWeaponHand(item, meleeCap.isStrong);
                                  const itemRange = formatRange(item.range);
                                  const itemMods = extractWeaponCombatModifiers(item);
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
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-bold">{item.name}</span>
                                          <span className="text-[9px] text-[#b8863c] uppercase font-mono px-1 py-0.2 bg-[#2a1610] rounded border border-[#5c3a21]">
                                            {itemHand.label}{itemRange !== '-' ? ` · ${itemRange}` : ''}
                                          </span>
                                          {itemMods.attackModifiers.map(m => (
                                            <span key={m} className="text-[8px] font-mono font-bold px-1 rounded bg-emerald-950/60 border border-emerald-500/50 text-emerald-300">
                                              {m}
                                            </span>
                                          ))}
                                          {itemMods.injuryModifiers.map(m => (
                                            <span key={m} className="text-[8px] font-mono font-bold px-1 rounded bg-red-950/60 border border-red-500/50 text-red-300">
                                              {m}
                                            </span>
                                          ))}
                                        </div>
                                        {itemMods.tacticalKeywords.length > 0 && (
                                          <div className="text-[9px] text-[#9e9178] mt-0.5 truncate max-w-xs">
                                            {itemMods.tacticalKeywords.slice(0, 3).join(', ')}{itemMods.tacticalKeywords.length > 3 ? '...' : ''}
                                          </div>
                                        )}
                                        {isDisabled && <span className="text-[9px] text-red-400">⚠ {cls.reason}</span>}
                                        {isEquipped && <span className="text-[9px] text-[#b8863c]">✓ Ya equipada</span>}
                                      </div>
                                      {(() => {
                                        const price = battlekitPurchaseCost(wb, item, model);
                                        const isDiscounted = price < item.cost;
                                        return (
                                          <div className="flex items-center gap-1.5 shrink-0">
                                            {isDiscounted && (
                                              <span className="line-through text-[#7a6a58] text-[9px]">{item.cost}</span>
                                            )}
                                            <span className="font-mono text-xs text-[#b8863c]">{price} {item.currency}</span>
                                            {isDiscounted && (
                                              <span className="text-[8px] bg-[#2a1610] text-[#b8863c] px-1 py-0.5 rounded border border-[#5c3a21]">Cold Steel</span>
                                            )}
                                          </div>
                                        );
                                      })()}
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
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* 2. SLOT RANGED */}
                  {(isShop || hasRanged) && (
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
                            rangedCap.items.map((it: any, i: number) => {
                              const handInfo = getWeaponHand(it, false);
                              const cleanRange = formatRange(it.range);
                              const mods = extractWeaponCombatModifiers(it);
                              const applicableAmmos = isAmmunitionApplicableToWeapon(it) ? specialAmmos : [];
                              const hasReload = (it.weaponKeywords || []).some((kw: string) => /^reload$/i.test(kw));

                              return (
                                <div key={i} className="bg-[#1a0f0a] border border-[#3a2110] rounded-lg p-2.5 flex justify-between items-center shadow-sm">
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-serif font-bold text-sm text-[#e2d4b7]">{it.name}</span>
                                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-mono bg-[#2a1610] text-[#b8863c] border border-[#5c3a21]">
                                        {handInfo.label}
                                      </span>
                                      {cleanRange !== '-' && (
                                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-mono bg-[#1a0f0a] text-[#9e9178] border border-[#3a2110]">
                                          {cleanRange}
                                        </span>
                                      )}
                                      {it.isBuiltIn && (
                                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#2a1610] text-[#b8863c] font-mono border border-[#5c3a21]">
                                          Innata
                                        </span>
                                      )}
                                      {mods.attackModifiers.map(m => (
                                        <span key={m} className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/50 text-emerald-300">
                                          Atq {m}
                                        </span>
                                      ))}
                                      {mods.injuryModifiers.map(m => (
                                        <span key={m} className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-red-950/60 border border-red-500/50 text-red-300">
                                          Daño {m}
                                        </span>
                                      ))}
                                      {applicableAmmos.map(a => (
                                        <span key={a.id} className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#2a1610] border border-[#b8863c] text-[#e2d4b7] flex items-center gap-1">
                                          <span className="text-[#b8863c]">⌖</span> {a.effectKeyword}
                                        </span>
                                      ))}
                                      {hasReload && (
                                        <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-500/50 text-amber-300" title="Atacar con este arma concluye la activación">
                                          RELOAD
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-[#9e9178] mt-0.5 flex flex-wrap gap-1">
                                      {mods.tacticalKeywords.map((kw: string, kwi: number) => {
                                        const kwDesc = getWeaponKeywordDesc(kw);
                                        return (
                                          <span 
                                            key={kwi} 
                                            title={kwDesc || undefined}
                                            className="text-[#b8863c]/80 hover:text-[#b8863c] cursor-help"
                                          >
                                            • {kw}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs font-mono text-[#e2d4b7]">
                                      {it.isBuiltIn ? (it.displayCost || 'Base') : `${it.cost} ${it.currency}`}
                                    </span>
                                    {isShop && !it.isBuiltIn && (
                                      <button 
                                        onClick={() => handleRemoveItem(it.id)}
                                        className="w-6 h-6 rounded bg-[#2a1610] hover:bg-red-950 text-[#9e9178] hover:text-red-400 border border-[#3a2110] flex items-center justify-center transition-all text-xs"
                                        title="Desequipar"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Selector Ranged (Solo en modo Bazar) */}
                        {isShop && (
                          selectorOpen === 'ranged' ? (
                            <div className="bg-[#0e0705] border border-[#5c3a21] rounded-lg p-3 space-y-2 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in">
                              <div className="flex justify-between items-center border-b border-[#3a2110] pb-1.5 text-[10px] uppercase text-[#7a6a58] tracking-widest font-bold">
                                <span>Elegir Arma a Distancia</span>
                                <button onClick={() => setSelectorOpen(null)} className="text-red-400 hover:text-white">✕ Cancelar</button>
                              </div>
                              <div className="space-y-1.5">
                                {getSelectorOptions('ranged').map(({ item, cls }: any) => {
                                  const isEquipped = cls.state === 'equipped';
                                  const isDisabled = cls.state === 'disabled';
                                  const itemHand = getWeaponHand(item, false);
                                  const itemRange = formatRange(item.range);
                                  const itemMods = extractWeaponCombatModifiers(item);
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
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-bold">{item.name}</span>
                                          <span className="text-[9px] text-[#b8863c] uppercase font-mono px-1 py-0.2 bg-[#2a1610] rounded border border-[#5c3a21]">
                                            {itemHand.label}{itemRange !== '-' ? ` · ${itemRange}` : ''}
                                          </span>
                                          {itemMods.attackModifiers.map(m => (
                                            <span key={m} className="text-[8px] font-mono font-bold px-1 rounded bg-emerald-950/60 border border-emerald-500/50 text-emerald-300">
                                              {m}
                                            </span>
                                          ))}
                                          {itemMods.injuryModifiers.map(m => (
                                            <span key={m} className="text-[8px] font-mono font-bold px-1 rounded bg-red-950/60 border border-red-500/50 text-red-300">
                                              {m}
                                            </span>
                                          ))}
                                        </div>
                                        {itemMods.tacticalKeywords.length > 0 && (
                                          <div className="text-[9px] text-[#9e9178] mt-0.5 truncate max-w-xs">
                                            {itemMods.tacticalKeywords.slice(0, 3).join(', ')}{itemMods.tacticalKeywords.length > 3 ? '...' : ''}
                                          </div>
                                        )}
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
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* 3. SLOT ARMADURA & ESCUDOS */}
                  {(isShop || hasArmourShield) && (
                    <div className="bg-[#0a0503] border border-[#3a2110] rounded-xl shadow-lg flex flex-col overflow-hidden">
                      <div className="bg-gradient-to-r from-[#2a1610] to-[#0a0503] border-b border-[#3a2110] p-3 flex justify-between items-center">
                        <span className="text-xs uppercase tracking-widest font-bold text-[#e2d4b7] flex items-center gap-1.5">
                          🛡️ Armadura & Escudos
                        </span>
                        <div className="flex items-center gap-2">
                          <span 
                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 border border-[#3a2110] text-[#b8863c] cursor-help"
                            title={armourBreakdown.summary ? `Desglose: ${armourBreakdown.summary}` : undefined}
                          >
                            Total ARM: {totalArmour}
                            {armourBreakdown.parts.length > 1 && (
                              <span className="text-[9px] text-[#7a6a58] ml-1">
                                ({armourBreakdown.parts.map(p => `-${p.value} ${p.label}`).join(' + ')})
                              </span>
                            )}
                          </span>
                          {armourShieldCost > 0 && (
                            <span className="text-[10px] font-mono bg-red-950/40 text-red-400 px-1.5 py-0.5 rounded border border-red-900/40">
                              {armourShieldCost} 👑
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Regla BULKY si aplica */}
                      {bulkyInfo.isBulky && (
                        <div className="mx-3 mt-3 p-2 rounded bg-[#160d08] border border-amber-900/50 flex flex-wrap items-center justify-between gap-1 text-[11px] text-amber-300">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold">⚖ BULKY:</span>
                            <span className="text-amber-200/90">{bulkyInfo.note}</span>
                          </div>
                          <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-700/50">
                            Peana {bulkyInfo.baseSize}
                          </span>
                        </div>
                      )}

                      <div className="p-3 space-y-3">
                        {/* Sub-slot: Armadura Corporal */}
                        {(isShop || armourShield.armour || (armourShield.permanentEquipment && armourShield.permanentEquipment.length > 0)) && (
                          <div>
                            <div className="text-[10px] uppercase text-[#7a6a58] tracking-widest font-bold mb-1.5 flex justify-between items-center">
                              <span>Armadura Corporal</span>
                              {unit.id === 'mech-heavy-inf' && isShop && (
                                <span className="text-[9px] text-[#b8863c] font-mono">Variante MHI</span>
                              )}
                            </div>

                            {/* MHI Quick Armour Switcher (Shop mode) */}
                            {unit.id === 'mech-heavy-inf' && isShop && (
                              <div className="grid grid-cols-2 gap-2 mb-2">
                                <button
                                  onClick={() => onUpdateModel({ ...model, costVariant: 'base' })}
                                  className={`py-1.5 px-2 rounded text-xs font-serif font-bold border transition-all text-center ${
                                    (!model.costVariant || model.costVariant === 'base')
                                      ? 'bg-[#2a1610] text-[#b8863c] border-[#b8863c] shadow'
                                      : 'bg-[#140b07] text-[#7a6a58] border-[#3a2110] hover:text-[#e2d4b7]'
                                  }`}
                                >
                                  Reinforced (85 👑)
                                </button>
                                <button
                                  disabled={!unitCostAltAllowed(wb, unit)}
                                  onClick={() => onUpdateModel({ ...model, costVariant: 'alt' })}
                                  className={`py-1.5 px-2 rounded text-xs font-serif font-bold border transition-all text-center ${
                                    model.costVariant === 'alt'
                                      ? 'bg-[#2a1610] text-[#b8863c] border-[#b8863c] shadow'
                                      : 'bg-[#140b07] text-[#7a6a58] border-[#3a2110] hover:text-[#e2d4b7]'
                                  } ${!unitCostAltAllowed(wb, unit) ? 'opacity-40 cursor-not-allowed' : ''}`}
                                >
                                  Machine (95 👑)
                                </button>
                              </div>
                            )}

                            {armourShield.permanentEquipment && armourShield.permanentEquipment.length > 0 && (
                              <div className="space-y-1.5 mb-2">
                                {armourShield.permanentEquipment.map((pe: string, peIdx: number) => (
                                  <div key={peIdx} className="bg-[#140b07] border border-[#3a2110] rounded-lg p-2 flex justify-between items-center text-xs">
                                    <div>
                                      <span className="font-bold text-[#b8863c]">{pe}</span>
                                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#2a1610] text-[#e2d4b7] font-mono ml-2">Innato</span>
                                    </div>
                                    <span className="text-[10px] font-mono text-[#7a6a58]">Base</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {armourShield.armour ? (() => {
                              const armDef = extractArmourDefenses(armourShield.armour);
                              return (
                                <div className="bg-[#1a0f0a] border border-[#3a2110] rounded-lg p-2.5 flex justify-between items-center">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <div className="font-serif font-bold text-sm text-[#e2d4b7]">{armourShield.armour.name}</div>
                                      {armDef.injuryModifier && (
                                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-800/50">
                                          ARM {armDef.injuryModifier}
                                        </span>
                                      )}
                                      {armourShield.armour.isBuiltIn && (
                                        <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-[#2a1610] text-[#b8863c] font-mono border border-[#5c3a21]">
                                          Innata
                                        </span>
                                      )}
                                      {armourShield.armour.id === 'machine-armour-na' && wb.variantId === 'alba' && (
                                        <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-400 font-mono border border-emerald-800/40">
                                          Celtic (+D6&quot; Charge)
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-[#9e9178] mt-1 flex flex-wrap gap-1">
                                      {armDef.defensiveTraits.map((trait: string, ti: number) => {
                                        const note = getTacticalRuleNote(trait);
                                        return (
                                          <span key={ti} title={note || undefined} className="px-1.5 py-0.2 rounded bg-[#22120b] border border-[#4a2a16] text-[#e2d4b7] font-mono text-[9px] cursor-help">
                                            🛡️ {trait}
                                          </span>
                                        );
                                      })}
                                      {(armourShield.armour.weaponKeywords || []).filter((kw: string) => !armDef.defensiveTraits.includes(kw.toUpperCase()) && !kw.includes('INJURY MODIFIER')).map((kw: string, kwi: number) => {
                                        const kwDesc = getWeaponKeywordDesc(kw);
                                        return (
                                          <span key={kwi} title={kwDesc || undefined} className="text-[#b8863c]/80 hover:text-[#b8863c] cursor-help">
                                            • {kw}
                                          </span>
                                        );
                                      })}
                                    </div>
                                    {armourShield.armour.id === 'machine-armour-na' && wb.variantId === 'alba' && (
                                      <div className="text-[9px] text-emerald-400/90 font-mono mt-1">
                                        Celtic Machine Armour: Charge Bonus D6&quot; · Sin penaliz. Mov Down
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs font-mono text-[#e2d4b7]">
                                      {armourShield.armour.displayCost || `${armourShield.armour.cost} ${armourShield.armour.currency}`}
                                    </span>
                                    {isShop && (
                                      armourShield.armour.isBuiltIn ? (
                                        unit.costAlt ? (
                                          <button 
                                            onClick={() => setSelectorOpen(selectorOpen === 'armour' ? null : 'armour')}
                                            className="px-2 py-0.5 rounded bg-[#2a1610] hover:bg-[#3a2110] text-[#b8863c] hover:text-[#e2d4b7] border border-[#5c3a21] text-xs transition-all font-mono"
                                            title="Cambiar armadura"
                                          >
                                            Cambiar
                                          </button>
                                        ) : null
                                      ) : (
                                        <button 
                                          onClick={() => handleRemoveItem(armourShield.armour.id)}
                                          className="w-6 h-6 rounded bg-[#2a1610] hover:bg-red-950 text-[#9e9178] hover:text-red-400 border border-[#3a2110] flex items-center justify-center transition-all text-xs"
                                          title="Desequipar armadura"
                                        >
                                          ✕
                                        </button>
                                      )
                                    )}
                                  </div>
                                </div>
                              );
                            })() : null}

                            {/* Selector de armadura */}
                            {isShop && selectorOpen === 'armour' && (
                              <div className="bg-[#0e0705] border border-[#5c3a21] rounded-lg p-2.5 space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar mt-2">
                                <div className="flex justify-between items-center text-[10px] uppercase text-[#7a6a58] pb-1 border-b border-[#3a2110]">
                                  <span>Elegir Armadura</span>
                                  <button onClick={() => setSelectorOpen(null)} className="text-red-400">✕</button>
                                </div>
                                {getSelectorOptions('armour').map(({ item, cls }: any) => {
                                  const isEquipped = cls.state === 'equipped';
                                  const isDisabled = cls.state === 'disabled';
                                  const itemDef = extractArmourDefenses(item);
                                  return (
                                    <button
                                      key={item.id}
                                      disabled={isEquipped || isDisabled}
                                      onClick={() => handleEquipItem(item.id)}
                                      className={`w-full text-left p-1.5 rounded flex justify-between items-center text-xs transition-all ${
                                        isEquipped 
                                          ? 'bg-[#1a0f0a] border border-[#b8863c]/40 text-[#b8863c] opacity-60' 
                                          : isDisabled 
                                            ? 'opacity-40 text-[#7a6a58] border border-transparent cursor-not-allowed'
                                            : 'bg-[#1a0f0a] hover:bg-[#2a1610] text-[#e2d4b7] border border-[#3a2110]'
                                      }`}
                                    >
                                      <div className="flex flex-col gap-0.5">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-bold">{item.name}</span>
                                          {itemDef.injuryModifier && (
                                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40">
                                              ARM {itemDef.injuryModifier}
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex flex-wrap gap-1 text-[9px]">
                                          {itemDef.defensiveTraits.map((tr: string, tri: number) => (
                                            <span key={tri} className="text-[#b8863c] font-mono">
                                              🛡️ {tr}
                                            </span>
                                          ))}
                                          {isEquipped && <span className="text-[#b8863c]">✓ Ya equipada</span>}
                                          {isDisabled && <span className="text-red-400">⚠ {cls.reason}</span>}
                                        </div>
                                      </div>
                                      <span className="font-mono text-[#b8863c] shrink-0 ml-2">
                                        {unit.id === 'mech-heavy-inf' 
                                          ? (item.id === 'machine-armour-na' ? '95 👑 (Base)' : '85 👑 (Base)')
                                          : `${item.cost} ${item.currency}`}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {isShop && !armourShield.armour && selectorOpen !== 'armour' && (
                              <button
                                onClick={() => setSelectorOpen('armour')}
                                className="w-full border border-dashed border-[#5c3a21] hover:border-[#b8863c] bg-[#1a0f0a]/60 hover:bg-[#2a1610] text-[#9e9178] hover:text-[#e2d4b7] py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
                              >
                                + Equipar Armadura
                              </button>
                            )}
                          </div>
                        )}

                        {/* Sub-slot: Escudo */}
                        {(isShop || armourShield.shield) && (
                          <div>
                            <div className="text-[10px] uppercase text-[#7a6a58] tracking-widest font-bold mb-1.5">Escudo</div>
                            {armourShield.shield ? (() => {
                              const shDef = extractArmourDefenses(armourShield.shield);
                              return (
                                <div className="bg-[#1a0f0a] border border-[#3a2110] rounded-lg p-2.5 flex justify-between items-center">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <div className="font-serif font-bold text-sm text-[#e2d4b7]">{armourShield.shield.name}</div>
                                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-800/50">
                                        ARM -1
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-[#9e9178] mt-1 flex flex-wrap gap-1">
                                      {shDef.defensiveTraits.map((trait: string, ti: number) => {
                                        const note = getTacticalRuleNote(trait);
                                        return (
                                          <span key={ti} title={note || undefined} className="px-1.5 py-0.2 rounded bg-[#22120b] border border-[#4a2a16] text-[#e2d4b7] font-mono text-[9px] cursor-help">
                                            🛡️ {trait}
                                          </span>
                                        );
                                      })}
                                      {(armourShield.shield.weaponKeywords || []).filter((kw: string) => !shDef.defensiveTraits.includes(kw.toUpperCase()) && !kw.includes('INJURY MODIFIER')).map((kw: string, kwi: number) => {
                                        const kwDesc = getWeaponKeywordDesc(kw);
                                        return (
                                          <span key={kwi} title={kwDesc || undefined} className="text-[#b8863c]/80 hover:text-[#b8863c] cursor-help">
                                            • {kw}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs font-mono text-[#e2d4b7]">{armourShield.shield.cost} {armourShield.shield.currency}</span>
                                    {isShop && (
                                      <button 
                                        onClick={() => handleRemoveItem(armourShield.shield.id)}
                                        className="w-6 h-6 rounded bg-[#2a1610] hover:bg-red-950 text-[#9e9178] hover:text-red-400 border border-[#3a2110] flex items-center justify-center transition-all text-xs"
                                        title="Desequipar escudo"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })() : (
                              isShop && (
                                selectorOpen === 'shields' ? (
                                  <div className="bg-[#0e0705] border border-[#5c3a21] rounded-lg p-2.5 space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                                    <div className="flex justify-between items-center text-[10px] uppercase text-[#7a6a58] pb-1 border-b border-[#3a2110]">
                                      <span>Elegir Escudo</span>
                                      <button onClick={() => setSelectorOpen(null)} className="text-red-400">✕</button>
                                    </div>
                                    {getSelectorOptions('shields').map(({ item, cls }: any) => {
                                      const shDef = extractArmourDefenses(item);
                                      return (
                                        <button
                                          key={item.id}
                                          disabled={cls.state !== 'available'}
                                          onClick={() => handleEquipItem(item.id)}
                                          className={`w-full text-left p-1.5 rounded flex justify-between items-center text-xs ${
                                            cls.state === 'available' ? 'bg-[#1a0f0a] hover:bg-[#2a1610] text-[#e2d4b7] border border-[#3a2110]' : 'opacity-40 text-[#7a6a58] border border-transparent'
                                          }`}
                                        >
                                          <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-1.5">
                                              <span className="font-bold">{item.name}</span>
                                              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40">
                                                ARM -1
                                              </span>
                                            </div>
                                            <div className="flex flex-wrap gap-1 text-[9px]">
                                              {shDef.defensiveTraits.map((tr: string, tri: number) => (
                                                <span key={tri} className="text-[#b8863c] font-mono">
                                                  🛡️ {tr}
                                                </span>
                                              ))}
                                              {cls.state === 'disabled' && <span className="text-red-400">⚠ {cls.reason}</span>}
                                            </div>
                                          </div>
                                          <span className="font-mono text-[#b8863c] shrink-0 ml-2">{item.cost} {item.currency}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setSelectorOpen('shields')}
                                    className="w-full border border-dashed border-[#5c3a21] hover:border-[#b8863c] bg-[#1a0f0a]/60 hover:bg-[#2a1610] text-[#9e9178] hover:text-[#e2d4b7] py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
                                  >
                                    + Equipar Escudo
                                  </button>
                                )
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 4. SLOT EQUIPO ADICIONAL & GRANADAS */}
                  {(isShop || hasGearGrenades) && (
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
                        {(isShop || gearGrenades.grenades.length > 0) && (
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="text-[10px] uppercase text-[#7a6a58] tracking-widest font-bold">Granadas (Máx. 1 Tipo)</span>
                              {isShop && gearGrenades.grenades.length === 0 && selectorOpen !== 'grenades' && (
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
                                      {g.isBuiltIn && (
                                        <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-[#2a1610] text-[#b8863c] font-mono border border-[#5c3a21] ml-2">
                                          Innata
                                        </span>
                                      )}
                                      <span className="text-[9px] text-[#7a6a58] ml-2">({(g.weaponKeywords || []).slice(0, 3).join(', ')})</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-[#b8863c]">
                                        {g.isBuiltIn ? (g.displayCost || 'Base') : `${g.cost} ${g.currency}`}
                                      </span>
                                      {isShop && !g.isBuiltIn && (
                                        <button onClick={() => handleRemoveItem(g.id)} className="text-[#7a6a58] hover:text-red-400 px-1">✕</button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : isShop && selectorOpen === 'grenades' ? (
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
                        )}

                        {/* Objetos y Equipo */}
                        {(isShop || gearGrenades.gear.length > 0) && (
                          <div className={isShop && gearGrenades.grenades.length > 0 ? "pt-2 border-t border-[#3a2110]/50" : ""}>
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="text-[10px] uppercase text-[#7a6a58] tracking-widest font-bold">Objetos & Consumibles</span>
                              {isShop && selectorOpen !== 'equipment' && (
                                <button onClick={() => setSelectorOpen('equipment')} className="text-[10px] text-[#b8863c] hover:underline uppercase">
                                  + Añadir Objeto
                                </button>
                              )}
                            </div>
                            {gearGrenades.gear.length > 0 ? (
                              <div className="space-y-1.5">
                                {gearGrenades.gear.map((it: any, i: number) => {
                                  const eqDet = extractEquipmentDetails(it);
                                  return (
                                    <div key={i} className="bg-[#1a0f0a] border border-[#3a2110] rounded-lg p-2.5 flex justify-between items-start text-xs">
                                      <div className="flex-1 pr-2">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-bold text-[#e2d4b7]">{it.name}</span>
                                          <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-[#22120b] text-[#b8863c] font-mono border border-[#4a2a16]">
                                            {eqDet.categoryTag}
                                          </span>
                                          {eqDet.actionGranted && (
                                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-800/50" title={eqDet.actionDescription || undefined}>
                                              ⚡ {eqDet.actionGranted}
                                            </span>
                                          )}
                                          {it.isBuiltIn && (
                                            <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-[#2a1610] text-[#b8863c] font-mono border border-[#5c3a21]">
                                              Innato
                                            </span>
                                          )}
                                          {it.restriction && <span className="text-[9px] text-[#7a6a58]">({it.restriction})</span>}
                                        </div>
                                        {eqDet.actionDescription ? (
                                          <div className="text-[10px] text-[#9e9178] mt-1 leading-snug">
                                            <span className="text-amber-400/90 font-mono">Efecto:</span> {eqDet.actionDescription}
                                          </div>
                                        ) : eqDet.summary ? (
                                          <div className="text-[10px] text-[#9e9178] mt-1 leading-snug">
                                            {eqDet.summary}
                                          </div>
                                        ) : null}
                                        {eqDet.traits.length > 0 && (
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {eqDet.traits.map((tr: string, tri: number) => (
                                              <span key={tri} className="text-[9px] font-mono px-1 py-0.2 rounded bg-black/40 text-[#7a6a58] border border-[#3a2110]">
                                                • {tr}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className="font-mono text-[#b8863c]">
                                          {it.isBuiltIn ? (it.displayCost || 'Base') : `${it.cost} ${it.currency}`}
                                        </span>
                                        {isShop && !it.isBuiltIn && (
                                          <button onClick={() => handleRemoveItem(it.id)} className="w-5 h-5 rounded hover:bg-red-950 text-[#7a6a58] hover:text-red-400 flex items-center justify-center transition-all">✕</button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              (!isShop || selectorOpen !== 'equipment') && (
                                <div className="text-center py-2.5 border border-dashed border-[#3a2110] rounded text-[#7a6a58] text-xs italic">
                                  Sin equipo adicional
                                </div>
                              )
                            )}

                            {isShop && selectorOpen === 'equipment' && (
                              <div className="bg-[#0e0705] border border-[#5c3a21] rounded-lg p-2.5 space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar mt-2">
                                <div className="flex justify-between items-center text-[10px] uppercase text-[#7a6a58] pb-1 border-b border-[#3a2110]">
                                  <span>Elegir Objeto de Equipo</span>
                                  <button onClick={() => setSelectorOpen(null)} className="text-red-400">✕</button>
                                </div>
                                {getSelectorOptions('equipment').map(({ item, cls }: any) => {
                                  const eqDet = extractEquipmentDetails(item);
                                  return (
                                    <button
                                      key={item.id}
                                      disabled={cls.state !== 'available'}
                                      onClick={() => handleEquipItem(item.id)}
                                      className={`w-full text-left p-2 rounded flex justify-between items-center text-xs transition-all ${
                                        cls.state === 'available' ? 'bg-[#1a0f0a] hover:bg-[#2a1610] text-[#e2d4b7] border border-[#3a2110]' : 'opacity-40 text-[#7a6a58] border border-transparent'
                                      }`}
                                    >
                                      <div className="flex flex-col gap-0.5">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-bold">{item.name}</span>
                                          <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-[#22120b] text-[#b8863c] font-mono border border-[#4a2a16]">
                                            {eqDet.categoryTag}
                                          </span>
                                          {eqDet.actionGranted && (
                                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40">
                                              ⚡ {eqDet.actionGranted}
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex flex-wrap gap-1 text-[9px] text-[#9e9178]">
                                          {eqDet.summary && <span className="line-clamp-1">{eqDet.summary}</span>}
                                          {cls.state === 'disabled' && <span className="text-red-400 font-semibold">⚠ {cls.reason}</span>}
                                        </div>
                                      </div>
                                      <span className="font-mono text-[#b8863c] shrink-0 ml-2">{item.cost} {item.currency}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* MEJORAS (UPGRADES) */}
          {/* ======================================================== */}
          {(isShop ? allUpgrades.length > 0 : upgradesToDisplay.length > 0) && (
            <div className="bg-[#0a0503] border border-[#3a2110] rounded-xl shadow-lg overflow-hidden mt-6">
              <div className="bg-gradient-to-r from-[#2a1610] to-[#0a0503] border-b border-[#3a2110] p-3 flex items-center gap-2">
                <span className="text-[#b8863c] text-lg">★</span>
                <span className="text-xs uppercase tracking-widest font-bold text-[#e2d4b7]">Mejoras (Upgrades)</span>
              </div>
              <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                {upgradesToDisplay.map((up: any) => {
                  const isActive = activeUpgrades.includes(up.id);
                  const upCls = classifyUpgrade(up, model, unit, wb);
                  const upBlocked = !isActive && upCls.state === 'disabled';
                  return (
                    <div 
                      key={up.id} 
                      onClick={() => isShop && !upBlocked && handleToggleUpgrade(up.id)}
                      className={`relative p-3 border-2 rounded-lg transition-all ${isShop ? 'cursor-pointer' : 'cursor-default'} group flex flex-col justify-between ${
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
              <div className="text-[10px] uppercase text-[#7a6a58] tracking-widest font-bold mb-2 border-b border-[#3a2110] pb-1 flex justify-between items-center">
                <span>Reglas Especiales de la Unidad</span>
                <span className="text-[9px] text-[#9e9178] italic">Pasa el ratón para ver descripción</span>
              </div>
              <ul className="text-xs text-[#e2d4b7] space-y-1.5">
                {unitAbilities.map((a: any, i: number) => (
                  <li 
                    key={i} 
                    title={a.desc || a.name}
                    className="flex flex-col bg-[#0a0503] p-2.5 rounded border border-[#3a2110] hover:border-[#b8863c] transition-all cursor-help group shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[#b8863c] mt-0.5">✦</span>
                        <span className="font-serif tracking-wide text-xs text-[#e2d4b7] font-bold group-hover:text-[#b8863c] transition-colors">
                          {a.name}
                        </span>
                      </div>
                      {a.desc && (
                        <span className="text-[10px] text-[#7a6a58] group-hover:text-[#b8863c] font-mono transition-colors">
                          ℹ️ Info
                        </span>
                      )}
                    </div>
                    {a.desc && (
                      <p className="text-[11px] text-[#9e9178] group-hover:text-[#c4b79b] mt-1.5 pl-4 leading-relaxed font-sans border-l border-[#3a2110] group-hover:border-[#b8863c]/50 transition-colors">
                        {a.desc}
                      </p>
                    )}
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
