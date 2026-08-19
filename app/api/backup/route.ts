import { NextResponse } from 'next/server';
import { isValidObjectId } from 'mongoose';
import Habit from '@/models/Habit';
import HabitLog from '@/models/HabitLog';
import TimerLog from '@/models/TimerLog';
import { getAuthenticatedUser } from '@/lib/auth';

const MAX_RECORDS = 10000;

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function cleanDate(value: unknown) {
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value.slice(0, MAX_RECORDS) : [];
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const [habits, logs, timerLogs] = await Promise.all([
      Habit.find({ userId: user._id }).sort({ order: 1, createdAt: 1 }).lean(),
      HabitLog.find({ userId: user._id }).sort({ date: 1 }).lean(),
      TimerLog.find({ userId: user._id }).sort({ startTime: 1 }).lean(),
    ]);

    return NextResponse.json({ version: 1, exportedAt: new Date().toISOString(), habits, logs, timerLogs });
  } catch (error) {
    console.error('GET /api/backup error:', error);
    return NextResponse.json({ error: 'Unable to export backup data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await request.json();
    if (body?.version !== 1 || !body || typeof body !== 'object') return NextResponse.json({ error: 'Unsupported backup format' }, { status: 400 });

    const habitRecords = asArray(body.habits);
    const logRecords = asArray(body.logs);
    const timerRecords = asArray(body.timerLogs);
    const habitIdMap = new Map<string, string>();
    let habitsImported = 0;
    let logsImported = 0;
    let timerLogsImported = 0;

    for (const record of habitRecords) {
      if (!record || typeof record !== 'object') continue;
      const name = cleanText(record.name, 120);
      if (!name) continue;
      const oldId = typeof record._id === 'string' ? record._id : '';
      const existing = isValidObjectId(oldId) ? await Habit.findOne({ _id: oldId, userId: user._id }) : null;
      const values = {
        name,
        description: cleanText(record.description, 500),
        icon: cleanText(record.icon, 12) || '•',
        color: cleanText(record.color, 32) || '#6f7f55',
        goal: Number.isFinite(Number(record.goal)) ? Math.max(0, Number(record.goal)) : 0,
        order: Number.isFinite(Number(record.order)) ? Number(record.order) : 0,
      };
      const habit = existing
        ? await Habit.findOneAndUpdate({ _id: existing._id, userId: user._id }, values, { new: true, runValidators: true })
        : await Habit.create({ ...values, userId: user._id });
      if (habit) {
        habitsImported += 1;
        if (oldId) habitIdMap.set(oldId, String(habit._id));
      }
    }

    for (const record of logRecords) {
      if (!record || typeof record !== 'object') continue;
      const mappedHabitId = typeof record.habitId === 'string' ? habitIdMap.get(record.habitId) : undefined;
      const date = cleanDate(record.date);
      if (!mappedHabitId || !date) continue;
      await HabitLog.findOneAndUpdate(
        { userId: user._id, habitId: mappedHabitId, date },
        { $set: { completed: Boolean(record.completed), ...(Number.isFinite(Number(record.value)) ? { value: Number(record.value) } : {}) } },
        { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
      );
      logsImported += 1;
    }

    for (const record of timerRecords) {
      if (!record || typeof record !== 'object') continue;
      const startTime = cleanDate(record.startTime);
      const endTime = cleanDate(record.endTime);
      const duration = Number(record.duration);
      const category = record.category;
      if (!startTime || !endTime || !Number.isFinite(duration) || duration <= 0 || !['Study', 'Other', 'Food'].includes(category)) continue;
      const duplicate = await TimerLog.exists({ userId: user._id, category, startTime, endTime, duration });
      if (!duplicate) {
        await TimerLog.create({ userId: user._id, category, startTime, endTime, duration });
        timerLogsImported += 1;
      }
    }

    return NextResponse.json({ habitsImported, logsImported, timerLogsImported });
  } catch (error) {
    console.error('POST /api/backup error:', error);
    return NextResponse.json({ error: 'Unable to import backup data' }, { status: 500 });
  }
}
