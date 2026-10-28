import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { sql } from '@/lib/db';
import BookingCard from '../../BookingCard';

export const dynamic = 'force-dynamic';

export default async function BookingPage({ params }) {
  const { id } = await params;
  await requireAdmin(`/admin/reserva/${id}`);
  const [booking] = Number(id) ? await sql`select * from bookings where id = ${Number(id)}` : [];
  if (!booking) notFound();

  return (
    <main className="page narrow">
      <p><Link href="/admin">← Volver al panel</Link></p>
      <h1 className="admin-title">Reserva #{booking.id}</h1>
      <BookingCard booking={booking} back={`/admin/reserva/${booking.id}`} />
      {booking.status === 'confirmed' && (
        <p className="muted">Confirmada. Tocá “Avisar confirmación” para mandarle el mensaje a la clienta por WhatsApp.</p>
      )}
    </main>
  );
}
