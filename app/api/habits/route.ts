import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Habit from '@/models/Habit';

export async function GET() {
    try {
        await dbConnect();
        const habits = await Habit.find({}).sort({ order: 1 });
        return NextResponse.json(habits);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch habits' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        await dbConnect();
        const body = await request.json();
        // Ensure description is handled if present
        const habit = await Habit.create(body);
        return NextResponse.json(habit, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'Failed to create habit' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        await dbConnect();
        const body = await request.json();
        const { _id, ...updates } = body;

        if (!_id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const habit = await Habit.findByIdAndUpdate(_id, updates, { new: true });
        return NextResponse.json(habit);
    } catch {
        return NextResponse.json({ error: 'Failed to update habit' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        await Habit.findByIdAndDelete(id);
        // Cascade delete logs
        const HabitLog = (await import('@/models/HabitLog')).default;
        await HabitLog.deleteMany({ habitId: id });

        return NextResponse.json({ message: 'Deleted successfully' });
    } catch {
        return NextResponse.json({ error: 'Failed to delete habit' }, { status: 500 });
    }
}
