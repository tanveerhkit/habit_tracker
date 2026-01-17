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
