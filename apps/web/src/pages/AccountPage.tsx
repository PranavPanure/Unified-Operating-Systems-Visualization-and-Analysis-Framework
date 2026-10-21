import { useState } from 'react';
import { LogIn, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../app/AuthState';
import { SectionHeader } from '../components/SectionHeader';

export function AccountPage() {
  const { user, checking, apiAvailable, error, signIn, signUp, signOut } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setFormError(null);
    try { if (mode === 'login') await signIn(email, password); else await signUp(email, password, displayName); } catch (reason) { setFormError(reason instanceof Error ? reason.message : 'Could not complete the request'); } finally { setBusy(false); }
  };

  if (checking) return <div className="empty-page"><span className="eyebrow">ACCOUNT / CHECKING SESSION</span><h1>Looking for your workspace…</h1></div>;
  if (user) return <div className="page-stack"><SectionHeader eyebrow="ACCOUNT / SYNCED WORKSPACE" title={`Welcome back, ${user.display_name}.`} description="Your account session is active. Guest progress was merged and future changes sync to the server automatically." /><section className="panel account-card"><div className="account-identity"><span className="account-avatar"><UserRound size={24} /></span><div><span className="eyebrow">SIGNED IN AS</span><h2>{user.email}</h2><p>{user.display_name} · server session active</p></div></div><div className="account-actions"><Link to="/dashboard" className="button button-primary">Return to workspace</Link><button className="button button-secondary" onClick={() => void signOut()}><LogOut size={16} /> Sign out</button></div></section></div>;

  return <div className="page-stack"><SectionHeader eyebrow="ACCOUNT / OPTIONAL SYNC" title="Keep your OS progress with you." description="Explore as a guest or create an account when you want server-backed identity. Your local learning loop stays available even if the API is offline." /><div className="auth-grid"><section className="panel auth-card"><div className="auth-status"><span className={`status-dot ${apiAvailable === false ? 'offline' : 'online'}`} /><span>{apiAvailable === false ? 'API offline · guest mode available' : 'Account service ready'}</span></div><div className="auth-tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setFormError(null); }}>Sign in</button><button className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setFormError(null); }}>Create account</button></div><form className="auth-form" onSubmit={submit}>{mode === 'register' && <label><span>Display name</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name" required /></label>}<label><span>Email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></label><label><span>Password</span><input type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" required /></label>{(error || formError) && <p className="auth-error">{formError ?? error}</p>}<button className="button button-primary" type="submit" disabled={busy}>{mode === 'login' ? <LogIn size={16} /> : <UserRound size={16} />}{busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}</button></form></section><section className="panel account-benefits"><ShieldCheck size={24} /><h2>What changes with an account?</h2><p>Authentication and progress syncing are active. Notes, bookmarks, lesson completion, and practice attempts follow the account session.</p><div><strong>Already learning locally?</strong><span>Keep using the dashboard, terminal, visualizers, and practice without signing in.</span></div></section></div></div>;
}
