'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Circle, Flag, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { readStored, writeStored } from '@/lib/clientStorage';

type Goal = {
  id: string;
  title: string;
  note: string;
  completed: boolean;
};

const DEFAULT_GOALS: Goal[] = [];

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [filter, setFilter] = useState<'all' | 'open' | 'done'>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');


  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setGoals(readStored<Goal[]>('goals', DEFAULT_GOALS)));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const saveGoals = (nextGoals: Goal[]) => {
    setGoals(nextGoals);
    writeStored('goals', nextGoals);
  };

  const visibleGoals = useMemo(() => goals.filter((goal) => filter === 'all' || (filter === 'done' ? goal.completed : !goal.completed)), [filter, goals]);
  const completedCount = goals.filter((goal) => goal.completed).length;
  const progress = goals.length ? Math.round((completedCount / goals.length) * 100) : 0;

  const resetForm = () => {
    setTitle('');
    setNote('');
    setIsAdding(false);
    setEditing(null);
  };

  const submitGoal = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    if (editing) {
      saveGoals(goals.map((goal) => goal.id === editing.id ? { ...editing, title: title.trim(), note: note.trim() } : goal));
    } else {
      saveGoals([...goals, { id: `goal-${Date.now()}`, title: title.trim(), note: note.trim(), completed: false }]);
    }
    resetForm();
  };

  const startEdit = (goal: Goal) => {
    setEditing(goal);
    setTitle(goal.title);
    setNote(goal.note);
    setIsAdding(true);
  };

  return (
    <div className="app-shell page-grid min-h-screen px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-10 flex items-start justify-between gap-4">
          <div><Link href="/" className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-ink"><ArrowLeft size={16} /> Dashboard</Link><p className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-accent">A bigger picture</p><h1 className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">Goals<span className="text-accent">.</span></h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted">Keep the direction visible. Break large intentions into the next clear step.</p></div>
          <div className="hidden rounded-2xl bg-ink px-5 py-4 text-white sm:block"><p className="text-xs font-semibold uppercase tracking-[.14em] text-white/50">Progress</p><p className="mt-2 font-display text-3xl font-semibold">{progress}%</p><p className="mt-1 text-xs text-white/60">{completedCount} of {goals.length} complete</p></div>
        </header>

        <section className="surface mb-6 p-5 shadow-[0_8px_30px_rgba(30,30,20,.03)] sm:p-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-xl font-semibold text-ink">Your direction</h2><p className="mt-1 text-sm text-muted">One meaningful goal is enough to begin.</p></div><button onClick={() => { resetForm(); setIsAdding(true); }} className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong"><Plus size={16} /> Add goal</button></div><div className="h-2 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} /></div><div className="mt-3 flex items-center justify-between text-xs text-muted"><span>{goals.length ? `${goals.length} goals in view` : 'No goals yet'}</span><span>{progress}% complete</span></div></section>

        {isAdding && <form onSubmit={submitGoal} className="surface mb-6 grid gap-3 p-5 shadow-[0_8px_30px_rgba(30,30,20,.03)] sm:grid-cols-[1fr_1fr_auto] sm:items-end"><label className="text-xs font-semibold uppercase tracking-[.12em] text-muted">Goal<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What matters next?" className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-ink placeholder:text-muted focus:border-accent focus:outline-none" /></label><label className="text-xs font-semibold uppercase tracking-[.12em] text-muted">Note<input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Why it matters" className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-ink placeholder:text-muted focus:border-accent focus:outline-none" /></label><div className="flex gap-2"><button type="button" onClick={resetForm} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-muted hover:bg-surface-muted"><X size={16} /></button><button type="submit" className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-strong">{editing ? 'Save' : 'Add'}</button></div></form>}

        <div className="mb-5 flex items-center gap-1 rounded-xl bg-surface-muted p-1" role="tablist" aria-label="Goal filter">{(['all', 'open', 'done'] as const).map((option) => <button key={option} onClick={() => setFilter(option)} role="tab" aria-selected={filter === option} className={`rounded-lg px-3 py-2 text-xs font-semibold capitalize transition ${filter === option ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`}>{option === 'all' ? 'All goals' : option === 'open' ? 'In progress' : 'Completed'}</button>)}</div>

        {visibleGoals.length ? <div className="grid gap-4 sm:grid-cols-2">{visibleGoals.map((goal) => <article key={goal.id} className={`surface group p-5 shadow-[0_8px_30px_rgba(30,30,20,.03)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_34px_rgba(30,30,20,.07)] ${goal.completed ? 'bg-[#fbfcf9]' : ''}`}><div className="mb-8 flex items-start justify-between gap-3"><button onClick={() => saveGoals(goals.map((item) => item.id === goal.id ? { ...item, completed: !item.completed } : item))} aria-label={`${goal.completed ? 'Mark incomplete' : 'Mark complete'}: ${goal.title}`} className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition ${goal.completed ? 'border-accent bg-accent text-white' : 'border-line text-transparent hover:border-accent hover:bg-accent-soft'}`}>{goal.completed ? <Check size={19} /> : <Circle size={18} />}</button><div className="flex gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100"><button onClick={() => startEdit(goal)} aria-label={`Edit ${goal.title}`} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-muted hover:text-ink"><Pencil size={15} /></button><button onClick={() => saveGoals(goals.filter((item) => item.id !== goal.id))} aria-label={`Delete ${goal.title}`} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-[#fbefed] hover:text-[#b66a63]"><Trash2 size={15} /></button></div></div><p className={`font-display text-xl font-semibold tracking-tight ${goal.completed ? 'text-muted line-through' : 'text-ink'}`}>{goal.title}</p><p className="mt-2 min-h-10 text-sm leading-5 text-muted">{goal.note || 'No note added yet.'}</p><div className="mt-6 flex items-center gap-2 text-xs font-semibold text-accent"><Flag size={14} /> {goal.completed ? 'Completed' : 'In progress'}</div></article>)}</div> : <div className="surface px-6 py-16 text-center"><div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent"><Sparkles size={22} /></div><h2 className="font-display text-xl font-semibold text-ink">Nothing here yet.</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">Add a goal you can move forward with this week. You can always refine it later.</p><button onClick={() => { resetForm(); setIsAdding(true); }} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-strong"><Plus size={16} /> Create a goal</button></div>}
      </div>
    </div>
  );
}
