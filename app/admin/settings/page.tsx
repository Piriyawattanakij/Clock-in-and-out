import { saveSettingsAction } from '@/app/admin/actions';
import { getSettings, type AppSettings } from '@/lib/settings';
import { Flash } from '@/components/Flash';

export const dynamic = 'force-dynamic';

const FIELDS: { group: string; items: [keyof AppSettings, string][] }[] = [
  { group: 'การตอกเวลา', items: [['maxAccuracyM', 'ความแม่นยำ GPS ที่ยอมรับ (เมตร)'], ['otBlockMinutes', 'ปัด OT ลงทีละ (นาที)']] },
  {
    group: 'อัตราค่าจ้าง',
    items: [
      ['hoursPerDay', 'ชั่วโมงทำงานต่อวัน'],
      ['daysPerMonth', 'จำนวนวันต่อเดือน (ใช้หาค่าจ้างรายวันของรายเดือน)'],
      ['otMultiplier', 'OT วันทำงาน (เท่า)'],
      ['holidayWorkMultiplierMonthly', 'ทำงานวันหยุด — รายเดือน (เท่า)'],
      ['holidayWorkMultiplierOther', 'ทำงานวันหยุด — รายวัน/ชม. (เท่า)'],
      ['holidayOtMultiplier', 'OT ในวันหยุด (เท่า)'],
    ],
  },
  {
    group: 'ประกันสังคม',
    items: [['ssoRatePercent', 'อัตราเงินสมทบลูกจ้าง (%)'], ['ssoWageMin', 'ฐานค่าจ้างขั้นต่ำ (บาท)'], ['ssoWageCap', 'เพดานฐานค่าจ้าง (บาท)']],
  },
  {
    group: 'ภาษีหัก ณ ที่จ่าย',
    items: [['personalAllowance', 'ลดหย่อนส่วนตัว (บาท/ปี)'], ['expenseRatePercent', 'หักค่าใช้จ่าย (%)'], ['expenseCap', 'หักค่าใช้จ่ายสูงสุด (บาท/ปี)']],
  },
];

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const s = await getSettings();
  return (
    <main className="container">
      <h1>ตั้งค่า</h1>
      <Flash {...sp} />
      <div className="alert alert-warn">
        อัตราประกันสังคม ภาษี และค่าแรงตามกฎหมายเปลี่ยนแปลงได้ กรุณาตรวจสอบกับประกาศล่าสุดของสำนักงานประกันสังคม / กรมสรรพากร หรือนักบัญชี
      </div>
      <form action={saveSettingsAction}>
        {FIELDS.map((g) => (
          <div className="card" key={g.group}>
            <h2 style={{ marginTop: 0 }}>{g.group}</h2>
            <div className="grid">
              {g.items.map(([k, label]) => (
                <label key={k}>{label}<input name={k} type="number" step="any" min={0} defaultValue={String(s[k])} /></label>
              ))}
            </div>
            {g.group === 'อัตราค่าจ้าง' && (
              <label className="check" style={{ marginTop: 12 }}>
                <input type="checkbox" name="deductLate" defaultChecked={s.deductLate} /> หักเงินเมื่อมาสาย (ตามนาทีที่สาย)
              </label>
            )}
          </div>
        ))}
        <button className="btn btn-primary">บันทึกการตั้งค่า</button>
      </form>
    </main>
  );
}
