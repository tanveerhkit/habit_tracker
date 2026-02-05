"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { format, isSameDay, subDays } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, AreaChart, Area, CartesianGrid } from 'recharts';
import { cn } from '@/lib/utils';

interface TimerLog {
    _id: string;
    category: 'Study' | 'Other' | 'Food';
    startTime: string;
    endTime: string;
    duration: number;
}

const CATEGORIES = {
    Study: { color: '#00fff5', label: 'Study', bg: 'bg-neon-blue' }, // Neon Blue
    Food: { color: '#ff9900', label: 'Food', bg: 'bg-neon-orange' }, // Neon Orange
    Other: { color: '#b026ff', label: 'Other', bg: 'bg-neon-purple' } // Neon Purple
};
type CategoryKey = keyof typeof CATEGORIES;

export default function TimerPage() {
    const [logs, setLogs] = useState<TimerLog[]>([]);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [elapsed, setElapsed] = useState(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch logs
    const fetchLogs = async () => {
        try {
            const res = await fetch('/api/timer?range=month');
            const data = await res.json();
            if (Array.isArray(data)) {
                setLogs(data);
            } else {
                console.error("Timer API returned non-array:", data);
                setLogs([]);
            }
        } catch (error) {
            console.error("Failed to fetch logs", error);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchLogs();
    }, []);

    // Timer Logic
    useEffect(() => {
        if (activeCategory && startTime) {
            intervalRef.current = setInterval(() => {
                setElapsed(Date.now() - startTime.getTime());
            }, 1000);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [activeCategory, startTime]);

    // Format Duration
    const formatDuration = (ms: number) => {
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor((ms / (1000 * 60 * 60)));
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    // Handlers
    const stopTimer = async () => {
        if (!activeCategory || !startTime) return;

        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();

        // Save Log
        try {
            await fetch('/api/timer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category: activeCategory,
                    startTime,
                    endTime,
                    duration
                })
            });
            await fetchLogs(); // Refresh data
        } catch (error) {
            console.error("Failed to save log", error);
        }

        setActiveCategory(null);
        setStartTime(null);
        setElapsed(0);
    };

    const startTimer = async (category: string) => {
        if (activeCategory === category) {
            // Stop current if clicked again (toggle) - actually simpler to have explicit 'Stop' or switch
            await stopTimer();
            return;
        }

        if (activeCategory) {
            await stopTimer(); // Stop previous before starting new
        }

        setActiveCategory(category);
        setStartTime(new Date());
        setElapsed(0);
    };

    // Calculate Today's Stats for Pie Chart
    const dailyData = useMemo(() => {
        const today = new Date(); // Use local time for simple grouping (Dashboard uses local)
        const todaysLogs = logs.filter(l => isSameDay(new Date(l.startTime), today));

        const summary = { Study: 0, Food: 0, Other: 0 };
        todaysLogs.forEach(l => {
            if (summary[l.category] !== undefined) {
                summary[l.category] += l.duration;
            }
        });

        // Add current elapsed if active
        if (activeCategory) {
            summary[activeCategory as keyof typeof summary] += elapsed;
        }

        return Object.entries(summary).map(([name, value]) => ({
            name,
            value: value / (1000 * 60 * 60) // in hours
        })).filter(d => d.value > 0);
    }, [logs, activeCategory, elapsed]);

    // Calculate Weekly Stats for Bar Chart
    const weeklyData = useMemo(() => {
        const days = [];
        // Last 7 days including today
        for (let i = 6; i >= 0; i--) {
            const date = subDays(new Date(), i);
            const dayLogs = logs.filter(l => isSameDay(new Date(l.startTime), date));

            const stats: { name: string } & Record<CategoryKey, number> = { name: format(date, 'EEE'), Study: 0, Food: 0, Other: 0 };
            dayLogs.forEach(l => {
                stats[l.category as CategoryKey] += l.duration;
            });

            // Convert to hours
            stats.Study = Number((stats.Study / (1000 * 60 * 60)).toFixed(1));
            stats.Food = Number((stats.Food / (1000 * 60 * 60)).toFixed(1));
            stats.Other = Number((stats.Other / (1000 * 60 * 60)).toFixed(1));

            days.push(stats);
        }
        return days;
    }, [logs]); // Exclude active session from weekly to keep it simple or include it? Let's leave active out of weekly until saved

    // Calculate Monthly Trend for Area Chart
    const monthlyData = useMemo(() => {
        const days = [];
        // Last 30 days
        for (let i = 29; i >= 0; i--) {
            const date = subDays(new Date(), i);
            const dayLogs = logs.filter(l => isSameDay(new Date(l.startTime), date));

            const stats: { name: string } & Record<CategoryKey, number> = { name: format(date, 'MMM d'), Study: 0, Food: 0, Other: 0 };
            dayLogs.forEach(l => {
                stats[l.category as CategoryKey] += l.duration;
            });

            // Convert to hours
            stats.Study = Number((stats.Study / (1000 * 60 * 60)).toFixed(1));
            stats.Food = Number((stats.Food / (1000 * 60 * 60)).toFixed(1));
            stats.Other = Number((stats.Other / (1000 * 60 * 60)).toFixed(1));

            days.push(stats);
        }
        return days;
    }, [logs]);

    return (
        <div className="h-screen overflow-y-auto bg-black text-white p-6 font-sans selection:bg-neon-blue selection:text-black">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <Link href="/" className="flex items-center text-gray-400 hover:text-white transition-colors">
                    <span className="mr-2 text-xl">←</span>
                    <span className="font-bold tracking-widest text-sm uppercase">Dashboard</span>
                </Link>
                <div className="text-right">
                    <div className="text-xs font-bold uppercase tracking-widest text-gray-500">Productivity Timer</div>
                    <div className="text-xl font-bold text-white uppercase">{format(new Date(), 'EEEE, MMMM d')}</div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">

                {/* Timer Section */}
                <div className="flex flex-col gap-6">
                    {/* Timer Display */}
                    <div className="glass p-12 flex flex-col items-center justify-center relative overflow-hidden group">
                        <div className={cn("absolute inset-0 opacity-10 transition-colors duration-500", activeCategory ? CATEGORIES[activeCategory as keyof typeof CATEGORIES].bg : "bg-gray-900")} />

                        <div className="relative z-10 text-center">
                            <div className={cn("text-xs font-bold uppercase tracking-[0.2em] mb-4 transition-colors", activeCategory ? `text-${CATEGORIES[activeCategory as keyof typeof CATEGORIES].color}` : "text-gray-500")}>
                                {activeCategory ? `Currently: ${activeCategory}` : "Timer Idle"}
                            </div>
                            <div className="text-8xl font-black tabular-nums tracking-tighter text-white drop-shadow-lg">
                                {formatDuration(elapsed)}
                            </div>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="grid grid-cols-3 gap-4">
                        {Object.entries(CATEGORIES).map(([key, config]) => {
                            const isActive = activeCategory === key;
                            return (
                                <button
                                    key={key}
                                    onClick={() => startTimer(key)}
                                    className={cn(
                                        "h-24 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 border border-white/10 hover:border-white/30",
                                        isActive ? "bg-white/10 scale-105 border-white/50 shadow-[0_0_30px_rgba(255,255,255,0.1)]" : "bg-black/40 hover:bg-white/5"
                                    )}
                                >
                                    <div className="w-3 h-3 rounded-full mb-2" style={{ backgroundColor: config.color, boxShadow: isActive ? `0 0 10px ${config.color}` : 'none' }} />
                                    <span className="font-bold text-sm tracking-widest uppercase text-gray-300">{config.label}</span>
                                    {isActive && <span className="text-[10px] text-white/50 mt-1 animate-pulse">Tracking...</span>}
                                </button>
                            );
                        })}
                    </div>

                    {/* Stop Button */}
                    <button
                        onClick={stopTimer}
                        disabled={!activeCategory}
                        className="w-full h-16 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 font-bold uppercase tracking-widest hover:bg-red-500/20 hover:border-red-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                        Stop Timer
                    </button>

                    <div className="mt-4 text-xs text-center text-gray-500">
                        Stop or switch categories to save your session automatically.
                    </div>
                </div>

                {/* VISUALIZATION SECTION */}
                <div className="flex flex-col gap-6">

                    {/* Daily Breakdown */}
                    <div className="glass p-6 flex flex-col h-[300px]">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Today&apos;s Focus</h3>
                        <div className="flex-1 w-full min-h-0">
                            {dailyData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={dailyData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {dailyData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={CATEGORIES[entry.name as keyof typeof CATEGORIES].color} stroke="none" />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#000', borderColor: '#333', borderRadius: '8px' }}
                                            itemStyle={{ color: '#fff' }}
                                            formatter={(value: number) => [`${value.toFixed(2)} hrs`, 'Duration']}
                                        />
                                        <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-600 text-sm italic">
                                    No activity recorded today
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Weekly Summary */}
                    <div className="glass p-6 flex flex-col h-[300px]">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Weekly Analysis (Hours)</h3>
                        <div className="flex-1 w-full min-h-0 text-xs">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={weeklyData} stackOffset="sign">
                                    <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.1)' }}
                                        contentStyle={{ backgroundColor: '#000', borderColor: '#333', borderRadius: '8px' }}
                                    />
                                    <Legend iconType="circle" />
                                    <Bar dataKey="Study" stackId="a" fill={CATEGORIES.Study.color} radius={[0, 0, 4, 4]} barSize={20} />
                                    <Bar dataKey="Other" stackId="a" fill={CATEGORIES.Other.color} barSize={20} />
                                    <Bar dataKey="Food" stackId="a" fill={CATEGORIES.Food.color} radius={[4, 4, 0, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Monthly Trend */}
                    <div className="glass p-6 flex flex-col h-[300px]">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">30-Day Trend (Hours)</h3>
                        <div className="flex-1 w-full min-h-0 text-xs">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={monthlyData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorStudy" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={CATEGORIES.Study.color} stopOpacity={0.8} />
                                            <stop offset="95%" stopColor={CATEGORIES.Study.color} stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorFood" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={CATEGORIES.Food.color} stopOpacity={0.8} />
                                            <stop offset="95%" stopColor={CATEGORIES.Food.color} stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorOther" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={CATEGORIES.Other.color} stopOpacity={0.8} />
                                            <stop offset="95%" stopColor={CATEGORIES.Other.color} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} axisLine={false} interval={6} />
                                    <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#000', borderColor: '#333', borderRadius: '8px' }}
                                    />
                                    <Area type="monotone" dataKey="Study" stroke={CATEGORIES.Study.color} fillOpacity={1} fill="url(#colorStudy)" />
                                    <Area type="monotone" dataKey="Other" stroke={CATEGORIES.Other.color} fillOpacity={1} fill="url(#colorOther)" />
                                    <Area type="monotone" dataKey="Food" stroke={CATEGORIES.Food.color} fillOpacity={1} fill="url(#colorFood)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
