import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import TimerLog from '@/models/TimerLog';
import { startOfDay, endOfDay, subDays } from 'date-fns';

export async function POST(request: Request) {
    try {
        await dbConnect();
        const body = await request.json();
        const { category, startTime, endTime, duration } = body;

        const log = await TimerLog.create({
            category,
            startTime,
            endTime,
            duration
        });

        return NextResponse.json(log, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'Failed to create timer log' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const range = searchParams.get('range'); // 'today' or 'week'

        let query = {};
        const now = new Date();

        if (range === 'today') {
            query = {
                startTime: { $gte: startOfDay(now), $lte: endOfDay(now) }
            };
        } else if (range === 'week') {
            query = {
                startTime: { $gte: subDays(now, 7) }
            };
        } else if (range === 'month') {
            query = {
                startTime: { $gte: subDays(now, 30) }
            };
        }

        const logs = await TimerLog.find(query).sort({ startTime: -1 });
        return NextResponse.json(logs);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch timer logs' }, { status: 500 });
    }
}
