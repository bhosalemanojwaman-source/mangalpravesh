'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function PhotoUploader({ projectId, phases }: { projectId: string; phases: string[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg('');
    const form = e.currentTarget;
    const f = new FormData(form);
    const file = f.get('file') as File;
    if (!file || !file.size) { setMsg('Choose a photo first.'); return; }
    if (file.size > 10 * 1024 * 1024) { setMsg('The photo is larger than 10 MB.'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setMsg('Only JPG, PNG or WebP photos are allowed.'); return; }
    setBusy(true);
    const sb = createClient();
    const path = `${projectId}/photos/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const up = await sb.storage.from('documents').upload(path, file, { contentType: file.type });
    if (up.error) { setMsg(up.error.message); setBusy(false); return; }
    const ins = await sb.from('site_photos').insert({
      project_id: projectId, path, phase: String(f.get('phase')),
      taken_on: String(f.get('d') || '') || undefined, caption: String(f.get('caption') || '').trim() || null,
    });
    if (ins.error) { await sb.storage.from('documents').remove([path]); setMsg(ins.error.message); setBusy(false); return; }
    form.reset();
    setBusy(false);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="row" style={{ margin: '12px 0' }}>
      <select name="phase" aria-label="Phase">{phases.map((p) => <option key={p}>{p}</option>)}</select>
      <input name="d" type="date" defaultValue={new Date().toISOString().slice(0, 10)} aria-label="Date taken" />
      <input name="caption" placeholder="Caption (optional)" />
      <input name="file" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Photo" />
      <button disabled={busy}>{busy ? 'Uploading...' : 'Add photo'}</button>
      <span className="err" role="alert">{msg}</span>
    </form>
  );
}
