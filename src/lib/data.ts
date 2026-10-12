export const STATUS = ['Not started', 'In progress', 'Clear', 'Review needed', 'High risk'];
export const STAGES = ['Land', 'Approvals', 'Foundation', 'Structure', 'Plumbing and electrical', 'Plaster and finishing', 'Interiors', 'Contingency'];
export const LAND: [string, string, string][] = [
  ['title', 'Title deeds and ownership history', 'Trace ownership back about 30 years. A lawyer should confirm the chain.'],
  ['thandaper', 'Thandaper and Basic Tax Register match the seller', 'Owner, area and survey number should match.'],
  ['certs', 'Possession and location certificates', 'Issued through the village office.'],
  ['tax', 'Land tax paid up to date', 'Ask for the latest receipt.'],
  ['ec', 'Encumbrance certificate is clean', 'Shows loans, mortgages or charges.'],
  ['court', 'Court and litigation search done', 'Search by seller name and by plot. An open case is a red flag.'],
  ['paddy', 'Not listed as paddy land or wetland', 'Kerala restricts building on such land.'],
  ['crz', 'Coastal, river and other limits checked', 'Applies near the coast, rivers and canals.'],
  ['zoning', 'Road access and local body rules allow your house', 'Check setbacks, road width and permitted use.'],
  ['survey', 'Boundary survey matches the documents', 'Measure on site and compare with the plan.'],
];
export const AP: [string, string, string][] = [
  ['permit', 'Building permit from the local body', 'Panchayat, Municipality or Corporation, as applicable'],
  ['start', 'Commencement certificate', 'Confirm whether your local body requires one'],
  ['water', 'Water connection', 'Water authority, or well and borewell approval'],
  ['power', 'Electricity connection', 'Temporary first, permanent after completion. Note the validity date.'],
  ['drain', 'Drainage and sewage approval', 'Where required'],
  ['noc', 'Other NOCs', 'Fire, airport height or heritage limits, if they apply'],
  ['completion', 'Completion certificate', 'Needed before you occupy'],
  ['number', 'Building number and tax assessment', 'From the local body after completion'],
];
export const APS = ['Not started', 'Applied', 'Approved'];
export const QUAL = ['Basic', 'Premium', 'Luxury'];
export const SEED: Record<string, number> = { 'Foundation': 14, 'Structure': 30, 'Plumbing and electrical': 12, 'Plaster and finishing': 24, 'Interiors': 10, 'Contingency': 10 };
// name, unit, quantity per sq ft, rate key, default rate. Rough defaults: an engineer must confirm them.
export const QTY: [string, string, number, string, number][] = [
  ['Cement', 'bags', 0.4, 'cement', 400],
  ['Steel', 'kg', 4, 'steel', 65],
  ['Sand', 'cu ft', 1.2, 'sand', 60],
  ['Aggregate', 'cu ft', 1.35, 'agg', 45],
  ['Blocks', 'nos', 8, 'block', 14],
];
export const FIN: Record<string, number> = { Basic: 900, Premium: 1500, Luxury: 2600 };
export const LABOUR = 450;
export const RATE_KEYS = ['cement', 'steel', 'sand', 'agg', 'block', 'labour', 'Basic', 'Premium', 'Luxury'];
export function readRates(get: (k: string) => string | null | undefined) {
  const o: Record<string, number> = {};
  for (const k of RATE_KEYS) { const v = Number(get('r_' + k)); if (v > 0) o[k] = v; }
  return o;
}
export function calc(area: number, q: string, rates: Record<string, number>) {
  const rows = QTY.map(([n, u, c, k, d]) => { const qty = area * c; const r = rates[k] ?? d; return { n, u, qty, r, k, cost: qty * r }; });
  const lab = rates.labour ?? LABOUR;
  const fin = rates[q] ?? FIN[q] ?? FIN.Premium;
  const total = rows.reduce((s, x) => s + x.cost, 0) + area * lab + area * fin;
  return { rows, lab, fin, total };
}
export const inr = (n: number) => '\u20B9' + Math.round(n).toLocaleString('en-IN');
