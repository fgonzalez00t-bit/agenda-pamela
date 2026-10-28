import { config } from '@/lib/config';
import { formatDate, formatPrice, intlPhone, waLink } from '@/lib/format';
import { setBookingStatus } from './actions';

const STATUS = { pending: 'Pendiente', confirmed: 'Confirmada', cancelled: 'Cancelada' };

export default function BookingCard({ booking: b, back }) {
  const when = `${formatDate(b.date).toLowerCase()} a las ${b.start_time}`;
  const confirmMsg = `Hola ${b.client_name}! Te confirmo tu turno de ${b.treatment_name} para el ${when}. ¡Te espero! ${config.businessName}`;
  const cancelMsg = `Hola ${b.client_name}! Te escribo por tu reserva de ${b.treatment_name} del ${when}. Lamentablemente no voy a poder atenderte en ese horario. ¿Te queda bien otro día?`;

  return (
    <article className={`booking status-${b.status}`}>
      <div className="booking-main">
        <div>
          <span className={`badge ${b.status}`}>{STATUS[b.status]}</span>
          <h3>{b.start_time}–{b.end_time} · {b.treatment_name}</h3>
          <p className="muted">{formatDate(b.date)} · {formatPrice(b.price, b.currency)}</p>
          <p>
            <strong>{b.client_name}</strong> · <a href={`tel:${b.client_phone}`}>{b.client_phone}</a>
          </p>
          {b.notes && <p className="note">“{b.notes}”</p>}
        </div>
      </div>
      <div className="actions">
        {b.status !== 'confirmed' && (
          <form action={setBookingStatus}>
            <input type="hidden" name="id" value={b.id} />
            <input type="hidden" name="status" value="confirmed" />
            <input type="hidden" name="back" value={back} />
            <button className="btn btn-sm">Confirmar</button>
          </form>
        )}
        {b.status !== 'cancelled' && (
          <form action={setBookingStatus}>
            <input type="hidden" name="id" value={b.id} />
            <input type="hidden" name="status" value="cancelled" />
            <input type="hidden" name="back" value={back} />
            <button className="btn btn-sm btn-ghost">{b.status === 'pending' ? 'Rechazar' : 'Cancelar'}</button>
          </form>
        )}
        <a
          className="btn btn-sm btn-wa"
          href={waLink(intlPhone(b.client_phone, config.countryCode), b.status === 'cancelled' ? cancelMsg : confirmMsg)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {b.status === 'confirmed' ? 'Avisar confirmación' : 'Escribirle'}
        </a>
      </div>
    </article>
  );
}
