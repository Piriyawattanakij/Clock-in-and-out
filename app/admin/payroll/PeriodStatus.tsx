const MAP: Record<string, [string, string]> = {
  DRAFT: ['ร่าง', 'badge-warn'],
  APPROVED: ['อนุมัติแล้ว', 'badge-ok'],
  PAID: ['จ่ายแล้ว', 'badge-ok'],
};

export function PeriodStatus({ status }: { status: string }) {
  const [label, cls] = MAP[status] ?? [status, ''];
  return <span className={`badge ${cls}`}>{label}</span>;
}
