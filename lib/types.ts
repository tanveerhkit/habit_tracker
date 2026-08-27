// lib/types.ts
export interface IHabit {
    _id: string;
    name: string;
    icon: string;
    color: string;
    description?: string;
    goal: number;
    order: number;
}

export interface IHabitLog {
    _id: string;
    habitId: string;
    date: string; // ISO string
    completed: boolean;
    value?: number;
}

export interface IGoal {
    id: string;
    title: string;
    note: string;
    completed: boolean;
    completedAt?: string;
    completionDates?: string[];
    createdAt?: string;
    updatedAt?: string;
}

export interface IBackupPayload {
    version: 1;
    exportedAt?: string;
    habits: IHabit[];
    goals: IGoal[];
    logs: IHabitLog[];
    timerLogs: Array<{ _id: string; category: 'Study' | 'Other' | 'Food'; startTime: string; endTime: string; duration: number }>;
}
