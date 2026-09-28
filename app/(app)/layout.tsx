'use client';
import Link from 'next/link';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#111] text-[#e2d4b7] font-sans">
      <header className="bg-[#2a1610] border-b border-[#5c3a21] p-4 flex justify-between items-center">
        <div className="flex gap-4 items-center">
          <Link href="/" className="font-serif text-[#b8863c] text-xl no-underline hover:text-[#e2d4b7] transition-colors">
            ⚔ WARBAND FORGE
          </Link>
          <nav className="flex gap-2">
            <Link href="/bandas" className="px-3 py-1 bg-[#5c3a21] text-[#e2d4b7] rounded text-sm uppercase tracking-wider font-bold">Bandas</Link>
            <a href="/app.html?mode=campana" className="px-3 py-1 bg-transparent border border-[#5c3a21] text-[#b8863c] rounded text-sm uppercase tracking-wider hover:bg-[#5c3a21] hover:text-[#e2d4b7] transition-colors">Campañas</a>
            <a href="/app.html?mode=lab" className="px-3 py-1 bg-transparent border border-[#5c3a21] text-[#b8863c] rounded text-sm uppercase tracking-wider hover:bg-[#5c3a21] hover:text-[#e2d4b7] transition-colors">Lab</a>
          </nav>
        </div>
        <button className="text-[#b8863c] text-xl" onClick={() => window.location.href = '/app.html?mode=banda&settings=1'}>⚙</button>
      </header>
      <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
