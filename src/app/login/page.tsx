'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg('');
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const email = String(f.get('email'));
    const password = String(f.get('password'));
    const sb = createClient();
    if (mode === 'up') {
      const { error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
      setMsg(error ? error.message : 'Check your email to confirm your account, then log in.');
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) setMsg(error.message);
      else { router.push('/dashboard'); router.refresh(); }
    }
    setBusy(false);
  }

  return (
    <main className="wrap" style={{ maxWidth: 420 }}>
      <h1>{mode === 'in' ? 'Log in' : 'Create your account'}</h1>
      <form onSubmit={submit} style={{ display: 'grid', gap: 10 }}>
        <input name="email" type="email" placeholder="Email" required autoComplete="email" />
        <input name="password" type="password" placeholder="Password (8+ characters)" required minLength={8} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} />
        <button disabled={busy}>{mode === 'in' ? 'Log in' : 'Sign up'}</button>
        <p className="err" role="alert">{msg}</p>
      </form>
      <button className="ghost" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg(''); }}>
        {mode === 'in' ? 'New here? Create an account' : 'Have an account? Log in'}
      </button>
    </main>
  );
}
