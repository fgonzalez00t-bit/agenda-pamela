'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { phoneKey } from '@/lib/clients';
import { sql } from '@/lib/db';
import { isDate } from '@/lib/time';

const str = (fd, key, max = 2000) => String(fd.get(key) ?? '').trim().slice(0, max);
const dateOrNull = (fd, key) => (isDate(str(fd, key)) ? str(fd, key) : null);
const money = (fd, key) => {
  const raw = str(fd, key).replace(',', '.');
  if (raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const currency = (fd) => (str(fd, 'currency') === 'USD' ? 'USD' : 'UYU');
const clientId = (fd) => Number(fd.get('client_id'));

function go(path, message) {
  revalidatePath('/admin', 'layout');
  redirect(message ? `${path}${path.includes('?') ? '&' : '?'}msg=${encodeURIComponent(message)}` : path);
}
const ficha = (id, message) => go(`/admin/clientes/${id}`, message);

// Fichas
export async function createClient(fd) {
  await requireAdmin();
  const name = str(fd, 'name', 120);
  const phone = str(fd, 'phone', 30);
  if (name.length < 2) return go('/admin?tab=clientes', 'Escribí el nombre de la clienta');
  const key = phoneKey(phone);
  if (key) {
    const [existing] = await sql`select id from clients where phone_key = ${key}`;
    if (existing) return ficha(existing.id, 'Ya había una ficha con ese teléfono');
  }
  const [row] = await sql`insert into clients (name, phone, phone_key) values (${name}, ${phone}, ${key}) returning id`;
  ficha(row.id, 'Ficha creada');
}

export async function updateClient(fd) {
  await requireAdmin();
  const id = clientId(fd);
  const name = str(fd, 'name', 120);
  const phone = str(fd, 'phone', 30);
  if (name.length < 2) return ficha(id, 'El nombre no puede quedar vacío');
  const key = phoneKey(phone);
  if (key) {
    const [other] = await sql`select id from clients where phone_key = ${key} and id <> ${id}`;
    if (other) return ficha(id, 'Ese teléfono ya está en otra ficha');
  }
  await sql`
    update clients set name = ${name}, phone = ${phone}, phone_key = ${key}, email = ${str(fd, 'email', 120)},
      instagram = ${str(fd, 'instagram', 80)}, birthdate = ${dateOrNull(fd, 'birthdate')}, notes = ${str(fd, 'notes')}
    where id = ${id}`;
  ficha(id, 'Datos guardados');
}

export async function deleteClient(fd) {
  await requireAdmin();
  if (fd.get('confirm') !== 'on') return ficha(clientId(fd), 'Tildá la casilla para confirmar que querés borrar la ficha');
  await sql`delete from clients where id = ${clientId(fd)}`;
  go('/admin?tab=clientes&f=todos', 'Ficha eliminada');
}

// Seguimiento
export async function setFollowup(fd) {
  await requireAdmin();
  const id = clientId(fd);
  const date = dateOrNull(fd, 'next_followup');
  await sql`update clients set next_followup = ${date}, followup_reason = ${date ? str(fd, 'followup_reason', 200) : ''} where id = ${id}`;
  ficha(id, date ? 'Seguimiento agendado' : 'Seguimiento quitado');
}

// "Ya la contacté": deja la nota de lo que hablaron y, si hace falta, agenda el próximo contacto.
export async function logContact(fd) {
  await requireAdmin();
  const id = clientId(fd);
  const note = str(fd, 'note');
  const next = dateOrNull(fd, 'next_followup');
  await sql`insert into client_notes (client_id, body) values (${id}, ${`Contacto: ${note || 'sin detalle'}`})`;
  await sql`update clients set next_followup = ${next}, followup_reason = ${next ? str(fd, 'followup_reason', 200) : ''} where id = ${id}`;
  ficha(id, next ? 'Contacto registrado y próximo seguimiento agendado' : 'Contacto registrado');
}

// Presupuestos
export async function addQuote(fd) {
  await requireAdmin();
  const id = clientId(fd);
  const treatment = str(fd, 'treatment', 200);
  const amount = money(fd, 'amount');
  const sentOn = dateOrNull(fd, 'sent_on');
  if (!treatment || amount === null || !sentOn) return ficha(id, 'Revisá tratamiento, monto y fecha del presupuesto');
  await sql`
    insert into quotes (client_id, treatment, amount, currency, sent_on, notes)
    values (${id}, ${treatment}, ${amount}, ${currency(fd)}, ${sentOn}, ${str(fd, 'notes')})`;
  // Recordatorio para preguntarle qué le pareció, salvo que ya haya uno antes.
  const followup = dateOrNull(fd, 'followup_on');
  if (followup) {
    await sql`
      update clients set next_followup = ${followup}, followup_reason = ${`Presupuesto: ${treatment}`}
      where id = ${id} and (next_followup is null or next_followup > ${followup})`;
  }
  ficha(id, 'Presupuesto guardado');
}

export async function setQuoteStatus(fd) {
  await requireAdmin();
  const status = str(fd, 'status');
  if (!['sent', 'accepted', 'rejected'].includes(status)) return;
  const [q] = await sql`update quotes set status = ${status} where id = ${Number(fd.get('id'))} returning client_id, treatment`;
  if (!q) return go('/admin?tab=clientes');
  // Si el seguimiento pendiente era por este presupuesto y ya respondió, se quita.
  if (status !== 'sent') {
    await sql`update clients set next_followup = null, followup_reason = ''
      where id = ${q.client_id} and followup_reason = ${`Presupuesto: ${q.treatment}`}`;
  }
  ficha(q.client_id, status === 'accepted' ? 'Presupuesto aceptado' : status === 'rejected' ? 'Presupuesto rechazado' : 'Presupuesto marcado como enviado');
}

export async function deleteQuote(fd) {
  await requireAdmin();
  await sql`delete from quotes where id = ${Number(fd.get('id'))}`;
  ficha(clientId(fd), 'Presupuesto eliminado');
}

// Tratamientos realizados
export async function addTreatmentDone(fd) {
  await requireAdmin();
  const id = clientId(fd);
  const treatment = str(fd, 'treatment', 200);
  const doneOn = dateOrNull(fd, 'done_on');
  if (!treatment || !doneOn) return ficha(id, 'Revisá el tratamiento y la fecha');
  await sql`
    insert into client_treatments (client_id, treatment, done_on, amount, currency, notes)
    values (${id}, ${treatment}, ${doneOn}, ${money(fd, 'amount')}, ${currency(fd)}, ${str(fd, 'notes')})`;
  const followup = dateOrNull(fd, 'followup_on');
  if (followup) {
    await sql`update clients set next_followup = ${followup}, followup_reason = ${`Control de ${treatment}`} where id = ${id}`;
  }
  ficha(id, 'Tratamiento registrado');
}

// Pasa una reserva al historial de tratamientos realizados.
export async function markBookingDone(fd) {
  await requireAdmin();
  const [b] = await sql`select * from bookings where id = ${Number(fd.get('booking_id'))}`;
  if (!b?.client_id) return go('/admin?tab=clientes');
  await sql`
    insert into client_treatments (client_id, booking_id, treatment, done_on, amount, currency)
    values (${b.client_id}, ${b.id}, ${b.treatment_name}, ${b.date}, ${b.price}, ${b.currency})
    on conflict (booking_id) do nothing`;
  ficha(b.client_id, 'Agregado al historial');
}

export async function deleteTreatmentDone(fd) {
  await requireAdmin();
  await sql`delete from client_treatments where id = ${Number(fd.get('id'))}`;
  ficha(clientId(fd), 'Quitado del historial');
}

// Notas
export async function addNote(fd) {
  await requireAdmin();
  const id = clientId(fd);
  const body = str(fd, 'body');
  if (!body) return ficha(id);
  await sql`insert into client_notes (client_id, body) values (${id}, ${body})`;
  ficha(id, 'Nota guardada');
}

export async function deleteNote(fd) {
  await requireAdmin();
  await sql`delete from client_notes where id = ${Number(fd.get('id'))}`;
  ficha(clientId(fd), 'Nota eliminada');
}
