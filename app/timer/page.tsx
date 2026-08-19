'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart3, Check, Clock3, Coffee, Flame, Play, Square, TimerReset } from 'lucide-react';
import { format, isSameDay, subDays } from 'date-fns';
import { readStored, writeStored } from '@/lib/clientStorage';

type Category = 'Study' | 'Other' | 'Food';
type TimerLog = { _id: string; category: Category; startTime: string; endTime: string; duration: number };

const CATEGORIES: Record<Category, { color: string; icon: typeof Clock3 }> = {
  Study: { color: '#6f7f55', icon: Clock3 },
  Other: { color: '#8b7aa8', icon: Flame },
  Food: { color: '#b98659', icon: Coffee },
};

function formatDuration(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000) % 60;
  const minutes = Math.floor(milliseconds / 60000) % 60;
  const hours = Math.floor(milliseconds / 3600000);
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}

export default function TimerPage() {
  const [logs, setLogs] = useState<TimerLog[]>(() => readStored<TimerLog[]>('timer-logs', []));
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const saveLogs = (nextLogs: TimerLog[]) => {
    setLogs(nextLogs);
    writeStored('timer-logs', nextLogs);
  };

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch('/api/timer?range=month', { cache: 'no-store' });
        if (!response.ok) throw new Error('Timer API unavailable');
        const data = await response.json();
        if (Array.isArray(data)) saveLogs(data);
      } catch {
        // Browser storage is the offline fallback.
      }
    };
    void fetchLogs();
  }, []);

  useEffect(() => {
    if (!activeCategory || !startTime) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => setElapsed(Date.now() - startTime.getTime()), 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [activeCategory, startTime]);

  const stopTimer = async () => {
    if (!activeCategory || !startTime) return;
    const endTime = new Date();
    const duration = Math.max(endTime.getTime() - startTime.getTime(), 1000);
    const localLog: TimerLog = { _id: `local-${Date.now()}`, category: activeCategory, startTime: startTime.toISOString(), endTime: endTime.toISOString(), duration };
    saveLogs([localLog, ...logs]);

    try {
      const response = await fetch('/api/timer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category: activeCategory, startTime: startTime.toISOString(), endTime: endTime.toISOString(), duration }) });
      if (response.ok) {
        const saved = await response.json();
        saveLogs([saved, ...logs]);
      }
    } catch {
      // The local session is already saved.
    }
    setActiveCategory(null);
    setStartTime(null);
    setElapsed(0);
  };

  const startTimer = async (category: Category) => {
    if (activeCategory === category) {
      await stopTimer();
      return;
    }
    if (activeCategory) await stopTimer();
    setActiveCategory(category);
    setStartTime(new Date());
    setElapsed(0);
  };

  const todayDuration = useMemo(() => logs.filter((log) => isSameDay(new Date(log.startTime), new Date())).reduce((total, log) => total + log.duration, 0) + (activeCategory ? elapsed : 0), [activeCategory, elapsed, logs]);
  const weeklyDuration = useMemo(() => logs.filter((log) => new Date(log.startTime) >= subDays(new Date(), 7)).reduce((total, log) => total + log.duration, 0), [logs]);
  const recentDays = useMemo(() => Array.from({ length: 7 }, (_, index) => { const day = subDays(new Date(), 6 - index); const duration = logs.filter((log) => isSameDay(new Date(log.startTime), day)).reduce((total, log) => total + log.duration, 0); return { day: format(day, 'EEE'), duration }; }), [logs]);

  return (
    <div className="app-shell page-grid min-h-screen px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-8 flex items-start justify-between gap-4"><div><Link href="/" className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-ink"><ArrowLeft size={16} /> Dashboard</Link><p className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-accent">Make space for focus</p><h1 className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">Focus timer<span className="text-accent">.</span></h1><p className="mt-3 text-sm leading-6 text-muted">A simple timer for the work that deserves your attention.</p></div><div className="hidden rounded-2xl bg-ink px-5 py-4 text-white sm:block"><p className="text-xs font-semibold uppercase tracking-[.14em] text-white/50">Today</p><p className="mt-2 font-display text-3xl font-semibold">{formatDuration(todayDuration)}</p><p className="mt-1 text-xs text-white/60">of focused time</p></div></header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(290px,.7fr)]">
          <section className="space-y-6"><div className="surface flex min-h-[330px] flex-col items-center justify-center p-6 text-center shadow-[0_8px_30px_rgba(30,30,20,.03)] sm:p-10"><div className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-accent">{activeCategory ? <Play size={20} fill="currentColor" /> : <TimerReset size={20} />}</div><p className="text-xs font-semibold uppercase tracking-[.18em] text-muted">{activeCategory ? `Tracking ${activeCategory}` : 'Ready when you are'}</p><div className="my-4 font-display text-6xl font-semibold tracking-[-.06em] text-ink tabular-nums sm:text-8xl">{formatDuration(elapsed)}</div><p className="max-w-sm text-sm leading-6 text-muted">{activeCategory ? 'Stay with it. Switching categories saves the current session.' : 'Choose a category below to start recording a focused session.'}</p></div><div className="grid grid-cols-3 gap-3">{(Object.entries(CATEGORIES) as [Category, typeof CATEGORIES[Category]][]).map(([category, config]) => { const Icon = config.icon; const active = category === activeCategory; return <button key={category} onClick={() => startTimer(category)} className={`surface flex min-h-[112px] flex-col items-center justify-center gap-2 p-3 text-center transition hover:-translate-y-0.5 hover:shadow-md ${active ? 'border-accent bg-accent-soft' : ''}`}><span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: `${config.color}18`, color: config.color }}><Icon size={18} /></span><span className="text-xs font-semibold text-ink">{category}</span>{active && <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-accent">Active</span>}</button>; })}</div><button onClick={stopTimer} disabled={!activeCategory} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#e4c9c5] bg-[#fff8f7] text-sm font-semibold text-[#b66a63] transition hover:bg-[#fbefed] disabled:opacity-40"><Square size={15} fill="currentColor" /> Stop and save session</button></section>

          <aside className="space-y-6"><div className="surface p-5 shadow-[0_8px_30px_rgba(30,30,20,.03)]"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-muted">Last 7 days</p><h2 className="mt-2 font-display text-2xl font-semibold text-ink">{formatDuration(weeklyDuration)}</h2></div><span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-soft text-accent"><BarChart3 size={17} /></span></div><div className="mt-7 flex h-32 items-end gap-2">{recentDays.map((day) => { const height = weeklyDuration ? Math.max((day.duration / Math.max(...recentDays.map((item) => item.duration), 1)) * 100, day.duration ? 8 : 2) : 2; return <div key={day.day} className="flex flex-1 flex-col items-center gap-2"><div className="flex h-24 w-full items-end"><div className="w-full rounded-t-lg bg-accent transition-all" style={{ height: `${height}%`, opacity: day.duration ? .9 : .15 }} /></div><span className="text-[10px] font-semibold text-muted">{day.day}</span></div>; })}</div></div><div className="surface p-5 shadow-[0_8px_30px_rgba(30,30,20,.03)]"><div className="mb-4 flex items-center gap-2"><Check size={16} className="text-accent" /><h2 className="font-display text-lg font-semibold text-ink">How it works</h2></div><ol className="space-y-3 text-sm leading-5 text-muted"><li><span className="mr-2 font-semibold text-ink">01</span>Choose what you are focusing on.</li><li><span className="mr-2 font-semibold text-ink">02</span>Stop or switch when you are done.</li><li><span className="mr-2 font-semibold text-ink">03</span>Your session is saved automatically.</li></ol></div></aside>
        </div>
      </div>
    </div>
  );
}
