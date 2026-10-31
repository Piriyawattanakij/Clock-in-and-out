import type { Store } from '@prisma/client';
import { prisma } from '@/lib/db';
import { saveStoreAction } from '@/app/admin/actions';
import { Flash } from '@/components/Flash';
import { LocationButton } from '@/components/LocationButton';

export const dynamic = 'force-dynamic';

function StoreForm({ store }: { store?: Store }) {
  const key = store ? `s${store.id}` : 'new';
  return (
    <form action={saveStoreAction} className="card">
      {store && <input type="hidden" name="id" value={store.id} />}
      <h2 style={{ marginTop: 0 }}>{store ? store.name : 'เพิ่มร้านใหม่'}</h2>
      <div className="grid">
        <label>ชื่อร้าน *<input name="name" defaultValue={store?.name} required /></label>
        <label>ที่อยู่<input name="address" defaultValue={store?.address ?? ''} /></label>
        <label>ละติจูด *<input id={`${key}-lat`} name="latitude" type="number" step="any" defaultValue={store?.latitude} required /></label>
        <label>ลองจิจูด *<input id={`${key}-lng`} name="longitude" type="number" step="any" defaultValue={store?.longitude} required /></label>
        <label>รัศมีที่อนุญาต (เมตร)<input name="radiusM" type="number" min={10} max={5000} defaultValue={store?.radiusM ?? 100} /></label>
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn btn-primary">บันทึก</button>
        <LocationButton latId={`${key}-lat`} lngId={`${key}-lng`} />
        {store && (
          <a className="btn btn-sm" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${store.latitude},${store.longitude}`}>
            🗺 ดูบนแผนที่
          </a>
        )}
      </div>
    </form>
  );
}

export default async function StoresPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const stores = await prisma.store.findMany({ orderBy: { id: 'asc' } });
  return (
    <main className="container">
      <h1>ร้าน / สาขา</h1>
      <Flash {...sp} />
      <p className="muted">
        วิธีง่ายที่สุด: เปิดหน้านี้บนมือถือขณะยืนอยู่ในร้าน แล้วกด “ใช้ตำแหน่งปัจจุบัน” หรือคัดลอกพิกัดจาก Google Maps (กดค้างที่จุดบนแผนที่)
        แนะนำรัศมี 50–150 เมตร เพราะ GPS ในอาคารคลาดเคลื่อนได้
      </p>
      {stores.map((s) => <StoreForm key={s.id} store={s} />)}
      <StoreForm />
    </main>
  );
}
