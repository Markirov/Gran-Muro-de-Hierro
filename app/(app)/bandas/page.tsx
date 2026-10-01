'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FACTIONS } from '../../data/factions';
import { CompanionImportModal } from '../../components/CompanionImportModal';
import { CompanionExportModal } from '../../components/CompanionExportModal';

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
  const [showImportModal, setShowImportModal] = useState(false);
  const [exportingWarband, setExportingWarband] = useState<any | null>(null);

  const refreshBandsList = () => {
    try {
      const idxRaw = localStorage.getItem('warband-forge-index');
      if (idxRaw) setBands(JSON.parse(idxRaw));
      setCurrentId(localStorage.getItem('warband-forge-v1:current'));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    refreshBandsList();
    const handleSync = () => refreshBandsList();
    window.addEventListener('warband-forge-synced', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('warband-forge-synced', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const getBandFactionOrVariant = (band: any) => {
    try {
      const raw = localStorage.getItem(`warband-forge-v1:${band.id}`);
      if (raw) {
        const full = JSON.parse(raw);
        const fac = FACTIONS.find(f => f.id === full.factionId);
        if (full.variantId && fac?.variants) {
          const v = fac.variants.find(varItem => varItem.id === full.variantId);
          if (v) return v.name;
        }
        if (fac) return fac.name;
      }
    } catch (e) {}
    const fac = FACTIONS.find(f => f.id === band.factionId);
    return fac?.name || band.factionId?.replace(/-/g, ' ') || '—';
  };

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
    // Borrar de índice local
    const newBands = bands.filter(b => b.id !== id);
    setBands(newBands);
    
    // Borrar datos completos
    import('../../lib/storage').then(({ deleteWarbandLocallyAndCloud }) => {
      deleteWarbandLocallyAndCloud(id);
    });
    
    if (currentId === id) {
      localStorage.removeItem('warband-forge-v1:current');
      setCurrentId(null);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center md:items-end border-b-2 border-[#5c3a21] pb-4 gap-4">
        <div>
          <h1 className="font-serif text-[#b8863c] text-5xl m-0 uppercase tracking-widest drop-shadow-md">Tus Bandas</h1>
          <p className="text-[#7a6a58] text-sm mt-2 uppercase tracking-widest">Forja tus filas · Equipa tus soldados · Ve a la Guerra</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            type="button"
            onClick={() => setShowImportModal(true)}
            className="bg-[#2a1610] text-[#e2d4b7] border border-[#b8863c] font-bold px-5 py-3 rounded uppercase tracking-widest hover:bg-[#b8863c] hover:text-[#1a0f0a] transition-all shadow-md flex items-center gap-2 text-sm cursor-pointer"
          >
            <span>📥</span> Importar de Companion
          </button>
          <button 
            type="button"
            onClick={handleCreate}
            className="bg-gradient-to-r from-[#b8863c] to-[#9c6f2a] text-[#1a0f0a] font-bold px-6 py-3 rounded uppercase tracking-widest hover:brightness-110 transition-all shadow-[0_0_15px_rgba(184,134,60,0.3)] hover:shadow-[0_0_25px_rgba(184,134,60,0.5)] transform hover:-translate-y-1 text-sm cursor-pointer"
          >
            + Nueva Banda
          </button>
        </div>
      </div>

      {bands.length === 0 ? (
        <div className="text-center p-16 border-2 border-dashed border-[#5c3a21] rounded-xl bg-[#1a0f0a]/50 space-y-4">
          <p className="text-[#9e9178] text-xl font-serif">No tienes bandas listas para la batalla.</p>
          <div className="flex justify-center gap-4">
            <button 
              onClick={() => setShowImportModal(true)}
              className="bg-[#2a1610] border border-[#b8863c] text-[#e2d4b7] px-4 py-2 rounded uppercase tracking-widest font-bold hover:bg-[#b8863c] hover:text-[#1a0f0a] text-xs transition-all"
            >
              📥 Importar de Companion (.json)
            </button>
            <button 
              onClick={handleCreate} 
              className="text-[#b8863c] font-bold uppercase tracking-widest hover:text-[#e2d4b7] underline decoration-2 underline-offset-4 text-xs py-2"
            >
              Reclutar ahora
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bands.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(band => (
            <div 
              key={band.id}
              onClick={() => handleOpenBanda(band.id)}
              className={`group relative p-6 rounded-xl border-2 cursor-pointer transition-all overflow-hidden shadow-lg transform hover:-translate-y-1 ${
                band.id === currentId 
                  ? 'border-[#b8863c] bg-gradient-to-br from-[rgba(95,25,25,0.8)] to-[#1a0f0a] shadow-[0_0_20px_rgba(184,134,60,0.2)]' 
                  : 'border-[#3a2110] bg-[#1a0f0a] hover:bg-[#2a1610] hover:border-[#b8863c]'
              }`}
            >
              {/* Overlay Pattern */}
              <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/black-paper.png')] pointer-events-none"></div>
              
              <div className="relative z-10 flex justify-between items-start mb-4">
                <h3 className={`font-serif text-2xl m-0 truncate ${band.id === currentId ? 'text-[#e2d4b7] drop-shadow' : 'text-[#b8863c]'}`}>
                  {band.name || '(Sin nombre)'}
                </h3>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      try {
                        const raw = localStorage.getItem(`warband-forge-v1:${band.id}`);
                        if (raw) setExportingWarband(JSON.parse(raw));
                      } catch (err) {
                        console.error('Error loading warband for export', err);
                      }
                    }}
                    className="text-[#b8863c] hover:bg-[#b8863c]/20 px-2 py-1 rounded text-xs uppercase tracking-widest transition-all"
                    title="Exportar a Trench Companion (.json)"
                  >
                    📤 Exportar
                  </button>
                  <button 
                    type="button"
                    onClick={(e) => handleDelete(band.id, e)}
                    className="text-red-500 hover:bg-red-500/20 px-2 py-1 rounded text-xs uppercase tracking-widest transition-all"
                    title="Eliminar Banda"
                  >
                    Borrar
                  </button>
                </div>
              </div>
              
              <div className="relative z-10 space-y-2">
                <div className="bg-black/40 px-3 py-1.5 rounded inline-block border border-[#3a2110]">
                  <span className="text-xs text-[#e2d4b7] uppercase tracking-widest font-bold">
                    {getBandFactionOrVariant(band)}
                  </span>
                </div>
              </div>
              
              <div className="relative z-10 border-t border-[#3a2110] mt-6 pt-4 flex justify-between items-center">
                <span className="text-[#9e9178] text-sm flex items-center gap-2">
                  <span className="opacity-50">⚔</span> {band.models || 0} Miniaturas
                </span>
                <span className="text-xs text-[#b8863c] font-bold uppercase tracking-wider group-hover:underline">
                  Abrir Roster →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Importar */}
      <CompanionImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          refreshBandsList();
          router.push('/bandas/roster');
        }}
      />

      {/* Modal Exportar */}
      <CompanionExportModal
        isOpen={!!exportingWarband}
        onClose={() => setExportingWarband(null)}
        wb={exportingWarband}
      />
    </div>
  );
}
