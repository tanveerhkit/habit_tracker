"use client";

import React, { useMemo } from 'react';
import { IHabit, IHabitLog } from '@/lib/types';
import { getWeeksInMonth } from '@/lib/dateUtils';
import { format, isSameDay, parseISO, isSameMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface WeeklyGridProps {
    habits: IHabit[];
    logs: IHabitLog[];
    currentDate: Date;
    onToggle: (habitId: string, date: Date) => void;
}

export default function WeeklyGrid({ habits, logs, currentDate, onToggle }: WeeklyGridProps) {
    // Group days by week relative to the start of the year
    const weeks = useMemo(() => getWeeksInMonth(currentDate), [currentDate]);

    // Design requirement: Week 1, 2, 3, 4, 5 colors matching reference
    const weekConfig = [
        { bg: 'bg-neon-red', text: 'text-neon-red', border: 'border-neon-red' },
        { bg: 'bg-neon-green', text: 'text-neon-green', border: 'border-neon-green' },
        { bg: 'bg-neon-blue', text: 'text-neon-blue', border: 'border-neon-blue' },
        { bg: 'bg-neon-purple', text: 'text-neon-purple', border: 'border-neon-purple' },
        { bg: 'bg-neon-orange', text: 'text-neon-orange', border: 'border-neon-orange' }
    ];

    return (
        <div className="flex h-full w-full select-none">
            {weeks.map((weekDays, weekIndex) => {
                const config = weekConfig[weekIndex % 5];

                return (
                    <div key={weekIndex} className="flex flex-col flex-1 min-w-[150px]">
                        {/* Week Header */}
                        <div className={cn("h-8 flex items-center justify-center text-xs font-black uppercase text-black", config.bg)}>
                            Week {weekIndex + 1}
                        </div>

                        {/* Date Headers Row */}
                        <div className={cn("flex border-b border-white/10 bg-black/40", config.text)}>
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayName, i) => {
                                const date = weekDays[i];
                                const isCurrentMonth = isSameMonth(date, currentDate);
                                return (
                                    <div key={i} className={cn("flex-1 h-6 flex flex-col items-center justify-center text-[10px] font-bold border-r border-white/5 last:border-r-0", !isCurrentMonth && "opacity-30")}>
                                        {format(date, 'd')}
                                        <div className="text-[8px] opacity-60">{dayName}</div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Rows for Habits */}
                        <div className="flex-1 flex flex-col">
                            {habits.map(habit => (
                                <div key={habit._id} className="flex h-12 border-b border-white/5 items-center">
                                    {weekDays.map((day, i) => {
                                        const isCurrentMonth = isSameMonth(day, currentDate);
                                        const isCompleted = logs.some(l => l.habitId === habit._id && isSameDay(parseISO(l.date), day) && l.completed);
                                        return (
                                            <div
                                                key={day.toISOString()}
                                                onClick={() => onToggle(habit._id, day)}
                                                className={cn(
                                                    "flex-1 h-full flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors border-r border-white/5 last:border-r-0 group p-[2px]",
                                                    !isCurrentMonth && "opacity-30 bg-white/5" // Dim days from other months
                                                )}
                                            >
                                                {/* Checkbox Style */}
                                                <div className={cn(
                                                    "w-[18px] h-[18px] rounded-[2px] border flex items-center justify-center transition-all duration-200",
                                                    config.border,
                                                    isCompleted ? cn(config.bg, "text-black border-transparent") : "bg-transparent text-transparent hover:border-opacity-100 border-opacity-40"
                                                )}>
                                                    {isCompleted && <span className="font-bold text-[10px]">✓</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}

                            {/* Spacer to push stats to bottom if habits don't fill */}
                            <div className="flex-1 min-h-4"></div>

                            {/* Bottom Stats: Count */}
                            <div className="flex h-8 border-t border-white/10 bg-black/20">
                                {weekDays.map((day, i) => {
                                    const isCurrentMonth = isSameMonth(day, currentDate);
                                    const count = logs.filter(l => isSameDay(parseISO(l.date), day) && l.completed).length;
                                    return (
                                        <div key={day.toISOString()} className={cn("flex-1 flex items-center justify-center text-[10px] font-bold text-gray-400 border-r border-white/5", !isCurrentMonth && "opacity-30")}>
                                            {count}
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Bottom Stats: Percentage */}
                            <div className={cn("flex h-8 border-t border-white/10", config.bg, "bg-opacity-20")}>
                                {weekDays.map((day, i) => {
                                    const isCurrentMonth = isSameMonth(day, currentDate);
                                    const count = logs.filter(l => isSameDay(parseISO(l.date), day) && l.completed).length;
                                    const pct = habits.length > 0 ? Math.round((count / habits.length) * 100) : 0;
                                    return (
                                        <div key={day.toISOString()} className={cn("flex-1 flex items-center justify-center text-[9px] font-bold border-r border-white/5", config.text, !isCurrentMonth && "opacity-30")}>
                                            {pct}%
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div >
    );
}
