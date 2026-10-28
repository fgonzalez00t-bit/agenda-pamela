import Link from 'next/link';
import { bookingWindow } from '@/lib/availability';
import { requireAdmin } from '@/lib/auth';
import { config } from '@/lib/config';
import { sql } from '@/lib/db';
import { WEEKDAYS, formatDate } from '@/lib/format';
import { addDays } from '@/lib/time';
import {
  addHours, blockDays, blockSlot, deleteHours, deleteTreatment, logout, saveTreatment, unblockDay, unblockSlot,
} from './actions';
import BookingCard from './BookingCard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Panel · Agenda' };

const TABS = [
  ['reservas', 'Reservas'],
  ['tratamientos', 'Tratamientos'],
  ['horarios', 'Horarios'],
  ['bloqueos', 'Bloqueos'],
];

export default async function AdminPage({ searchParams }) {
  const { tab = 'reservas', msg, ver } = await searchParams;
  await requireAdmin(`/admin?tab=${tab}`);
  const { today } = bookingWindow();
  const back = `/admin?tab=${tab}${ver ? `&ver=${ver}` : ''}`;
  const [{ pending }] = await sql`select count(*)::int as pending from bookings where status = 'pending' and date >= ${today}`;

  return (
    <main className="page wide">
      <header className="admin-header">
        <div>
          <h1 className="admin-title">Panel de {config.businessName}</h1>
          <Link href="/" target="_blank">Ver la agenda pública ↗</Link>
        </div>
        <form action={logout}><button className="btn btn-sm btn-ghost">Salir</button></form>
      </header>

      <nav className="tabs">
        {TABS.map(([key, label]) => (
          <Link key={key} href={`/admin?tab=${key}`} className={tab === key ? 'active' : ''}>
            {label}{key === 'reservas' && pending > 0 && <span className="count">{pending}</span>}
          </Link>
        ))}
      </nav>

      {msg && <p className="flash">{msg}</p>}

      {tab === 'reservas' && <Bookings today={today} ver={ver} back={back} />}
      {tab === 'tratamientos' && <Treatments back={back} />}
      {tab === 'horarios' && <Hours back={back} />}
      {tab === 'bloqueos' && <Blocks today={today} back={back} />}
    </main>
  );
}

async function Bookings({ today, ver, back }) {
  const showPast = ver === 'pasadas';
  const bookings = showPast
    ? await sql`select * from bookings where date < ${today} order by date desc, start_time desc limit 100`
    : await sql`select * from bookings where date >= ${today} and status <> 'cancelled' order by date, start_time`;
  const byDate = Object.groupBy ? Object.groupBy(bookings, (b) => b.date) : bookings.reduce((acc, b) => ((acc[b.date] ??= []).push(b), acc), {});

  return (
    <section>
      <p className="subnav">
        <Link href="/admin?tab=reservas" className={!showPast ? 'active' : ''}>Próximas</Link>
        <Link href="/admin?tab=reservas&ver=pasadas" className={showPast ? 'active' : ''}>Pasadas</Link>
      </p>
      {bookings.length === 0 && <p className="muted card">No hay reservas {showPast ? 'pasadas' : 'próximas'}.</p>}
      {Object.entries(byDate).map(([date, list]) => (
        <div key={date} className="day-group">
          <h2 className="day-title">{date === today ? 'Hoy' : date === addDays(today, 1) ? 'Mañana' : formatDate(date)}</h2>
          {list.map((b) => <BookingCard key={b.id} booking={b} back={back} />)}
        </div>
      ))}
    </section>
  );
}

function TreatmentForm({ t, back }) {
  return (
    <form action={saveTreatment} className={`treatment-form ${t && !t.active ? 'inactive' : ''}`}>
      <input type="hidden" name="back" value={back} />
      {t && <input type="hidden" name="id" value={t.id} />}
      <label className="grow">Categoría<input name="category" defaultValue={t?.category} list="categories" /></label>
      <label className="grow">Nombre<input name="name" defaultValue={t?.name} required /></label>
      <label className="grow2">Detalle<input name="description" defaultValue={t?.description} /></label>
      <label>Duración (min)<input name="duration_min" type="number" min="5" step="5" defaultValue={t?.duration_min ?? 30} required /></label>
      <label className="xs">Moneda
        <select name="currency" defaultValue={t?.currency ?? 'UYU'}>
          <option value="UYU">$</option>
          <option value="USD">USD</option>
        </select>
      </label>
      <label>Precio<input name="price" type="number" min="0" step="any" defaultValue={t?.price} required /></label>
      <label className="check-label"><input type="checkbox" name="price_from" defaultChecked={t?.price_from} /> “desde”</label>
      <label className="xs">Orden<input name="sort" type="number" defaultValue={t?.sort ?? 0} /></label>
      <label className="check-label"><input type="checkbox" name="active" defaultChecked={t ? t.active : true} /> Disponible</label>
      <div className="row-actions">
        <button className="btn btn-sm">{t ? 'Guardar' : 'Agregar'}</button>
        {t && <button className="btn btn-sm btn-ghost" formAction={deleteTreatment}>Eliminar</button>}
      </div>
    </form>
  );
}

async function Treatments({ back }) {
  const treatments = await sql`select * from treatments order by sort, name`;
  const categories = [...new Set(treatments.map((t) => t.category).filter(Boolean))];
  return (
    <section className="card">
      <datalist id="categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
      <p className="muted">Destildá “Disponible” para pausar un tratamiento: deja de aparecer en la agenda sin borrarlo. Marcá “desde” cuando el precio final depende de la paciente. El orden define en qué posición aparece.</p>
      {treatments.map((t) => (
        <TreatmentForm key={t.id} t={t} back={back} />
      ))}
      <h2>Nuevo tratamiento</h2>
      <TreatmentForm back={back} />
    </section>
  );
}

async function Hours({ back }) {
  const hours = await sql`select * from weekly_hours order by weekday, start_time`;
  const order = [1, 2, 3, 4, 5, 6, 0];
  return (
    <section className="card">
      <p className="muted">Estos son los horarios en que se ofrecen turnos cada semana. Podés tener más de una franja por día (por ejemplo mañana y tarde).</p>
      <ul className="hours">
        {order.map((d) => {
          const ranges = hours.filter((h) => h.weekday === d);
          return (
            <li key={d}>
              <strong>{WEEKDAYS[d]}</strong>
              <span className="ranges">
                {ranges.length === 0 && <span className="muted">No atiende</span>}
                {ranges.map((h) => (
                  <form key={h.id} action={deleteHours} className="chip">
                    <input type="hidden" name="id" value={h.id} />
                    <input type="hidden" name="back" value={back} />
                    {h.start_time}–{h.end_time}
                    <button aria-label="Quitar franja" title="Quitar">×</button>
                  </form>
                ))}
              </span>
            </li>
          );
        })}
      </ul>
      <h2>Agregar franja horaria</h2>
      <form action={addHours} className="form inline-form">
        <input type="hidden" name="back" value={back} />
        <fieldset className="weekdays">
          {order.map((d) => (
            <label key={d} className="check-label"><input type="checkbox" name="weekday" value={d} /> {WEEKDAYS[d].slice(0, 3)}</label>
          ))}
        </fieldset>
        <label>Desde<input type="time" name="start_time" required step="900" /></label>
        <label>Hasta<input type="time" name="end_time" required step="900" /></label>
        <button className="btn btn-sm">Agregar</button>
      </form>
    </section>
  );
}

async function Blocks({ today, back }) {
  const [days, slots] = await Promise.all([
    sql`select * from blocked_days where date >= ${today} order by date`,
    sql`select * from blocked_slots where date >= ${today} order by date, start_time`,
  ]);
  return (
    <>
      <section className="card">
        <h2>Bloquear días completos</h2>
        <p className="muted">Para vacaciones, feriados o días que no quieras trabajar. Las reservas ya hechas no se borran.</p>
        <form action={blockDays} className="form inline-form">
          <input type="hidden" name="back" value={back} />
          <label>Desde<input type="date" name="from" min={today} required /></label>
          <label>Hasta (opcional)<input type="date" name="to" min={today} /></label>
          <label className="grow">Motivo (opcional)<input name="reason" placeholder="Vacaciones" /></label>
          <button className="btn btn-sm">Bloquear</button>
        </form>
        <ul className="block-list">
          {days.length === 0 && <li className="muted">No hay días bloqueados.</li>}
          {days.map((d) => (
            <li key={d.id}>
              <span>{formatDate(d.date)}{d.reason && <span className="muted"> · {d.reason}</span>}</span>
              <form action={unblockDay}>
                <input type="hidden" name="id" value={d.id} />
                <input type="hidden" name="back" value={back} />
                <button className="link-btn">Desbloquear</button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Bloquear un horario puntual</h2>
        <p className="muted">Por ejemplo, un trámite el martes de 10 a 12.</p>
        <form action={blockSlot} className="form inline-form">
          <input type="hidden" name="back" value={back} />
          <label>Día<input type="date" name="date" min={today} required /></label>
          <label>Desde<input type="time" name="start_time" required step="900" /></label>
          <label>Hasta<input type="time" name="end_time" required step="900" /></label>
          <label className="grow">Motivo (opcional)<input name="reason" /></label>
          <button className="btn btn-sm">Bloquear</button>
        </form>
        <ul className="block-list">
          {slots.length === 0 && <li className="muted">No hay horarios bloqueados.</li>}
          {slots.map((s) => (
            <li key={s.id}>
              <span>{formatDate(s.date)} · {s.start_time}–{s.end_time}{s.reason && <span className="muted"> · {s.reason}</span>}</span>
              <form action={unblockSlot}>
                <input type="hidden" name="id" value={s.id} />
                <input type="hidden" name="back" value={back} />
                <button className="link-btn">Desbloquear</button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
