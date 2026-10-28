import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const COOKIE = 'agenda_admin';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 días

const secret = () => process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || '';
const sign = (value) => createHmac('sha256', secret()).update(value).digest('hex');

function safeEqual(a, b) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function checkPassword(password) {
  const expected = process.env.ADMIN_PASSWORD;
  return Boolean(expected) && typeof password === 'string' && safeEqual(sign(password), sign(expected));
}

export async function startSession() {
  const exp = String(Date.now() + MAX_AGE * 1000);
  (await cookies()).set(COOKIE, `${exp}.${sign(exp)}`, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: MAX_AGE, path: '/',
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin() {
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value || !secret()) return false;
  const [exp, sig] = value.split('.');
  return Boolean(exp && sig) && safeEqual(sig, sign(exp)) && Number(exp) > Date.now();
}

export async function requireAdmin(next = '/admin') {
  if (!(await isAdmin())) redirect(`/admin/login?next=${encodeURIComponent(next)}`);
}
