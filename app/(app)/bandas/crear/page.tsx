'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FACTIONS } from '../../../data/factions';

export default function CrearBandaPage() {
  const router = useRouter();
  const [selectedFaction, setSelectedFaction] = useState<string>('new-antioch');
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  
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
      budgetTotal: faction.budget,
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
    localStorage.setItem(`warband-forge-v1:${newId}`, JSON.stringify(newBand));
    
    // Actualizar el índice
    try {
      const idxRaw = localStorage.getItem('warband-forge-index');
      const idx = idxRaw ? JSON.parse(idxRaw) : [];
      idx.push({
        id: newId,
        name: newBand.name,
        factionId: newBand.factionId,
        models: 0,
        updatedAt: newBand.updatedAt
      });
      localStorage.setItem('warband-forge-index', JSON.stringify(idx));
    } catch (e) {
      console.error(e);
    }
    
    // Establecer como banda activa y redirigir
    localStorage.setItem('warband-forge-v1:current', newId);
    localStorage.setItem('wf.mode', 'banda');
    window.location.href = '/app.html?mode=banda';
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FACTIONS.map(f => (
          <div 
            key={f.id}
            onClick={() => { setSelectedFaction(f.id); setSelectedVariant(''); }}
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

      <div className="mt-8 pt-4 border-t border-[#5c3a21] flex justify-end">
        <button 
          onClick={handleCreate}
          className="bg-[#2a1610] text-[#b8863c] border border-[#5c3a21] px-8 py-3 rounded text-lg font-bold hover:bg-[#5c3a21] hover:text-[#e2d4b7] transition-colors shadow-lg"
        >
          Crear y Configurar Roster
        </button>
      </div>
    </div>
  );
}
