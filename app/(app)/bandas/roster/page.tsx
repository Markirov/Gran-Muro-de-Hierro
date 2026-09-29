'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FACTIONS } from '../../../data/factions';
import { DATA } from '../../../data/01_trench_crusade_game_data';
import { UnitMarket } from './UnitMarket';
import { RosterList } from './RosterList';
import { ModelDetails } from './ModelDetails';
import { modelCost } from '../../../lib/cost_calculation';
import { TabletopMode } from '../../partida/TabletopMode';

export default function RosterPage() {
  const router = useRouter();
  const [wb, setWb] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [showTabletop, setShowTabletop] = useState(false);
  const [tabletopSession, setTabletopSession] = useState<any>({ modelStates: {} });

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
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [tempBudget, setTempBudget] = useState(0);
  const [tempGlory, setTempGlory] = useState(0);

  const openBudgetModal = () => {
    setTempBudget(wb.budgetTotal ?? 0);
    setTempGlory(wb.glory ?? 0);
    setShowBudgetModal(true);
  };

  const handleSaveBudget = () => {
    saveWb({
      ...wb,
      budgetTotal: Math.max(0, tempBudget),
      glory: Math.max(0, tempGlory)
    });
    setShowBudgetModal(false);
  };

  const handleReorderModels = (newModels: any[]) => {
    saveWb({ ...wb, models: newModels });
  };

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
          <input 
            type="text" 
            value={wb.name || ''}
            onChange={(e) => saveWb({ ...wb, name: e.target.value })}
            placeholder="(Sin nombre)"
            className="w-full bg-transparent text-[#b8863c] font-serif text-3xl m-0 uppercase tracking-widest drop-shadow-md placeholder-[#b8863c]/50 focus:outline-none focus:border-b border-[#5c3a21] transition-all text-center md:text-left"
          />
          <div className="text-[#9e9178] mt-1 text-sm tracking-widest uppercase">
            {faction?.name} {variant ? ` — ${variant.name}` : ''}
          </div>
        </div>
        
        <div className="flex items-center gap-4 md:gap-8">
          <button 
            type="button"
            onClick={openBudgetModal}
            className="flex gap-6 bg-[#0a0503] hover:bg-[#1a0f0a] px-6 py-2 rounded-lg border border-[#3a2110] hover:border-[#b8863c] transition-all shadow-inner group cursor-pointer text-left"
            title="Pulsar para ajustar Ducados y Gloria de la banda"
          >
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase text-[#7a6a58] group-hover:text-[#b8863c] tracking-widest mb-1 flex items-center gap-1 font-bold">
                Presupuesto <span className="text-[9px]">✎</span>
              </span>
              <div className="text-2xl font-serif text-[#b8863c]">
                {(wb.budgetTotal || 0) - spentDucados}{' '}
                <span className="text-[#7a6a58] text-sm">
                  / {wb.budgetTotal ?? 0} 👑
                </span>
              </div>
            </div>
            <div className="w-px bg-[#3a2110] my-2"></div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase text-[#7a6a58] group-hover:text-[#e2d4b7] tracking-widest mb-1 flex items-center gap-1 font-bold">
                Gloria <span className="text-[9px]">✎</span>
              </span>
              <div className="text-2xl font-serif text-[#e2d4b7]">
                {(wb.glory || 0) - spentGlory} <span className="text-[#7a6a58] text-sm">/ {wb.glory ?? 0} ☼</span>
              </div>
            </div>
          </button>

          <div className="flex flex-col gap-2">
            <button 
              onClick={() => setShowTabletop(true)}
              className="bg-[#b8863c] border border-[#b8863c] text-[#1a0f0a] px-4 py-2 text-sm rounded font-bold hover:bg-[#e2d4b7] transition-all shadow-lg uppercase tracking-widest"
            >
              📱 Modo Mesa (Libre)
            </button>
            <button 
              onClick={() => {
                localStorage.setItem('warband-forge-v1:current', wb.id);
                router.push('/partida');
              }}
              className="bg-red-900/80 border border-red-500/50 text-[#e2d4b7] px-4 py-2 text-sm rounded font-bold hover:bg-red-700 transition-all shadow-lg hover:shadow-red-900/50 uppercase tracking-widest"
            >
              ⚔ Jugar Partida
            </button>
          </div>
        </div>
      </header>
      
      {showTabletop && (
        <TabletopMode 
          session={tabletopSession}
          wb={wb}
          onUpdate={setTabletopSession}
          onClose={() => setShowTabletop(false)}
        />
      )}

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
              onSelectModel={setSelectedUid}
              selectedUid={selectedUid}
              onReorderModels={handleReorderModels}
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
                onRemoveModel={handleRemoveUnit}
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

      {/* MODAL AJUSTE DE PRESUPUESTO Y GLORIA */}
      {showBudgetModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setShowBudgetModal(false)}>
          <div className="w-full max-w-md bg-[#1a0f0a] border-2 border-[#b8863c] rounded-xl shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-b from-[#2a1610] to-[#1a0f0a] p-4 flex justify-between items-center border-b border-[#5c3a21]">
              <h2 className="font-serif text-xl text-[#b8863c] uppercase tracking-widest m-0 flex items-center gap-2">
                💰 Fondos de la Banda
              </h2>
              <button onClick={() => setShowBudgetModal(false)} className="text-[#9e9178] hover:text-white text-2xl leading-none">&times;</button>
            </div>

            <div className="p-5 space-y-4">
              {/* AVISO EN ROJO */}
              <div className="bg-red-950/40 border border-red-800/60 rounded-lg p-3 flex gap-2.5 items-start">
                <span className="text-red-500 text-lg leading-none shrink-0 mt-0.5">⚠️</span>
                <p className="text-xs text-red-200/90 leading-relaxed font-sans">
                  <strong className="text-red-400 uppercase tracking-wide block mb-1">Aviso de Reglas:</strong>
                  Modificar manualmente los Ducados o la Gloria altera el límite de reclutamiento de la banda. En futuras progresiones de campaña, estos fondos se actualizarán automáticamente con las recompensas y gastos obtenidos.
                </p>
              </div>

              {/* DUCADOS */}
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-widest text-[#e2d4b7] font-bold flex justify-between">
                  <span>Presupuesto Total (Ducados 👑)</span>
                  <span className="text-[#9e9178] font-mono text-[11px]">Gastados: {spentDucados} 👑</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={tempBudget}
                  onChange={(e) => setTempBudget(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full bg-[#0a0503] border border-[#5c3a21] focus:border-[#b8863c] rounded-lg px-3 py-2 text-[#b8863c] font-serif text-xl outline-none font-bold shadow-inner"
                />
              </div>

              {/* GLORIA */}
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-widest text-[#e2d4b7] font-bold flex justify-between">
                  <span>Gloria Base (☼)</span>
                  <span className="text-[#9e9178] font-mono text-[11px]">Gastada: {spentGlory} ☼</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={tempGlory}
                  onChange={(e) => setTempGlory(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full bg-[#0a0503] border border-[#5c3a21] focus:border-[#b8863c] rounded-lg px-3 py-2 text-[#e2d4b7] font-serif text-xl outline-none font-bold shadow-inner"
                />
              </div>

              {/* BOTONES ACCION */}
              <div className="flex gap-3 pt-3 border-t border-[#3a2110]">
                <button
                  type="button"
                  onClick={() => setShowBudgetModal(false)}
                  className="flex-1 py-2 rounded border border-[#5c3a21] text-[#9e9178] hover:text-[#e2d4b7] uppercase tracking-widest text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveBudget}
                  className="flex-1 py-2 rounded bg-gradient-to-r from-[#b8863c] to-[#9c6f2a] text-[#1a0f0a] uppercase tracking-widest text-xs font-bold hover:brightness-110 transition-all shadow-md"
                >
                  Guardar Fondos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
