import Link from 'next/link';

export default function Home() {
  return (
    <main className="wrap">
      <div className="bar"><span className="brand">MangalPravesh</span><Link className="btn" href="/login">Log in</Link></div>
      <h1 style={{ fontSize: 'clamp(2.4rem,7vw,4.4rem)' }}>Plot se Pravesh tak.</h1>
      <p className="muted" style={{ maxWidth: '34em' }}>
        Check the land, track approvals, estimate the cost and follow every rupee, from the first plot visit to the day you walk in.
      </p>
      <Link className="btn" href="/login">Get started</Link>
    </main>
  );
}
