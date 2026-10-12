import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

async function createWorkspace(f: FormData) {
  'use server';
  const name = String(f.get('name') || '').trim();
  const kind = String(f.get('kind'));
  if (!name || !['homeowner', 'project_manager', 'company'].includes(kind)) return;
  await createClient().rpc('create_workspace', { p_name: name, p_kind: kind });
  revalidatePath('/dashboard');
}

async function createProject(f: FormData) {
  'use server';
  const name = String(f.get('name') || '').trim();
  if (!name) return;
  await createClient().from('projects').insert({ workspace_id: String(f.get('ws')), name });
  revalidatePath('/dashboard');
}

async function signOut() {
  'use server';
  await createClient().auth.signOut();
  redirect('/');
}

export default async function Dashboard() {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/login');
  const { data: ws } = await sb.from('workspaces').select('id,name,kind').limit(1).maybeSingle();
  const { data: projects } = ws
    ? await sb.from('projects').select('id,name,state').order('created_at', { ascending: false })
    : { data: [] as any[] };

  return (
    <main className="wrap">
      <div className="bar">
        <Link className="brand" href="/dashboard">MangalPravesh</Link>
        <form action={signOut}><button className="ghost">Log out</button></form>
      </div>
      {!ws ? (
        <>
          <h1>Set up your workspace</h1>
          <p className="muted">Tell us who you are. You can invite your team later.</p>
          <form action={createWorkspace} className="row">
            <input name="name" placeholder="Your name or company" required />
            <select name="kind" defaultValue="homeowner">
              <option value="homeowner">Homeowner</option>
              <option value="project_manager">Project manager</option>
              <option value="company">Development company</option>
            </select>
            <button>Continue</button>
          </form>
        </>
      ) : (
        <>
          <h1>{ws.name}</h1>
          <form action={createProject} className="row" style={{ margin: '12px 0 20px' }}>
            <input type="hidden" name="ws" value={ws.id} />
            <input name="name" placeholder="New project name" required />
            <button>Add project</button>
          </form>
          {(projects ?? []).length === 0 && <p className="muted">No projects yet. Add your first one above.</p>}
          {(projects ?? []).map((p: any) => (
            <div className="card" key={p.id}>
              <div><b>{p.name}</b><small>{p.state}</small></div>
              <Link className="btn" href={`/projects/${p.id}`}>Open</Link>
            </div>
          ))}
        </>
      )}
    </main>
  );
}
