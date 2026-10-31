/** แสดงข้อความจาก query string (?ok=... หรือ ?error=...) หลัง redirect */
export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (error) return <div className="alert alert-err">{error}</div>;
  if (ok) return <div className="alert alert-ok">{ok}</div>;
  return null;
}
