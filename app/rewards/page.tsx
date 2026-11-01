import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { cancelRedemptionAction } from '@/app/actions/rewards';
import { ACHIEVEMENTS } from '@/lib/achievement-defs';
import { consecutivePerfectMonths, punctualStreaks, PROBATION_DAYS } from '@/lib/achievements';
import { achievementSettings, walletOf } from '@/lib/reward-service';
import { employedFrom, employeeDays } from '@/lib/payroll-service';
import { getSettings } from '@/lib/settings';
import { fmtBaht } from '@/lib/money';
import { addDays, daysInclusive, fmtDate, shiftMonth, toDateStr } from '@/lib/time';
import { BadgeCollection, type CollectionItem } from '@/components/badges/BadgeCollection';
import { ClaimCeremony } from '@/components/badges/ClaimCeremony';
import { ConfirmSubmit } from '@/components/ConfirmSubmit';
import { RedeemForm } from './RedeemForm';

export const dynamic = 'force-dynamic';

const REDEEM_LABEL: Record<string, [string, string]> = {
  PENDING: ['รออนุมัติ', 'badge-warn'],
  APPROVED: ['รอจ่ายในงวดถัดไป', 'badge-warn'],
  PAID: ['จ่ายแล้ว', 'badge-ok'],
  REJECTED: ['ไม่อนุมัติ', 'badge-err'],
  CANCELLED: ['ยกเลิก', ''],
};

export default async function RewardsPage() {
  const user = await requireUser();
  const today = toDateStr(new Date());
  const from = employedFrom(user);
  const [wallet, awards, conf, settings, redemptions] = await Promise.all([
    walletOf(user.id),
    prisma.employeeAchievement.findMany({ where: { employeeId: user.id, revokedAt: null }, orderBy: { awardedAt: 'asc' } }),
    achievementSettings(),
    getSettings(),
    prisma.rewardRedemption.findMany({ where: { employeeId: user.id }, orderBy: { createdAt: 'desc' }, take: 20 }),
  ]);

  // ความคืบหน้าของ badge ที่ยังไม่ได้
  const histStart = from > addDays(today, -420) ? from : addDays(today, -420);
  const history = await employeeDays(user.id, histStart, today);
  const streak = punctualStreaks(history).current;
  const perfectSet = new Set(awards.filter((a) => a.achievementKey === 'perfect_month').map((a) => a.periodKey));
  const lastMonth = shiftMonth(today.slice(0, 7), -1);
  const perfectRun = consecutivePerfectMonths(lastMonth, perfectSet.has(lastMonth), perfectSet);
  const daysWorked = from <= today ? daysInclusive(from, today) : 0;
  const progressOf = (key: string): CollectionItem['progress'] => {
    const m = key.match(/^(streak_punctual|streak_perfect|tenure)_(\d+)$/);
    if (key === 'probation') return { current: Math.min(daysWorked, PROBATION_DAYS), target: PROBATION_DAYS };
    if (!m) return null;
    const n = Number(m[2]);
    if (m[1] === 'streak_punctual') return { current: Math.min(streak, n), target: n };
    if (m[1] === 'streak_perfect') return { current: Math.min(perfectRun, n), target: n };
    return { current: Math.min(Math.floor(daysWorked / 30.4), n * 12), target: n * 12 };
  };

  const items: CollectionItem[] = ACHIEVEMENTS.filter((a) => conf.get(a.key)!.active || awards.some((w) => w.achievementKey === a.key)).map((a) => {
    const mine = awards.filter((w) => w.achievementKey === a.key);
    return {
      def: { key: a.key, kanji: a.kanji, motif: a.motif, colors: a.colors, tier: a.tier, group: a.group, name: a.name, description: a.description, kanjiMeaning: a.kanjiMeaning, repeatable: a.repeatable },
      count: mine.length,
      firstAt: mine[0]?.awardedAt.toISOString() ?? null,
      lastAt: mine.at(-1)?.awardedAt.toISOString() ?? null,
      totalAmount: mine.reduce((s, w) => s + w.amount, 0),
      amount: conf.get(a.key)!.amount,
      progress: progressOf(a.key),
    };
  });
  const unclaimed = awards
    .filter((w) => !w.claimedAt)
    .map((w) => {
      const a = ACHIEVEMENTS.find((x) => x.key === w.achievementKey)!;
      return {
        id: w.id,
        def: { key: a.key, kanji: a.kanji, motif: a.motif, colors: a.colors, tier: a.tier, group: a.group, name: a.name, description: a.description, kanjiMeaning: a.kanjiMeaning },
        amount: w.amount,
        note: w.note,
        awardedAt: w.awardedAt.toISOString(),
      };
    });
  const earnedCount = items.filter((i) => i.count > 0).length;

  return (
    <main className="container narrow">
      {unclaimed.length > 0 && <ClaimCeremony items={unclaimed} />}
      <h1>รางวัลของฉัน</h1>
      <section className="wallet-hero">
        <div className="muted" style={{ position: 'relative', zIndex: 1 }}>🐷 กระปุก KICHI</div>
        <div className="wallet-amount" style={{ position: 'relative', zIndex: 1 }}>฿{fmtBaht(wallet.balance)}</div>
        <div className="wallet-row">
          <span>สะสมทั้งหมด ฿{fmtBaht(wallet.earned)}</span>
          <span>แลกแล้ว ฿{fmtBaht(wallet.redeemed)}</span>
          {wallet.pending > 0 && <span>รออนุมัติ ฿{fmtBaht(wallet.pending)}</span>}
          <span>badge {earnedCount}/{items.length}</span>
        </div>
        <RedeemForm balance={wallet.balance} min={settings.rewardMinRedeem * 100} />
      </section>

      <BadgeCollection items={items} />

      {redemptions.length > 0 && (
        <>
          <div className="section-title"><h2>ประวัติการแลก</h2></div>
          <div className="list">
            {redemptions.map((r) => (
              <div key={r.id} className={`list-item ${r.status === 'CANCELLED' || r.status === 'REJECTED' ? 'dim' : ''}`}>
                <div className="grow">
                  <b>฿{fmtBaht(r.amount)}</b>{r.reason === 'RESIGNATION' && <span className="sub"> · จ่ายคงเหลือ</span>}
                  <div className="sub">{fmtDate(r.createdAt)}{r.reviewNote ? ` · ${r.reviewNote}` : ''}</div>
                </div>
                <span className={`badge ${REDEEM_LABEL[r.status][1]}`}>{REDEEM_LABEL[r.status][0]}</span>
                {r.status === 'PENDING' && (
                  <form action={cancelRedemptionAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <ConfirmSubmit className="btn btn-sm" message="ยกเลิกคำขอแลกนี้?">ยกเลิก</ConfirmSubmit>
                  </form>
                )}
              </div>
            ))}
          </div>
        </>
      )}
      <p className="muted" style={{ marginTop: 20 }}>
        badge รายเดือนจะได้รับเมื่อผู้ดูแลอนุมัติเงินเดือนของเดือนนั้น · เงินที่แลกจะรวมในเงินเดือนงวดถัดไป · ถ้าลาออก ร้านจะจ่ายเงินคงเหลือในกระปุกให้ในเดือนสุดท้าย
      </p>
    </main>
  );
}
