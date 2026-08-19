import { NextResponse } from 'next/server';
import TimerLog from '@/models/TimerLog';
import { getAuthenticatedUser } from '@/lib/auth';
import { startOfDay, endOfDay, subDays } from 'date-fns';

export async function POST(request: Request) {
    try {
        const user = await getAuthenticatedUser(request);
        if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        const body = await request.json();
        const { category, startTime, endTime, duration } = body;
        if (!['Study', 'Other', 'Food'].includes(category) || !startTime || !endTime || !Number.isFinite(Number(duration)) || Number(duration) <= 0) return NextResponse.json({ error: 'Valid category, times, and duration are required' }, { status: 400 });

        const log = await TimerLog.create({
            userId: user._id,
            category,
            startTime,
            endTime,
            duration
        });

        return NextResponse.json(log, { status: 201 });
    } catch (error) {
        console.error("POST /api/timer error:", error);
        return NextResponse.json({ error: 'Failed to create timer log' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const user = await getAuthenticatedUser(request);
        if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        const { searchParams } = new URL(request.url);
        const range = searchParams.get('range'); // 'today' or 'week'

        let query: Record<string, unknown> = { userId: user._id };
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

        const logs = await TimerLog.find(query).sort({ startTime: -1 }).lean();
        return NextResponse.json(logs);
    } catch (error) {
        console.error("GET /api/timer error:", error);
        return NextResponse.json({ error: 'Failed to fetch timer logs' }, { status: 500 });
    }
}
