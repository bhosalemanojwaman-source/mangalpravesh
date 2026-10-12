import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { LAND, STATUS, STAGES, AP, APS, QUAL, SEED, QTY, FIN, LABOUR, RATE_KEYS, readRates, calc, inr } from '@/lib/data';

const TABS: [string, string][] = [['land', 'Land check'], ['ap', 'Approvals'], ['est', 'Estimator'], ['money', 'Money']];

export default async function Project({ params, searchParams }: { params: { id: string }; searchParams: Record<string, string | undefined> }) {
  const sb = createClient();
  const { data: p } = await sb.from('projects').select('id,name,state').eq('id', params.id).maybeSingle();
  if (!p) notFound();
  const tab = TABS.some(([k]) => k === searchParams.tab) ? (searchParams.tab as string) : 'land';
  const base = `/projects/${p.id}`;
  const refresh = () => revalidatePath(base);

  async function setStatus(f: FormData) {
    'use server';
    const s = String(f.get('s'));
    if (!STATUS.includes(s)) return;
    await createClient().from('land_checks').upsert({ project_id: params.id, item_key: String(f.get('k')), status: s });
    revalidatePath(`/projects/${params.id}`);
  }
  async function saveAp(f: FormData) {
    'use server';
    const s = String(f.get('s'));
    if (!APS.includes(s)) return;
    await createClient().from('approval_steps').upsert({
      project_id: params.id, step_key: String(f.get('k')), status: s,
      reference: String(f.get('r') || '').trim() || null, valid_till: String(f.get('v') || '') || null,
    });
    revalidatePath(`/projects/${params.id}`);
  }
  async function saveBudget(f: FormData) {
    'use server';
    const rows = STAGES.map((stage, i) => ({ project_id: params.id, stage, amount: Math.max(0, Number(f.get('b' + i)) || 0) }));
    await createClient().from('budget_lines').upsert(rows);
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
  async function seed(f: FormData) {
    'use server';
    const q = QUAL.includes(String(f.get('q'))) ? String(f.get('q')) : 'Premium';
    const { total } = calc(Math.max(0, Number(f.get('area')) || 0), q, readRates((k) => f.get(k) as string | null));
    const rows = Object.entries(SEED).map(([stage, pct]) => ({ project_id: params.id, stage, amount: Math.round((total * pct) / 100) }));
    await createClient().from('budget_lines').upsert(rows);
    redirect(`/projects/${params.id}?tab=money`);
  }

  let body: React.ReactNode = null;

  if (tab === 'land') {
    const { data: checks } = await sb.from('land_checks').select('item_key,status').eq('project_id', p.id);
    const st: Record<string, string> = Object.fromEntries((checks ?? []).map((c: any) => [c.item_key, c.status]));
    const clear = LAND.filter(([k]) => st[k] === 'Clear').length;
    const risk = LAND.some(([k]) => st[k] === 'High risk') ? 'High risk' : LAND.some(([k]) => st[k] === 'Review needed') ? 'Review required' : clear === LAND.length ? 'Clear to proceed' : 'In progress';
    body = (<>
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
    </>);
  }

  if (tab === 'ap') {
    const { data: steps } = await sb.from('approval_steps').select('step_key,status,reference,valid_till').eq('project_id', p.id);
    const m: Record<string, any> = Object.fromEntries((steps ?? []).map((s: any) => [s.step_key, s]));
    body = (<>
      <h2>Approvals</h2>
      <p className="muted">Record the status, reference number and validity date of each permission. Dates close to expiry are flagged.</p>
      {AP.map(([k, title, hint]) => {
        const d = m[k] ?? {};
        const days = d.valid_till ? Math.ceil((new Date(d.valid_till).getTime() - Date.now()) / 864e5) : null;
        const flag = days === null ? '' : days < 0 ? 'Expired' : days <= 30 ? `Expires in ${days} days` : '';
        return (
          <div className="card" key={k}>
            <div style={{ flex: '1 1 260px' }}><b>{title}</b>{flag && <b className="err"> ({flag})</b>}<small>{hint}</small></div>
            <form action={saveAp} className="row">
              <input type="hidden" name="k" value={k} />
              <select name="s" defaultValue={d.status ?? APS[0]} aria-label={`${title} status`}>{APS.map((s) => <option key={s}>{s}</option>)}</select>
              <input name="r" placeholder="Reference no." defaultValue={d.reference ?? ''} aria-label="Reference number" />
              <input name="v" type="date" defaultValue={d.valid_till ?? ''} aria-label="Valid till" />
              <button className="ghost">Save</button>
            </form>
          </div>
        );
      })}
    </>);
  }

  if (tab === 'est') {
    const area = Math.max(0, Number(searchParams.area ?? 1500) || 0);
    const q = QUAL.includes(searchParams.q ?? '') ? (searchParams.q as string) : 'Premium';
    const rates = readRates((k) => searchParams[k]);
    const c = calc(area, q, rates);
    const rateInput = (k: string, v: number) => <input name={'r_' + k} type="number" min="0" step="any" defaultValue={v} style={{ width: 90 }} aria-label={`Rate ${k}`} />;
    body = (<>
      <h2>Cost estimator</h2>
      <p className="muted">A quick estimate from built-up area. The quantity rules and rates are rough defaults. Change the rates to local prices, and have an engineer confirm the result before you rely on it.</p>
      <form method="get" className="row" style={{ marginBottom: 14 }}>
        <input type="hidden" name="tab" value="est" />
        <label>Built-up area, all floors (sq ft)<br /><input name="area" type="number" min="1" defaultValue={area} /></label>
        <label>Finishing<br /><select name="q" defaultValue={q}>{QUAL.map((x) => <option key={x}>{x}</option>)}</select></label>
        <table style={{ marginTop: 10 }}>
          <thead><tr><th>Item</th><th className="n">Quantity</th><th className="n">Rate</th><th className="n">Cost</th></tr></thead>
          <tbody>
            {c.rows.map((x) => <tr key={x.k}><td>{x.n}</td><td className="n">{Math.round(x.qty).toLocaleString('en-IN')} {x.u}</td><td className="n">{rateInput(x.k, x.r)}</td><td className="n">{inr(x.cost)}</td></tr>)}
            <tr><td>Labour (per sq ft)</td><td className="n">{area.toLocaleString('en-IN')} sq ft</td><td className="n">{rateInput('labour', c.lab)}</td><td className="n">{inr(area * c.lab)}</td></tr>
            <tr><td>{q} finishing (per sq ft)</td><td className="n">{area.toLocaleString('en-IN')} sq ft</td><td className="n">{rateInput(q, c.fin)}</td><td className="n">{inr(area * c.fin)}</td></tr>
            <tr><td colSpan={3}><b>Estimated total</b></td><td className="n"><b>{inr(c.total)}</b></td></tr>
          </tbody>
        </table>
        <button className="ghost">Recalculate</button>
      </form>
      <form action={seed}>
        <input type="hidden" name="area" value={area} />
        <input type="hidden" name="q" value={q} />
        {c.rows.map((x) => <input key={x.k} type="hidden" name={'r_' + x.k} value={x.r} />)}
        <input type="hidden" name="r_labour" value={c.lab} />
        <input type="hidden" name={'r_' + q} value={c.fin} />
        <button>Use as my budget</button>
        <p className="muted">This fills the construction stages of your budget in the Money tab, replacing amounts you set there. Land and approvals stay yours to enter.</p>
      </form>
    </>);
  }

  if (tab === 'money') {
    const { data: bl } = await sb.from('budget_lines').select('stage,amount').eq('project_id', p.id);
    const { data: exps } = await sb.from('expenses').select('id,stage,vendor,amount,paid_on').eq('project_id', p.id).order('paid_on', { ascending: false }).limit(50);
    const { data: all } = await sb.from('expenses').select('stage,amount').eq('project_id', p.id);
    const bud: Record<string, number> = Object.fromEntries((bl ?? []).map((b: any) => [b.stage, Number(b.amount)]));
    const sp: Record<string, number> = {};
    (all ?? []).forEach((e: any) => { sp[e.stage] = (sp[e.stage] ?? 0) + Number(e.amount); });
    const tb = STAGES.reduce((s, g) => s + (bud[g] ?? 0), 0);
    const ts = STAGES.reduce((s, g) => s + (sp[g] ?? 0), 0);
    const over = STAGES.filter((g) => (sp[g] ?? 0) > (bud[g] ?? 0) && (sp[g] ?? 0) > 0);
    body = (<>
      <h2>Budget and spending</h2>
      {over.length > 0 && <p className="err" role="alert">Over budget: {over.join(', ')}.</p>}
      <form action={saveBudget}>
        <table>
          <thead><tr><th>Stage</th><th className="n">Budget</th><th className="n">Spent</th><th>Used</th><th className="n">Left</th></tr></thead>
          <tbody>
            {STAGES.map((g, i) => {
              const b = bud[g] ?? 0, s = sp[g] ?? 0, pct = b ? (s / b) * 100 : s ? 100 : 0;
              return (
                <tr key={g}>
                  <td>{g}</td>
                  <td className="n"><input name={'b' + i} type="number" min="0" step="any" defaultValue={b} style={{ width: 110, textAlign: 'right' }} aria-label={`Budget for ${g}`} /></td>
                  <td className="n">{inr(s)}</td>
                  <td><div style={{ background: 'var(--line)', height: 8, borderRadius: 6, overflow: 'hidden', minWidth: 70 }}><i style={{ display: 'block', height: '100%', width: `${Math.min(pct, 100)}%`, background: pct > 100 ? 'var(--bad)' : pct >= 90 ? '#B7791F' : '#2F7A4F' }} /></div></td>
                  <td className={'n' + (b - s < 0 ? ' err' : '')}>{b - s < 0 ? `Over by ${inr(s - b)}` : inr(b - s)}</td>
                </tr>
              );
            })}
            <tr><td><b>Total</b></td><td className="n"><b>{inr(tb)}</b></td><td className="n"><b>{inr(ts)}</b></td><td></td><td className={'n' + (tb - ts < 0 ? ' err' : '')}><b>{inr(tb - ts)}</b></td></tr>
          </tbody>
        </table>
        <button style={{ marginTop: 12 }}>Save budget</button>
      </form>
      <h2 style={{ marginTop: 32 }}>Payments</h2>
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
    </>);
  }

  return (
    <main className="wrap">
      <div className="bar"><Link className="brand" href="/dashboard">MangalPravesh</Link><Link href="/dashboard">All projects</Link></div>
      <h1>{p.name}</h1>
      <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0 20px' }}>
        {TABS.map(([k, label]) => (
          <Link key={k} href={`${base}?tab=${k}`} className={k === tab ? 'btn' : 'btn ghost'} style={k === tab ? undefined : { background: 'transparent', border: '1.5px solid var(--line)', color: 'var(--ink)', padding: '6px 14px' }}>{label}</Link>
        ))}
      </nav>
      {body}
    </main>
  );
}
