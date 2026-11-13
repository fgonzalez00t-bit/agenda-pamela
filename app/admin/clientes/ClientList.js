import Link from 'next/link';
import { config } from '@/lib/config';
import { sql } from '@/lib/db';
import { followupLabel, formatPrice, intlPhone, shortDate, waLink } from '@/lib/format';
import { addDays } from '@/lib/time';
import { createClient } from './actions';

const FILTERS = [
  ['contactar', 'Para contactar'],
  ['semana', 'Próximos 7 días'],
  ['presupuestos', 'Presupuestos sin respuesta'],
  ['todos', 'Todas'],
];

export default async function ClientList({ today, f = 'contactar', q = '' }) {
  const week = addDays(today, 7);
  const search = q.trim();
  const like = `%${search}%`;
  const digits = search.replace(/\D/g, '').replace(/^0+/, '');

  let clients;
  let counts;
  try {
    [[counts], clients] = await Promise.all([
      sql`
        select
          count(*) filter (where next_followup <= ${today})::int as contactar,
          count(*) filter (where next_followup > ${today} and next_followup <= ${week})::int as semana,
          count(*) filter (where exists (select 1 from quotes q where q.client_id = c.id and q.status = 'sent'))::int as presupuestos,
          count(*)::int as todos
        from clients c`,
      sql`
        select c.*,
          (select count(*)::int from quotes q where q.client_id = c.id and q.status = 'sent') as open_quotes,
          (select json_agg(json_build_object('amount', q.amount, 'currency', q.currency)) from quotes q
            where q.client_id = c.id and q.status = 'sent') as open_amounts,
          (select t.treatment || '|' || t.done_on from client_treatments t where t.client_id = c.id
            order by t.done_on desc limit 1) as last_treatment,
          (select count(*)::int from bookings b where b.client_id = c.id and b.status <> 'cancelled' and b.date >= ${today}) as upcoming
        from clients c
        where true
          ${f === 'contactar' ? sql`and c.next_followup <= ${today}` : sql``}
          ${f === 'semana' ? sql`and c.next_followup > ${today} and c.next_followup <= ${week}` : sql``}
          ${f === 'presupuestos' ? sql`and exists (select 1 from quotes q where q.client_id = c.id and q.status = 'sent')` : sql``}
          ${search ? sql`and (c.name ilike ${like} or c.email ilike ${like} ${digits.length >= 3 ? sql`or c.phone_key like ${`%${digits}%`}` : sql``})` : sql``}
        order by ${f === 'todos' ? sql`c.name` : sql`c.next_followup nulls last, c.name`}
        limit 300`,
    ]);
  } catch (err) {
    if (err.code === '42P01') {
      return (
        <section className="card">
          <h2>Falta preparar la base</h2>
          <p className="muted">Para usar la sección de clientes hay que ejecutar una vez el archivo <code>db/migraciones/002_crm.sql</code> en el editor SQL de la base de datos.</p>
        </section>
      );
    }
    throw err;
  }

  const href = (key) => `/admin?tab=clientes&f=${key}${search ? `&q=${encodeURIComponent(search)}` : ''}`;

  return (
    <section>
      <div className="crm-toolbar">
        <nav className="filter-pills">
          {FILTERS.map(([key, label]) => (
            <Link key={key} href={href(key)} className={f === key ? 'active' : ''}>
              {label} <span className="pill-count">{counts[key]}</span>
            </Link>
          ))}
        </nav>
        <form className="crm-search" action="/admin">
          <input type="hidden" name="tab" value="clientes" />
          <input type="hidden" name="f" value={f} />
          <input type="search" name="q" defaultValue={search} placeholder="Buscar por nombre o teléfono" aria-label="Buscar clienta" />
        </form>
      </div>

      {clients.length === 0 && (
        <p className="muted card">
          {search ? 'No encontré clientas con esa búsqueda.'
            : f === 'contactar' ? 'No hay nadie para contactar hoy. 🎉'
            : f === 'semana' ? 'No hay seguimientos agendados para esta semana.'
            : f === 'presupuestos' ? 'No hay presupuestos esperando respuesta.'
            : 'Todavía no hay fichas. Se crean solas con cada reserva, o podés agregar una abajo.'}
        </p>
      )}

      <div className="client-list">
        {clients.map((c) => {
          const fu = followupLabel(c.next_followup, today);
          const [lastName, lastDate] = c.last_treatment?.split('|') ?? [];
          const totals = Object.entries((c.open_amounts ?? []).reduce((acc, a) => ((acc[a.currency] = (acc[a.currency] ?? 0) + Number(a.amount)), acc), {}));
          const msg = `Hola ${c.name.split(' ')[0]}! Te escribe la ${config.businessName}. ${c.followup_reason ? `Te escribo por ${c.followup_reason.replace(/^Presupuesto: /, 'el presupuesto de ').replace(/^Control de /, 'el control de ')}. ` : ''}¿Cómo estás?`;
          return (
            <article key={c.id} className={`client-row ${fu ? `fu-${fu.tone}` : ''}`}>
              <div className="client-row-main">
                <Link href={`/admin/clientes/${c.id}`} className="client-name">{c.name}</Link>
                <p className="muted small">
                  {c.phone || 'Sin teléfono'}
                  {lastName && <> · Último: {lastName} ({shortDate(lastDate)})</>}
                  {c.upcoming > 0 && <> · {c.upcoming === 1 ? 'Tiene 1 turno reservado' : `Tiene ${c.upcoming} turnos reservados`}</>}
                </p>
                <div className="client-tags">
                  {fu && <span className={`fu-tag ${fu.tone}`}>{fu.text}{c.followup_reason && ` · ${c.followup_reason}`}</span>}
                  {c.open_quotes > 0 && (
                    <span className="quote-tag">
                      {c.open_quotes === 1 ? '1 presupuesto' : `${c.open_quotes} presupuestos`} sin respuesta · {totals.map(([cur, sum]) => formatPrice(sum, cur)).join(' + ')}
                    </span>
                  )}
                </div>
              </div>
              <div className="actions">
                <Link className="btn btn-sm btn-ghost" href={`/admin/clientes/${c.id}`}>Ver ficha</Link>
                {c.phone && (
                  <a className="btn btn-sm btn-wa" href={waLink(intlPhone(c.phone, config.countryCode), msg)} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <section className="card">
        <h2>Nueva ficha</h2>
        <p className="muted">Las fichas se crean solas cuando alguien reserva. Agregá acá a quienes te consultan por otro lado (Instagram, WhatsApp, en persona).</p>
        <form action={createClient} className="form inline-form">
          <label className="grow">Nombre<input name="name" required /></label>
          <label>Teléfono<input name="phone" type="tel" placeholder="099 123 456" /></label>
          <button className="btn btn-sm">Crear ficha</button>
        </form>
      </section>
    </section>
  );
}
