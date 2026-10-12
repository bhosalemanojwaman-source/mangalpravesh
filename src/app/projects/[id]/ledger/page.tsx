import Link from 'next/link';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { inr } from '@/lib/data';
import ProjectNav from '../nav';

const KINDS = ['Bill', 'Payment', 'Advance'];

export default async function Ledger({ params }: { params: { id: string } }) {
  const sb = createClient();
  const { data: p } = await sb.from('projects').select('id,name').eq('id', params.id).maybeSingle();
  if (!p) notFound();
  const { data: le } = await sb.from('ledger_entries').select('*').eq('project_id', p.id).order('entry_date', { ascending: false }).order('created_at', { ascending: false });
  const { data: la } = await sb.from('labour_entries').select('*').eq('project_id', p.id).order('work_date', { ascending: false }).order('created_at', { ascending: false });
  const entries: any[] = le ?? [];
  const labour: any[] = la ?? [];
  const bal: Record<string, number> = {};
  entries.forEach((e: any) => { bal[e.party] = (bal[e.party] ?? 0) + (e.kind === 'Bill' ? 1 : -1) * Number(e.amount); });
  const wages = labour.reduce((s: number, x: any) => s + x.workers * Number(x.daily_wage), 0);
  const path = `/projects/${params.id}/ledger`;

  async function addEntry(f: FormData) {
    'use server';
    const party = String(f.get('party') || '').trim();
    const kind = String(f.get('kind'));
    const amount = Number(f.get('amount'));
    if (!party || !KINDS.includes(kind) || !(amount > 0)) return;
    await createClient().from('ledger_entries').insert({ project_id: params.id, party, kind, amount, entry_date: String(f.get('d') || '') || undefined, note: String(f.get('note') || '').trim() || null });
    revalidatePath(path);
  }
  async function addLabour(f: FormData) {
    'use server';
    const gang = String(f.get('gang') || '').trim();
    const workers = Math.floor(Number(f.get('workers')));
    const wage = Number(f.get('wage'));
    if (!gang || !(workers > 0) || !(wage > 0)) return;
    await createClient().from('labour_entries').insert({ project_id: params.id, gang, workers, daily_wage: wage, work_date: String(f.get('d') || '') || undefined, note: String(f.get('note') || '').trim() || null });
    revalidatePath(path);
  }
  async function del(f: FormData) {
    'use server';
    const t = String(f.get('t')) === 'labour' ? 'labour_entries' : 'ledger_entries';
    await createClient().from(t).delete().eq('id', String(f.get('id'))).eq('project_id', params.id);
    revalidatePath(path);
  }
  const today = new Date().toISOString().slice(0, 10);
  const parties = Object.keys(bal).sort();

  return (
    <main className="wrap">
      <div className="bar"><Link className="brand" href="/dashboard">MangalPravesh</Link><Link href="/dashboard">All projects</Link></div>
      <h1>{p.name}</h1>
      <ProjectNav base={`/projects/${p.id}`} current="ledger" />
      <h2>Vendor and contractor ledger</h2>
      <p className="muted">Record bills, payments and advances for each vendor or contractor to see what you still owe. To count a payment against your budget, also add it in the Money tab.</p>
      <form action={addEntry} className="row" style={{ margin: '12px 0' }}>
        <input name="party" placeholder="Vendor or contractor" required />
        <select name="kind" aria-label="Type">{KINDS.map((k) => <option key={k}>{k}</option>)}</select>
        <input name="amount" type="number" min="1" step="any" placeholder="Amount (INR)" required />
        <input name="d" type="date" defaultValue={today} aria-label="Date" />
        <input name="note" placeholder="Note (optional)" />
        <button>Add</button>
      </form>
      {parties.length > 0 && (
        <table style={{ marginBottom: 16 }}>
          <thead><tr><th>Vendor or contractor</th><th className="n">Balance</th></tr></thead>
          <tbody>{parties.map((n) => <tr key={n}><td>{n}</td><td className="n">{bal[n] > 0 ? `You owe ${inr(bal[n])}` : bal[n] < 0 ? `Paid ahead ${inr(-bal[n])}` : 'Settled'}</td></tr>)}</tbody>
        </table>
      )}
      {entries.length === 0 ? <p className="muted">No entries yet.</p> : (
        <table>
          <thead><tr><th>Date</th><th>Name</th><th>Type</th><th className="n">Amount</th><th></th></tr></thead>
          <tbody>{entries.map((e: any) => (
            <tr key={e.id}><td>{e.entry_date}</td><td>{e.party}{e.note ? <small className="muted"> {e.note}</small> : null}</td><td>{e.kind}</td><td className="n">{inr(Number(e.amount))}</td>
              <td><form action={del}><input type="hidden" name="t" value="ledger" /><input type="hidden" name="id" value={e.id} /><button className="ghost">Delete</button></form></td></tr>
          ))}</tbody>
        </table>
      )}
      <h2 style={{ marginTop: 32 }}>Labour</h2>
      <p className="muted">Log the number of workers and the daily wage for each day. Total wages recorded: <b>{inr(wages)}</b>.</p>
      <form action={addLabour} className="row" style={{ margin: '12px 0' }}>
        <input name="gang" placeholder="Gang or contractor" required />
        <input name="workers" type="number" min="1" step="1" placeholder="Workers" required style={{ width: 100 }} />
        <input name="wage" type="number" min="1" step="any" placeholder="Daily wage (INR)" required />
        <input name="d" type="date" defaultValue={today} aria-label="Date" />
        <input name="note" placeholder="Work done (optional)" />
        <button>Add</button>
      </form>
      {labour.length === 0 ? <p className="muted">No labour entries yet.</p> : (
        <table>
          <thead><tr><th>Date</th><th>Gang</th><th className="n">Workers</th><th className="n">Wages</th><th></th></tr></thead>
          <tbody>{labour.map((x: any) => (
            <tr key={x.id}><td>{x.work_date}</td><td>{x.gang}{x.note ? <small className="muted"> {x.note}</small> : null}</td><td className="n">{x.workers}</td><td className="n">{inr(x.workers * Number(x.daily_wage))}</td>
              <td><form action={del}><input type="hidden" name="t" value="labour" /><input type="hidden" name="id" value={x.id} /><button className="ghost">Delete</button></form></td></tr>
          ))}</tbody>
        </table>
      )}
    </main>
  );
}
