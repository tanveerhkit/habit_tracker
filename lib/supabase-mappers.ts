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

export type GoalLogRow = {
  id: string;
  goal_id: string;
  date: string;
  completed: boolean;
};

export type GoalRow = {
  id: string;
  title: string;
  note: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
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

export function mapGoal(row: GoalRow, completionDates: string[] = []) {
  return {
    id: row.id,
    title: row.title,
    note: row.note || '',
    completed: Boolean(row.completed),
    ...(row.completed_at ? { completedAt: row.completed_at } : {}),
    completionDates,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
