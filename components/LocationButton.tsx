'use client';

import { useState } from 'react';

/** ปุ่มเติมพิกัดปัจจุบันลงในช่อง latitude/longitude ของฟอร์ม */
export function LocationButton({ latId, lngId }: { latId: string; lngId: string }) {
  const [msg, setMsg] = useState('');
  return (
    <span className="row">
      <button
        type="button"
        className="btn btn-sm"
        onClick={() => {
          setMsg('กำลังหาตำแหน่ง…');
          navigator.geolocation.getCurrentPosition(
            (p) => {
              (document.getElementById(latId) as HTMLInputElement).value = p.coords.latitude.toFixed(6);
              (document.getElementById(lngId) as HTMLInputElement).value = p.coords.longitude.toFixed(6);
              setMsg(`ได้ตำแหน่งแล้ว (±${Math.round(p.coords.accuracy)} ม.) อย่าลืมกดบันทึก`);
            },
            (e) => setMsg(`หาตำแหน่งไม่ได้: ${e.message}`),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
          );
        }}
      >
        📍 ใช้ตำแหน่งปัจจุบัน
      </button>
      {msg && <span className="muted">{msg}</span>}
    </span>
  );
}
