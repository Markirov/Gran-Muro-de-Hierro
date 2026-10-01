'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { AuthSyncButton } from '../components/AuthSyncButton';

const NAV_ACTIVE = 'px-3 py-1 bg-[#5c3a21] text-[#e2d4b7] rounded text-sm uppercase tracking-wider font-bold';
const NAV_IDLE = 'px-3 py-1 bg-transparent border border-[#5c3a21] text-[#b8863c] rounded text-sm uppercase tracking-wider hover:bg-[#5c3a21] hover:text-[#e2d4b7] transition-colors';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const navClass = (base: string) => (pathname.startsWith(base) ? NAV_ACTIVE : NAV_IDLE);
  const isRosterWorkspace = pathname.startsWith('/bandas/roster');

  return (
    <div className={`${isRosterWorkspace ? 'h-screen overflow-hidden' : 'min-h-screen'} flex flex-col bg-[#111] text-[#e2d4b7] font-sans`}>
      <header className="bg-[#2a1610] border-b border-[#5c3a21] px-4 py-2.5 flex justify-between items-center shrink-0 gap-3">
        <div className="flex gap-4 items-center">
          <Link href="/" className="font-serif text-[#b8863c] text-xl no-underline hover:text-[#e2d4b7] transition-colors">
            ⚔ WARBAND FORGE
          </Link>
          <nav className="flex gap-2">
            <Link href="/bandas" className={navClass('/bandas')}>Bandas</Link>
            <Link href="/campana" className={navClass('/campana')}>Campañas</Link>
            <Link href="/lab" className={navClass('/lab')}>Lab</Link>
          </nav>
        </div>
        <div className="flex items-center">
          <AuthSyncButton />
        </div>
      </header>
      <main className={`flex-1 w-full ${isRosterWorkspace ? 'overflow-hidden flex flex-col p-2 md:p-3 max-w-[1700px] min-h-0' : 'p-4 md:p-8 max-w-6xl'} mx-auto`}>
        {children}
      </main>
    </div>
  );
}
