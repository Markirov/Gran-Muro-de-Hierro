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
    localStorage.setItem(`warband-forge-v1:${newWb.id}`, JSON.stringify(newWb));
  };

  const handleAddUnit = (u: any) => {
    const newModel = {
      uid: 'm_' + Date.now().toString(36),
      typeId: u.id,
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

  if (error) {
    return <div className="text-red-500 p-8">{error}</div>;
  }

  if (!wb) return <div className="p-8 text-[#9e9178]">Cargando banda...</div>;

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
    <div className="max-w-[1400px] mx-auto space-y-4">
      {/* HEADER */}
      <header className="bg-[#2a1610] border border-[#5c3a21] rounded p-4 flex justify-between items-center">
        <div>
          <h1 className="text-[#b8863c] font-serif text-2xl m-0 uppercase tracking-wide">
            {wb.name || '(Sin nombre)'}
          </h1>
          <div className="text-[#e2d4b7] mt-1 text-sm">
            {faction?.name} {variant ? ` — ${variant.name}` : ''}
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="bg-[#1a0f0a] border border-[#5c3a21] px-4 py-2 rounded text-center flex items-center gap-4">
            <div>
              <div className="text-xs uppercase text-[#9e9178] tracking-wider">Ducados</div>
              <div className="text-xl font-bold text-[#b8863c]">
                {wb.budgetTotal - spentDucados} <span className="text-[#e2d4b7] text-sm">/ {wb.budgetTotal} 👑</span>
              </div>
            </div>
            {wb.glory > 0 && (
              <div className="border-l border-[#5c3a21] pl-4">
                <div className="text-xs uppercase text-[#9e9178] tracking-wider">Glory</div>
                <div className="text-xl font-bold text-[#b8863c]">
                  {wb.glory - spentGlory} <span className="text-[#e2d4b7] text-sm">/ {wb.glory} ☼</span>
                </div>
              </div>
            )}
          </div>
          <button 
            onClick={() => {
              localStorage.setItem('warband-forge-v1:current', wb.id);
              localStorage.setItem('wf.mode', 'banda');
              window.location.href = `/app.html?mode=banda`;
            }}
            className="bg-[#5c3a21] text-[#e2d4b7] px-3 py-1 text-sm rounded font-bold hover:bg-[#b8863c] transition-colors h-fit"
          >
            Editor Legacy
          </button>
        </div>
      </header>

      {/* GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT PANEL: Unit Market */}
        <div className="lg:col-span-3">
          <UnitMarket wb={wb} onAddUnit={handleAddUnit} />
        </div>

        {/* CENTER PANEL: Roster List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-[#2a1610] border border-[#5c3a21] p-3 font-bold text-[#b8863c] uppercase tracking-wider text-sm flex justify-between rounded">
            <span>Roster</span>
            <span className="text-[#e2d4b7]">{wb.models.length} modelos</span>
          </div>
          <RosterList 
            wb={wb} 
            onRemoveUnit={handleRemoveUnit} 
            onSelectModel={setSelectedUid}
            selectedUid={selectedUid}
          />
        </div>

        {/* RIGHT PANEL: Details */}
        <div className="lg:col-span-4 sticky top-4">
          <div className="bg-[#2a1610] border border-[#5c3a21] p-3 font-bold text-[#b8863c] uppercase tracking-wider text-sm rounded mb-3">
            <span>Hoja de Datos & Armería</span>
          </div>
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
      </div>
    </div>
  );
}
