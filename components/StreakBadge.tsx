'use client';

import { Flame } from 'lucide-react';

type StreakBadgeProps = {
  streak: number;
  celebrating: boolean;
  label: string;
};

export default function StreakBadge({ streak, celebrating, label }: StreakBadgeProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 ${celebrating ? 'border-[#e6b85c]/60 bg-[#fff7df] text-[#9a6817] dark:border-[#d39b43]/50 dark:bg-[#40331d] dark:text-[#f2c56f] streak-fire' : 'border-line bg-surface text-muted'}`}
      aria-live="polite"
      aria-label={`${label}: ${streak} ${streak === 1 ? 'day' : 'days'}`}
    >
      <span className={`grid h-8 w-8 place-items-center rounded-xl ${celebrating ? 'bg-[#f7d98b]/60 dark:bg-[#66502b]' : 'bg-accent-soft text-accent'}`}>
        <Flame size={16} fill={celebrating ? 'currentColor' : 'none'} className={celebrating ? 'streak-flame' : ''} />
      </span>
      <span className="leading-tight">
        <span className="block text-[10px] font-semibold uppercase tracking-[.14em] opacity-70">{celebrating ? 'All complete' : label}</span>
        <span className="block font-display text-sm font-semibold text-ink">{streak} {streak === 1 ? 'day' : 'days'}</span>
      </span>
    </div>
  );
}
