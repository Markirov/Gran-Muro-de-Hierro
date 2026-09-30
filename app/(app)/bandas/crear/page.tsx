'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FACTIONS } from '../../../data/factions';
import { CompanionImportModal } from '../../../components/CompanionImportModal';

export default function CrearBandaPage() {
  const router = useRouter();
  const [selectedFaction, setSelectedFaction] = useState<string>('new-antioch');
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [budget, setBudget] = useState<number>(FACTIONS.find(f => f.id === 'new-antioch')?.budget ?? 700);
  const [showImportModal, setShowImportModal] = useState(false);

  const faction = FACTIONS.find(f => f.id === selectedFaction)!;

  const handleCreate = () => {
    const newId = 'wb_' + Date.now().toString(36);
    const now = new Date().toISOString();
    
    // Si la variante define un budget distinto, se aplicará luego en el Roster (o podemos asignarlo aquí, 
    // pero el JS antiguo lo calcula en 20_cost_calculation.js y renderAll).
    // Para simplificar, ponemos el budget default de la facción, el Roster lo ajustará.
    const newBand = {
      id: newId,
      name: '',
      factionId: selectedFaction,
      variantId: selectedVariant || null,
      budgetTotal: budget,
      startingGlory: 0,
      models: [],
      glory: 0,
      notes: '',
      createdAt: now,
      updatedAt: now,
      campaign: null,
      freeBattles: [],
      discoveredLocations: [],
      campaignIds: []
    };

    // Guardar los datos completos de la banda
    import('../../../lib/storage').then(({ saveWarbandLocallyAndCloud }) => {
      saveWarbandLocallyAndCloud(newId, newBand).then(() => {
        // Establecer como banda activa y redirigir
        localStorage.setItem('warband-forge-v1:current', newId);
        // Ir a la nueva vista React del Roster
        router.push(`/bandas/roster`);
      });
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-end border-b border-[#5c3a21] pb-2">
        <div>
          <h1 className="font-serif text-[#b8863c] text-3xl m-0 uppercase tracking-widest">Alistar Nueva Banda</h1>
          <p className="text-[#9e9178] text-sm mt-1">Selecciona una facción para crear una banda local (Modo Offline)</p>
        </div>
        <button 
          onClick={() => router.push('/bandas')}
          className="text-[#9e9178] underline hover:text-[#e2d4b7]"
        >
          Volver a Mis Bandas
        </button>
      </div>

      {/* Banner Importar Companion */}
      <div className="bg-[#2a1610]/60 border border-[#b8863c]/50 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📥</span>
          <div>
            <span className="text-sm font-bold text-[#e2d4b7] block">¿Ya creaste tu banda en Trench Companion?</span>
            <span className="text-xs text-[#9e9178]">Importa directamente tu archivo .json con tus soldados, armas y equipo listos.</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowImportModal(true)}
          className="bg-[#b8863c] text-[#1a0f0a] font-bold px-4 py-2 rounded text-xs uppercase tracking-widest hover:bg-[#e2d4b7] transition-all shrink-0 shadow"
        >
          Importar .json
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FACTIONS.map(f => (
          <div 
            key={f.id}
            onClick={() => { setSelectedFaction(f.id); setSelectedVariant(''); setBudget(f.budget); }}
            className={`p-4 rounded border cursor-pointer transition-colors ${
              selectedFaction === f.id 
                ? 'border-[#b8863c] bg-[rgba(95,25,25,0.35)]' 
                : 'border-[#5c3a21] bg-[#1a0f0a] hover:bg-[#2a1610] hover:border-[#b8863c]'
            }`}
          >
            <h3 className={`font-bold m-0 ${selectedFaction === f.id ? 'text-[#b8863c]' : 'text-[#e2d4b7]'}`}>
              {f.name}
            </h3>
            <div className="text-sm text-[#9e9178] mt-1 font-serif">
              {f.side === 'faithful' ? '✠ The Faithful' : '⛧ The Fallen'}
            </div>
          </div>
        ))}
      </div>

      {faction.variants && faction.variants.length > 0 && (
        <div className="mt-8 p-4 bg-[#1a0f0a] border border-[#5c3a21] rounded">
          <h3 className="text-[#b8863c] font-bold mb-3">Variante de Facción (Opcional)</h3>
          <select 
            value={selectedVariant} 
            onChange={(e) => setSelectedVariant(e.target.value)}
            className="w-full bg-[#2a1610] text-[#e2d4b7] border border-[#5c3a21] rounded p-2 focus:border-[#b8863c] outline-none"
          >
            <option value="">— Banda principal —</option>
            {faction.variants.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-8 p-4 bg-[#1a0f0a] border border-[#5c3a21] rounded">
        <label className="flex items-center justify-between gap-4">
          <span className="text-[#b8863c] font-bold">Presupuesto (ducados)</span>
          <input
            type="number"
            min={0}
            step={5}
            value={budget}
            onChange={(e) => setBudget(Math.max(0, parseInt(e.target.value, 10) || 0))}
            className="w-32 bg-[#2a1610] text-[#e2d4b7] border border-[#5c3a21] rounded p-2 text-right focus:border-[#b8863c] outline-none"
          />
        </label>
        <p className="text-xs text-[#7a6a58] mt-2">Por defecto el de la facción ({faction.budget}). Se puede cambiar luego en el Roster.</p>
      </div>

      <div className="mt-8 pt-4 border-t border-[#5c3a21] flex justify-end">
        <button 
          onClick={handleCreate}
          className="bg-[#2a1610] text-[#b8863c] border border-[#5c3a21] px-8 py-3 rounded text-lg font-bold hover:bg-[#5c3a21] hover:text-[#e2d4b7] transition-colors shadow-lg"
        >
          Crear y Configurar Roster
        </button>
      </div>

      <CompanionImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
      />
    </div>
  );
}
