import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Nav } from '@/components/Nav';

export const metadata: Metadata = {
  title: 'ตอกเวลา',
  description: 'ระบบตอกเวลาเข้า-ออกงานและคิดเงินเดือน',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
