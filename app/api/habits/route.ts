import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Habit from '@/models/Habit';

export async function GET() {
    try {
        await dbConnect();
        const habits = await Habit.find({}).sort({ order: 1 });
        return NextResponse.json(habits);
    } catch (error) {
        console.error("GET /api/habits error:", error);
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
    } catch (error) {
        console.error("POST /api/habits error:", error);
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
    } catch (error) {
        console.error("PUT /api/habits error:", error);
        return NextResponse.json({ error: 'Failed to update habit' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        let id = searchParams.get('id');

        // Fallback to body if not in query
        if (!id) {
            try {
                const body = await request.clone().json();
                id = body.id || body._id;
            } catch {
                // Ignore body parse error
            }
        }

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        console.log('API: Deleting habit with ID:', id);
        const deletedHabit = await Habit.findByIdAndDelete(id);
        
        if (!deletedHabit) {
            console.warn('API: Habit not found for ID:', id);
            return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
        }

        // Cascade delete logs
        const HabitLog = (await import('@/models/HabitLog')).default;
        await HabitLog.deleteMany({ habitId: id });

        return NextResponse.json({ message: 'Deleted successfully' });
    } catch (error) {
        console.error("DELETE /api/habits error:", error);
        return NextResponse.json({ error: 'Failed to delete habit' }, { status: 500 });
    }
}
