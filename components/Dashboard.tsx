'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Flag,
  LayoutDashboard,
  Menu,
  Pencil,
  Plus,
  Sparkles,
  Target,
  Timer,
  Trash2,
  X,
} from 'lucide-react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import StatsChart from './StatsChart';
import { IHabit, IHabitLog } from '@/lib/types';
import { readStored, writeStored } from '@/lib/clientStorage';

const FALLBACK_HABITS: IHabit[] = [];
const ACCENT_COLORS = ['#6f7f55', '#b98659', '#9a7b9c', '#678da8', '#bd746b'];

function logDate(log: IHabitLog) {
  return typeof log.date === 'string' ? parseISO(log.date) : new Date(log.date);
}

function formatDurationDays(days: number) {
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

export default function Dashboard() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [habits, setHabits] = useState<IHabit[]>([]);
  const [logs, setLogs] = useState<IHabitLog[]>([]);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitDescription, setNewHabitDescription] = useState('');
  const [editingHabit, setEditingHabit] = useState<IHabit | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const monthStart = useMemo(() => startOfMonth(currentDate), [currentDate]);
  const monthEnd = useMemo(() => endOfMonth(currentDate), [currentDate]);
  const calendarStart = useMemo(() => startOfWeek(monthStart, { weekStartsOn: 1 }), [monthStart]);
  const calendarEnd = useMemo(() => endOfWeek(monthEnd, { weekStartsOn: 1 }), [monthEnd]);
  const calendarDays = useMemo(
    () => eachDayOfInterval({ start: calendarStart, end: calendarEnd }),
    [calendarStart, calendarEnd],
  );

  const persistHabits = (nextHabits: IHabit[]) => {
    setHabits(nextHabits);
    writeStored('habits', nextHabits);
  };

  const persistLogs = (nextLogs: IHabitLog[]) => {
    setLogs(nextLogs);
    writeStored('logs', nextLogs);
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    const storedHabits = readStored<IHabit[]>('habits', FALLBACK_HABITS);
    const storedLogs = readStored<IHabitLog[]>('logs', []);

    try {
      const habitsResponse = await fetch('/api/habits', { cache: 'no-store' });
      if (!habitsResponse.ok) throw new Error('Habit API unavailable');
      const habitsData = await habitsResponse.json();
      const nextHabits = Array.isArray(habitsData) ? habitsData : storedHabits;
      persistHabits(nextHabits);

      const start = calendarStart.toISOString();
      const end = calendarEnd.toISOString();
      const logsResponse = await fetch(`/api/logs?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`, { cache: 'no-store' });
      if (!logsResponse.ok) throw new Error('Log API unavailable');
      const logsData = await logsResponse.json();
      persistLogs(Array.isArray(logsData) ? logsData : storedLogs);
    } catch {
      setHabits(storedHabits);
      setLogs(storedLogs);
      setErrorMessage('Offline mode — your changes are saved in this browser.');
    } finally {
      setIsLoading(false);
    }
  }, [calendarEnd, calendarStart]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const getLog = useCallback((habitId: string, date: Date) =>
    logs.find((log) => log.habitId === habitId && isSameDay(logDate(log), date)), [logs]);

  const toggleHabit = async (habitId: string, date: Date) => {
    const existingLog = getLog(habitId, date);
    const completed = !existingLog?.completed;
    const nextLog: IHabitLog = {
      _id: existingLog?._id ?? `local-${habitId}-${date.toISOString()}`,
      habitId,
      date: date.toISOString(),
      completed,
    };
    const nextLogs = existingLog
      ? logs.map((log) => (log._id === existingLog._id ? nextLog : log))
      : [...logs, nextLog];
    persistLogs(nextLogs);

    try {
      const response = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habitId, date: date.toISOString(), completed }),
      });
      if (!response.ok) throw new Error('Unable to save log');
      const savedLog = await response.json();
      persistLogs(nextLogs.map((log) => (log._id === nextLog._id ? savedLog : log)));
    } catch {
      setErrorMessage('Saved locally. Connect MongoDB to sync this change.');
    }
  };

  const createHabit = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = newHabitName.trim();
    if (!name) return;

    setIsSaving(true);
    const localHabit: IHabit = {
      _id: `local-${Date.now()}`,
      name,
      description: newHabitDescription.trim(),
      icon: '•',
      color: 'accent',
      goal: 0,
      order: habits.length,
    };

    try {
      const response = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: newHabitDescription.trim(), icon: '•', color: 'accent', order: habits.length }),
      });
      if (!response.ok) throw new Error('Unable to create habit');
      const created = await response.json();
      persistHabits([...habits, created]);
    } catch {
      persistHabits([...habits, localHabit]);
      setErrorMessage('Habit added locally. Connect MongoDB to sync it.');
    } finally {
      setNewHabitName('');
      setNewHabitDescription('');
      setIsAdding(false);
      setIsSaving(false);
    }
  };

  const updateHabit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingHabit || !editingHabit.name.trim()) return;
    setIsSaving(true);
    const nextHabits = habits.map((habit) => (habit._id === editingHabit._id ? editingHabit : habit));
    persistHabits(nextHabits);

    try {
      const response = await fetch('/api/habits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingHabit),
      });
      if (!response.ok) throw new Error('Unable to update habit');
      const saved = await response.json();
      persistHabits(nextHabits.map((habit) => (habit._id === editingHabit._id ? saved : habit)));
    } catch {
      setErrorMessage('Updated locally. Connect MongoDB to sync it.');
    } finally {
      setEditingHabit(null);
      setIsSaving(false);
    }
  };

  const deleteHabit = async () => {
    if (!editingHabit) return;
    const deletedId = editingHabit._id;
    persistHabits(habits.filter((habit) => habit._id !== deletedId));
    persistLogs(logs.filter((log) => log.habitId !== deletedId));
    setEditingHabit(null);

    try {
      const response = await fetch(`/api/habits?id=${encodeURIComponent(deletedId)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Unable to delete habit');
    } catch {
      setErrorMessage('Removed locally. Connect MongoDB to sync it.');
    }
  };

  const currentMonthLogs = useMemo(
    () => logs.filter((log) => isSameMonth(logDate(log), currentDate) && habits.some((habit) => habit._id === log.habitId)),
    [currentDate, habits, logs],
  );
  const totalCompleted = currentMonthLogs.filter((log) => log.completed).length;
  const totalPossible = habits.length * monthEnd.getDate();
  const completionRate = totalPossible ? Math.round((totalCompleted / totalPossible) * 100) : 0;
  const todayCompleted = habits.filter((habit) => getLog(habit._id, new Date())?.completed).length;

  const currentStreak = useMemo(() => {
    let streak = 0;
    for (let index = 0; index < 366; index += 1) {
      const day = new Date();
      day.setDate(day.getDate() - index);
      const completed = habits.length > 0 && habits.every((habit) => getLog(habit._id, day)?.completed);
      if (!completed) break;
      streak += 1;
    }
    return streak;
  }, [getLog, habits]);

  const weeklyStats = useMemo(() => {
    const weeks: { label: string; completed: number; possible: number }[] = [];
    for (let index = 0; index < calendarDays.length; index += 7) {
      const days = calendarDays.slice(index, index + 7).filter((day) => isSameMonth(day, currentDate));
      const completed = days.reduce(
        (count, day) => count + habits.filter((habit) => getLog(habit._id, day)?.completed).length,
        0,
      );
      weeks.push({ label: `Week ${weeks.length + 1}`, completed, possible: days.length * habits.length });
    }
    return weeks;
  }, [calendarDays, currentDate, getLog, habits]);

  const todayLabel = format(new Date(), 'EEEE, MMM d');

  return (
    <div className="app-shell page-grid min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-[1500px]">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-white/70 px-6 py-7 lg:flex">
          <Link href="/" className="mb-12 flex items-center gap-3" aria-label="Habitly home">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-white"><Sparkles size={17} /></span>
            <span className="font-display text-lg font-semibold tracking-tight">Habitly</span>
          </Link>
          <nav className="space-y-1" aria-label="Primary navigation">
            <Link href="/" className="flex items-center gap-3 rounded-xl bg-accent-soft px-3 py-2.5 text-sm font-semibold text-accent-strong"><LayoutDashboard size={17} /> Overview</Link>
            <Link href="/goals" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-muted hover:text-ink"><Target size={17} /> Goals</Link>
            <Link href="/timer" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-muted hover:text-ink"><Timer size={17} /> Focus timer</Link>
          </nav>
          <div className="mt-auto rounded-2xl bg-ink p-4 text-white">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-white/50">Small steps</p>
            <p className="text-sm leading-6 text-white/80">Consistency is built one checkmark at a time.</p>
            <Link href="/goals" className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#dfe8d4]">Set a goal <ArrowRight size={14} /></Link>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
          <header className="mb-7 flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-muted lg:hidden"><Menu size={15} /> Habitly</div>
              <p className="mb-1 text-sm text-muted">{todayLabel}</p>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Good morning, Tanveer<span className="text-accent">.</span></h1>
              <p className="mt-2 text-sm text-muted">A quiet view of your progress this month.</p>
            </div>
            <div className="flex gap-2">
              <Link href="/goals" className="hidden items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-ink shadow-sm transition hover:border-accent/40 sm:flex"><Flag size={15} /> Goals</Link>
              <Link href="/timer" className="flex items-center gap-2 rounded-xl bg-ink px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-strong"><Timer size={15} /> <span className="hidden sm:inline">Focus timer</span></Link>
            </div>
          </header>

          {errorMessage && <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-[#d8e2cc] bg-accent-soft px-4 py-3 text-sm text-accent-strong"><span>{errorMessage}</span><button onClick={() => setErrorMessage('')} aria-label="Dismiss message"><X size={16} /></button></div>}

          <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Monthly completion', value: `${completionRate}%`, note: `${totalCompleted} of ${totalPossible || 0} check-ins`, icon: BarChart3 },
              { label: 'Today', value: `${todayCompleted}/${habits.length}`, note: habits.length ? 'habits completed' : 'add your first habit', icon: Check },
              { label: 'Current streak', value: formatDurationDays(currentStreak), note: currentStreak ? 'keep the rhythm going' : 'start with today', icon: Sparkles },
              { label: 'Active habits', value: String(habits.length), note: 'habits on your list', icon: Target },
            ].map(({ label, value, note, icon: Icon }) => (
              <div key={label} className="surface flex items-start justify-between p-4 shadow-[0_8px_30px_rgba(30,30,20,.03)]">
                <div><p className="text-xs font-semibold uppercase tracking-[.14em] text-muted">{label}</p><p className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink">{isLoading ? '—' : value}</p><p className="mt-1 text-xs text-muted">{note}</p></div>
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-soft text-accent"><Icon size={17} /></span>
              </div>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,.75fr)]">
            <div className="space-y-6">
              <div className="surface overflow-hidden shadow-[0_8px_30px_rgba(30,30,20,.03)]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
                  <div><h2 className="font-display text-lg font-semibold text-ink">Your habits</h2><p className="mt-1 text-xs text-muted">Tap a day to mark it complete.</p></div>
                  <button onClick={() => setIsAdding((value) => !value)} className="inline-flex items-center gap-2 rounded-xl bg-ink px-3 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong"><Plus size={16} /> Add habit</button>
                </div>
                {isAdding && <form onSubmit={createHabit} className="grid gap-2 border-b border-line bg-surface-muted p-4 sm:grid-cols-[1fr_1fr_auto]">
                  <input autoFocus value={newHabitName} onChange={(event) => setNewHabitName(event.target.value)} placeholder="Habit name" className="rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none" />
                  <input value={newHabitDescription} onChange={(event) => setNewHabitDescription(event.target.value)} placeholder="Optional note" className="rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none" />
                  <button type="submit" disabled={isSaving} className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:opacity-50">{isSaving ? 'Saving…' : 'Save'}</button>
                </form>}
                <div className="divide-y divide-line">
                  {habits.map((habit, index) => {
                    const completedToday = getLog(habit._id, new Date())?.completed;
                    const monthlyCount = currentMonthLogs.filter((log) => log.habitId === habit._id && log.completed).length;
                    return <div key={habit._id} className="group flex items-center gap-3 px-5 py-4 transition hover:bg-[#fbfbf8]">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold text-white" style={{ background: ACCENT_COLORS[index % ACCENT_COLORS.length] }}>{habit.icon || '•'}</span>
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">{habit.name}</p><p className="mt-1 truncate text-xs text-muted">{habit.description || `${monthlyCount} check-ins this month`}</p></div>
                      <span className="hidden text-xs text-muted sm:block">{monthlyCount} days</span>
                      <button onClick={() => toggleHabit(habit._id, new Date())} aria-label={`${completedToday ? 'Uncomplete' : 'Complete'} ${habit.name} today`} className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border transition ${completedToday ? 'border-accent bg-accent text-white' : 'border-line bg-white text-transparent hover:border-accent hover:text-accent'}`}><Check size={16} strokeWidth={2.5} /></button>
                      <button onClick={() => setEditingHabit(habit)} aria-label={`Edit ${habit.name}`} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted opacity-100 transition hover:bg-surface-muted hover:text-ink sm:opacity-0 sm:group-hover:opacity-100"><Pencil size={15} /></button>
                    </div>;
                  })}
                  {!isLoading && habits.length === 0 && <div className="px-5 py-12 text-center"><div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-accent"><Sparkles size={20} /></div><p className="text-sm font-semibold text-ink">Your list is clear.</p><p className="mx-auto mt-1 max-w-xs text-sm text-muted">Add one small habit to start building your daily rhythm.</p></div>}
                </div>
              </div>

              <div className="surface overflow-hidden shadow-[0_8px_30px_rgba(30,30,20,.03)]">
                <div className="flex items-center justify-between border-b border-line px-5 py-4"><div><h2 className="font-display text-lg font-semibold text-ink">Monthly rhythm</h2><p className="mt-1 text-xs text-muted">{format(currentDate, 'MMMM yyyy')}</p></div><div className="flex items-center gap-1"><button onClick={() => setCurrentDate((date) => addMonths(date, -1))} aria-label="Previous month" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-muted hover:text-ink"><ChevronLeft size={17} /></button><button onClick={() => setCurrentDate(new Date())} className="rounded-lg px-2 py-1 text-xs font-semibold text-muted hover:bg-surface-muted hover:text-ink">Today</button><button onClick={() => setCurrentDate((date) => addMonths(date, 1))} aria-label="Next month" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-muted hover:text-ink"><ChevronRight size={17} /></button></div></div>
                <div className="overflow-x-auto"><div className="min-w-[640px] p-4"><div className="grid grid-cols-[minmax(150px,1.4fr)_repeat(7,minmax(48px,1fr))] border-b border-line pb-2 text-center text-[10px] font-semibold uppercase tracking-[.12em] text-muted"><div className="text-left">Habit</div>{['M','T','W','T','F','S','S'].map((day, index) => <div key={`${day}-${index}`}>{day}</div>)}</div>{habits.map((habit) => <div key={habit._id} className="grid grid-cols-[minmax(150px,1.4fr)_repeat(7,minmax(48px,1fr))] items-center border-b border-line py-2 last:border-b-0"><div className="truncate pr-3 text-xs font-semibold text-ink">{habit.name}</div>{calendarDays.slice(0, 7).map((day) => <div key={day.toISOString()} className="flex justify-center"><button onClick={() => toggleHabit(habit._id, day)} aria-label={`${habit.name} on ${format(day, 'MMM d')}`} className={`grid h-7 w-7 place-items-center rounded-lg border text-[11px] transition ${getLog(habit._id, day)?.completed ? 'border-accent bg-accent text-white' : 'border-line bg-surface-muted text-transparent hover:border-accent hover:bg-accent-soft'}`}><Check size={13} strokeWidth={3} /></button></div>)}</div>)}{habits.length === 0 && <p className="py-10 text-center text-sm text-muted">Add a habit to see its weekly rhythm.</p>}</div></div>
              </div>
            </div>

            <aside className="space-y-6">
              <div className="surface p-5 shadow-[0_8px_30px_rgba(30,30,20,.03)]"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-muted">Monthly goal</p><h2 className="mt-2 font-display text-xl font-semibold text-ink">Show up often</h2></div><span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-soft text-accent"><Target size={17} /></span></div><div className="mt-6 flex items-center gap-5"><div className="grid h-28 w-28 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(var(--accent) ${completionRate}%, var(--surface-muted) 0)` }}><div className="grid h-20 w-20 place-items-center rounded-full bg-white"><span className="font-display text-xl font-semibold text-ink">{completionRate}%</span></div></div><div><p className="text-sm font-semibold text-ink">{totalCompleted} completed</p><p className="mt-1 text-xs leading-5 text-muted">Every completed day compounds into something bigger.</p></div></div></div>
              <div className="surface p-5 shadow-[0_8px_30px_rgba(30,30,20,.03)]"><div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-muted">Consistency</p><h2 className="mt-2 font-display text-lg font-semibold text-ink">By week</h2></div><BarChart3 size={18} className="text-muted" /></div><div className="space-y-4">{weeklyStats.map((week) => { const percent = week.possible ? Math.round((week.completed / week.possible) * 100) : 0; return <div key={week.label}><div className="mb-1.5 flex justify-between text-xs"><span className="font-medium text-ink">{week.label}</span><span className="text-muted">{percent}%</span></div><div className="h-2 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${percent}%` }} /></div></div>; })}</div></div>
              <div className="surface p-5 shadow-[0_8px_30px_rgba(30,30,20,.03)]"><div className="mb-3 flex items-center gap-2 text-muted"><CircleHelp size={16} /><span className="text-xs font-semibold uppercase tracking-[.14em]">A gentle reminder</span></div><p className="text-sm leading-6 text-ink">You do not need a perfect month. You only need a next check-in.</p></div>
              <div className="surface p-5 shadow-[0_8px_30px_rgba(30,30,20,.03)]"><div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-muted">Daily overview</p><h2 className="mt-2 font-display text-lg font-semibold text-ink">Completions</h2></div><BarChart3 size={18} className="text-muted" /></div><div className="h-44"><StatsChart logs={currentMonthLogs} totalHabits={habits.length} currentDate={currentDate} /></div></div>
            </aside>
          </section>
        </main>
      </div>

      {editingHabit && <div className="fixed inset-0 z-50 grid place-items-center bg-ink/30 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Edit habit"><form onSubmit={updateHabit} className="surface w-full max-w-md p-5 shadow-2xl"><div className="mb-5 flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-muted">Edit habit</p><h2 className="mt-2 font-display text-xl font-semibold text-ink">Keep it honest.</h2></div><button type="button" onClick={() => setEditingHabit(null)} aria-label="Close edit dialog" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-muted hover:text-ink"><X size={17} /></button></div><label className="mb-4 block text-sm font-semibold text-ink">Name<input value={editingHabit.name} onChange={(event) => setEditingHabit({ ...editingHabit, name: event.target.value })} className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-normal text-ink focus:border-accent focus:outline-none" /></label><label className="mb-6 block text-sm font-semibold text-ink">Note<textarea value={editingHabit.description || ''} onChange={(event) => setEditingHabit({ ...editingHabit, description: event.target.value })} rows={3} className="mt-2 w-full resize-none rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-normal text-ink focus:border-accent focus:outline-none" placeholder="A short note to keep you on track" /></label><div className="flex items-center justify-between gap-3"><button type="button" onClick={deleteHabit} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[#b66a63] hover:bg-[#fbefed]"><Trash2 size={15} /> Delete</button><div className="flex gap-2"><button type="button" onClick={() => setEditingHabit(null)} className="rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:bg-surface-muted">Cancel</button><button type="submit" disabled={isSaving} className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-50">{isSaving ? 'Saving…' : 'Save changes'}</button></div></div></form></div>}
    </div>
  );
}
