'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type BandIndexEntry = {
  id: string;
  name: string;
  factionId: string;
  models: number;
  updatedAt: string;
};

export default function BandasPage() {
  const router = useRouter();
  const [bands, setBands] = useState<BandIndexEntry[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);

  useEffect(() => {
    // Cargar bandas desde localStorage (índice de Vanilla JS)
    try {
      const idxRaw = localStorage.getItem('warband-forge-index');
      if (idxRaw) setBands(JSON.parse(idxRaw));
      setCurrentId(localStorage.getItem('warband-forge-v1:current'));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleOpenBanda = (id: string) => {
    localStorage.setItem('warband-forge-v1:current', id);
    router.push(`/bandas/roster`);
  };

  const handleCreate = () => {
    router.push('/bandas/crear');
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Eliminar esta banda definitivamente?')) return;
    
    // Borrar de índice
    const newBands = bands.filter(b => b.id !== id);
    setBands(newBands);
    localStorage.setItem('warband-forge-index', JSON.stringify(newBands));
    
    // Borrar datos completos
    localStorage.removeItem(`warband-forge-v1:${id}`);
    
    if (currentId === id) {
      localStorage.removeItem('warband-forge-v1:current');
      setCurrentId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-end border-b border-[#5c3a21] pb-2">
        <div>
          <h1 className="font-serif text-[#b8863c] text-3xl m-0 uppercase tracking-widest">Tus Bandas</h1>
          <p className="text-[#9e9178] text-sm mt-1">Selecciona una banda para entrar al modo Gestor (Roster, Variantes y PDF)</p>
        </div>
        <button 
          onClick={handleCreate}
          className="bg-[#2a1610] text-[#b8863c] border border-[#5c3a21] px-4 py-2 rounded hover:bg-[#5c3a21] hover:text-[#e2d4b7] transition-colors"
        >
          + Nueva Banda
        </button>
      </div>

      {bands.length === 0 ? (
        <div className="text-center p-12 border border-dashed border-[#5c3a21] rounded bg-[#2a1610]/50">
          <p className="text-[#9e9178] italic">No tienes bandas creadas en este dispositivo.</p>
          <button onClick={handleCreate} className="mt-4 text-[#b8863c] underline hover:text-[#e2d4b7]">Crear tu primera banda</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bands.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(band => (
            <div 
              key={band.id}
              onClick={() => handleOpenBanda(band.id)}
              className={`p-4 rounded border cursor-pointer transition-colors hover:shadow-lg ${
                band.id === currentId 
                  ? 'border-[#b8863c] bg-[rgba(95,25,25,0.35)]' 
                  : 'border-[#5c3a21] bg-[#1a0f0a] hover:bg-[#2a1610] hover:border-[#b8863c]'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className={`font-bold m-0 ${band.id === currentId ? 'text-[#b8863c]' : 'text-[#e2d4b7]'}`}>
                  {band.name || '(Sin nombre)'}
                </h3>
                <button 
                  onClick={(e) => handleDelete(band.id, e)}
                  className="text-red-500/50 hover:text-red-500 hover:bg-red-500/10 px-2 py-1 rounded text-sm transition-colors"
                  title="Eliminar Banda"
                >
                  ✕
                </button>
              </div>
              
              <div className="text-sm text-[#9e9178]">
                <span className="uppercase">{band.factionId ? band.factionId.replace(/-/g, ' ') : '—'}</span>
                <span className="mx-2 opacity-50">•</span>
                <span>{band.models || 0} miniaturas</span>
              </div>
              
              {band.updatedAt && (
                <div className="text-xs opacity-40 mt-3 text-right">
                  Actualizada: {new Date(band.updatedAt).toLocaleString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
