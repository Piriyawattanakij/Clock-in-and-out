import type { Metadata, Viewport } from 'next';
import { Noto_Sans_Thai } from 'next/font/google';
import './globals.css';
import { Nav } from '@/components/Nav';

const font = Noto_Sans_Thai({ subsets: ['thai', 'latin'], weight: ['400', '500', '600', '700'], variable: '--font-thai', display: 'swap' });

export const metadata: Metadata = {
  title: 'KICHI · บันทึกเวลาเข้า-ออก',
  description: 'ระบบบันทึกเวลาเข้า-ออกงานและคิดเงินเดือน',
  appleWebApp: { capable: true, title: 'KICHI', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f9f2e8' },
    { media: '(prefers-color-scheme: dark)', color: '#13110e' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={font.variable}>
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
