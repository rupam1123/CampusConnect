import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, ArrowRight, ShieldCheck } from 'lucide-react';
import { API_BASE, readJson } from '../lib/api';

export default function HostedLogin({ admin = false }) {
  const [context, setContext] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState('Student');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    fetch(`${API_BASE}/api/auth/context`).then(readJson).then(data => { if (active) setContext(data); }).catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, []);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      if (admin) {
        const data = await fetch(`${API_BASE}/api/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).then(readJson);
        localStorage.setItem('adminToken', data.token);
        navigate('/admin-dashboard');
      } else {
        const data = context.user ? context : await fetch(`${API_BASE}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role, name, username }) }).then(readJson);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/courses');
      }
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-slate-50 flex items-center justify-center p-5">
    <section className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-xl p-8 sm:p-12">
      <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white grid place-items-center mb-6"><GraduationCap size={32}/></div>
      <p className="text-sm font-bold text-indigo-600 mb-2">CampusConnect · Rupam</p>
      <h1 className="text-3xl font-extrabold text-slate-900 mb-3">{admin ? 'Administrator access' : context?.user ? 'Welcome back' : 'Your campus, connected.'}</h1>
      <p className="text-slate-500 mb-7">Courses, class discussions, feedback, projects and your campus community in one place.</p>
      {error && <p role="alert" className="rounded-xl bg-red-50 text-red-700 p-3 mb-5">{error}</p>}
      {!context && !error && <p role="status">Checking your session…</p>}
      {context && !context.signedIn && <><a className="flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-5 py-4" href={`/signin-with-chatgpt?return_to=${encodeURIComponent(admin ? '/admin-login' : '/login')}`} target="_top">Continue with ChatGPT <ArrowRight size={18}/></a><p className="mt-4 text-sm text-slate-500">Sign in using a ChatGPT account with a Gmail address. Your email is verified securely during sign-in.</p></>}
      {context?.signedIn && <form onSubmit={submit} className="space-y-4">
        <p className="flex gap-2 items-center text-sm bg-emerald-50 text-emerald-800 p-3 rounded-xl"><ShieldCheck size={18}/>{context.email}</p>
        {admin && !context.isOwner ? <p className="text-red-700">Only Rupam’s administrator account can access this page.</p> : <>
          {!admin && !context.user && <>
            <label className="block font-semibold text-slate-700">Full name<input required maxLength={100} value={name} onChange={e => setName(e.target.value)} className="block w-full mt-1 border rounded-xl p-3" autoComplete="name"/></label>
            <label className="block font-semibold text-slate-700" htmlFor="join-role">Join as</label><select id="join-role" aria-label="Join as" value={role} onChange={e => setRole(e.target.value)} className="block w-full mt-1 border rounded-xl p-3"><option>Student</option><option>Professor</option></select>
            {role === 'Student' ? <label className="block font-semibold text-slate-700">Username<input required pattern="[a-zA-Z0-9_]{3,30}" title="3–30 letters, numbers or underscores" value={username} onChange={e => setUsername(e.target.value)} className="block w-full mt-1 border rounded-xl p-3" autoComplete="username"/></label> : <p className="text-sm text-slate-500">Professor accounts need approval from Rupam before registration.</p>}
          </>}
          <button disabled={busy} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl py-3 font-bold">{busy ? 'Please wait…' : admin ? 'Open admin dashboard' : context.user ? 'Open my workspace' : 'Create my account'}</button>
        </>}
        <a href="/signout-with-chatgpt?return_to=/login" target="_top" className="block text-center text-sm text-slate-500 underline">Use a different account</a>
      </form>}
      <div className="mt-7 pt-5 border-t text-sm text-slate-500 flex justify-between"><span>Created by Rupam</span><Link className="text-indigo-600" to={admin ? '/login' : '/admin-login'}>{admin ? 'Student / Professor' : 'Admin'}</Link></div>
    </section>
  </main>;
}
