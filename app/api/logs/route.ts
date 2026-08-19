import { NextResponse } from 'next/server';
import HabitLog from '@/models/HabitLog';
import Habit from '@/models/Habit';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(request: Request) {
    try {
        const user = await getAuthenticatedUser(request);
        if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        if (!startDate || !endDate) return NextResponse.json({ error: 'Start date and end date are required' }, { status: 400 });

        const start = new Date(startDate);
        const end = new Date(endDate);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });

        const habitIds = await Habit.find({ userId: user._id }).distinct('_id');
        const logs = await HabitLog.find({ userId: user._id, habitId: { $in: habitIds }, date: { $gte: start, $lte: end } }).sort({ date: 1 }).lean();
        return NextResponse.json(logs);
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
        const { habitId, date, completed, value } = body;
        if (!habitId || !date || typeof completed !== 'boolean') return NextResponse.json({ error: 'Habit, date, and completed status are required' }, { status: 400 });

        const targetDate = new Date(date);
        const ownedHabit = await Habit.exists({ _id: habitId, userId: user._id });
        if (!ownedHabit) return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
        if (Number.isNaN(targetDate.getTime())) return NextResponse.json({ error: 'Invalid date' }, { status: 400 });

        const log = await HabitLog.findOneAndUpdate(
            { userId: user._id, habitId, date: targetDate },
            { $set: { completed, ...(typeof value === 'number' ? { value } : {}) } },
            { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
        ).lean();

        return NextResponse.json(log);
    } catch (error) {
        console.error('POST /api/logs error:', error);
        return NextResponse.json({ error: 'Failed to update log' }, { status: 500 });
    }
}
