import { prisma } from '@/lib/db';
import {
  approveRedemptionAction, evaluateAchievementsAction, manualAwardAction, rejectRedemptionAction, revokeAwardAction, saveAchievementSettingsAction,
} from '@/app/admin/actions';
import { ACHIEVEMENTS, ACHIEVEMENT_BY_KEY, GROUP_LABEL, TIER_INFO } from '@/lib/achievement-defs';
import { achievementSettings, walletOf } from '@/lib/reward-service';
import { fmtBaht, toBahtInput } from '@/lib/money';
import { fmtDateTime, shiftMonth, toDateStr } from '@/lib/time';
import { Avatar } from '@/components/Avatar';
import { BadgeArt } from '@/components/badges/BadgeArt';
import { ConfirmSubmit } from '@/components/ConfirmSubmit';
import { Flash } from '@/components/Flash';

export const dynamic = 'force-dynamic';

export default async function AdminRewardsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const [conf, employees, pending, recent] = await Promise.all([
    achievementSettings(),
    prisma.employee.findMany({ where: { active: true, OR: [{ role: 'STAFF' }, { baseSalary: { gt: 0 } }] }, orderBy: { code: 'asc' } }),
    prisma.rewardRedemption.findMany({ where: { status: 'PENDING' }, include: { employee: true }, orderBy: { createdAt: 'asc' } }),
    prisma.employeeAchievement.findMany({ include: { employee: true }, orderBy: { awardedAt: 'desc' }, take: 25 }),
  ]);
  const wallets = await Promise.all(employees.map(async (e) => ({ e, w: await walletOf(e.id) })));
  const liability = wallets.reduce((a, x) => a + x.w.balance + x.w.pending, 0);
  const owedApproved = await prisma.rewardRedemption.aggregate({ where: { status: 'APPROVED' }, _sum: { amount: true } });
  const lastMonth = shiftMonth(toDateStr(new Date()).slice(0, 7), -1);
  const manual = ACHIEVEMENTS.filter((a) => a.kind === 'MANUAL');

  return (
    <main className="container" style={{ maxWidth: 960 }}>
      <h1>รางวัล · กระปุก KICHI</h1>
      <Flash {...sp} />
      <div className="grid grid-2">
        <div className="card stat"><span className="muted">ยอดสะสมค้างจ่ายรวม</span><b>฿{fmtBaht(liability)}</b></div>
        <div className="card stat"><span className="muted">อนุมัติแล้ว รอจ่ายในงวดถัดไป</span><b>฿{fmtBaht(owedApproved._sum.amount ?? 0)}</b></div>
      </div>

      <div className="section-title"><h2>คำขอแลกเงิน ({pending.length})</h2></div>
      {pending.length === 0 ? <div className="card muted" style={{ textAlign: 'center' }}>ไม่มีคำขอที่รออนุมัติ</div> : (
        <div className="list" style={{ marginBottom: 16 }}>
          {pending.map((r) => (
            <form key={r.id} action={approveRedemptionAction} className="list-item" style={{ flexWrap: 'wrap' }}>
              <input type="hidden" name="id" value={r.id} />
              <Avatar emp={r.employee} size={40} />
              <div className="grow"><b>{r.employee.name}</b><div className="sub">ขอแลก ฿{fmtBaht(r.amount)} · {fmtDateTime(r.createdAt)}</div></div>
              <input name="note" placeholder="หมายเหตุ" style={{ width: 150, padding: '6px 10px' }} />
              <button className="btn btn-sm btn-approve">อนุมัติ</button>
              <button className="btn btn-sm btn-danger" formAction={rejectRedemptionAction}>ไม่อนุมัติ</button>
            </form>
          ))}
        </div>
      )}

      <div className="section-title"><h2>ยอดในกระปุกของพนักงาน</h2></div>
      <div className="card table-wrap">
        <table>
          <thead><tr><th>พนักงาน</th><th className="num">สะสมทั้งหมด</th><th className="num">แลกแล้ว</th><th className="num">คงเหลือ</th></tr></thead>
          <tbody>
            {wallets.map(({ e, w }) => (
              <tr key={e.id}>
                <td><span className="row" style={{ gap: 8, flexWrap: 'nowrap' }}><Avatar emp={e} size={28} />{e.name}</span></td>
                <td className="num">{fmtBaht(w.earned)}</td>
                <td className="num">{fmtBaht(w.redeemed)}</td>
                <td className="num"><b>{fmtBaht(w.balance + w.pending)}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section-title"><h2>มอบ badge พิเศษ</h2></div>
      <form action={manualAwardAction} className="card" style={{ display: 'grid', gap: 12 }}>
        <div className="grid">
          <label>พนักงาน
            <select name="employeeId" required defaultValue="">
              <option value="" disabled>— เลือก —</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.code} {e.name}</option>)}
            </select>
          </label>
          <label>badge
            <select name="key">{manual.map((a) => <option key={a.key} value={a.key}>{a.name} (฿{fmtBaht(conf.get(a.key)!.amount)})</option>)}</select>
          </label>
          <label>เงินรางวัล (บาท)<input name="amount" type="number" min={0} step="1" defaultValue={toBahtInput(conf.get(manual[0].key)!.amount)} /></label>
        </div>
        <label>ข้อความถึงพนักงาน (ไม่บังคับ)<input name="note" maxLength={200} placeholder="เช่น ลูกค้าโต๊ะ 5 ชมว่าบริการดีมาก" /></label>
        <div><button className="btn btn-primary">มอบ badge</button></div>
      </form>

      <div className="section-title"><h2>ประเมินย้อนหลัง</h2></div>
      <form action={evaluateAchievementsAction} className="card row">
        <span className="muted" style={{ flex: '1 1 240px' }}>ปกติระบบประเมินอัตโนมัติเมื่ออนุมัติเงินเดือนของเดือนนั้น ใช้ปุ่มนี้ถ้าต้องการประเมินเดือนที่จบแล้วอีกครั้ง (ไม่ให้ซ้ำ)</span>
        <input type="month" name="month" defaultValue={lastMonth} style={{ width: 'auto' }} />
        <button className="btn">ประเมิน</button>
      </form>

      <div className="section-title"><h2>badge ล่าสุด</h2></div>
      <div className="card table-wrap">
        <table>
          <tbody>
            {recent.length === 0 && <tr><td className="muted">ยังไม่มี</td></tr>}
            {recent.map((a) => {
              const d = ACHIEVEMENT_BY_KEY.get(a.achievementKey);
              return (
                <tr key={a.id} style={a.revokedAt ? { opacity: 0.45, textDecoration: 'line-through' } : undefined}>
                  <td>{d && <BadgeArt def={d} size={32} idSuffix={`-r${a.id}`} />}</td>
                  <td>{a.employee.name}</td>
                  <td>{d?.name}<div className="muted">{a.periodKey.startsWith('manual') ? a.note ?? 'มอบโดยผู้ดูแล' : a.periodKey === 'once' ? '' : a.periodKey}</div></td>
                  <td className="num">{a.amount ? `฿${fmtBaht(a.amount)}` : '-'}</td>
                  <td className="muted">{fmtDateTime(a.awardedAt)}</td>
                  <td>
                    {!a.revokedAt && (
                      <form action={revokeAwardAction}>
                        <input type="hidden" name="id" value={a.id} />
                        <ConfirmSubmit className="btn btn-sm" message="เพิกถอน badge นี้? เงินรางวัลจะถูกหักออกจากกระปุก">เพิกถอน</ConfirmSubmit>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="section-title" id="settings"><h2>ตั้งค่า badge และเงินรางวัล</h2></div>
      <form action={saveAchievementSettingsAction} className="card table-wrap">
        <table>
          <thead><tr><th></th><th>badge</th><th>เงื่อนไข</th><th>รางวัล (บาท)</th><th>เปิดใช้</th></tr></thead>
          <tbody>
            {ACHIEVEMENTS.map((a) => (
              <tr key={a.key}>
                <td><BadgeArt def={a} size={40} idSuffix="-s" /></td>
                <td>
                  <b>{a.name}</b>
                  <div className="muted">{GROUP_LABEL[a.group]}{a.tier ? ` · ${TIER_INFO[a.tier].emoji} ${TIER_INFO[a.tier].name}` : ''}</div>
                </td>
                <td style={{ whiteSpace: 'normal', minWidth: 220 }} className="muted">{a.description}</td>
                <td><input name={`amount_${a.key}`} type="number" min={0} step="1" defaultValue={toBahtInput(conf.get(a.key)!.amount)} style={{ width: 100 }} /></td>
                <td><input type="checkbox" name={`active_${a.key}`} defaultChecked={conf.get(a.key)!.active} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 12 }}><button className="btn btn-primary">บันทึก</button></div>
      </form>
    </main>
  );
}
