import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Flash } from '@/components/Flash';
import { EmployeeForm } from '../EmployeeForm';

export default async function NewEmployeePage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const [stores, shifts] = await Promise.all([prisma.store.findMany(), prisma.shift.findMany()]);
  return (
    <main className="container">
      <Link href="/admin/employees">← พนักงานทั้งหมด</Link>
      <h1>เพิ่มพนักงาน</h1>
      <Flash {...sp} />
      <EmployeeForm stores={stores} shifts={shifts} />
    </main>
  );
}
