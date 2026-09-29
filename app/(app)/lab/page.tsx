'use client';
import { useRouter } from 'next/navigation';

export default function LabPage() {
  const router = useRouter();
  
  return (
    <div className="max-w-[1100px] mx-auto space-y-4">
      <header className="bg-[#2a1610] border border-[#5c3a21] rounded p-4 flex justify-between items-center mb-6">
        <div>
          <h1 className="text-[#b8863c] font-serif text-2xl m-0 uppercase tracking-wide">
            🔬 Battle Lab 2.0
          </h1>
          <div className="text-[#e2d4b7] mt-1 text-sm">
            Simulador estadístico de batallas con conciencia espacial.
          </div>
        </div>
        <button 
          onClick={() => window.location.href = 'app.html?mode=lab'}
          className="bg-[#5c3a21] text-[#e2d4b7] border border-[#5c3a21] px-4 py-2 rounded font-bold hover:bg-[#b8863c] transition-colors"
        >
          Ir al Simulador Clásico (Legacy)
        </button>
      </header>

      <div className="bg-[#1a0f0a] border border-[#5c3a21] p-8 rounded text-center">
        <span className="text-4xl block mb-4 opacity-80">⚙️</span>
        <h2 className="text-[#b8863c] font-bold text-2xl mb-2">Motor Estadístico en Migración</h2>
        <p className="text-[#9e9178] max-w-xl mx-auto">
          El simulador de batallas y la lógica de análisis espacial están siendo reescritos nativamente en React para esta nueva versión. 
          <br /><br />
          Para realizar cruces estadísticos o probar el winrate de tus Loadouts (A/B testing), usa el botón superior para acceder a la herramienta heredada.
        </p>
      </div>
    </div>
  );
}
