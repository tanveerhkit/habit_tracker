'use client';

import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { eachDayOfInterval, endOfMonth, format, isSameDay, parseISO, startOfMonth } from 'date-fns';
import { IHabitLog } from '@/lib/types';

interface StatsChartProps {
  logs: IHabitLog[];
  totalHabits: number;
  currentDate: Date;
}

export default function StatsChart({ logs, totalHabits, currentDate }: StatsChartProps) {
  const data = useMemo(() => eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) }).map((day) => ({
    day: format(day, 'd'),
    label: format(day, 'MMM d'),
    completed: logs.filter((log) => log.completed && isSameDay(parseISO(log.date), day)).length,
  })), [currentDate, logs]);

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
        <defs>
          <linearGradient id="habitlyCompletion" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6f7f55" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#6f7f55" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 3" />
        <XAxis dataKey="day" tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} interval={Math.max(0, Math.ceil(data.length / 7) - 1)} />
        <YAxis domain={[0, Math.max(totalHabits, 1)]} allowDecimals={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ border: '1px solid var(--line)', borderRadius: 12, background: 'var(--surface)', boxShadow: '0 8px 24px rgba(30,30,20,.08)' }} labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }} itemStyle={{ color: 'var(--accent)' }} labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ''} formatter={(value) => [`${value} completed`, 'Habits']} />
        <Area type="monotone" dataKey="completed" stroke="var(--accent)" strokeWidth={2.5} fill="url(#habitlyCompletion)" activeDot={{ r: 4, fill: 'var(--accent)', stroke: 'var(--surface)', strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
