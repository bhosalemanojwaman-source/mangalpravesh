import Link from 'next/link';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { LAND, STATUS, STAGES, inr } from '@/lib/data';

export default async function Project({ params }: { params: { id: string } }) {
  const sb = createClient();
  const { data: p } = await sb.from('projects').select('id,name,state').eq('id', params.id).maybeSingle();
  if (!p) notFound();
  const { data: checks } = await sb.from('land_checks').select('item_key,status').eq('project_id', p.id);
  const { data: exps } = await sb.from('expenses').select('id,stage,vendor,amount,paid_on').eq('project_id', p.id).order('paid_on', { ascending: false }).limit(50);
  const st: Record<string, string> = Object.fromEntries((checks ?? []).map((c: any) => [c.item_key, c.status]));
  const clear = LAND.filter(([k]) => st[k] === 'Clear').length;
  const risk = LAND.some(([k]) => st[k] === 'High risk') ? 'High risk' : LAND.some(([k]) => st[k] === 'Review needed') ? 'Review required' : clear === LAND.length ? 'Clear to proceed' : 'In progress';
  const total = (exps ?? []).reduce((s: number, e: any) => s + Number(e.amount), 0);

  async function setStatus(f: FormData) {
    'use server';
    const s = String(f.get('s'));
    if (!STATUS.includes(s)) return;
    await createClient().from('land_checks').upsert({ project_id: params.id, item_key: String(f.get('k')), status: s });
    revalidatePath(`/projects/${params.id}`);
  }
  async function addExpense(f: FormData) {
    'use server';
    const amount = Number(f.get('amount'));
    const stage = String(f.get('stage'));
    if (!(amount > 0) || !STAGES.includes(stage)) return;
    await createClient().from('expenses').insert({ project_id: params.id, stage, vendor: String(f.get('vendor') || '').trim() || null, amount });
    revalidatePath(`/projects/${params.id}`);
  }

  return (
    <main className="wrap">
      <div className="bar"><Link className="brand" href="/dashboard">MangalPravesh</Link><Link href="/dashboard">All projects</Link></div>
      <h1>{p.name}</h1>
      <h2>Land check: {risk}</h2>
      <p className="muted">{clear} of {LAND.length} items clear. Rules vary by plot, so have a property lawyer review the documents.</p>
      {LAND.map(([k, title, hint]) => (
        <div className="card" key={k}>
          <div><b>{title}</b><small>{hint}</small></div>
          <form action={setStatus} className="row">
            <input type="hidden" name="k" value={k} />
            <select name="s" defaultValue={st[k] ?? STATUS[0]} aria-label={title}>{STATUS.map((s) => <option key={s}>{s}</option>)}</select>
            <button className="ghost">Save</button>
          </form>
        </div>
      ))}
      <h2 style={{ marginTop: 32 }}>Money: {inr(total)} spent</h2>
      <form action={addExpense} className="row" style={{ margin: '12px 0' }}>
        <select name="stage" defaultValue="Foundation">{STAGES.map((s) => <option key={s}>{s}</option>)}</select>
        <input name="vendor" placeholder="Paid to" />
        <input name="amount" type="number" min="1" step="any" placeholder="Amount (INR)" required />
        <button>Add payment</button>
      </form>
      {(exps ?? []).length === 0 ? <p className="muted">No payments yet.</p> : (
        <table>
          <thead><tr><th>Date</th><th>Stage</th><th>Paid to</th><th className="n">Amount</th></tr></thead>
          <tbody>{(exps ?? []).map((e: any) => <tr key={e.id}><td>{e.paid_on}</td><td>{e.stage}</td><td>{e.vendor ?? '-'}</td><td className="n">{inr(Number(e.amount))}</td></tr>)}</tbody>
        </table>
      )}
    </main>
  );
}
