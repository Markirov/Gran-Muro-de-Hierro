'use client';
import { useState } from 'react';
import { modelCost, getUnit, effectiveUnitName } from '../../../lib/cost_calculation';

export function RosterList({ 
  wb, 
  onSelectModel, 
  selectedUid,
  onReorderModels 
}: { 
  wb: any, 
  onSelectModel: (uid: string) => void, 
  selectedUid: string | null,
  onReorderModels?: (newModels: any[]) => void 
}) {
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  if (!wb) return null;

  if (wb.models.length === 0) {
    return (
      <div className="p-8 border border-dashed border-[#5c3a21] rounded text-center text-[#9e9178] bg-[#1a0f0a]">
        Tu banda aguarda. Selecciona unidades del catálogo para reclutar.
      </div>
    );
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverIdx !== index) {
      setDragOverIdx(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverIdx(null);
    if (draggedIdx === null || draggedIdx === targetIndex) return;

    const newModels = [...wb.models];
    const [moved] = newModels.splice(draggedIdx, 1);
    newModels.splice(targetIndex, 0, moved);

    if (onReorderModels) {
      onReorderModels(newModels);
    }
    setDraggedIdx(null);
  };

  return (
    <div className="space-y-2">
      {wb.models.map((model: any, index: number) => {
        const cost = modelCost(model, wb.factionId, wb);
        const costStr = `${cost.ducados ? cost.ducados + ' 👑' : ''}${cost.ducados && cost.glory ? ' ' : ''}${cost.glory ? cost.glory + ' ☼' : ''}`;
        const isSelected = selectedUid === model.uid;
        const isBeingDragged = draggedIdx === index;
        const isDragTarget = dragOverIdx === index;
        
        const unit = getUnit(wb.factionId, model.unitId);
        const effName = effectiveUnitName(model, unit);

        return (
          <div 
            key={model.uid} 
            draggable={true}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={() => dragOverIdx === index && setDragOverIdx(null)}
            onDrop={(e) => handleDrop(e, index)}
            onClick={() => onSelectModel(model.uid)}
            className={`group rounded-lg border-2 cursor-pointer transition-all relative overflow-hidden select-none ${
              isBeingDragged ? 'opacity-40 scale-[0.98]' : ''
            } ${
              isDragTarget ? 'border-t-4 border-t-[#b8863c]' : ''
            } ${
              isSelected 
                ? 'border-[#b8863c] bg-gradient-to-r from-[rgba(95,25,25,0.4)] to-[#1a0f0a] shadow-[0_0_15px_rgba(184,134,60,0.15)]' 
                : 'bg-[#1a0f0a] border-[#3a2110] hover:border-[#b8863c]/50 hover:bg-[#2a1610]'
            }`}
          >
            {/* Indicador de selección lateral */}
            {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#b8863c] shadow-[0_0_10px_#b8863c]" />}

            <div className="p-3 pl-3 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                {/* Grip Handle para Drag and Drop */}
                <div 
                  className="cursor-grab active:cursor-grabbing text-[#5c3a21] group-hover:text-[#b8863c] text-sm font-mono px-1 py-2 flex flex-col justify-center items-center transition-colors"
                  title="Arrastrar para reordenar"
                >
                  <span className="leading-none text-[11px]">⋮</span>
                  <span className="leading-none text-[11px]">⋮</span>
                </div>

                <div className="flex flex-col">
                  <div className="flex items-baseline gap-2">
                    <span className={`font-serif text-lg tracking-wide ${isSelected ? 'text-[#b8863c]' : 'text-[#e2d4b7]'}`}>
                      {model.name || effName || '(Desconocido)'}
                    </span>
                    <span className="text-[10px] text-[#7a6a58] uppercase tracking-widest bg-black/40 px-2 py-0.5 rounded border border-[#3a2110]">
                      {model.unitId.replace(/-/g, ' ')}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 mt-1 text-xs text-[#9e9178]">
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
              </div>

              <div className="flex flex-col items-end">
                <div className="text-[#e2d4b7] font-bold text-sm bg-black/30 px-2.5 py-1 rounded shadow-inner font-mono">
                  {costStr || '0 👑'}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
