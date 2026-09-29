import { DATA } from '../../../data/01_trench_crusade_game_data';
import { unitsAvailableForWarband, unitForbiddenByVariant } from '../../../lib/cost_calculation';
import { canAddUnit } from '../../../lib/limit_validation';

export function UnitMarket({ wb, onAddUnit }: { wb: any, onAddUnit: (u: any) => void }) {
  if (!wb) return null;

  const factionUnits = unitsAvailableForWarband(wb);
  const tiers = { elite: [] as any[], troops: [] as any[] };
  
  factionUnits.forEach((u: any) => {
    if (tiers[u.tier as keyof typeof tiers]) {
      tiers[u.tier as keyof typeof tiers].push(u);
    }
  });

  const renderUnitList = (units: any[], isMerc: boolean = false) => {
    return units.map((u: any) => {
      const can = canAddUnit(wb, u);
      const isForbidden = unitForbiddenByVariant(wb, u.id);
      const isOverLimit = !can && !isForbidden;

      let btnClass = "bg-[#2a1610] text-[#b8863c] border border-[#5c3a21] hover:bg-[#5c3a21] hover:text-[#e2d4b7]";
      if (!can) {
        btnClass = "bg-red-900/20 text-red-500/50 border-red-900/50 cursor-not-allowed";
      }

      return (
        <div key={u.id} className="bg-[#1a0f0a] border border-[#5c3a21] p-3 rounded flex justify-between items-center mb-2">
          <div>
            <div className={`font-bold ${!can ? 'text-[#9e9178]/50' : 'text-[#e2d4b7]'}`}>
              {u.name}
            </div>
            <div className="text-xs text-[#9e9178] mt-1">
              {u.cost} {u.currency}
              {u.limit ? ` · Límite: ${u.limit}` : ''}
              {isForbidden && <span className="text-red-500 ml-2">Prohibido por Variante</span>}
              {isOverLimit && <span className="text-red-500 ml-2">Límite alcanzado / Faltan reqs</span>}
            </div>
          </div>
          <button 
            onClick={() => {
              if (can) onAddUnit(u);
            }}
            disabled={!can}
            className={`px-3 py-1 rounded text-sm transition-colors ${btnClass}`}
          >
            Reclutar
          </button>
        </div>
      );
    });
  };

  return (
    <div className="bg-[#1a0f0a] border border-[#5c3a21] rounded overflow-hidden">
      <div className="bg-[#2a1610] border-b border-[#5c3a21] p-3 font-bold text-[#b8863c] uppercase tracking-wider text-sm flex justify-between">
        <span>Catálogo de Unidades</span>
      </div>
      
      <div className="p-4 space-y-6 max-h-[600px] overflow-y-auto custom-scrollbar">
        {tiers.elite.length > 0 && (
          <div>
            <h3 className="text-[#b8863c] font-serif border-b border-[#5c3a21] pb-1 mb-3">★ Elite</h3>
            {renderUnitList(tiers.elite)}
          </div>
        )}

        {tiers.troops.length > 0 && (
          <div>
            <h3 className="text-[#b8863c] font-serif border-b border-[#5c3a21] pb-1 mb-3">⚔ Troops</h3>
            {renderUnitList(tiers.troops)}
          </div>
        )}

        {DATA.mercenaries.length > 0 && (
          <div>
            <h3 className="text-[#b8863c] font-serif border-b border-[#5c3a21] pb-1 mb-3">☼ Mercenaries</h3>
            {renderUnitList(DATA.mercenaries, true)}
          </div>
        )}
      </div>
    </div>
  );
}
