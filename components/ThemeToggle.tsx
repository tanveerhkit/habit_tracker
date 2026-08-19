'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const stored = window.localStorage.getItem('habit-tracker:theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const nextDark = stored ? stored === 'dark' : prefersDark;
      setDark(nextDark);
      document.documentElement.classList.toggle('dark', nextDark);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const toggle = () => {
    const nextDark = !dark;
    setDark(nextDark);
    window.localStorage.setItem('habit-tracker:theme', nextDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', nextDark);
  };

  return <button type="button" onClick={toggle} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-surface text-muted transition hover:border-accent/40 hover:text-ink">{dark ? <Sun size={16} /> : <Moon size={16} />}</button>;
}
