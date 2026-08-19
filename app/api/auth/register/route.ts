import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { createSessionToken, hashPassword, normalizeEmail, publicUser, setSessionCookie, validatePassword } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? normalizeEmail(body.email) : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (name.length < 2 || name.length > 80) return NextResponse.json({ error: 'Please enter a name between 2 and 80 characters.' }, { status: 400 });
    if (!email.includes('@') || email.length > 320) return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    if (!validatePassword(password)) return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });

    await dbConnect();
    const existing = await User.findOne({ email }).select('_id').lean();
    if (existing) return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });

    const user = await User.create({ name, email, passwordHash: await hashPassword(password) });
    const response = NextResponse.json({ user: publicUser(user) }, { status: 201 });
    setSessionCookie(response, await createSessionToken(String(user._id)));
    return response;
  } catch (error) {
    console.error('POST /api/auth/register error:', error);
    return NextResponse.json({ error: 'Unable to create your account right now.' }, { status: 500 });
  }
}
