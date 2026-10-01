'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CampanaPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<any>(null);

  const loadData = () => {
    try {
      const idx = localStorage.getItem('warband-forge-v1:campaign-index');
      if (idx) {
        setCampaigns(JSON.parse(idx));
      } else {
        setCampaigns([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
    const handleSync = () => loadData();
    window.addEventListener('warband-forge-synced', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('warband-forge-synced', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const createCampaign = () => {
    const name = prompt('Nombre de la nueva campaña:');
    if (!name) return;
    const c = {
      id: 'cmp_' + Date.now().toString(36),
      name,
      description: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      warbandIds: [],
      battles: [],
      gameNumber: 1,
      warbandStates: {},
      finances: {},
      rewardDefaults: {
        win:  { ducados: 50, glory: 1 },
        loss: { ducados: 20, glory: 0 },
        draw: { ducados: 30, glory: 0 }
      }
    };
    const idx = [...campaigns, { id: c.id, name: c.name, warbands: 0, battles: 0, updatedAt: c.updatedAt }];
    setCampaigns(idx);
    setActiveCampaign(c);
    import('../../lib/storage').then(({ saveCampaignLocallyAndCloud }) => {
      saveCampaignLocallyAndCloud(c.id, c);
    });
  };

  const deleteCampaign = (id: string) => {
    if (!confirm('¿Seguro que quieres borrar esta campaña?')) return;
    const newIdx = campaigns.filter(c => c.id !== id);
    setCampaigns(newIdx);
    if (activeCampaign?.id === id) setActiveCampaign(null);
    import('../../lib/storage').then(({ deleteCampaignLocallyAndCloud }) => {
      deleteCampaignLocallyAndCloud(id);
    });
  };

  const openCampaign = (id: string) => {
    const raw = localStorage.getItem('warband-forge-v1:c_' + id);
    if (raw) setActiveCampaign(JSON.parse(raw));
  };

  return (
    <div className="max-w-[1100px] mx-auto space-y-4">
      <header className="bg-[#2a1610] border border-[#5c3a21] rounded p-4 flex justify-between items-center mb-6">
        <div>
          <h1 className="text-[#b8863c] font-serif text-2xl m-0 uppercase tracking-wide">
            📜 Gestor de Campañas
          </h1>
          <div className="text-[#e2d4b7] mt-1 text-sm">
            Juega crónicas narrativas, controla recursos (Ducados/Glory) y registra el progreso de tu banda.
          </div>
        </div>
        {activeCampaign ? (
          <button 
            onClick={() => setActiveCampaign(null)}
            className="bg-[#1a0f0a] text-[#b8863c] border border-[#5c3a21] px-4 py-2 rounded font-bold hover:bg-[#5c3a21] hover:text-[#e2d4b7] transition-colors"
          >
            ← Volver a Campañas
          </button>
        ) : (
          <button 
            onClick={createCampaign}
            className="bg-[#b8863c] text-[#1a0f0a] px-4 py-2 rounded font-bold hover:bg-[#e2d4b7] transition-colors"
          >
            + Nueva Campaña
          </button>
        )}
      </header>

      {activeCampaign ? (
        <div className="space-y-6">
          <div className="bg-[#1a0f0a] border border-[#5c3a21] rounded p-6">
            <h2 className="text-[#b8863c] font-bold text-2xl mb-1">{activeCampaign.name}</h2>
            <p className="text-[#9e9178] mb-6">Juego Actual (Game Number): <span className="text-[#e2d4b7] font-bold">{activeCampaign.gameNumber}</span></p>

            <div className="text-[#9e9178] border border-[#5c3a21] p-6 rounded bg-[#2a1610] text-center">
              <span className="text-xl">⚠️ Interfaz en migración</span>
              <p className="mt-2 text-sm">
                Las partidas se juegan desde el nuevo botón &quot;Partida&quot; en el menú principal. <br />
                En una próxima fase terminaremos la UI para registrar resultados de la campaña aquí directamente.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div>
          {campaigns.length === 0 ? (
            <div className="p-4 bg-[#1a0f0a] border border-[#5c3a21] rounded text-[#9e9178] text-center">
              No hay campañas guardadas. Crea una para empezar.
            </div>
          ) : (
            <div className="grid gap-3">
              {campaigns.map(c => (
                <div key={c.id} className="p-4 rounded border bg-[#2a1610] border-[#5c3a21] flex justify-between items-center hover:border-[#b8863c] transition-colors cursor-pointer" onClick={() => openCampaign(c.id)}>
                  <div>
                    <div className="font-bold text-[#b8863c]">{c.name}</div>
                    <div className="text-sm text-[#9e9178] mt-1">
                      {c.warbands} bandas · {c.battles} batallas
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteCampaign(c.id); }}
                      className="bg-red-900/20 text-red-500 border border-red-900/50 px-3 py-1 rounded text-sm hover:bg-red-900/40 transition-colors"
                    >
                      Borrar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
