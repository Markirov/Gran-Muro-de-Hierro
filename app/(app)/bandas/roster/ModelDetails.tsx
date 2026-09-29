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

interface Props {
  wb: any;
  model: any;
  onUpdateModel: (newModel: any) => void;
}

export function ModelDetails({ wb, model, onUpdateModel }: Props) {
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
    ['ranged', 'Ranged Weapons'],
    ['melee', 'Melee Weapons'],
    ['grenades', 'Grenades'],
    ['shields', 'Shields'],
    ['armour', 'Armour'],
    ['equipment', 'Equipment'],
  ];
  if (unit.id === 'anchorite-shrine') {
    cats.push(['anchoriteRanged', 'Anchorite Ranged Weapons']);
    cats.push(['anchoriteBattlekit', 'Anchorite Battlekit']);
  }

  const unitAbilities = displayAbilitiesForCard(model, unit).map((a: any) => a.name);

  return (
    <div className="space-y-4">
      {/* HEADER & NAME */}
      <div className="bg-[#1a0f0a] border border-[#5c3a21] rounded p-3">
        <label className="block text-xs uppercase text-[#9e9178] font-bold mb-1">Nombre personalizado</label>
        <input 
          type="text" 
          value={model.customName || ''}
          onChange={(e) => onUpdateModel({ ...model, customName: e.target.value })}
          placeholder={unit.name}
          className="w-full bg-[#2a1610] text-[#e2d4b7] border border-[#5c3a21] p-2 rounded focus:outline-none focus:border-[#b8863c]"
        />
      </div>

      {/* STATS */}
      {unit.stats && (
        <div className="bg-[#1a0f0a] border border-[#5c3a21] rounded p-3">
          <div className="text-[#b8863c] font-bold mb-2">
            {effName} 
            {effName !== unit.name && <span className="text-[#9e9178] text-xs ml-2">(de {unit.name})</span>}
            <span className="float-right text-[#9e9178]">{unit.cost} {unit.currency}</span>
          </div>
          <div className="grid grid-cols-5 gap-2 text-center text-sm">
            {['movement', 'ranged', 'melee', 'armour', 'base'].map(k => (
              <div key={k} className="bg-[#2a1610] border border-[#5c3a21] rounded p-1">
                <div className="text-[0.65rem] uppercase text-[#9e9178]">{k === 'movement' ? 'Mov' : k}</div>
                <div className={`font-bold ${isOverridden(k) ? 'text-[#b8863c]' : 'text-[#e2d4b7]'}`}>
                  {effStats[k]}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KEYWORDS */}
      {effKeywords.length > 0 && (
        <div className="bg-[#1a0f0a] border border-[#5c3a21] rounded p-3">
          <div className="text-xs uppercase text-[#9e9178] font-bold mb-2">Keywords</div>
          <div className="flex flex-wrap gap-2">
            {effKeywords.map((k: string) => {
              const isSpecial = k === 'ELITE' || k === 'LEADER';
              const isFromUpgrade = !(unit.keywords || []).includes(k);
              return (
                <span 
                  key={k} 
                  title={KEYWORD_LIBRARY[k] || ''}
                  className={`px-2 py-0.5 text-xs rounded border ${
                    isSpecial ? 'bg-[#5c3a21] border-[#b8863c] text-[#e2d4b7]' : 'bg-[#2a1610] border-[#5c3a21] text-[#9e9178]'
                  } ${isFromUpgrade ? 'italic' : ''}`}
                >
                  {k}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* ABILITIES */}
      {unitAbilities.length > 0 && (
        <div className="bg-[#1a0f0a] border border-[#5c3a21] rounded p-3">
          <div className="text-xs uppercase text-[#9e9178] font-bold mb-2">Habilidades</div>
          <ul className="list-disc list-inside text-sm text-[#e2d4b7] space-y-1">
            {unitAbilities.map((a: string, i: number) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}

      {/* UPGRADES */}
      {allUpgrades.length > 0 && (
        <div className="bg-[#1a0f0a] border border-[#5c3a21] rounded p-3">
          <div className="text-xs uppercase text-[#b8863c] font-bold mb-2">Mejoras (Upgrades)</div>
          <div className="space-y-2">
            {allUpgrades.map((up: any) => {
              const isActive = activeUpgrades.includes(up.id);
              const upCls = classifyUpgrade(up, model, unit, wb);
              const upBlocked = !isActive && upCls.state === 'disabled';
              return (
                <div key={up.id} className={`p-2 border rounded ${isActive ? 'bg-[#5c3a21]/20 border-[#b8863c]' : 'bg-[#2a1610] border-[#5c3a21]'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <div className="font-bold text-[#e2d4b7] text-sm">
                      {up.name} {up._fromVariant && <span className="text-xs text-[#b8863c] ml-1">⚜ variante</span>}
                    </div>
                    <div className="text-xs text-[#9e9178]">+{up.cost} {up.currency}</div>
                  </div>
                  {up.note && <div className="text-xs text-[#9e9178] mb-2">{up.note}</div>}
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleToggleUpgrade(up.id)}
                      disabled={upBlocked}
                      className={`text-xs px-2 py-1 rounded transition-colors ${
                        isActive 
                          ? 'bg-[#b8863c] text-[#1a0f0a] font-bold' 
                          : upBlocked 
                            ? 'bg-red-900/20 text-red-500/50 cursor-not-allowed'
                            : 'bg-[#5c3a21] text-[#e2d4b7] hover:bg-[#b8863c]'
                      }`}
                      title={upBlocked ? upCls.reason : ''}
                    >
                      {isActive ? '✓ Activo' : 'Activar'}
                    </button>
                    {upBlocked && <span className="text-[0.65rem] text-red-500">{upCls.reason}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ARMOURY */}
      {unit.noBattlekit ? (
        <div className="p-3 text-center text-sm text-[#9e9178] border border-[#5c3a21] bg-[#1a0f0a] rounded">
          Esta unidad no tiene acceso al Battlekit.
        </div>
      ) : (
        <div className="space-y-3">
          {cats.map(([key, label]) => {
            const items = armouryItemsForWarband(wb, key);
            if (!items.length) return null;

            const classified = items.map((item: any) => ({
              item,
              cls: classifyBattlekitItem(item, model, unit, wb),
            })).filter((c: any) => c.cls.state !== 'hidden');

            if (!classified.length) return null;

            return (
              <div key={key} className="bg-[#1a0f0a] border border-[#5c3a21] rounded p-3">
                <div className="text-xs uppercase text-[#b8863c] font-bold border-b border-[#5c3a21] pb-1 mb-2">
                  {label}
                </div>
                <div className="space-y-1">
                  {classified.map(({ item, cls }: any) => {
                    const isActive = cls.state === 'equipped';
                    const isDisabled = cls.state === 'disabled';
                    const currencyClass = item.currency === '☼' ? 'text-yellow-500' : 'text-[#9e9178]';
                    
                    return (
                      <div 
                        key={item.id} 
                        onClick={() => !isDisabled && handleToggleBattlekit(item.id)}
                        className={`flex justify-between items-center p-1.5 rounded border text-sm transition-colors ${
                          isActive 
                            ? 'bg-[#5c3a21]/30 border-[#b8863c] cursor-pointer' 
                            : isDisabled 
                              ? 'bg-red-900/10 border-red-900/30 opacity-50 cursor-not-allowed'
                              : 'bg-[#2a1610] border-transparent hover:border-[#5c3a21] cursor-pointer'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className={`font-medium ${isActive ? 'text-[#e2d4b7]' : 'text-[#9e9178]'}`}>
                            {item.name}
                            {item.restriction && <span className="text-[0.65rem] text-[#b8863c] ml-2">({item.restriction})</span>}
                          </span>
                          {isDisabled && <span className="text-[0.65rem] text-red-500">{cls.reason}</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs ${currencyClass}`}>
                            {battlekitPurchaseCost(wb, item, model)} {item.currency}
                          </span>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isActive ? 'bg-[#b8863c] border-[#b8863c]' : 'border-[#5c3a21]'
                          }`}>
                            {isActive && <div className="w-2 h-2 bg-[#1a0f0a] rounded-full" />}
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
  );
}
