import { AuthSyncButton } from './components/AuthSyncButton';

export default function Home() {
  return (
    <div className="landing-bg min-h-screen flex flex-col items-center text-[#e2d4b7] font-sans">
      <header className="w-full p-6 sm:p-8 text-center border-b border-[#5c3a21] bg-black/60 relative flex justify-between items-center gap-4">
        <div className="flex items-center z-10">
          <AuthSyncButton />
        </div>

        <div className="text-center absolute left-1/2 -translate-x-1/2">
          <h1 className="font-serif text-[#b8863c] uppercase tracking-widest m-0 text-3xl sm:text-4xl">WARBAND FORGE</h1>
          <span className="text-[#9e9178] text-xs sm:text-sm uppercase tracking-widest block mt-1">Trench Crusade</span>
        </div>

        <div className="w-[100px] hidden sm:block" />
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 w-full max-w-4xl p-16 box-border">
        <a href="/bandas" className="bg-[#2a1610] border border-[#5c3a21] rounded p-12 text-center no-underline text-[#b8863c] font-serif uppercase transition-all hover:bg-[#5c3a21] hover:text-[#e2d4b7] hover:-translate-y-1 hover:shadow-xl hover:border-[#b8863c] flex flex-col items-center gap-4">
          <span className="text-6xl opacity-90">⚔</span>
          <h2 className="text-3xl m-0">Bandas</h2>
          <span className="font-sans text-base text-[#9e9178] normal-case tracking-normal">Crear, importar y gestionar tus warbands</span>
        </a>
        <a href="/campana" className="bg-[#2a1610] border border-[#5c3a21] rounded p-12 text-center no-underline text-[#b8863c] font-serif uppercase transition-all hover:bg-[#5c3a21] hover:text-[#e2d4b7] hover:-translate-y-1 hover:shadow-xl hover:border-[#b8863c] flex flex-col items-center gap-4">
          <span className="text-6xl opacity-90">📚</span>
          <h2 className="text-3xl m-0">Campañas</h2>
          <span className="font-sans text-base text-[#9e9178] normal-case tracking-normal">Juega crónicas narrativas y progresión</span>
        </a>
        <a href="/lab" className="bg-[#2a1610] border border-[#5c3a21] rounded p-12 text-center no-underline text-[#b8863c] font-serif uppercase transition-all hover:bg-[#5c3a21] hover:text-[#e2d4b7] hover:-translate-y-1 hover:shadow-xl hover:border-[#b8863c] flex flex-col items-center gap-4">
          <span className="text-6xl opacity-90">🔬</span>
          <h2 className="text-3xl m-0">Lab</h2>
          <span className="font-sans text-base text-[#9e9178] normal-case tracking-normal">Simula batallas y cruza estadísticas</span>
        </a>
        <a href="/partida" className="bg-[#2a1610] border border-[#5c3a21] rounded p-12 text-center no-underline text-[#b8863c] font-serif uppercase transition-all hover:bg-[#5c3a21] hover:text-[#e2d4b7] hover:-translate-y-1 hover:shadow-xl hover:border-[#b8863c] flex flex-col items-center gap-4">
          <span className="text-6xl opacity-90">📋</span>
          <h2 className="text-3xl m-0">Partida</h2>
          <span className="font-sans text-base text-[#9e9178] normal-case tracking-normal">Juega una partida sin afectar a campañas</span>
        </a>
      </div>
    </div>
  );
}
