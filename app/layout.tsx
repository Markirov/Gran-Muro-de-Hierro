import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trench Crusade - Warband Forge',
  description: 'Trench Crusade Companion App',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
