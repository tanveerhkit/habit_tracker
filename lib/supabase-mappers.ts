export type HabitRow = {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string | null;
  goal: number | null;
  display_order: number | null;
  created_at: string;
};

export type HabitLogRow = {
  id: string;
  habit_id: string;
  date: string;
  completed: boolean;
  value: number | null;
};

export type TimerLogRow = {
  id: string;
  category: string;
  start_time: string;
  end_time: string;
  duration: number;
};

export function mapHabit(row: HabitRow) {
  return {
    _id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    description: row.description || '',
    goal: Number(row.goal || 0),
    order: Number(row.display_order || 0),
    createdAt: row.created_at,
  };
}

export function mapHabitLog(row: HabitLogRow) {
  return {
    _id: row.id,
    habitId: row.habit_id,
    date: row.date,
    completed: Boolean(row.completed),
    ...(row.value === null || row.value === undefined ? {} : { value: Number(row.value) }),
  };
}

export function mapTimerLog(row: TimerLogRow) {
  return {
    _id: row.id,
    category: row.category,
    startTime: row.start_time,
    endTime: row.end_time,
    duration: Number(row.duration),
  };
}
