import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import HabitLog from '@/models/HabitLog';
import { startOfMonth, endOfMonth, parseISO } from 'date-fns';

export async function GET(request: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        if (!startDate || !endDate) {
            return NextResponse.json({ error: 'StartDate and EndDate required' }, { status: 400 });
        }

        const logs = await HabitLog.find({
            date: { $gte: new Date(startDate), $lte: new Date(endDate) }
        });
        return NextResponse.json(logs);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        await dbConnect();
        const body = await request.json();
        const { habitId, date, completed, value } = body;

        // date should be normalized to start of day by client or here
        // assuming client sends YYYY-MM-DD or ISO string
        const targetDate = new Date(date);

        // Upsert
        const log = await HabitLog.findOneAndUpdate(
            { habitId, date: targetDate },
            { completed, value },
            { upsert: true, new: true }
        );

        return NextResponse.json(log);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to update log' }, { status: 500 });
    }
}
