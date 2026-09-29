import { modelCost } from '../../../lib/cost_calculation';

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
    <div className="space-y-3">
      {wb.models.map((model: any) => {
        const cost = modelCost(model, wb.factionId, wb);
        const costStr = `${cost.ducados ? cost.ducados + ' 👑' : ''}${cost.ducados && cost.glory ? ' · ' : ''}${cost.glory ? cost.glory + ' ☼' : ''}`;
        
        const isSelected = selectedUid === model.uid;

        return (
          <div 
            key={model.uid} 
            onClick={() => onSelectModel(model.uid)}
            className={`p-4 rounded border cursor-pointer flex justify-between items-center transition-colors ${
              isSelected 
                ? 'border-[#b8863c] bg-[rgba(95,25,25,0.35)]' 
                : 'bg-[#1a0f0a] border-[#5c3a21] hover:border-[#b8863c]/50 hover:bg-[#2a1610]'
            }`}
          >
            <div>
              <div className={`font-bold ${isSelected ? 'text-[#b8863c]' : 'text-[#e2d4b7]'}`}>
                {model.name || '(Sin nombre)'} 
                <span className="text-xs text-[#9e9178] ml-2 font-normal uppercase tracking-wider">
                  {model.typeId.replace(/-/g, ' ')}
                </span>
              </div>
              <div className="text-xs text-[#9e9178] mt-1">
                {model.battlekit?.length || 0} objetos equipados
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-[#e2d4b7] font-bold">
                {costStr || '0 👑'}
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveUnit(model.uid);
                }}
                className="text-red-500/50 hover:text-red-500 p-1 transition-colors"
                title="Despedir modelo"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
