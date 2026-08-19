import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { comparePassword, createSessionToken, normalizeEmail, publicUser, setSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? normalizeEmail(body.email) : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!email || !password) return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });

    await dbConnect();
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !(await comparePassword(password, user.passwordHash))) return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });

    const response = NextResponse.json({ user: publicUser(user) });
    setSessionCookie(response, await createSessionToken(String(user._id)));
    return response;
  } catch (error) {
    console.error('POST /api/auth/login error:', error);
    return NextResponse.json({ error: 'Unable to sign you in right now.' }, { status: 500 });
  }
}
