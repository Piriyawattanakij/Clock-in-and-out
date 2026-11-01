import type { MetadataRoute } from 'next';

// ทำให้กด "เพิ่มลงหน้าจอหลัก" บนมือถือ แล้วเปิดเต็มจอเหมือนแอพ
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'KICHI · บันทึกเวลาเข้า-ออก',
    short_name: 'KICHI',
    description: 'ระบบบันทึกเวลาเข้า-ออกงาน',
    start_url: '/',
    display: 'standalone',
    background_color: '#f9f2e8',
    theme_color: '#f9f2e8',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
