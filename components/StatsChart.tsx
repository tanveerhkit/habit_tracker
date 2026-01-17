"use client";

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, parseISO } from 'date-fns';
import { IHabitLog } from '@/lib/types';

interface StatsChartProps {
    logs: IHabitLog[];
    totalHabits: number;
    currentDate: Date; // The selected month
}

export default function StatsChart({ logs, totalHabits, currentDate }: StatsChartProps) {
    // Generate data for the current month
    const data = React.useMemo(() => {
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        const daysInMonth = eachDayOfInterval({ start, end });

        // Map each day of the month to completion stats
        const chartData = daysInMonth.map(day => {
            // Find logs for this day
            // Logs date is ISO string, need to compare date part
            const count = logs.filter(log =>
                isSameDay(parseISO(log.date), day) && log.completed
            ).length;

            return {
                date: day,
                dateStr: format(day, 'd'),
                fullDate: format(day, 'MMM d, yyyy'),
                completed: count
            };
        });

        return chartData;
    }, [logs, currentDate]);

    return (
        <div className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
                    margin={{
                        top: 10,
                        right: 10,
                        left: -25,
                        bottom: 0,
                    }}
                >
                    <defs>
                        <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#DC2626" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#DC2626" stopOpacity={0.1} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                    <XAxis
                        dataKey="dateStr"
                        tick={{ fill: '#737373', fontSize: 9, fontWeight: 'bold' }}
                        axisLine={false}
                        tickLine={false}
                        interval={2}
                    />
                    <YAxis
                        tick={{ fill: '#737373', fontSize: 9, fontWeight: 'bold' }}
                        axisLine={false}
                        tickLine={false}
                        domain={[0, totalHabits > 0 ? totalHabits : 5]}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a' }}
                        itemStyle={{ color: '#DC2626' }}
                        labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
                        cursor={{ stroke: 'rgba(255,255,255,0.1)' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="completed"
                        stroke="#DC2626"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorCompleted)"
                        animationDuration={800}
                        isAnimationActive={true}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
