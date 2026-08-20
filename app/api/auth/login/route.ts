import { NextResponse } from 'next/server';
import { comparePassword, createSessionToken, normalizeEmail, publicUser, setSessionCookie } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === 'string' ? normalizeEmail(body.email) : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    if (!email || !password) return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });

    const { data: user, error } = await getSupabaseAdmin()
      .from('users')
      .select('id, name, email, password_hash')
      .eq('email', email)
      .maybeSingle();
    if (error) throw error;
    if (!user || !(await comparePassword(password, user.password_hash))) return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });

    const response = NextResponse.json({ user: publicUser(user) });
    setSessionCookie(response, await createSessionToken(user.id));
    return response;
  } catch (error) {
    console.error('POST /api/auth/login error:', error);
    return NextResponse.json({ error: 'Unable to sign you in right now.' }, { status: 500 });
  }
}
