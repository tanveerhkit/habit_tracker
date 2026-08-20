import bcrypt from 'bcryptjs';
import { jwtVerify, SignJWT } from 'jose';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const SESSION_COOKIE = 'habitly_session';
const SESSION_DAYS = 30;

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') throw new Error('AUTH_SECRET is not configured');
  return new TextEncoder().encode(secret || 'habitly-development-secret-change-me');
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function validatePassword(password: string) {
  return password.length >= 8;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(userId: string) {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getAuthSecret());
}

export async function getSessionUserId(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  if (!match?.[1]) return null;

  try {
    const { payload } = await jwtVerify(match[1], getAuthSecret());
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function getAuthenticatedUser(request: Request) {
  const userId = await getSessionUserId(request);
  if (!userId) return null;

  const { data, error } = await getSupabaseAdmin()
    .from('users')
    .select('id, name, email, password_hash')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    _id: data.id,
    name: data.name,
    email: data.email,
    passwordHash: data.password_hash,
  };
}

export function publicUser(user: { id?: unknown; _id?: unknown; name: string; email: string }) {
  return { id: String(user.id ?? user._id), name: user.name, email: user.email };
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
