import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { mapHabitLog } from '@/lib/supabase-mappers';

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const startDate = new Date(searchParams.get('startDate') || '');
    const endDate = new Date(searchParams.get('endDate') || '');
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return NextResponse.json({ error: 'Valid startDate and endDate are required' }, { status: 400 });

    const { data, error } = await getSupabaseAdmin()
      .from('habit_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString())
      .order('date', { ascending: true });
    if (error) throw error;
    return NextResponse.json((data || []).map(mapHabitLog));
  } catch (error) {
    console.error('GET /api/logs error:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const body = await request.json();
    const habitId = typeof body?.habitId === 'string' ? body.habitId : '';
    const date = new Date(String(body?.date || ''));
    if (!habitId || Number.isNaN(date.getTime()) || typeof body.completed !== 'boolean') return NextResponse.json({ error: 'Habit, date, and completed status are required' }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { data: habit, error: habitError } = await supabase.from('habits').select('id').eq('id', habitId).eq('user_id', user.id).maybeSingle();
    if (habitError) throw habitError;
    if (!habit) return NextResponse.json({ error: 'Habit not found' }, { status: 404 });

    const payload: Record<string, unknown> = { user_id: user.id, habit_id: habitId, date: date.toISOString(), completed: body.completed };
    if (body.value !== undefined && Number.isFinite(Number(body.value))) payload.value = Number(body.value);
    const { data, error } = await supabase.from('habit_logs').upsert(payload, { onConflict: 'user_id,habit_id,date' }).select('*').single();
    if (error || !data) throw error || new Error('Log was not saved');
    return NextResponse.json(mapHabitLog(data));
  } catch (error) {
    console.error('POST /api/logs error:', error);
    return NextResponse.json({ error: 'Failed to update log' }, { status: 500 });
  }
}
