import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { mapTimerLog } from '@/lib/supabase-mappers';

const categories = ['Study', 'Other', 'Food'] as const;

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const body = await request.json();
    const category = body?.category;
    const startTime = new Date(String(body?.startTime || ''));
    const endTime = new Date(String(body?.endTime || ''));
    const duration = Number(body?.duration);
    if (!categories.includes(category) || Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime()) || !Number.isFinite(duration) || duration <= 0) {
      return NextResponse.json({ error: 'Valid category, timestamps, and duration are required' }, { status: 400 });
    }

    const { data, error } = await getSupabaseAdmin()
      .from('timer_logs')
      .insert({ user_id: user.id, category, start_time: startTime.toISOString(), end_time: endTime.toISOString(), duration: Math.round(duration) })
      .select('*')
      .single();
    if (error || !data) throw error || new Error('Timer session was not saved');
    return NextResponse.json(mapTimerLog(data), { status: 201 });
  } catch (error) {
    console.error('POST /api/timer error:', error);
    return NextResponse.json({ error: 'Failed to save timer session' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const range = new URL(request.url).searchParams.get('range') || 'month';
    const now = new Date();
    const start = new Date(now);
    if (range === 'today') start.setHours(0, 0, 0, 0);
    else if (range === 'week') {
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - 6);
    } else {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    }

    const { data, error } = await getSupabaseAdmin()
      .from('timer_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('start_time', start.toISOString())
      .lte('start_time', now.toISOString())
      .order('start_time', { ascending: false });
    if (error) throw error;
    return NextResponse.json((data || []).map(mapTimerLog));
  } catch (error) {
    console.error('GET /api/timer error:', error);
    return NextResponse.json({ error: 'Failed to fetch timer sessions' }, { status: 500 });
  }
}
