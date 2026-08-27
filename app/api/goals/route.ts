import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { mapGoal, type GoalLogRow, type GoalRow } from '@/lib/supabase-mappers';

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function cleanDate(value: unknown) {
  if (typeof value !== 'string' || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function cleanDateKey(value: unknown) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (!Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value) return value;
  }
  const date = cleanDate(value);
  return date ? date.slice(0, 10) : null;
}

async function getGoalData(userId: string) {
  const supabase = getSupabaseAdmin();
  const [goalsResult, logsResult] = await Promise.all([
    supabase.from('goals').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
    supabase.from('goal_logs').select('id, goal_id, date, completed').eq('user_id', userId).eq('completed', true).order('date', { ascending: true }),
  ]);
  if (goalsResult.error) throw goalsResult.error;
  if (logsResult.error) throw logsResult.error;
  const datesByGoal = new Map<string, string[]>();
  for (const row of (logsResult.data || []) as GoalLogRow[]) {
    const dates = datesByGoal.get(row.goal_id) || [];
    dates.push(row.date);
    datesByGoal.set(row.goal_id, dates);
  }
  return (goalsResult.data || []).map((row) => mapGoal(row as GoalRow, datesByGoal.get(String(row.id)) || []));
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    return NextResponse.json(await getGoalData(user.id));
  } catch (error) {
    console.error('GET /api/goals error:', error);
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const body = await request.json();
    const title = cleanText(body?.title, 160);
    const note = cleanText(body?.note, 500);
    const completed = typeof body?.completed === 'boolean' ? body.completed : false;
    const completedAt = completed ? cleanDate(body?.completedAt) : null;
    const rawCompletionDates: unknown[] = Array.isArray(body?.completionDates) ? body.completionDates : [];
    const completionDates = Array.from(new Set(rawCompletionDates.map(cleanDateKey).filter((date): date is string => Boolean(date))));
    const completionDate = completed ? cleanDateKey(body?.completionDate || completedAt) : null;
    if (completionDate) completionDates.push(completionDate);
    if (!title) return NextResponse.json({ error: 'Goal title is required' }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('goals').insert({
      user_id: user.id,
      title,
      note,
      completed,
      completed_at: completedAt,
      updated_at: new Date().toISOString(),
    }).select('*').single();
    if (error || !data) throw error || new Error('Goal was not created');
    if (completionDates.length) {
      const log = await supabase.from('goal_logs').upsert(completionDates.map((date) => ({ user_id: user.id, goal_id: data.id, date, completed: true })), { onConflict: 'user_id,goal_id,date' });
      if (log.error) throw log.error;
    }
    return NextResponse.json(mapGoal(data as GoalRow, completionDates), { status: 201 });
  } catch (error) {
    console.error('POST /api/goals error:', error);
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const body = await request.json();
    const id = typeof body?._id === 'string' ? body._id : typeof body?.id === 'string' ? body.id : '';
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const existing = await supabase.from('goals').select('*').eq('id', id).eq('user_id', user.id).maybeSingle();
    if (existing.error) throw existing.error;
    if (!existing.data) return NextResponse.json({ error: 'Goal not found' }, { status: 404 });

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) {
      const title = cleanText(body.title, 160);
      if (!title) return NextResponse.json({ error: 'Goal title is required' }, { status: 400 });
      updates.title = title;
    }
    if (body.note !== undefined) updates.note = cleanText(body.note, 500);

    const hasCompletionChange = typeof body.completed === 'boolean';
    const completionDate = cleanDateKey(body.completionDate || body.completedAt || new Date().toISOString());
    if (hasCompletionChange) {
      updates.completed = body.completed;
      updates.completed_at = body.completed ? cleanDate(body.completedAt) || new Date().toISOString() : null;
    }

    const updated = await supabase.from('goals').update(updates).eq('id', id).eq('user_id', user.id).select('*').single();
    if (updated.error) throw updated.error;

    if (hasCompletionChange && completionDate) {
      const log = body.completed
        ? await supabase.from('goal_logs').upsert({ user_id: user.id, goal_id: id, date: completionDate, completed: true }, { onConflict: 'user_id,goal_id,date' })
        : await supabase.from('goal_logs').delete().eq('user_id', user.id).eq('goal_id', id).eq('date', completionDate);
      if (log.error) throw log.error;
    }

    const logs = await supabase.from('goal_logs').select('date').eq('user_id', user.id).eq('goal_id', id).eq('completed', true).order('date', { ascending: true });
    if (logs.error) throw logs.error;
    return NextResponse.json(mapGoal(updated.data as GoalRow, (logs.data || []).map((row) => row.date)));
  } catch (error) {
    console.error('PUT /api/goals error:', error);
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    const { data, error } = await getSupabaseAdmin().from('goals').delete().eq('id', id).eq('user_id', user.id).select('id').maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/goals error:', error);
    return NextResponse.json({ error: 'Failed to delete goal' }, { status: 500 });
  }
}
