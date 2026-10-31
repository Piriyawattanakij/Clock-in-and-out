'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { clockAction, type ClockResult } from '@/app/actions/clock';

const GEO_ERRORS: Record<number, string> = {
  1: 'ไม่ได้รับอนุญาตให้เข้าถึงตำแหน่ง กรุณาเปิดสิทธิ์ Location ให้เบราว์เซอร์ แล้วลองใหม่',
  2: 'ไม่สามารถระบุตำแหน่งได้ กรุณาเปิด GPS แล้วลองใหม่',
  3: 'หาตำแหน่งนานเกินไป กรุณาลองใหม่',
};

export function ClockPanel({ nextType, storeName, radiusM }: { nextType: 'IN' | 'OUT'; storeName: string; radiusM: number }) {
  const router = useRouter();
  const [now, setNow] = useState<Date | null>(null);
  const [locating, setLocating] = useState(false);
  const [result, setResult] = useState<ClockResult | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  function handleClock() {
    setResult(null);
    if (!('geolocation' in navigator)) {
      setResult({ ok: false, message: 'อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง' });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        startTransition(async () => {
          const r = await clockAction({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
          setResult(r);
          if (r.ok) router.refresh();
        });
      },
      (err) => {
        setLocating(false);
        setResult({ ok: false, message: GEO_ERRORS[err.code] ?? err.message });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  const busy = locating || pending;
  const isIn = nextType === 'IN';

  return (
    <div>
      <div className="big-time" suppressHydrationWarning>
        {now ? now.toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' }) : '--:--:--'}
      </div>
      <p className="muted" style={{ textAlign: 'center', marginTop: 0 }}>
        📍 {storeName} (ต้องอยู่ในรัศมี {radiusM} ม.)
      </p>
      <button className={`btn btn-clock ${isIn ? 'btn-in' : 'btn-out'}`} onClick={handleClock} disabled={busy}>
        {locating ? 'กำลังหาตำแหน่ง…' : pending ? 'กำลังบันทึก…' : isIn ? 'ตอกเวลาเข้างาน' : 'ตอกเวลาออกงาน'}
      </button>
      {result && <div className={`alert ${result.ok ? 'alert-ok' : 'alert-err'}`}>{result.message}</div>}
    </div>
  );
}
