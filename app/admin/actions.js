'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { checkPassword, endSession, requireAdmin, startSession } from '@/lib/auth';
import { sql } from '@/lib/db';
import { addDays, isDate, isTime } from '@/lib/time';

const str = (fd, key) => String(fd.get(key) ?? '').trim();
const back = (fd, fallback) => {
  const target = str(fd, 'back');
  return target.startsWith('/admin') ? target : fallback;
};

function done(fd, fallback, message) {
  revalidatePath('/', 'layout');
  const url = back(fd, fallback);
  redirect(message ? `${url}${url.includes('?') ? '&' : '?'}msg=${encodeURIComponent(message)}` : url);
}

export async function login(_prev, fd) {
  if (!checkPassword(str(fd, 'password'))) return { error: 'Clave incorrecta' };
  await startSession();
  const next = str(fd, 'next');
  redirect(next.startsWith('/admin') ? next : '/admin');
}

export async function logout() {
  await endSession();
  redirect('/admin/login');
}

// Reservas
export async function setBookingStatus(fd) {
  await requireAdmin();
  const status = str(fd, 'status');
  if (!['confirmed', 'cancelled', 'pending'].includes(status)) return;
  await sql`update bookings set status = ${status} where id = ${Number(fd.get('id'))}`;
  done(fd, '/admin');
}

// Tratamientos
function treatmentFields(fd) {
  const t = {
    name: str(fd, 'name'),
    description: str(fd, 'description'),
    duration_min: Number(fd.get('duration_min')),
    price: Number(fd.get('price')),
    sort: Number(fd.get('sort') || 0),
    active: fd.get('active') === 'on',
  };
  if (!t.name || !(t.duration_min > 0) || !(t.price >= 0)) return null;
  return t;
}

export async function saveTreatment(fd) {
  await requireAdmin();
  const t = treatmentFields(fd);
  if (!t) return done(fd, '/admin?tab=tratamientos', 'Revisá nombre, duración y precio');
  const id = Number(fd.get('id'));
  if (id) await sql`update treatments set ${sql(t)} where id = ${id}`;
  else await sql`insert into treatments ${sql(t)}`;
  done(fd, '/admin?tab=tratamientos', 'Guardado');
}

export async function deleteTreatment(fd) {
  await requireAdmin();
  const id = Number(fd.get('id'));
  const [{ count }] = await sql`select count(*)::int as count from bookings where treatment_id = ${id}`;
  if (count > 0) {
    await sql`update treatments set active = false where id = ${id}`;
    return done(fd, '/admin?tab=tratamientos', 'Tiene reservas, así que lo pausé en lugar de borrarlo');
  }
  await sql`delete from treatments where id = ${id}`;
  done(fd, '/admin?tab=tratamientos', 'Eliminado');
}

// Horario semanal
export async function addHours(fd) {
  await requireAdmin();
  const weekdays = fd.getAll('weekday').map(Number).filter((d) => d >= 0 && d <= 6);
  const start = str(fd, 'start_time');
  const end = str(fd, 'end_time');
  if (!weekdays.length || !isTime(start) || !isTime(end) || start >= end) {
    return done(fd, '/admin?tab=horarios', 'Elegí al menos un día y un horario válido');
  }
  for (const weekday of weekdays) {
    await sql`insert into weekly_hours (weekday, start_time, end_time) values (${weekday}, ${start}, ${end})`;
  }
  done(fd, '/admin?tab=horarios', 'Horario agregado');
}

export async function deleteHours(fd) {
  await requireAdmin();
  await sql`delete from weekly_hours where id = ${Number(fd.get('id'))}`;
  done(fd, '/admin?tab=horarios');
}

// Bloqueos
export async function blockDays(fd) {
  await requireAdmin();
  const from = str(fd, 'from');
  const to = str(fd, 'to') || from;
  if (!isDate(from) || !isDate(to) || to < from) return done(fd, '/admin?tab=bloqueos', 'Revisá las fechas');
  const reason = str(fd, 'reason');
  let n = 0;
  for (let d = from; d <= to && n < 366; d = addDays(d, 1), n++) {
    await sql`insert into blocked_days (date, reason) values (${d}, ${reason}) on conflict (date) do update set reason = excluded.reason`;
  }
  done(fd, '/admin?tab=bloqueos', n === 1 ? 'Día bloqueado' : `${n} días bloqueados`);
}

export async function unblockDay(fd) {
  await requireAdmin();
  await sql`delete from blocked_days where id = ${Number(fd.get('id'))}`;
  done(fd, '/admin?tab=bloqueos');
}

export async function blockSlot(fd) {
  await requireAdmin();
  const date = str(fd, 'date');
  const start = str(fd, 'start_time');
  const end = str(fd, 'end_time');
  if (!isDate(date) || !isTime(start) || !isTime(end) || start >= end) {
    return done(fd, '/admin?tab=bloqueos', 'Revisá la fecha y el horario');
  }
  await sql`insert into blocked_slots (date, start_time, end_time, reason) values (${date}, ${start}, ${end}, ${str(fd, 'reason')})`;
  done(fd, '/admin?tab=bloqueos', 'Horario bloqueado');
}

export async function unblockSlot(fd) {
  await requireAdmin();
  await sql`delete from blocked_slots where id = ${Number(fd.get('id'))}`;
  done(fd, '/admin?tab=bloqueos');
}
