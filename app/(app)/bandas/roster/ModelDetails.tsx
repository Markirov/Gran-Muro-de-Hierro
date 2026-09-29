'use client';
import { 
  getUnit, 
  effectiveStats, 
  effectiveKeywords, 
  allAvailableUpgrades,
  effectiveUnitName,
  armouryItemsForWarband,
  foreignArmouryItems,
  battlekitPurchaseCost,
  unitCostAltAllowed,
  classifyUpgrade,
  displayAbilitiesForCard
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
  try {
  if (!model) {
    return (
      <div className="p-4 bg-[#1a0f0a] border border-[#5c3a21] rounded text-[#9e9178] text-sm text-center">
        Selecciona un modelo del roster para ver sus stats y editar su equipamiento.
      </div>
    );
  }

  const unit = getUnit(wb.factionId, model.unitId);
  if (!unit) {
    return <div className="text-red-500">Unidad no encontrada.</div>;
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

  const handleToggleBattlekit = (itemId: string) => {
    let bk = [...(model.battlekit || [])];
    if (bk.includes(itemId)) bk = bk.filter(id => id !== itemId);
    else bk.push(itemId);
    onUpdateModel({ ...model, battlekit: bk });
  };

  // CATEGORIES
  const cats = [
    ['ranged', '⌖ Armas a Distancia'],
    ['melee', '⚔ Armas Cuerpo a Cuerpo'],
    ['grenades', '💣 Granadas'],
    ['shields', '🛡 Escudos'],
    ['armour', '⛨ Armadura'],
    ['equipment', '🎒 Equipo & Objetos'],
  ];
  if (unit.id === 'anchorite-shrine') {
    cats.push(['anchoriteRanged', '⌖ Armas a Distancia (Anchorite)']);
    cats.push(['anchoriteBattlekit', '🎒 Equipo (Anchorite)']);
  }

  const unitAbilities = displayAbilitiesForCard(model, unit).map((a: any) => a.name);
  const faction = FACTIONS.find((f: any) => f.id === wb.factionId);

  return (
    <div className="flex flex-col h-full w-full">
      {/* HEADER & NAME */}
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
              placeholder={unit.name}
              className="w-full bg-transparent text-[#b8863c] font-serif text-3xl placeholder-[#b8863c]/50 focus:outline-none focus:border-b border-[#b8863c] transition-all"
            />
            <div className="text-[#9e9178] text-xs uppercase tracking-widest mt-1">
              {effName !== unit.name ? `${effName} (${unit.name})` : effName} 
              <span className="mx-2">•</span> 
              Base: {unit.cost} {unit.currency}
            </div>
          </div>
        </div>

        {/* STATS */}
        {unit.stats && (
          <div className="grid grid-cols-5 gap-2 mt-6">
            {['movement', 'ranged', 'melee', 'armour', 'base'].map(k => (
              <div key={k} className="bg-[#0a0503] border border-[#3a2110] rounded-lg p-2 text-center shadow-inner flex flex-col justify-center relative overflow-hidden">
                <div className="text-[9px] uppercase text-[#7a6a58] tracking-widest z-10">{k === 'movement' ? 'Mov' : k}</div>
                <div className={`font-serif text-2xl z-10 ${isOverridden(k) ? 'text-[#b8863c] drop-shadow-[0_0_5px_rgba(184,134,60,0.5)]' : 'text-[#e2d4b7]'}`}>
                  {effStats[k]}
                </div>
                {/* Background icon per stat */}
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

      <div className="p-4 space-y-4">

      {/* KEYWORDS & ABILITIES */}
      <div className="grid grid-cols-1 gap-4">
        {effKeywords.length > 0 && (
          <div>
            <div className="text-[10px] uppercase text-[#7a6a58] tracking-widest font-bold mb-2">Keywords</div>
            <div className="flex flex-wrap gap-2">
              {effKeywords.map((k: string) => {
                const isSpecial = k === 'ELITE' || k === 'LEADER';
                const isFromUpgrade = !(unit.keywords || []).includes(k);
                return (
                  <span 
                    key={k} 
                    title={KEYWORD_LIBRARY[k] || ''}
                    className={`px-3 py-1 text-xs uppercase tracking-wider rounded-full border ${
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

        {unitAbilities.length > 0 && (
          <div className="mt-2">
            <div className="text-[10px] uppercase text-[#7a6a58] tracking-widest font-bold mb-2 border-b border-[#3a2110] pb-1">Reglas Especiales</div>
            <ul className="text-sm text-[#e2d4b7] space-y-2">
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

      {/* UPGRADES */}
      {allUpgrades.length > 0 && (
        <div className="bg-[#0a0503] border border-[#3a2110] rounded-xl shadow-lg overflow-hidden mt-6">
          <div className="bg-gradient-to-r from-[#2a1610] to-[#0a0503] border-b border-[#3a2110] p-3 flex items-center gap-2">
            <span className="text-[#b8863c] text-lg">★</span>
            <span className="text-sm uppercase tracking-widest font-bold text-[#e2d4b7]">Mejoras (Upgrades)</span>
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

      {/* ARMOURY */}
      {unit.noBattlekit ? (
        <div className="p-6 text-center text-[#7a6a58] border border-dashed border-[#5c3a21] bg-[#1a0f0a] rounded-xl font-serif text-lg mx-4 mt-6">
          Esta unidad no tiene acceso a la Armería.
        </div>
      ) : (
        <div className="space-y-6 mt-6">
          {cats.map(([key, label]) => {
            const items = armouryItemsForWarband(wb, key);
            if (!items.length) return null;

            const classified = items.map((item: any) => ({
              item,
              cls: classifyBattlekitItem(item, model, unit, wb),
            })).filter((c: any) => c.cls.state !== 'hidden');

            if (!classified.length) return null;

            return (
              <div key={key} className="bg-[#0a0503] border border-[#3a2110] rounded-xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-[#2a1610] to-[#0a0503] border-b border-[#3a2110] p-3">
                  <span className="text-sm uppercase tracking-widest font-bold text-[#e2d4b7]">{label}</span>
                </div>
                
                <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {classified.map(({ item, cls }: any) => {
                    const isActive = cls.state === 'equipped';
                    const isDisabled = cls.state === 'disabled';
                    const isGlory = item.currency === '☼';
                    const currencyClass = isGlory ? 'text-yellow-500' : 'text-[#9e9178]';
                    
                    return (
                      <div 
                        key={item.id} 
                        onClick={() => !isDisabled && handleToggleBattlekit(item.id)}
                        className={`relative p-3 border-2 rounded-lg transition-all cursor-pointer group flex flex-col justify-between ${
                          isActive 
                            ? 'bg-gradient-to-br from-[#2a1610] to-[#1a0f0a] border-[#b8863c] shadow-[0_0_10px_rgba(184,134,60,0.1)]' 
                            : isDisabled 
                              ? 'bg-[#1a0f0a]/50 border-red-900/30 opacity-50 cursor-not-allowed'
                              : 'bg-[#1a0f0a] border-[#3a2110] hover:border-[#b8863c]/50 hover:bg-[#2a1610]'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start mb-1">
                            <div className="flex flex-col">
                              <span className={`font-bold text-sm ${isActive ? 'text-[#b8863c]' : 'text-[#e2d4b7]'}`}>
                                {item.name}
                              </span>
                              {item.restriction && (
                                <span className="text-[9px] uppercase tracking-widest text-[#b8863c] bg-[#b8863c]/10 px-1 py-0.5 rounded w-fit mt-1 border border-[#b8863c]/30">
                                  {item.restriction}
                                </span>
                              )}
                            </div>
                            <div className={`text-xs font-bold px-1.5 py-0.5 rounded shadow-inner bg-black/30 ${currencyClass}`}>
                              {battlekitPurchaseCost(wb, item, model)} {item.currency}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center mt-3 border-t border-[#3a2110]/50 pt-2">
                          {isDisabled ? (
                            <span className="text-[10px] text-red-500 uppercase tracking-widest flex items-center gap-1">
                              <span className="text-sm">⚠</span> {cls.reason}
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
            );
          })}
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
