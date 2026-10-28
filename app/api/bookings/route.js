import { NextResponse } from 'next/server';
import { getAvailability } from '@/lib/availability';
import { config } from '@/lib/config';
import { sql } from '@/lib/db';
import { formatDate, formatPrice } from '@/lib/format';
import { fromMin, isDate, isTime, toMin } from '@/lib/time';
import { notifyOwner } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

const clean = (s, max) => String(s ?? '').trim().slice(0, max);

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  if (body.website) return NextResponse.json({ ok: true }); // trampa anti-spam: campo oculto que solo llenan los bots

  const treatmentId = Number(body.treatmentId);
  const { date, time } = body;
  const name = clean(body.name, 80);
  const phone = clean(body.phone, 30);
  const notes = clean(body.notes, 500);

  if (!Number.isInteger(treatmentId) || !isDate(date) || !isTime(time)) {
    return NextResponse.json({ error: 'Datos de turno inválidos' }, { status: 400 });
  }
  if (name.length < 2) return NextResponse.json({ error: 'Ingresá tu nombre' }, { status: 400 });
  if (!/^\+?[\d\s()-]{8,20}$/.test(phone)) return NextResponse.json({ error: 'Ingresá un teléfono válido' }, { status: 400 });

  // Bloqueo por fecha para que dos personas no tomen el mismo horario a la vez.
  const booking = await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(hashtext(${date}))`;
    const days = await getAvailability(tx, treatmentId, date, date);
    if (!days?.[date]?.includes(time)) return null;
    const [treatment] = await tx`select * from treatments where id = ${treatmentId}`;
    const [row] = await tx`
      insert into bookings (treatment_id, treatment_name, price, date, start_time, end_time, client_name, client_phone, notes)
      values (${treatment.id}, ${treatment.name}, ${treatment.price}, ${date}, ${time},
              ${fromMin(toMin(time) + treatment.duration_min)}, ${name}, ${phone}, ${notes})
      returning *`;
    return row;
  });

  if (!booking) {
    return NextResponse.json({ error: 'Ese horario ya no está disponible. Elegí otro, por favor.' }, { status: 409 });
  }

  await notifyOwner(
    [
      '🗓️ *Nueva reserva pendiente*',
      `${booking.treatment_name} (${formatPrice(booking.price, config.currency)})`,
      `${formatDate(booking.date)} a las ${booking.start_time}`,
      `Clienta/e: ${booking.client_name} · ${booking.client_phone}`,
      ...(booking.notes ? [`Nota: ${booking.notes}`] : []),
      '',
      `Confirmala o rechazala acá: ${config.publicUrl}/admin/reserva/${booking.id}`,
    ].join('\n'),
  );

  return NextResponse.json({
    booking: { id: booking.id, treatment: booking.treatment_name, date: booking.date, time: booking.start_time },
  });
}
