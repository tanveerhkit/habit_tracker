"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { IHabit, IHabitLog } from '@/lib/types';
import WeeklyGrid from './WeeklyGrid';
import { cn } from '@/lib/utils';
import { addMonths, subMonths, format, startOfMonth, endOfMonth, isSameDay, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { motion } from 'framer-motion';
import StatsChart from './StatsChart';
import { getWeeksInMonth } from '@/lib/dateUtils';

export default function Dashboard() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [habits, setHabits] = useState<IHabit[]>([]);
    const [logs, setLogs] = useState<IHabitLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [newHabitName, setNewHabitName] = useState('');
    const [newHabitDescription, setNewHabitDescription] = useState('');
    const [editingHabit, setEditingHabit] = useState<IHabit | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // ... (fetchData) ...

    const promptEdit = (habit: IHabit) => {
        setEditingHabit(habit);
        setIsEditModalOpen(true);
    };

    const handleUpdateHabit = async () => {
        if (!editingHabit) return;
        try {
            const res = await fetch('/api/habits', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingHabit)
            });
            const updated = await res.json();
            setHabits(prev => prev.map(h => h._id === updated._id ? updated : h));
            setIsEditModalOpen(false);
            setEditingHabit(null);
        } catch (error) {
            console.error("Failed to update habit", error);
        }
    };

    const handleDeleteHabit = async () => {
        if (!editingHabit?._id) return;
        if (!confirm("Are you sure you want to delete this habit? This cannot be undone.")) return;

        try {
            await fetch(`/api/habits?id=${editingHabit._id}`, { method: 'DELETE' });
            setHabits(prev => prev.filter(h => h._id !== editingHabit._id));
            setIsEditModalOpen(false);
            setEditingHabit(null);
        } catch (error) {
            console.error("Failed to delete habit", error);
        }
    };

    // Fetch data (habits and logs)
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch Habits
            const habitsRes = await fetch('/api/habits');
            const habitsData = await habitsRes.json();
            setHabits(habitsData);

            // Fetch Logs (Full Range)
            const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 }).toISOString();
            const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 }).toISOString();
            const logsRes = await fetch(`/api/logs?startDate=${start}&endDate=${end}`);
            const logsData = await logsRes.json();
            setLogs(logsData);

        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    }, [currentDate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const toggleHabit = async (habitId: string, date: Date) => {
        const dateStr = date.toISOString();
        // Use precise matching for logs
        const existingLogIndex = logs.findIndex(l => l.habitId === habitId && isSameDay(parseISO(l.date), date));
        const isCompleted = existingLogIndex > -1 ? logs[existingLogIndex].completed : false;
        const newValue = !isCompleted;

        const newLogs = [...logs];
        if (existingLogIndex > -1) {
            newLogs[existingLogIndex] = { ...newLogs[existingLogIndex], completed: newValue };
        } else {
            newLogs.push({ _id: 'temp', habitId, date: dateStr, completed: newValue });
        }
        setLogs(newLogs);

        try {
            const res = await fetch('/api/logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ habitId, date: dateStr, completed: newValue })
            });
            const updatedLog = await res.json();
            // Replace temp log with real one
            setLogs(prev => prev.map(l => (l.habitId === habitId && new Date(l.date).toDateString() === date.toDateString()) ? updatedLog : l));
            // Re-fetch to ensure sync? Or just rely on local state? Local is faster.
        } catch (error) {
            console.error("Failed to toggle", error);
            fetchData();
        }
    };

    const createHabit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newHabitName.trim()) return;

        try {
            const res = await fetch('/api/habits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newHabitName,
                    description: newHabitDescription || '',
                    icon: '⚡',
                    color: 'neon-blue'
                })
            });
            const newHabit = await res.json();
            setHabits([...habits, newHabit]);
            setNewHabitName('');
            setNewHabitDescription('');
        } catch (error) {
            console.error("Failed to create habit", error);
        }
    };

    // Stats for the month
    const activeLogs = useMemo(() => {
        return logs.filter(log => habits.some(h => h._id === log.habitId));
    }, [logs, habits]);

    const totalPossible = habits.length * new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const totalCompleted = activeLogs.filter(l => l.completed).length;
    const completionRate = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;

    // Weekly Stats Calculation
    const weeks = useMemo(() => getWeeksInMonth(currentDate), [currentDate]);

    const weeklyStats = useMemo(() => {
        // weeks is Array<Date[]>
        return weeks.map((weekDays, index) => {
            // weekDays contains all valid dates now (including padding dates)
            let weekPossible = habits.length * weekDays.length;
            let weekCompleted = 0;

            weekDays.forEach(day => {
                habits.forEach(habit => {
                    const log = activeLogs.find(l => l.habitId === habit._id && isSameDay(parseISO(l.date), day));
                    if (log?.completed) weekCompleted++;
                });
            });

            // completionRate calculation
            const pct = weekPossible > 0 ? Math.round((weekCompleted / weekPossible) * 100) : 0;

            return {
                weekIndex: index + 1,
                completed: weekCompleted,
                possible: weekPossible,
                completionRate: pct
            };
        });
    }, [weeks, habits, activeLogs]);

    const weekColors = [
        'bg-neon-red', 'bg-neon-green', 'bg-neon-blue', 'bg-neon-purple', 'bg-neon-orange'
    ];
    const weekTextColors = [
        'text-neon-red', 'text-neon-green', 'text-neon-blue', 'text-neon-purple', 'text-neon-orange'
    ];

    return (
        <div className="flex flex-col h-full w-full p-4 gap-4 max-w-[1800px] mx-auto relative">
            {/* Edit Modal Overlay */}
            {isEditModalOpen && editingHabit && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="w-[400px] glass p-6 flex flex-col gap-4 border border-neon-blue/50 shadow-[0_0_30px_rgba(0,255,255,0.2)]">
                        <h2 className="text-xl font-bold text-white mb-2">Edit Habit</h2>

                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-gray-400">Habit Name</label>
                            <input
                                className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-white outline-none focus:border-neon-blue transition-colors"
                                value={editingHabit.name}
                                onChange={e => setEditingHabit({ ...editingHabit, name: e.target.value })}
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-gray-400">Notes / Description</label>
                            <textarea
                                className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-white outline-none focus:border-neon-blue transition-colors min-h-[100px] text-sm resize-none"
                                value={editingHabit.description || ''}
                                onChange={e => setEditingHabit({ ...editingHabit, description: e.target.value })}
                                placeholder="Add notes, goals, or reminders..."
                            />
                        </div>

                        <div className="flex justify-between mt-2">
                            <button
                                onClick={handleDeleteHabit}
                                className="px-4 py-2 text-sm text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors self-start"
                            >
                                Delete Habit
                            </button>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpdateHabit}
                                    className="px-4 py-2 text-sm bg-neon-blue/20 text-neon-blue border border-neon-blue/50 rounded hover:bg-neon-blue/40 transition-all font-bold"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Top Header */}
            <div className="grid grid-cols-12 gap-4 h-[140px] shrink-0">
                <div className="col-span-2 glass flex flex-col items-center justify-center text-center relative group cursor-pointer" onClick={() => setCurrentDate(new Date())}>
                    <div className="absolute top-2 left-2 text-xs text-gray-500 hover:text-white z-20" onClick={(e) => { e.stopPropagation(); setCurrentDate(subMonths(currentDate, 1)); }}>◀</div>
                    <div className="absolute top-2 right-2 text-xs text-gray-500 hover:text-white z-20" onClick={(e) => { e.stopPropagation(); setCurrentDate(addMonths(currentDate, 1)); }}>▶</div>

                    <h2 className="text-3xl font-bold text-gray-300 uppercase">{format(currentDate, 'MMMM')}</h2>
                    <h1 className="text-5xl font-extrabold text-white">{format(currentDate, 'yyyy')}</h1>
                </div>

                <div className="col-span-8 glass relative overflow-hidden p-2 flex flex-col">
                    <div className="absolute top-2 left-0 right-0 text-center uppercase text-xs font-bold tracking-widest text-gray-400 z-10">Daily Habits Completed</div>
                    <div className="flex-1 mt-4 w-full h-full">
                        <StatsChart logs={activeLogs} totalHabits={habits.length} currentDate={currentDate} />
                    </div>
                </div>

                <div className="col-span-2 glass flex flex-col items-center justify-center gap-2">
                    <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Level Up Tracker</div>
                    <h3 className="text-2xl font-bold text-white mb-2">Tanveer</h3>

                    <Link href="/timer" className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest text-neon-blue hover:bg-neon-blue/20 hover:border-neon-blue transition-all flex items-center gap-2">
                        <span>⏱</span> Stopwatch
                    </Link>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
                {/* Sidebar Habits */}
                <div className="col-span-3 glass flex flex-col">
                    <div className="h-12 border-b border-white/10 flex items-center justify-between px-4 font-bold tracking-wider text-sm">
                        <span>HABITS</span>
                        <span className="text-xs text-gray-500">{habits.length} Active</span>
                    </div>

                    {/* Header Spacers to align with Grid */}
                    <div className="h-8 border-b border-white/10 bg-black/40"></div>
                    <div className="h-6 border-b border-white/10 bg-black/40"></div>

                    <div className="flex-1 overflow-y-auto">
                        {habits.map((habit) => (
                            <div key={habit._id} className="flex h-12 items-center px-4 hover:bg-white/5 border-b border-white/5 text-sm text-gray-300 group relative">
                                <span className={cn("mr-3 text-lg", `text-${habit.color}`)}>{habit.icon}</span>
                                <div className="flex flex-col flex-1 min-w-0 justify-center">
                                    <span className="truncate font-medium leading-tight">{habit.name}</span>
                                    {habit.description && (
                                        <span className="truncate text-[10px] text-gray-500 leading-tight block">{habit.description}</span>
                                    )}
                                </div>

                                {/* Edit Button */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); promptEdit(habit); }}
                                    className="opacity-0 group-hover:opacity-100 ml-auto mr-2 text-gray-500 hover:text-white transition-opacity self-center"
                                >
                                    ✏️
                                </button>

                                <div className={cn("w-[2px] h-6 rounded-full absolute right-0 bg-transparent top-1/2 -translate-y-1/2", `bg-${habit.color}`)} />
                            </div>
                        ))}

                        {habits.length === 0 && (
                            <div className="p-4 text-center text-xs text-gray-500 italic">
                                No habits yet. Add one below!
                            </div>
                        )}

                        {/* Add Habit Form */}
                        <form onSubmit={createHabit} className="p-2 border-t border-white/10 mt-auto flex flex-col gap-2">
                            <input
                                type="text"
                                placeholder="+ Add Habit"
                                className="w-full bg-transparent border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-neon-blue"
                                value={newHabitName}
                                onChange={(e) => setNewHabitName(e.target.value)}
                            />
                            <input
                                type="text"
                                placeholder="Optional note / goal..."
                                value={newHabitDescription}
                                onChange={(e) => setNewHabitDescription(e.target.value)}
                                className="w-full bg-transparent border border-white/10 rounded px-2 py-1 text-xs text-gray-400 focus:text-white focus:outline-none focus:border-neon-blue transition-colors"
                            />
                            <button type="submit" className="hidden" />
                        </form>
                    </div>

                    {/* Bottom Stats Labels */}
                    {habits.length > 0 && (
                        <>
                            <div className="h-8 border-t border-white/10 bg-black/20 flex items-center justify-end px-4 text-[10px] font-bold text-gray-400">
                                Habits completed daily:
                            </div>
                            <div className="h-8 border-t border-white/10 bg-black/20 flex items-center justify-end px-4 text-[10px] font-bold text-gray-400">
                                Progress %:
                            </div>
                        </>
                    )}
                </div>

                {/* Weekly Grid */}
                <div className="col-span-7 glass overflow-hidden flex flex-col">
                    {/* Header Spacer to align with Sidebar "HABITS" header */}
                    <div className="h-12 border-b border-white/10 flex items-center justify-center font-bold tracking-wider text-sm text-gray-400">
                        WEEKLY PROGRESS
                    </div>
                    <div className="flex-1 overflow-auto">
                        <WeeklyGrid
                            habits={habits}
                            logs={logs}
                            currentDate={currentDate}
                            onToggle={toggleHabit}
                        />
                    </div>
                </div>

                {/* Right Sidebar Goals */}
                <div className="col-span-2 glass p-4 flex flex-col relative">
                    <h4 className="text-xs font-bold uppercase tracking-widest mb-4">Monthly Goal</h4>
                    <div className="flex-1 space-y-4">
                        <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                            <div className="h-full bg-neon-green" style={{ width: `${completionRate}%` }} />
                        </div>
                        <div className="text-right text-sm text-neon-green font-bold">{completionRate}% Completed</div>
                    </div>

                    <div className="absolute bottom-4 right-4 text-center">
                        <div className="text-4xl text-white">❤️</div>
                        <div className="text-xl font-bold">{totalCompleted}</div>
                    </div>
                </div>
            </div>

            {/* Bottom Summary Row */}
            <div className="grid grid-cols-5 gap-4 h-[80px] shrink-0">
                {[0, 1, 2, 3, 4].map(i => {
                    // Ensure we don't render empty cards if month has fewer weeks (e.g. 4)
                    if (!weeklyStats[i]) return <div key={i} className="glass opacity-30"></div>;

                    const stats = weeklyStats[i];
                    return (
                        <div key={i} className="glass flex flex-col items-center justify-center relative overflow-hidden group p-2">
                            <div className={cn(
                                "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300",
                                weekColors[i % 5]
                            )} />
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">WEEK {i + 1}</span>
                            <div className={cn(
                                "text-lg font-bold",
                                weekTextColors[i % 5]
                            )}>
                                {stats.completed}/{stats.possible}/{stats.completionRate}%
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
}
