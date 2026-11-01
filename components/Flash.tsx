import { CircleAlert, CircleCheck } from 'lucide-react';

/** แสดงข้อความจาก query string (?ok=... หรือ ?error=...) หลัง redirect */
export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (error) return <div className="alert alert-err"><CircleAlert size={20} /> {error}</div>;
  if (ok) return <div className="alert alert-ok"><CircleCheck size={20} /> {ok}</div>;
  return null;
}
