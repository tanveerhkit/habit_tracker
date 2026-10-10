'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Circle, Flag, LogOut, Pencil, Plus, Sparkles, Trash2, UserCircle, X } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { readStored, writeStored } from '@/lib/clientStorage';
import { AuthGate, useAuth } from '@/lib/auth-client';
import AuthScreen from '@/components/AuthScreen';
import ThemeToggle from '@/components/ThemeToggle';
import MobileTabBar from '@/components/MobileTabBar';
import StreakBadge from '@/components/StreakBadge';

type Goal = {
  id: string;
  title: string;
  note: string;
  completed: boolean;
  completedAt?: string;
  completionDates?: string[];
  createdAt?: string;
  updatedAt?: string;
};

const DEFAULT_GOALS: Goal[] = [];

function goalPayload(goal: Goal) {
  return { id: goal.id, title: goal.title, note: goal.note };
}

function isLocalGoal(goal: Goal) {
  return goal.id.startsWith('local-');
}

function normalizeGoal(goal: Goal): Goal {
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const dates = goal.completionDates || (goal.completedAt ? [format(new Date(goal.completedAt), 'yyyy-MM-dd')] : []);
  return { ...goal, completed: dates.includes(todayKey) };
}

function GoalsContent() {
  const { user, logout } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [filter, setFilter] = useState<'all' | 'open' | 'done'>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const persistGoals = useCallback((nextGoals: Goal[]) => {
    setGoals(nextGoals);
    writeStored('goals', nextGoals, user.id);
  }, [user.id]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    const storedGoals = readStored<Goal[]>('goals', DEFAULT_GOALS, user.id);
    try {
      const response = await fetch('/api/goals', { cache: 'no-store' });
      if (!response.ok) throw new Error('Goal API unavailable');
      const data = await response.json();
      let nextGoals = Array.isArray(data) ? (data as Goal[]).map(normalizeGoal) : [];
      if (nextGoals.length === 0 && storedGoals.length > 0) {
        const migrated: Goal[] = [];
        for (const goal of storedGoals) {
          if (!goal?.title?.trim()) continue;
          const migration = await fetch('/api/goals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: goal.title, note: goal.note, completed: goal.completed, completedAt: goal.completedAt, completionDates: goal.completionDates }),
          });
          if (migration.ok) migrated.push(normalizeGoal(await migration.json() as Goal));
          else migrated.push({ ...goal, id: isLocalGoal(goal) ? goal.id : `local-${Date.now()}-${migrated.length}` });
        }
        nextGoals = migrated;
      }
      persistGoals(nextGoals);
    } catch {
      persistGoals(storedGoals);
      setErrorMessage('Sync is temporarily unavailable. Goal changes are safe on this device and will retry when you reconnect.');
    } finally {
      setIsLoading(false);
    }
  }, [persistGoals, user.id]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const visibleGoals = useMemo(() => goals.filter((goal) => filter === 'all' || (filter === 'done' ? goal.completed : !goal.completed)), [filter, goals]);
  const completedCount = goals.filter((goal) => goal.completed).length;
  const progress = goals.length ? Math.round((completedCount / goals.length) * 100) : 0;

  const resetForm = () => {
    setTitle('');
    setNote('');
    setIsAdding(false);
    setEditing(null);
  };

  const submitGoal = async (event: FormEvent) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    setIsSaving(true);
    setErrorMessage('');
    try {
      if (editing) {
        const nextGoal = { ...editing, title: cleanTitle, note: note.trim() };
        const response = await fetch('/api/goals', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(goalPayload(nextGoal)) });
        if (!response.ok) throw new Error('Unable to update goal');
        const saved = normalizeGoal(await response.json() as Goal);
        persistGoals(goals.map((goal) => goal.id === editing.id ? saved : goal));
      } else {
        const response = await fetch('/api/goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: cleanTitle, note: note.trim() }) });
        if (!response.ok) throw new Error('Unable to create goal');
        const created = normalizeGoal(await response.json() as Goal);
        persistGoals([...goals, created]);
      }
      resetForm();
    } catch {
      const localGoal = editing
        ? { ...editing, title: cleanTitle, note: note.trim() }
        : { id: `local-${Date.now()}`, title: cleanTitle, note: note.trim(), completed: false, completionDates: [] };
      persistGoals(editing ? goals.map((goal) => goal.id === editing.id ? localGoal : goal) : [...goals, localGoal]);
      setErrorMessage('Sync is temporarily unavailable. This goal is saved on this device and will retry when you reconnect.');
      resetForm();
    } finally {
      setIsSaving(false);
    }
  };

  const toggleGoal = async (goal: Goal) => {
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    const existingDates = goal.completionDates || (goal.completedAt ? [format(new Date(goal.completedAt), 'yyyy-MM-dd')] : []);
    const completionDates = goal.completed ? existingDates.filter((date) => date !== todayKey) : Array.from(new Set([...existingDates, todayKey])).sort();
    const nextGoal: Goal = { ...goal, completed: !goal.completed, completedAt: goal.completed ? undefined : new Date().toISOString(), completionDates };
    persistGoals(goals.map((item) => item.id === goal.id ? nextGoal : item));
    setErrorMessage('');
    if (isLocalGoal(goal)) return;
    try {
        const response = await fetch('/api/goals', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...goalPayload(nextGoal), completed: nextGoal.completed, completedAt: nextGoal.completedAt, completionDate: todayKey }) });
        if (!response.ok) throw new Error('Unable to update goal');
      const saved = normalizeGoal(await response.json() as Goal);
      persistGoals(goals.map((item) => item.id === goal.id ? saved : item));
    } catch {
      setErrorMessage('Sync is temporarily unavailable. This change is saved on this device and will retry when you reconnect.');
    }
  };

  const deleteGoal = async (goal: Goal) => {
    persistGoals(goals.filter((item) => item.id !== goal.id));
    if (isLocalGoal(goal)) return;
    try {
      const response = await fetch(`/api/goals?id=${encodeURIComponent(goal.id)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Unable to delete goal');
    } catch {
      setErrorMessage('Sync is temporarily unavailable. This removal is saved on this device and will retry when you reconnect.');
    }
  };

  const startEdit = (goal: Goal) => {
    setEditing(goal);
    setTitle(goal.title);
    setNote(goal.note);
    setIsAdding(true);
  };

  const isGoalDayComplete = useCallback((date: Date) => {
    const key = format(date, 'yyyy-MM-dd');
    return goals.length > 0 && goals.every((goal) => {
      const dates = goal.completionDates || (goal.completedAt ? [format(new Date(goal.completedAt), 'yyyy-MM-dd')] : []);
      return dates.includes(key) || (goal.completed && goal.completedAt ? isSameDay(new Date(goal.completedAt), date) : false);
    });
  }, [goals]);
  const todayAllGoalsComplete = isGoalDayComplete(new Date());
  const goalStreak = useMemo(() => {
    let streak = 0;
    for (let index = todayAllGoalsComplete ? 0 : 1; index < 366; index += 1) {
      const day = new Date();
      day.setDate(day.getDate() - index);
      if (!isGoalDayComplete(day)) break;
      streak += 1;
    }
    return streak;
  }, [isGoalDayComplete, todayAllGoalsComplete]);

  return (
    <div className="app-shell page-grid min-h-screen px-4 pb-24 pt-5 sm:px-6 lg:px-10 lg:pb-8 lg:pt-8">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-10 flex items-start justify-between gap-4">
          <div><Link href="/" className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-ink"><ArrowLeft size={16} /> Dashboard</Link><p className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-accent">A bigger picture</p><h1 className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">Goals<span className="text-accent">.</span></h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted">Keep the direction visible. Break large intentions into the next clear step.</p><div className="mt-4 sm:hidden"><StreakBadge streak={goalStreak} celebrating={todayAllGoalsComplete} label="Goal streak" /></div></div>
          <div className="flex items-start gap-2"><div className="hidden rounded-2xl bg-foreground px-5 py-4 text-background sm:block"><p className="text-xs font-semibold uppercase tracking-[.14em] text-background/50">Progress</p><p className="mt-2 font-display text-3xl font-semibold">{progress}%</p><p className="mt-1 text-xs text-background/60">{completedCount} of {goals.length} complete</p></div><div className="hidden sm:block"><StreakBadge streak={goalStreak} celebrating={todayAllGoalsComplete} label="Goal streak" /></div><div className="flex items-center gap-2"><span className="hidden items-center gap-1 text-xs text-muted md:flex"><UserCircle size={15} />{user.name}</span><ThemeToggle /><button onClick={() => void logout()} aria-label="Sign out" className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-surface text-muted hover:text-danger"><LogOut size={16} /></button></div></div>
        </header>

        {errorMessage && <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-[#d8e2cc] bg-accent-soft px-4 py-3 text-sm text-accent-strong" role="status"><span>{errorMessage}</span><button onClick={() => setErrorMessage('')} aria-label="Dismiss message"><X size={16} /></button></div>}
        <section className="surface mb-6 p-5 shadow-[0_8px_30px_rgba(30,30,20,.03)] sm:p-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-xl font-semibold text-ink">Your direction</h2><p className="mt-1 text-sm text-muted">One meaningful goal is enough to begin.</p></div><button onClick={() => { resetForm(); setIsAdding(true); }} className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition hover:bg-accent-strong"><Plus size={16} /> Add goal</button></div><div className="h-2 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} /></div><div className="mt-3 flex items-center justify-between text-xs text-muted"><span>{goals.length ? `${goals.length} goals in view` : 'No goals yet'}</span><span>{progress}% complete</span></div></section>

        {isAdding && <form onSubmit={submitGoal} className="surface mb-6 grid gap-3 p-5 shadow-[0_8px_30px_rgba(30,30,20,.03)] sm:grid-cols-[1fr_1fr_auto] sm:items-end"><label className="text-xs font-semibold uppercase tracking-[.12em] text-muted">Goal<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What matters next?" className="mt-2 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-ink placeholder:text-muted focus:border-accent focus:outline-none" /></label><label className="text-xs font-semibold uppercase tracking-[.12em] text-muted">Note<input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Why it matters" className="mt-2 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-ink placeholder:text-muted focus:border-accent focus:outline-none" /></label><div className="flex gap-2"><button type="button" onClick={resetForm} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-muted hover:bg-surface-muted"><X size={16} /></button><button type="submit" disabled={isSaving} className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-50">{isSaving ? 'Saving…' : editing ? 'Save' : 'Add'}</button></div></form>}

        <div className="mb-5 flex items-center gap-1 rounded-xl bg-surface-muted p-1" role="tablist" aria-label="Goal filter">{(['all', 'open', 'done'] as const).map((option) => <button key={option} onClick={() => setFilter(option)} role="tab" aria-selected={filter === option} className={`rounded-lg px-3 py-2 text-xs font-semibold capitalize transition ${filter === option ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'}`}>{option === 'all' ? 'All goals' : option === 'open' ? 'In progress' : 'Completed'}</button>)}</div>

        {isLoading ? <div className="surface px-6 py-16 text-center text-sm text-muted">Loading your goals…</div> : visibleGoals.length ? <div className="grid gap-4 sm:grid-cols-2">{visibleGoals.map((goal) => <article key={goal.id} className={`surface group p-5 shadow-[0_8px_30px_rgba(30,30,20,.03)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_34px_rgba(30,30,20,.07)] ${goal.completed ? 'bg-surface-muted' : ''}`}><div className="mb-8 flex items-start justify-between gap-3"><button onClick={() => void toggleGoal(goal)} aria-label={`${goal.completed ? 'Mark incomplete' : 'Mark complete'}: ${goal.title}`} className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition ${goal.completed ? 'border-accent bg-accent text-white' : 'border-line text-transparent hover:border-accent hover:bg-accent-soft'}`}>{goal.completed ? <Check size={19} /> : <Circle size={18} />}</button><div className="flex gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100"><button onClick={() => startEdit(goal)} aria-label={`Edit ${goal.title}`} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-muted hover:text-ink"><Pencil size={15} /></button><button onClick={() => void deleteGoal(goal)} aria-label={`Delete ${goal.title}`} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-[#fbefed] hover:text-[#b66a63]"><Trash2 size={15} /></button></div></div><p className={`font-display text-xl font-semibold tracking-tight ${goal.completed ? 'text-muted line-through' : 'text-ink'}`}>{goal.title}</p><p className="mt-2 min-h-10 text-sm leading-5 text-muted">{goal.note || 'No note added yet.'}</p><div className="mt-6 flex items-center gap-2 text-xs font-semibold text-accent"><Flag size={14} /> {goal.completed ? 'Completed' : 'In progress'}</div></article>)}</div> : <div className="surface px-6 py-16 text-center"><div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent"><Sparkles size={22} /></div><h2 className="font-display text-xl font-semibold text-ink">Nothing here yet.</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">Add a goal you can move forward with this week. You can always refine it later.</p><button onClick={() => { resetForm(); setIsAdding(true); }} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background hover:bg-accent-strong"><Plus size={16} /> Create a goal</button></div>}
      </div>
      <MobileTabBar />
    </div>
  );
}

export default function GoalsPage() {
  return <AuthGate authScreen={<AuthScreen />}><GoalsContent /></AuthGate>;
}
