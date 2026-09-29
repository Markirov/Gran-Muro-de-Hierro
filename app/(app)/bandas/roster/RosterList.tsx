import { modelCost, getUnit, effectiveUnitName } from '../../../lib/cost_calculation';

export function RosterList({ wb, onRemoveUnit, onSelectModel, selectedUid }: { wb: any, onRemoveUnit: (uid: string) => void, onSelectModel: (uid: string) => void, selectedUid: string | null }) {
  if (!wb) return null;

  if (wb.models.length === 0) {
    return (
      <div className="p-8 border border-dashed border-[#5c3a21] rounded text-center text-[#9e9178] bg-[#1a0f0a]">
        Tu banda aguarda. Selecciona unidades del catálogo para reclutar.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {wb.models.map((model: any) => {
        const cost = modelCost(model, wb.factionId, wb);
        const costStr = `${cost.ducados ? cost.ducados + ' 👑' : ''}${cost.ducados && cost.glory ? ' ' : ''}${cost.glory ? cost.glory + ' ☼' : ''}`;
        const isSelected = selectedUid === model.uid;
        
        const unit = getUnit(wb.factionId, model.unitId);
        const effName = effectiveUnitName(model, unit);

        // Contar tipos de armas equipadas
        const meleeWeapons = model.battlekit?.filter((id: string) => id.includes('melee') || id.includes('sword') || id.includes('club') || id.includes('axe') || id.includes('spear')) || [];
        const rangedWeapons = model.battlekit?.filter((id: string) => id.includes('ranged') || id.includes('rifle') || id.includes('pistol') || id.includes('gun')) || [];

        return (
          <div 
            key={model.uid} 
            onClick={() => onSelectModel(model.uid)}
            className={`group rounded-lg border-2 cursor-pointer transition-all relative overflow-hidden ${
              isSelected 
                ? 'border-[#b8863c] bg-gradient-to-r from-[rgba(95,25,25,0.4)] to-[#1a0f0a] shadow-[0_0_15px_rgba(184,134,60,0.15)]' 
                : 'bg-[#1a0f0a] border-[#3a2110] hover:border-[#b8863c]/50 hover:bg-[#2a1610]'
            }`}
          >
            {/* Indicador de selección lateral */}
            {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#b8863c] shadow-[0_0_10px_#b8863c]" />}

            <div className="p-3 pl-4 flex justify-between items-start">
              <div className="flex flex-col">
                <div className="flex items-baseline gap-2">
                  <span className={`font-serif text-lg tracking-wide ${isSelected ? 'text-[#b8863c]' : 'text-[#e2d4b7]'}`}>
                    {model.name || effName || '(Desconocido)'}
                  </span>
                  <span className="text-[10px] text-[#7a6a58] uppercase tracking-widest bg-black/40 px-2 py-0.5 rounded border border-[#3a2110]">
                    {model.unitId.replace(/-/g, ' ')}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 mt-1.5 text-xs text-[#9e9178]">
                  {model.battlekit?.length > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <span className="opacity-60">⚔</span> {model.battlekit.length} objetos
                    </div>
                  ) : (
                    <span className="italic opacity-50">Desarmado</span>
                  )}
                  {model.xp > 0 && (
                    <div className="flex items-center gap-1 text-[#b8863c]">
                      ★ {model.xp} XP
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end">
                <div className="text-[#e2d4b7] font-bold text-sm bg-black/30 px-2 py-1 rounded shadow-inner">
                  {costStr || '0 👑'}
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveUnit(model.uid);
                  }}
                  className={`mt-2 text-xs text-red-500/30 hover:text-red-500 transition-colors uppercase tracking-widest ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                  title="Despedir modelo"
                >
                  ✕ Eliminar
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
