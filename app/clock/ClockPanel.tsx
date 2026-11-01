'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CircleAlert, CircleCheck, Fingerprint, LoaderCircle } from 'lucide-react';
import { clockAction, type ClockResult } from '@/app/actions/clock';

const GEO_ERRORS: Record<number, string> = {
  1: 'ไม่ได้รับอนุญาตให้เข้าถึงตำแหน่ง กรุณาเปิดสิทธิ์ Location ให้เบราว์เซอร์ แล้วลองใหม่',
  2: 'ไม่สามารถระบุตำแหน่งได้ กรุณาเปิด GPS แล้วลองใหม่',
  3: 'หาตำแหน่งนานเกินไป กรุณาลองใหม่',
};

const pad = (n: number) => String(n).padStart(2, '0');
function elapsed(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

export function ClockPanel({ nextType, openSince }: { nextType: 'IN' | 'OUT'; openSince: string | null }) {
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
          const r = await clockAction({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy });
          setResult(r);
          if (r.ok) {
            navigator.vibrate?.(60);
            router.refresh();
          }
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
    <section className="card clock-card">
      <div className="live-time" suppressHydrationWarning>
        {now ? now.toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' }) : '--:--:--'}
      </div>
      {openSince ? (
        <div className="status-pill working" suppressHydrationWarning>
          <span className="dot" /> กำลังทำงาน {now ? elapsed(now.getTime() - Date.parse(openSince)) : ''}
        </div>
      ) : (
        <div className="status-pill idle"><span className="dot" /> ยังไม่ได้เข้างาน</div>
      )}

      <button className={`clock-btn ${isIn ? 'in' : 'out'}`} onClick={handleClock} disabled={busy} aria-label={isIn ? 'ตอกเวลาเข้างาน' : 'ตอกเวลาออกงาน'}>
        {busy ? <LoaderCircle size={56} className="spin" /> : <Fingerprint size={56} strokeWidth={1.6} />}
        <span>{isIn ? 'เข้างาน' : 'ออกงาน'}</span>
        <small>{locating ? 'กำลังหาตำแหน่ง…' : pending ? 'กำลังบันทึก…' : 'แตะเพื่อตอกเวลา'}</small>
      </button>

      {result && (
        <div className={`alert ${result.ok ? 'alert-ok' : 'alert-err'}`} role="status" style={{ textAlign: 'left', marginBottom: 0 }}>
          {result.ok ? <CircleCheck size={20} /> : <CircleAlert size={20} />}
          <span>{result.message}</span>
        </div>
      )}
    </section>
  );
}
