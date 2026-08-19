import { NextResponse } from 'next/server';
import Habit from '@/models/Habit';
import { getAuthenticatedUser } from '@/lib/auth';

const allowedFields = ['name', 'description', 'icon', 'color', 'goal', 'order'] as const;

type HabitUpdate = Partial<Record<(typeof allowedFields)[number], unknown>>;

function normalizeHabit(input: Record<string, unknown>): HabitUpdate {
    const result: HabitUpdate = {};
    for (const field of allowedFields) {
        if (input[field] !== undefined) result[field] = input[field];
    }
    if (typeof result.name === 'string') result.name = result.name.trim();
    if (typeof result.description === 'string') result.description = result.description.trim();
    if (typeof result.goal === 'string') result.goal = Number(result.goal) || 0;
    if (typeof result.order === 'string') result.order = Number(result.order) || 0;
    return result;
}

export async function GET(request: Request) {
    try {
        const user = await getAuthenticatedUser(request);
        if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        const habits = await Habit.find({ userId: user._id }).sort({ order: 1, createdAt: 1 }).lean();
        return NextResponse.json(habits);
    } catch (error) {
        console.error('GET /api/habits error:', error);
        return NextResponse.json({ error: 'Failed to fetch habits' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const user = await getAuthenticatedUser(request);
        if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        const body = await request.json();
        const values = normalizeHabit(body);
        if (!values.name || typeof values.name !== 'string') return NextResponse.json({ error: 'Habit name is required' }, { status: 400 });
        const habit = await Habit.create({ ...values, userId: user._id });
        return NextResponse.json(habit, { status: 201 });
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
        const { _id, ...input } = body;
        if (!_id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
        const updates = normalizeHabit(input);
        if (updates.name === '') return NextResponse.json({ error: 'Habit name is required' }, { status: 400 });
        const habit = await Habit.findOneAndUpdate({ _id, userId: user._id }, updates, { new: true, runValidators: true }).lean();
        if (!habit) return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
        return NextResponse.json(habit);
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
                id = body.id || body._id;
            } catch {
                // Query string is the normal path; body is only a fallback.
            }
        }
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
        const deletedHabit = await Habit.findOneAndDelete({ _id: id, userId: user._id });
        if (!deletedHabit) return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
        const HabitLog = (await import('@/models/HabitLog')).default;
        await HabitLog.deleteMany({ habitId: id, userId: user._id });
        return NextResponse.json({ message: 'Deleted successfully' });
    } catch (error) {
        console.error('DELETE /api/habits error:', error);
        return NextResponse.json({ error: 'Failed to delete habit' }, { status: 500 });
    }
}
