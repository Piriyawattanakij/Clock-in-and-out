import type { Metadata, Viewport } from 'next';
import { Noto_Sans_Thai } from 'next/font/google';
import './globals.css';
import { Nav } from '@/components/Nav';

const font = Noto_Sans_Thai({ subsets: ['thai', 'latin'], weight: ['400', '500', '600', '700'], variable: '--font-thai', display: 'swap' });

export const metadata: Metadata = {
  title: 'ตอกเวลา',
  description: 'ระบบตอกเวลาเข้า-ออกงานและคิดเงินเดือน',
  appleWebApp: { capable: true, title: 'ตอกเวลา', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f5fb' },
    { media: '(prefers-color-scheme: dark)', color: '#0c0e18' },
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
