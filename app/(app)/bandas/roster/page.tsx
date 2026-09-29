'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FACTIONS } from '../../../data/factions';
import { DATA } from '../../../data/01_trench_crusade_game_data';
import { UnitMarket } from './UnitMarket';
import { RosterList } from './RosterList';
import { ModelDetails } from './ModelDetails';
import { modelCost } from '../../../lib/cost_calculation';

export default function RosterPage() {
  const router = useRouter();
  const [wb, setWb] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  useEffect(() => {
    try {
      const id = localStorage.getItem('warband-forge-v1:current');
      if (!id) {
        setError('No hay ninguna banda seleccionada.');
        return;
      }
      const data = localStorage.getItem(`warband-forge-v1:${id}`);
      if (!data) {
        setError('Banda no encontrada en este dispositivo.');
        return;
      }
      setWb(JSON.parse(data));
    } catch (e) {
      setError('Error al leer la banda.');
    }
  }, []);

  const saveWb = (newWb: any) => {
    setWb(newWb);
    import('../../../lib/storage').then(({ saveWarbandLocallyAndCloud }) => {
      saveWarbandLocallyAndCloud(newWb.id, newWb);
    });
  };

  const handleAddUnit = (u: any) => {
    const newModel = {
      uid: 'm_' + Date.now().toString(36),
      unitId: u.id,
      name: '',
      xp: 0,
      isElite: !!u.isElite,
      equipment: [],
      battlekit: [],
    };
    const newWb = { ...wb, models: [...wb.models, newModel] };
    saveWb(newWb);
    setSelectedUid(newModel.uid);
  };

  const handleRemoveUnit = (uid: string) => {
    const newWb = { ...wb, models: wb.models.filter((m: any) => m.uid !== uid) };
    saveWb(newWb);
    if (selectedUid === uid) setSelectedUid(null);
  };

  const [showMarket, setShowMarket] = useState(false);

  if (error) {
    return <div className="text-red-500 p-8">{error}</div>;
  }

  if (!wb) return <div className="p-8 text-[#9e9178] animate-pulse">Invocando banda...</div>;

  const faction = FACTIONS.find(f => f.id === wb.factionId);
  const variant = faction?.variants?.find(v => v.id === wb.variantId);

  // Calcular presupuesto gastado
  let spentDucados = 0;
  let spentGlory = 0;
  wb.models.forEach((m: any) => {
    const cost = modelCost(m, wb.factionId, wb);
    spentDucados += cost.ducados || 0;
    spentGlory += cost.glory || 0;
  });

  return (
    <div className="max-w-[1600px] mx-auto h-[calc(100vh-2rem)] flex flex-col pt-4">
      {/* HEADER TÁCTICO */}
      <header className="bg-gradient-to-r from-[#1a0f0a] via-[#2a1610] to-[#1a0f0a] border-y border-[#5c3a21] p-4 flex flex-col md:flex-row justify-between items-center shadow-xl mb-4 shrink-0">
        <div className="flex flex-col mb-4 md:mb-0 text-center md:text-left">
          <h1 className="text-[#b8863c] font-serif text-3xl m-0 uppercase tracking-widest drop-shadow-md">
            {wb.name || '(Sin nombre)'}
          </h1>
          <div className="text-[#9e9178] mt-1 text-sm tracking-widest uppercase">
            {faction?.name} {variant ? ` — ${variant.name}` : ''}
          </div>
        </div>
        
        <div className="flex items-center gap-4 md:gap-8">
          <div className="flex gap-6 bg-[#0a0503] px-6 py-2 rounded-lg border border-[#3a2110] shadow-inner">
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase text-[#7a6a58] tracking-widest mb-1">Presupuesto</span>
              <div className="text-2xl font-serif text-[#b8863c]">
                {wb.budgetTotal - spentDucados} <span className="text-[#7a6a58] text-sm">/ {wb.budgetTotal} 👑</span>
              </div>
            </div>
            {wb.glory > 0 && (
              <>
                <div className="w-px bg-[#3a2110] my-2"></div>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] uppercase text-[#7a6a58] tracking-widest mb-1">Gloria</span>
                  <div className="text-2xl font-serif text-[#e2d4b7]">
                    {wb.glory - spentGlory} <span className="text-[#7a6a58] text-sm">/ {wb.glory} ☼</span>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <button 
              onClick={() => {
                localStorage.setItem('warband-forge-v1:current', wb.id);
                localStorage.setItem('wf.mode', 'partida');
                window.location.href = `/partida`;
              }}
              className="bg-red-900/80 border border-red-500/50 text-[#e2d4b7] px-4 py-2 text-sm rounded font-bold hover:bg-red-700 transition-all shadow-lg hover:shadow-red-900/50 uppercase tracking-widest"
            >
              ⚔ Jugar Partida
            </button>
          </div>
        </div>
      </header>

      {/* WORKSPACE */}
      <div className="flex-1 flex gap-4 min-h-0 relative">
        
        {/* COLUMNA IZQUIERDA: ROSTER */}
        <div className="w-full md:w-1/3 max-w-[450px] flex flex-col gap-3 h-full">
          <div className="bg-[#1a0f0a] border border-[#5c3a21] rounded-t-lg p-3 flex justify-between items-center shrink-0 shadow-md z-10">
            <span className="font-serif text-[#b8863c] text-lg uppercase tracking-wider">Tu Roster ({wb.models.length})</span>
            <button 
              onClick={() => setShowMarket(true)}
              className="bg-[#2a1610] text-[#e2d4b7] border border-[#b8863c] px-3 py-1 text-xs uppercase tracking-widest font-bold hover:bg-[#b8863c] hover:text-[#1a0f0a] transition-all rounded"
            >
              + Reclutar
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0a0503]/50 rounded-b-lg border-x border-b border-[#5c3a21] p-2 relative">
            <RosterList 
              wb={wb} 
              onRemoveUnit={handleRemoveUnit} 
              onSelectModel={setSelectedUid}
              selectedUid={selectedUid}
            />
          </div>
        </div>

        {/* COLUMNA DERECHA: DETALLES */}
        <div className="flex-1 bg-[#1a0f0a] border border-[#5c3a21] rounded-lg shadow-2xl flex flex-col h-full overflow-hidden relative">
          {!selectedUid ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[#7a6a58] opacity-50 p-8 text-center">
              <span className="text-6xl mb-4">⚕</span>
              <p className="font-serif text-xl uppercase tracking-widest">Selecciona un modelo</p>
              <p className="text-sm mt-2 max-w-md">Haz clic en un modelo del roster para ver sus estadísticas, asignarle armamento o ver sus reglas especiales.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <ModelDetails 
                wb={wb} 
                model={wb.models.find((m: any) => m.uid === selectedUid)} 
                onUpdateModel={(newModel) => {
                  const newWb = {
                    ...wb,
                    models: wb.models.map((m: any) => m.uid === newModel.uid ? newModel : m)
                  };
                  saveWb(newWb);
                }} 
              />
            </div>
          )}
        </div>
      </div>

      {/* MODAL MARKET */}
      {showMarket && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowMarket(false)}>
          <div className="w-full max-w-2xl bg-[#1a0f0a] border-2 border-[#b8863c] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-b from-[#2a1610] to-[#1a0f0a] p-4 flex justify-between items-center border-b border-[#5c3a21]">
              <h2 className="font-serif text-2xl text-[#b8863c] uppercase tracking-widest m-0">Mercado de Unidades</h2>
              <button onClick={() => setShowMarket(false)} className="text-[#9e9178] hover:text-white text-3xl leading-none">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <UnitMarket wb={wb} onAddUnit={(u) => { handleAddUnit(u); setShowMarket(false); }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
