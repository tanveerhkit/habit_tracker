import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { mapGoal, mapHabit, mapHabitLog, mapTimerLog, type GoalRow, type HabitRow } from '@/lib/supabase-mappers';

const MAX_RECORDS = 10000;

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function cleanDate(value: unknown) {
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value.slice(0, MAX_RECORDS) : [];
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const supabase = getSupabaseAdmin();
    const [habitsResult, goalsResult, goalLogsResult, logsResult, timerResult] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', user.id).order('display_order', { ascending: true }).order('created_at', { ascending: true }),
      supabase.from('goals').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
      supabase.from('goal_logs').select('goal_id, date, completed').eq('user_id', user.id).eq('completed', true).order('date', { ascending: true }),
      supabase.from('habit_logs').select('*').eq('user_id', user.id).order('date', { ascending: true }),
      supabase.from('timer_logs').select('*').eq('user_id', user.id).order('start_time', { ascending: true }),
    ]);
    if (habitsResult.error) throw habitsResult.error;
    if (goalsResult.error) throw goalsResult.error;
    if (goalLogsResult.error) throw goalLogsResult.error;
    if (logsResult.error) throw logsResult.error;
    if (timerResult.error) throw timerResult.error;
    const goalDates = new Map<string, string[]>();
    for (const row of goalLogsResult.data || []) {
      const dates = goalDates.get(String(row.goal_id)) || [];
      dates.push(String(row.date));
      goalDates.set(String(row.goal_id), dates);
    }
    return NextResponse.json({
      version: 1,
      exportedAt: new Date().toISOString(),
      habits: (habitsResult.data || []).map(mapHabit),
      goals: (goalsResult.data || []).map((row) => mapGoal(row as GoalRow, goalDates.get(String(row.id)) || [])),
      logs: (logsResult.data || []).map(mapHabitLog),
      timerLogs: (timerResult.data || []).map(mapTimerLog),
    });
  } catch (error) {
    console.error('GET /api/backup error:', error);
    return NextResponse.json({ error: 'Unable to export backup data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const body = await request.json();
    if (!body || typeof body !== 'object' || body.version !== 1) return NextResponse.json({ error: 'Unsupported backup format' }, { status: 400 });

    const habitRecords = asArray(body.habits);
    const goalRecords = asArray(body.goals);
    const logRecords = asArray(body.logs);
    const timerRecords = asArray(body.timerLogs);
    const habitIdMap = new Map<string, string>();
    const supabase = getSupabaseAdmin();
    let habitsImported = 0;
    let goalsImported = 0;
    let logsImported = 0;
    let timerLogsImported = 0;

    for (const record of habitRecords) {
      if (!record || typeof record !== 'object') continue;
      const name = cleanText(record.name, 120);
      if (!name) continue;
      const oldId = typeof record._id === 'string' ? record._id : '';
      const values = {
        name,
        description: cleanText(record.description, 500),
        icon: cleanText(record.icon, 12) || '•',
        color: cleanText(record.color, 32) || '#6f7f55',
        goal: Number.isFinite(Number(record.goal)) ? Math.max(0, Number(record.goal)) : 0,
        display_order: Number.isFinite(Number(record.order)) ? Number(record.order) : 0,
      };

      let habit: HabitRow | null = null;
      if (oldId) {
        const existing = await supabase.from('habits').select('*').eq('id', oldId).eq('user_id', user.id).maybeSingle();
        if (existing.error) throw existing.error;
        if (existing.data) {
          const updated = await supabase.from('habits').update(values).eq('id', oldId).eq('user_id', user.id).select('*').single();
          if (updated.error) throw updated.error;
          habit = updated.data as HabitRow;
        }
      }
      if (!habit) {
        const created = await supabase.from('habits').insert({ ...values, user_id: user.id }).select('*').single();
        if (created.error) throw created.error;
        habit = created.data as HabitRow;
      }
      habitsImported += 1;
      if (oldId && habit) habitIdMap.set(oldId, String(habit.id));
    }

    for (const record of goalRecords) {
      if (!record || typeof record !== 'object') continue;
      const title = cleanText(record.title, 160);
      if (!title) continue;
      const oldId = typeof record.id === 'string' ? record.id : typeof record._id === 'string' ? record._id : '';
      const completed = typeof record.completed === 'boolean' ? record.completed : false;
      const completedAt = completed ? cleanDate(record.completedAt) : null;
      const rawCompletionDates: unknown[] = Array.isArray(record.completionDates) ? record.completionDates : [];
      const completionDates = rawCompletionDates
        .map((date) => cleanDate(date))
        .filter((date): date is Date => Boolean(date))
        .map((date: Date) => date.toISOString().slice(0, 10));
      if (completedAt) completionDates.push(completedAt.toISOString().slice(0, 10));
      const values = { title, note: cleanText(record.note, 500), completed, completed_at: completedAt ? completedAt.toISOString() : null, updated_at: new Date().toISOString() };
      let goal: GoalRow | null = null;
      if (oldId) {
        const existing = await supabase.from('goals').select('*').eq('id', oldId).eq('user_id', user.id).maybeSingle();
        if (existing.error) throw existing.error;
        if (existing.data) {
          const updated = await supabase.from('goals').update(values).eq('id', oldId).eq('user_id', user.id).select('*').single();
          if (updated.error) throw updated.error;
          goal = updated.data as GoalRow;
        }
      }
      if (!goal) {
        const created = await supabase.from('goals').insert({ ...values, user_id: user.id }).select('*').single();
        if (created.error) throw created.error;
        goal = created.data as GoalRow;
      }
      goalsImported += 1;
      const goalDates = Array.from(new Set(completionDates));
      if (goalDates.length) {
        const goalLogs = goalDates.map((date) => ({ user_id: user.id, goal_id: String(goal?.id), date, completed: true }));
        const insertedLogs = await supabase.from('goal_logs').upsert(goalLogs, { onConflict: 'user_id,goal_id,date' });
        if (insertedLogs.error) throw insertedLogs.error;
      }
    }

    for (const record of logRecords) {
      if (!record || typeof record !== 'object') continue;
      const mappedHabitId = typeof record.habitId === 'string' ? habitIdMap.get(record.habitId) : undefined;
      const date = cleanDate(record.date);
      if (!mappedHabitId || !date) continue;
      const payload: Record<string, unknown> = { user_id: user.id, habit_id: mappedHabitId, date: date.toISOString(), completed: Boolean(record.completed) };
      if (Number.isFinite(Number(record.value))) payload.value = Number(record.value);
      const result = await supabase.from('habit_logs').upsert(payload, { onConflict: 'user_id,habit_id,date' });
      if (result.error) throw result.error;
      logsImported += 1;
    }

    for (const record of timerRecords) {
      if (!record || typeof record !== 'object') continue;
      const startTime = cleanDate(record.startTime);
      const endTime = cleanDate(record.endTime);
      const duration = Number(record.duration);
      const category = record.category;
      if (!startTime || !endTime || !Number.isFinite(duration) || duration <= 0 || !['Study', 'Other', 'Food'].includes(category)) continue;
      const duplicate = await supabase.from('timer_logs').select('id').eq('user_id', user.id).eq('category', category).eq('start_time', startTime.toISOString()).eq('end_time', endTime.toISOString()).eq('duration', Math.round(duration)).maybeSingle();
      if (duplicate.error) throw duplicate.error;
      if (!duplicate.data) {
        const inserted = await supabase.from('timer_logs').insert({ user_id: user.id, category, start_time: startTime.toISOString(), end_time: endTime.toISOString(), duration: Math.round(duration) });
        if (inserted.error) throw inserted.error;
        timerLogsImported += 1;
      }
    }

    return NextResponse.json({ habitsImported, goalsImported, logsImported, timerLogsImported });
  } catch (error) {
    console.error('POST /api/backup error:', error);
    return NextResponse.json({ error: 'Unable to import backup data' }, { status: 500 });
  }
}
