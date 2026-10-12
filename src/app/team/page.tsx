import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { inr } from '@/lib/data';

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
  await sb.rpc('claim_invites');
  const { data: ws } = await sb.from('workspaces').select('id,name,kind').limit(1).maybeSingle();
  const { data: me } = ws ? await sb.from('members').select('role').eq('workspace_id', ws.id).eq('user_id', user.id).maybeSingle() : { data: null as any };
  const canEdit = me?.role === 'owner' || me?.role === 'member';
  const { data: pr } = ws ? await sb.from('projects').select('id,name,state').order('created_at', { ascending: false }) : { data: [] as any[] };
  const projects: any[] = pr ?? [];
  const ids = projects.map((p: any) => p.id);
  const { data: bl } = ids.length ? await sb.from('budget_lines').select('project_id,stage,amount').in('project_id', ids) : { data: [] as any[] };
  const { data: ex } = ids.length ? await sb.from('expenses').select('project_id,stage,amount').in('project_id', ids) : { data: [] as any[] };
  const { data: lc } = ids.length ? await sb.from('land_checks').select('project_id,status').in('project_id', ids) : { data: [] as any[] };

  const stats = projects.map((p: any) => {
    const bud: Record<string, number> = {}, sp: Record<string, number> = {};
    (bl ?? []).filter((x: any) => x.project_id === p.id).forEach((x: any) => { bud[x.stage] = Number(x.amount); });
    (ex ?? []).filter((x: any) => x.project_id === p.id).forEach((x: any) => { sp[x.stage] = (sp[x.stage] ?? 0) + Number(x.amount); });
    const budget = Object.values(bud).reduce((s, v) => s + v, 0);
    const spent = Object.values(sp).reduce((s, v) => s + v, 0);
    const over = Object.keys(sp).filter((k) => sp[k] > (bud[k] ?? 0)).length;
    const st = (lc ?? []).filter((x: any) => x.project_id === p.id).map((x: any) => x.status);
    const land = st.includes('High risk') ? 'High risk' : st.includes('Review needed') ? 'Review needed' : st.filter((s: string) => s === 'Clear').length + ' of 10 clear';
    return { ...p, budget, spent, over, land, risky: land === 'High risk' };
  });
  const totalB = stats.reduce((s, x) => s + x.budget, 0);
  const totalS = stats.reduce((s, x) => s + x.spent, 0);

  return (
    <main className="wrap">
      <div className="bar">
        <Link className="brand" href="/dashboard">MangalPravesh</Link>
        <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {ws && <Link href="/team">Team</Link>}
          <form action={signOut}><button className="ghost">Log out</button></form>
        </span>
      </div>
      {!ws ? (
        <>
          <h1>Set up your workspace</h1>
          <p className="muted">Tell us who you are. If someone invited you to their team, log in with the invited email and confirm it, then reload this page.</p>
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
          <p className="muted">{projects.length} project{projects.length === 1 ? '' : 's'}. Budget {inr(totalB)}, spent {inr(totalS)}.{me?.role === 'viewer' ? ' You have view-only access.' : ''}</p>
          {canEdit && (
            <form action={createProject} className="row" style={{ margin: '12px 0 20px' }}>
              <input type="hidden" name="ws" value={ws.id} />
              <input name="name" placeholder="New project name" required />
              <button>Add project</button>
            </form>
          )}
          {projects.length === 0 && <p className="muted">No projects yet.</p>}
          {stats.map((p: any) => (
            <div className="card" key={p.id}>
              <div>
                <b>{p.name}</b>
                <small>{p.state}. Budget {inr(p.budget)}, spent {inr(p.spent)}. Land check: <span className={p.risky ? 'err' : ''}>{p.land}</span>.{p.over > 0 && <b className="err"> {p.over} stage{p.over === 1 ? '' : 's'} over budget.</b>}</small>
              </div>
              <Link className="btn" href={`/projects/${p.id}`}>Open</Link>
            </div>
          ))}
        </>
      )}
    </main>
  );
}
