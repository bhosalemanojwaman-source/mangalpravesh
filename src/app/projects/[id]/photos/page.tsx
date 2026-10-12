import Link from 'next/link';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import ProjectNav from '../nav';
import PhotoUploader from './uploader';

const PHASES = ['Site clearing', 'Excavation', 'Foundation', 'Columns and beams', 'Slab casting', 'Brickwork', 'Plastering', 'Electrical and plumbing', 'Flooring', 'Painting', 'Finishing', 'Handover'];

export default async function Photos({ params }: { params: { id: string } }) {
  const sb = createClient();
  const { data: p } = await sb.from('projects').select('id,name').eq('id', params.id).maybeSingle();
  if (!p) notFound();
  const { data } = await sb.from('site_photos').select('id,path,phase,taken_on,caption').eq('project_id', p.id).order('taken_on', { ascending: false }).order('created_at', { ascending: false });
  const list: any[] = data ?? [];
  const { data: urls } = list.length ? await sb.storage.from('documents').createSignedUrls(list.map((x: any) => x.path), 3600) : { data: [] as any[] };
  const url: Record<string, string> = Object.fromEntries((urls ?? []).map((u: any) => [u.path, u.signedUrl]));

  async function remove(f: FormData) {
    'use server';
    const s = createClient();
    const id = String(f.get('id'));
    const { data: d } = await s.from('site_photos').select('path').eq('id', id).eq('project_id', params.id).maybeSingle();
    if (!d) return;
    await s.storage.from('documents').remove([d.path]);
    await s.from('site_photos').delete().eq('id', id);
    revalidatePath(`/projects/${params.id}/photos`);
  }

  return (
    <main className="wrap">
      <div className="bar"><Link className="brand" href="/dashboard">MangalPravesh</Link><Link href="/dashboard">All projects</Link></div>
      <h1>{p.name}</h1>
      <ProjectNav base={`/projects/${p.id}`} current="photos" />
      <h2>Site progress timeline</h2>
      <p className="muted">Add photos tagged by construction phase. Together they become a dated record of the build.</p>
      <PhotoUploader projectId={p.id} phases={PHASES} />
      {list.length === 0 ? <p className="muted">No photos yet.</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12, marginTop: 12 }}>
          {list.map((x: any) => (
            <figure key={x.id} style={{ margin: 0, background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
              {url[x.path] ? <a href={url[x.path]} target="_blank" rel="noopener noreferrer"><img src={url[x.path]} alt={x.caption || x.phase} style={{ width: '100%', height: 150, objectFit: 'cover', display: 'block' }} /></a> : null}
              <figcaption style={{ padding: '8px 10px', fontSize: '.9rem' }}>
                <b>{x.phase}</b><br />
                <span className="muted">{new Date(x.taken_on).toLocaleDateString('en-IN')}{x.caption ? `, ${x.caption}` : ''}</span>
                <form action={remove} style={{ marginTop: 6 }}><input type="hidden" name="id" value={x.id} /><button className="ghost">Delete</button></form>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </main>
  );
}
