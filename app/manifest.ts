import type { MetadataRoute } from 'next';

// ทำให้กด "เพิ่มลงหน้าจอหลัก" บนมือถือ แล้วเปิดเต็มจอเหมือนแอพ
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ตอกเวลา',
    short_name: 'ตอกเวลา',
    description: 'ระบบตอกเวลาเข้า-ออกงาน',
    start_url: '/',
    display: 'standalone',
    background_color: '#f4f5fb',
    theme_color: '#4f46e5',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
