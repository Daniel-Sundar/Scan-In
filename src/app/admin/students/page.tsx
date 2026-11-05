import { AddStudentForm } from '@/components/admin/Forms';
import { BulkUpload } from '@/components/admin/BulkUpload';
import { StudentTable } from '@/components/admin/Lists';
import { PageHeader } from '@/components/ui/static';
import { requirePage } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Students' };

export default async function Students() {
  await requirePage('admin');
  const supabase = await createClient();
  const { data } = await supabase.from('students').select('id,roll_no,full_name,department,year').order('roll_no').limit(2000);
  return (
    <div className="page space-y-10">
      <PageHeader eyebrow="Admin · Directory" title="Students" description="Import rosters in bulk or add students one at a time." />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card-static"><p className="eyebrow">Import</p><h2 className="mb-4 text-lg font-semibold">Bulk import</h2><BulkUpload /></section>
        <section className="card-static"><p className="eyebrow">Manual</p><h2 className="mb-4 text-lg font-semibold">Add one student</h2><AddStudentForm /></section>
      </div>
      <section><p className="eyebrow">Directory</p><h2 className="mb-4 text-lg font-semibold">All students</h2><StudentTable students={data ?? []} /></section>
    </div>
  );
}
