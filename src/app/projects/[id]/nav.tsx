import Link from 'next/link';

const ITEMS: [string, string, string][] = [
  ['land', 'Land check', '?tab=land'],
  ['ap', 'Approvals', '?tab=ap'],
  ['est', 'Estimator', '?tab=est'],
  ['money', 'Money', '?tab=money'],
  ['documents', 'Documents', '/documents'],
  ['ledger', 'Ledger', '/ledger'],
];

export default function ProjectNav({ base, current }: { base: string; current: string }) {
  return (
    <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0 20px' }}>
      {ITEMS.map(([k, label, href]) => (
        <Link key={k} href={base + href} className="btn"
          style={k === current ? undefined : { background: 'transparent', border: '1.5px solid var(--line)', color: 'var(--ink)', padding: '6px 14px' }}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
