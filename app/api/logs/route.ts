import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import HabitLog from '@/models/HabitLog';

export async function GET(request: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        if (!startDate || !endDate) return NextResponse.json({ error: 'Start date and end date are required' }, { status: 400 });

        const start = new Date(startDate);
        const end = new Date(endDate);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });

        const logs = await HabitLog.find({ date: { $gte: start, $lte: end } }).sort({ date: 1 }).lean();
        return NextResponse.json(logs);
    } catch (error) {
        console.error('GET /api/logs error:', error);
        return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        await dbConnect();
        const body = await request.json();
        const { habitId, date, completed, value } = body;
        if (!habitId || !date || typeof completed !== 'boolean') return NextResponse.json({ error: 'Habit, date, and completed status are required' }, { status: 400 });

        const targetDate = new Date(date);
        if (Number.isNaN(targetDate.getTime())) return NextResponse.json({ error: 'Invalid date' }, { status: 400 });

        const log = await HabitLog.findOneAndUpdate(
            { habitId, date: targetDate },
            { $set: { completed, ...(typeof value === 'number' ? { value } : {}) } },
            { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
        ).lean();

        return NextResponse.json(log);
    } catch (error) {
        console.error('POST /api/logs error:', error);
        return NextResponse.json({ error: 'Failed to update log' }, { status: 500 });
    }
}
