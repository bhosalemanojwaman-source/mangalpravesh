'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function Uploader({ projectId, categories }: { projectId: string; categories: string[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg('');
    const form = e.currentTarget;
    const f = new FormData(form);
    const file = f.get('file') as File;
    if (!file || !file.size) { setMsg('Choose a file first.'); return; }
    if (file.size > 20 * 1024 * 1024) { setMsg('The file is larger than 20 MB.'); return; }
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) { setMsg('Only PDF, JPG or PNG files are allowed.'); return; }
    setBusy(true);
    const sb = createClient();
    const path = `${projectId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const up = await sb.storage.from('documents').upload(path, file, { contentType: file.type });
    if (up.error) { setMsg(up.error.message); setBusy(false); return; }
    const ins = await sb.from('documents').insert({ project_id: projectId, name: file.name, category: String(f.get('category')), path, size: file.size });
    if (ins.error) { await sb.storage.from('documents').remove([path]); setMsg(ins.error.message); setBusy(false); return; }
    form.reset();
    setBusy(false);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="row" style={{ margin: '12px 0' }}>
      <select name="category" aria-label="Category">{categories.map((c) => <option key={c}>{c}</option>)}</select>
      <input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" aria-label="File" />
      <button disabled={busy}>{busy ? 'Uploading...' : 'Upload'}</button>
      <span className="err" role="alert">{msg}</span>
    </form>
  );
}
