import Link from 'next/link';
import { notFound } from 'next/navigation';
import { bookingWindow } from '@/lib/availability';
import { requireAdmin } from '@/lib/auth';
import { QUOTE_STATUS } from '@/lib/clients';
import { config } from '@/lib/config';
import { sql } from '@/lib/db';
import { followupLabel, formatDate, formatPrice, intlPhone, shortDate, waLink } from '@/lib/format';
import { addDays } from '@/lib/time';
import {
  addNote, addQuote, addTreatmentDone, deleteClient, deleteNote, deleteQuote, deleteTreatmentDone,
  logContact, markBookingDone, setFollowup, setQuoteStatus, updateClient,
} from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ficha · Panel' };

const BOOKING_STATUS = { pending: 'Pendiente', confirmed: 'Confirmada', cancelled: 'Cancelada' };

function Hidden({ id }) {
  return <input type="hidden" name="client_id" value={id} />;
}

function CurrencySelect({ value = 'UYU' }) {
  return (
    <label className="xs">Moneda
      <select name="currency" defaultValue={value}>
        <option value="UYU">$</option>
        <option value="USD">USD</option>
      </select>
    </label>
  );
}

export default async function ClientPage({ params, searchParams }) {
  const { id } = await params;
  const { msg } = await searchParams;
  await requireAdmin(`/admin/clientes/${id}`);
  const [c] = Number(id) ? await sql`select * from clients where id = ${Number(id)}` : [];
  if (!c) notFound();

  const { today } = bookingWindow();
  const [quotes, done, bookings, notes, treatments] = await Promise.all([
    sql`select * from quotes where client_id = ${c.id} order by sent_on desc, id desc`,
    sql`select * from client_treatments where client_id = ${c.id} order by done_on desc, id desc`,
    sql`select b.*, exists (select 1 from client_treatments t where t.booking_id = b.id) as in_history
        from bookings b where b.client_id = ${c.id} order by b.date desc, b.start_time desc`,
    sql`select * from client_notes where client_id = ${c.id} order by created_at desc`,
    sql`select name, price, currency from treatments order by sort, name`,
  ]);

  const fu = followupLabel(c.next_followup, today);
  const first = c.name.split(' ')[0];
  const wa = c.phone ? (text) => waLink(intlPhone(c.phone, config.countryCode), text) : null;
  const openQuotes = quotes.filter((q) => q.status === 'sent');
  const spent = Object.entries(done.reduce((acc, t) => (t.amount != null && (acc[t.currency] = (acc[t.currency] ?? 0) + Number(t.amount)), acc), {}));

  return (
    <main className="page wide">
      <p><Link href="/admin?tab=clientes">← Volver a clientes</Link></p>

      <header className="client-header">
        <div>
          <h1 className="admin-title">{c.name}</h1>
          <p className="muted">
            {c.phone && <a href={`tel:${c.phone}`}>{c.phone}</a>}
            {c.email && <> · <a href={`mailto:${c.email}`}>{c.email}</a></>}
            {c.instagram && <> · <a href={`https://www.instagram.com/${c.instagram.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer">@{c.instagram.replace(/^@/, '')}</a></>}
          </p>
          <div className="client-stats">
            <span><strong>{done.length}</strong> {done.length === 1 ? 'tratamiento' : 'tratamientos'}</span>
            {spent.length > 0 && <span><strong>{spent.map(([cur, sum]) => formatPrice(sum, cur)).join(' + ')}</strong> facturado</span>}
            <span><strong>{openQuotes.length}</strong> {openQuotes.length === 1 ? 'presupuesto abierto' : 'presupuestos abiertos'}</span>
            <span>Ficha desde {shortDate(c.created_at.toISOString().slice(0, 10))}</span>
          </div>
        </div>
        {wa && (
          <a className="btn btn-wa" href={wa(`Hola ${first}! Te escribe la ${config.businessName}. ¿Cómo estás?`)} target="_blank" rel="noopener noreferrer">
            Escribirle por WhatsApp
          </a>
        )}
      </header>

      {msg && <p className="flash">{msg}</p>}

      <div className="client-grid">
        <div className="client-col">
          {/* Seguimiento */}
          <section className={`card followup-card ${fu ? `fu-${fu.tone}` : ''}`}>
            <h2>Seguimiento</h2>
            {fu ? (
              <p className="followup-now">
                <span className={`fu-tag ${fu.tone}`}>{fu.text}</span> {shortDate(c.next_followup)}
                {c.followup_reason && <> · {c.followup_reason}</>}
              </p>
            ) : (
              <p className="muted">No hay un próximo contacto agendado.</p>
            )}

            {fu && (
              <form action={logContact} className="form">
                <Hidden id={c.id} />
                <h3 className="mini-title">Ya la contacté</h3>
                <label>¿Qué hablaron?<textarea name="note" rows="2" placeholder="Le pregunté por el presupuesto, lo piensa para diciembre…" /></label>
                <div className="inline-form">
                  <label>Volver a contactar el (opcional)<input type="date" name="next_followup" min={today} /></label>
                  <label className="grow">Motivo<input name="followup_reason" defaultValue={c.followup_reason} /></label>
                </div>
                <div className="actions">
                  <button className="btn btn-sm">Registrar contacto</button>
                </div>
              </form>
            )}

            <details className="more" open={!fu}>
              <summary>{fu ? 'Cambiar fecha' : 'Agendar seguimiento'}</summary>
              <form action={setFollowup} className="inline-form">
                <Hidden id={c.id} />
                <label>Fecha<input type="date" name="next_followup" defaultValue={c.next_followup ?? addDays(today, 7)} /></label>
                <label className="grow">Motivo<input name="followup_reason" defaultValue={c.followup_reason} placeholder="Preguntar cómo le fue" /></label>
                <button className="btn btn-sm">Guardar</button>
              </form>
              {fu && (
                <form action={setFollowup}>
                  <Hidden id={c.id} />
                  <button className="link-btn small">Quitar el seguimiento</button>
                </form>
              )}
            </details>
          </section>

          {/* Presupuestos */}
          <section className="card">
            <h2>Presupuestos</h2>
            <datalist id="treatment-names">{treatments.map((t) => <option key={t.name} value={t.name} />)}</datalist>
            {quotes.length === 0 && <p className="muted">Todavía no le enviaste presupuestos.</p>}
            <ul className="crm-list">
              {quotes.map((q) => (
                <li key={q.id} className={`quote status-${q.status}`}>
                  <div>
                    <span className={`badge q-${q.status}`}>{QUOTE_STATUS[q.status]}</span>
                    <strong className="item-title">{q.treatment}</strong>
                    <span className="item-meta">{formatPrice(q.amount, q.currency)} · enviado el {shortDate(q.sent_on)}</span>
                    {q.notes && <p className="note">{q.notes}</p>}
                  </div>
                  <div className="actions">
                    {(q.status === 'sent' ? ['accepted', 'rejected'] : ['sent']).map((s) => (
                      <form key={s} action={setQuoteStatus}>
                        <input type="hidden" name="id" value={q.id} />
                        <input type="hidden" name="status" value={s} />
                        {s === 'sent'
                          ? <button className="link-btn small">Volver a “enviado”</button>
                          : <button className={`btn btn-sm ${s === 'accepted' ? '' : 'btn-ghost'}`}>{s === 'accepted' ? 'Aceptó' : 'No aceptó'}</button>}
                      </form>
                    ))}
                    {q.status === 'sent' && wa && (
                      <a className="btn btn-sm btn-wa" target="_blank" rel="noopener noreferrer"
                        href={wa(`Hola ${first}! ¿Pudiste ver el presupuesto de ${q.treatment} que te mandé? Cualquier duda me decís. ${config.businessName}`)}>
                        Preguntarle
                      </a>
                    )}
                    <form action={deleteQuote}>
                      <Hidden id={c.id} />
                      <input type="hidden" name="id" value={q.id} />
                      <button className="link-btn small">Borrar</button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
            <details className="more" open={quotes.length === 0}>
              <summary>Registrar presupuesto enviado</summary>
              <form action={addQuote} className="inline-form">
                <Hidden id={c.id} />
                <label className="grow">Tratamiento<input name="treatment" list="treatment-names" required /></label>
                <CurrencySelect />
                <label>Monto<input name="amount" type="number" min="0" step="any" required /></label>
                <label>Enviado el<input type="date" name="sent_on" defaultValue={today} required /></label>
                <label>Recordarme el<input type="date" name="followup_on" defaultValue={addDays(today, 3)} /></label>
                <label className="grow">Detalle (opcional)<input name="notes" placeholder="3 sesiones, precio por pago contado…" /></label>
                <button className="btn btn-sm">Guardar</button>
              </form>
            </details>
          </section>

          {/* Historial de tratamientos */}
          <section className="card">
            <h2>Tratamientos realizados</h2>
            {done.length === 0 && <p className="muted">Sin tratamientos registrados.</p>}
            <ul className="crm-list timeline">
              {done.map((t) => (
                <li key={t.id}>
                  <div>
                    <span className="item-date">{shortDate(t.done_on)}</span>
                    <strong className="item-title">{t.treatment}</strong>
                    {t.amount != null && <span className="item-meta">{formatPrice(t.amount, t.currency)}</span>}
                    {t.notes && <p className="note">{t.notes}</p>}
                  </div>
                  <form action={deleteTreatmentDone}>
                    <Hidden id={c.id} />
                    <input type="hidden" name="id" value={t.id} />
                    <button className="link-btn small">Quitar</button>
                  </form>
                </li>
              ))}
            </ul>
            <details className="more">
              <summary>Agregar tratamiento realizado</summary>
              <form action={addTreatmentDone} className="inline-form">
                <Hidden id={c.id} />
                <label className="grow">Tratamiento<input name="treatment" list="treatment-names" required /></label>
                <label>Fecha<input type="date" name="done_on" defaultValue={today} max={today} required /></label>
                <CurrencySelect />
                <label>Monto (opcional)<input name="amount" type="number" min="0" step="any" /></label>
                <label className="grow">Notas (zona, producto, dosis…)<input name="notes" /></label>
                <label>Control el (opcional)<input type="date" name="followup_on" min={today} /></label>
                <button className="btn btn-sm">Agregar</button>
              </form>
            </details>
          </section>
        </div>

        <div className="client-col">
          {/* Notas */}
          <section className="card">
            <h2>Notas</h2>
            <form action={addNote} className="form">
              <Hidden id={c.id} />
              <textarea name="body" rows="2" placeholder="Escribí una nota…" required />
              <div><button className="btn btn-sm">Guardar nota</button></div>
            </form>
            <ul className="crm-list notes">
              {notes.map((n) => (
                <li key={n.id}>
                  <div>
                    <span className="item-date">{shortDate(n.created_at.toISOString().slice(0, 10))}</span>
                    <p className="note-body">{n.body}</p>
                  </div>
                  <form action={deleteNote}>
                    <Hidden id={c.id} />
                    <input type="hidden" name="id" value={n.id} />
                    <button className="link-btn small" aria-label="Borrar nota">×</button>
                  </form>
                </li>
              ))}
            </ul>
          </section>

          {/* Reservas */}
          <section className="card">
            <h2>Reservas</h2>
            {bookings.length === 0 && <p className="muted">No reservó por la agenda.</p>}
            <ul className="crm-list">
              {bookings.map((b) => (
                <li key={b.id} className={b.status === 'cancelled' ? 'faded' : ''}>
                  <div>
                    <span className={`badge ${b.status}`}>{BOOKING_STATUS[b.status]}</span>
                    <Link href={`/admin/reserva/${b.id}`} className="item-title">{b.treatment_name}</Link>
                    <span className="item-meta">{formatDate(b.date)} · {b.start_time}</span>
                  </div>
                  {b.status === 'confirmed' && b.date <= today && (
                    b.in_history ? <span className="muted small">En el historial ✓</span> : (
                      <form action={markBookingDone}>
                        <input type="hidden" name="booking_id" value={b.id} />
                        <button className="btn btn-sm btn-ghost">Marcar realizado</button>
                      </form>
                    )
                  )}
                </li>
              ))}
            </ul>
          </section>

          {/* Datos */}
          <section className="card">
            <h2>Datos de contacto</h2>
            <form action={updateClient} className="form">
              <Hidden id={c.id} />
              <label>Nombre<input name="name" defaultValue={c.name} required /></label>
              <label>Teléfono<input name="phone" type="tel" defaultValue={c.phone} /></label>
              <label>Email<input name="email" type="email" defaultValue={c.email} /></label>
              <label>Instagram<input name="instagram" defaultValue={c.instagram} placeholder="@usuario" /></label>
              <label>Fecha de nacimiento<input type="date" name="birthdate" defaultValue={c.birthdate ?? ''} /></label>
              <label>Notas fijas (alergias, preferencias…)<textarea name="notes" rows="3" defaultValue={c.notes} /></label>
              <div><button className="btn btn-sm">Guardar datos</button></div>
            </form>
            <details className="more danger-zone">
              <summary>Borrar ficha</summary>
              <form action={deleteClient} className="form">
                <Hidden id={c.id} />
                <p className="muted small">Se borran sus presupuestos, historial y notas. Las reservas quedan en la agenda.</p>
                <label className="check-label"><input type="checkbox" name="confirm" /> Sí, quiero borrar esta ficha</label>
                <div><button className="btn btn-sm btn-ghost">Borrar ficha</button></div>
              </form>
            </details>
          </section>
        </div>
      </div>
    </main>
  );
}
