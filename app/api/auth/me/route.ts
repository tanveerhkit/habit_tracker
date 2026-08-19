import { NextResponse } from 'next/server';
import { getAuthenticatedUser, publicUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    return NextResponse.json({ user: user ? publicUser(user) : null });
  } catch (error) {
    console.error('GET /api/auth/me error:', error);
    return NextResponse.json({ user: null });
  }
}
