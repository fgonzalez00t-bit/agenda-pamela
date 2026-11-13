import { config } from './config';
import { sql } from './db';
import { intlPhone } from './format';

// Clave para reconocer a la misma persona aunque escriba el teléfono distinto ("099 123 456" = "+598 99123456").
export function phoneKey(phone) {
  const digits = String(phone ?? '').replace(/\D/g, '');
  return digits ? intlPhone(phone, config.countryCode) : null;
}

// Vincula una reserva nueva con la ficha de la clienta (la crea si es la primera vez).
// Nunca hace fallar la reserva: si algo sale mal (por ejemplo, falta la migración del CRM), solo lo registra.
export async function linkBookingToClient(booking) {
  const key = phoneKey(booking.client_phone);
  if (!key) return;
  try {
    const [client] = await sql`
      insert into clients (name, phone, phone_key) values (${booking.client_name}, ${booking.client_phone}, ${key})
      on conflict (phone_key) do update set phone_key = excluded.phone_key
      returning id`;
    await sql`update bookings set client_id = ${client.id} where id = ${booking.id}`;
  } catch (err) {
    console.error('[crm] no se pudo vincular la reserva con la ficha:', err.message);
  }
}

export const QUOTE_STATUS = { sent: 'Enviado', accepted: 'Aceptado', rejected: 'Rechazado' };
