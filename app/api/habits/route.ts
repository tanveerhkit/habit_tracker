import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { mapHabit } from '@/lib/supabase-mappers';

const allowedFields = ['name', 'description', 'icon', 'color', 'goal', 'order'] as const;
type HabitUpdate = Partial<Record<(typeof allowedFields)[number], unknown>>;

function normalizeHabit(input: Record<string, unknown>): HabitUpdate {
  const result: HabitUpdate = {};
  for (const field of allowedFields) if (input[field] !== undefined) result[field] = input[field];
  if (typeof result.name === 'string') result.name = result.name.trim();
  if (typeof result.description === 'string') result.description = result.description.trim();
  if (typeof result.goal === 'string' || typeof result.goal === 'number') result.goal = Math.max(0, Number(result.goal) || 0);
  if (typeof result.order === 'string' || typeof result.order === 'number') result.order = Number(result.order) || 0;
  return result;
}

function toDbValues(values: HabitUpdate) {
  const result: Record<string, unknown> = {};
  if (values.name !== undefined) result.name = values.name;
  if (values.description !== undefined) result.description = values.description;
  if (values.icon !== undefined) result.icon = values.icon;
  if (values.color !== undefined) result.color = values.color;
  if (values.goal !== undefined) result.goal = values.goal;
  if (values.order !== undefined) result.display_order = values.order;
  return result;
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const { data, error } = await getSupabaseAdmin().from('habits').select('*').eq('user_id', user.id).order('display_order', { ascending: true }).order('created_at', { ascending: true });
    if (error) throw error;
    return NextResponse.json((data || []).map(mapHabit));
  } catch (error) {
    console.error('GET /api/habits error:', error);
    return NextResponse.json({ error: 'Failed to fetch habits' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const values = normalizeHabit(await request.json());
    if (!values.name || typeof values.name !== 'string') return NextResponse.json({ error: 'Habit name is required' }, { status: 400 });
    const { data, error } = await getSupabaseAdmin().from('habits').insert({ user_id: user.id, ...toDbValues(values) }).select('*').single();
    if (error || !data) throw error || new Error('Habit was not created');
    return NextResponse.json(mapHabit(data), { status: 201 });
  } catch (error) {
    console.error('POST /api/habits error:', error);
    return NextResponse.json({ error: 'Failed to create habit' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const body = await request.json();
    const { _id, ...input } = body || {};
    if (!_id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    const updates = normalizeHabit(input);
    if (updates.name === '') return NextResponse.json({ error: 'Habit name is required' }, { status: 400 });
    const { data, error } = await getSupabaseAdmin().from('habits').update(toDbValues(updates)).eq('id', String(_id)).eq('user_id', user.id).select('*').maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
    return NextResponse.json(mapHabit(data));
  } catch (error) {
    console.error('PUT /api/habits error:', error);
    return NextResponse.json({ error: 'Failed to update habit' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');
    if (!id) {
      try {
        const body = await request.json();
        id = body?.id || body?._id;
      } catch {
        // Query string is the normal path; body is a fallback.
      }
    }
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('habits').delete().eq('id', String(id)).eq('user_id', user.id).select('id').maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/habits error:', error);
    return NextResponse.json({ error: 'Failed to delete habit' }, { status: 500 });
  }
}
