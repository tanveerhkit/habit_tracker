'use client';

import { FormEvent, useState } from 'react';
import { ArrowRight, Check, LockKeyhole, Mail, Moon, Sparkles, UserRound } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/auth/${mode === 'login' ? 'login' : 'register'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Something went wrong.');
      window.location.reload();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode((current) => current === 'login' ? 'register' : 'login');
    setError('');
  };

  return (
    <main className="app-shell page-grid min-h-screen px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-5xl flex-col justify-between">
        <header className="flex items-center justify-between"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-foreground text-background"><Sparkles size={17} /></span><span className="font-display text-lg font-semibold tracking-tight text-ink">Habitly</span></div><ThemeToggle /></header>
        <div className="grid items-center gap-12 py-16 lg:grid-cols-[1fr_420px] lg:gap-20">
          <section className="max-w-xl"><p className="mb-4 text-xs font-semibold uppercase tracking-[.22em] text-accent">A calmer way to be consistent</p><h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-[-.05em] text-ink sm:text-7xl">Make room for the habits that matter<span className="text-accent">.</span></h1><p className="mt-6 max-w-md text-base leading-7 text-muted">A private, focused space for your habits, goals, and attention. Small check-ins, thoughtfully kept.</p><div className="mt-8 grid max-w-md gap-3 sm:grid-cols-3">{['Private by account', 'Simple by design', 'Built for momentum'].map((item) => <div key={item} className="flex items-center gap-2 text-xs font-medium text-muted"><Check size={15} className="text-accent" />{item}</div>)}</div></section>
          <section className="surface p-5 shadow-[0_16px_60px_rgba(30,30,20,.08)] sm:p-7"><div className="mb-7"><p className="text-xs font-semibold uppercase tracking-[.16em] text-muted">{mode === 'login' ? 'Welcome back' : 'Start your space'}</p><h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">{mode === 'login' ? 'Sign in to Habitly' : 'Create your account'}</h2><p className="mt-2 text-sm text-muted">{mode === 'login' ? 'Your progress is waiting for you.' : 'Your habits will be kept separate and private.'}</p></div><form onSubmit={submit} className="space-y-4">{mode === 'register' && <label className="block text-sm font-semibold text-ink">Name<div className="relative mt-2"><UserRound size={16} className="pointer-events-none absolute left-3 top-3 text-muted" /><input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Your name" className="w-full rounded-xl border border-line bg-surface-muted py-2.5 pl-10 pr-3 text-sm font-normal text-ink placeholder:text-muted focus:border-accent focus:outline-none" /></div></label>}<label className="block text-sm font-semibold text-ink">Email<div className="relative mt-2"><Mail size={16} className="pointer-events-none absolute left-3 top-3 text-muted" /><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" placeholder="you@example.com" className="w-full rounded-xl border border-line bg-surface-muted py-2.5 pl-10 pr-3 text-sm font-normal text-ink placeholder:text-muted focus:border-accent focus:outline-none" /></div></label><label className="block text-sm font-semibold text-ink">Password<div className="relative mt-2"><LockKeyhole size={16} className="pointer-events-none absolute left-3 top-3 text-muted" /><input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="At least 8 characters" className="w-full rounded-xl border border-line bg-surface-muted py-2.5 pl-10 pr-3 text-sm font-normal text-ink placeholder:text-muted focus:border-accent focus:outline-none" /></div></label>{error && <p role="alert" className="rounded-xl border border-[#e4c9c5] bg-[#fff8f7] px-3 py-2.5 text-sm text-[#a65f59]">{error}</p>}<button disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background transition hover:bg-accent-strong disabled:opacity-50">{isSubmitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'} {!isSubmitting && <ArrowRight size={16} />}</button></form><div className="mt-6 border-t border-line pt-5 text-center text-sm text-muted">{mode === 'login' ? 'New to Habitly?' : 'Already have an account?'} <button type="button" onClick={switchMode} className="font-semibold text-accent hover:text-accent-strong">{mode === 'login' ? 'Create an account' : 'Sign in instead'}</button></div></section>
        </div>
        <footer className="flex items-center gap-2 text-xs text-muted"><Moon size={13} /> Your data is scoped to your account.</footer>
      </div>
    </main>
  );
}
