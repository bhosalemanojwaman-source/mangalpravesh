import Link from 'next/link';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import ProjectNav from '../nav';
import Uploader from './uploader';

const CATS = ['Land documents', 'Approvals', 'Drawings', 'Contracts', 'Bills and receipts', 'Other'];

export default async function Documents({ params }: { params: { id: string } }) {
  const sb = createClient();
  const { data: p } = await sb.from('projects').select('id,name').eq('id', params.id).maybeSingle();
  if (!p) notFound();
  const { data: docs } = await sb.from('documents').select('id,name,category,path,size,uploaded_at').eq('project_id', p.id).order('uploaded_at', { ascending: false });
  const list: any[] = docs ?? [];
  const { data: urls } = list.length ? await sb.storage.from('documents').createSignedUrls(list.map((d: any) => d.path), 3600) : { data: [] as any[] };
  const url: Record<string, string> = Object.fromEntries((urls ?? []).map((u: any) => [u.path, u.signedUrl]));

  async function remove(f: FormData) {
    'use server';
    const s = createClient();
    const id = String(f.get('id'));
    const { data: d } = await s.from('documents').select('path').eq('id', id).eq('project_id', params.id).maybeSingle();
    if (!d) return;
    await s.storage.from('documents').remove([d.path]);
    await s.from('documents').delete().eq('id', id);
    revalidatePath(`/projects/${params.id}/documents`);
  }

  return (
    <main className="wrap">
      <div className="bar"><Link className="brand" href="/dashboard">MangalPravesh</Link><Link href="/dashboard">All projects</Link></div>
      <h1>{p.name}</h1>
      <ProjectNav base={`/projects/${p.id}`} current="documents" />
      <h2>Documents</h2>
      <p className="muted">Keep land papers, approvals, drawings and bills in one private place. PDF, JPG or PNG, up to 20 MB each.</p>
      <Uploader projectId={p.id} categories={CATS} />
      {list.length === 0 ? <p className="muted">No documents yet.</p> : list.map((d: any) => (
        <div className="card" key={d.id}>
          <div>
            {url[d.path] ? <a href={url[d.path]} target="_blank" rel="noopener noreferrer"><b>{d.name}</b></a> : <b>{d.name}</b>}
            <small>{d.category}, {new Date(d.uploaded_at).toLocaleDateString('en-IN')}{d.size ? `, ${(d.size / 1048576).toFixed(1)} MB` : ''}</small>
          </div>
          <form action={remove}><input type="hidden" name="id" value={d.id} /><button className="ghost">Delete</button></form>
        </div>
      ))}
    </main>
  );
}
