'use client';

import { useEffect, useMemo, useState } from 'react';
import { WhatsAppIcon } from './Icons';
import { formatDate, formatDuration, formatPrice, waLink } from '@/lib/format';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAY_HEADERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const pad = (n) => String(n).padStart(2, '0');
const isoDate = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

function todayIso() {
  const d = new Date();
  return isoDate(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDaysIso(date, n) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export default function BookingFlow({ treatments, business }) {
  const [treatment, setTreatment] = useState(null);
  const [openCategory, setOpenCategory] = useState(null);
  const [days, setDays] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', notes: '', website: '' });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  useEffect(() => {
    if (!treatment) return;
    let cancelled = false;
    setDays(null);
    setLoadError('');
    const from = todayIso();
    fetch(`/api/availability?treatmentId=${treatment.id}&from=${from}&to=${addDaysIso(from, 120)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => !cancelled && setDays(data.days))
      .catch(() => !cancelled && setLoadError('No pudimos cargar los horarios. Probá de nuevo en un momento.'));
    return () => {
      cancelled = true;
    };
  }, [treatment]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const t of treatments) {
      if (!map.has(t.category)) map.set(t.category, []);
      map.get(t.category).push(t);
    }
    return [...map];
  }, [treatments]);

  const availableDates = useMemo(() => Object.keys(days ?? {}).sort(), [days]);

  function chooseTreatment(t) {
    setTreatment(t);
    setDate(null);
    setTime(null);
    setError('');
  }

  async function submit(e) {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ treatmentId: treatment.id, date, time, ...form }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo reservar.');
        if (res.status === 409) {
          setTime(null);
          setDays((prev) => ({ ...prev, [date]: (prev?.[date] ?? []).filter((t) => t !== time) }));
        }
        return;
      }
      setDone(data.booking);
    } catch {
      setError('Hubo un problema de conexión. Probá de nuevo.');
    } finally {
      setSending(false);
    }
  }

  if (done) {
    const message = [
      `Hola Pamela! Soy ${form.name}. Acabo de reservar ${treatment.name} para el ${formatDate(date).toLowerCase()} a las ${time}.`,
      `Para confirmarla: ${window.location.origin}/admin/reserva/${done.id}`,
    ].join('\n\n');
    return (
      <section className="card center">
        <div className="check">✓</div>
        <h2>¡Ya casi está!</h2>
        <p>
          <strong>{treatment.name}</strong>
          <br />
          {formatDate(date)} · {time} hs
        </p>
        {business.whatsappNumber ? (
          <>
            <p><strong>Último paso:</strong> enviale el aviso a {business.businessName} por WhatsApp para que confirme tu turno.</p>
            <a className="btn btn-wa btn-lg" href={waLink(business.whatsappNumber, message)} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon /> Enviar aviso por WhatsApp
            </a>
            <p className="muted small">El turno queda reservado a tu nombre y pendiente hasta que Pamela lo confirme.</p>
          </>
        ) : (
          <p className="muted">Tu turno queda pendiente hasta que {business.businessName} lo confirme. Te va a escribir al {form.phone}.</p>
        )}
      </section>
    );
  }

  return (
    <>
      <section className="card">
        <h2><span className="step">1</span> Elegí tu tratamiento</h2>
        {treatments.length === 0 && <p className="muted">Por el momento no hay tratamientos disponibles para reservar online.</p>}
        <div className="categories">
          {groups.map(([category, list]) => {
            const open = openCategory === category;
            const chosenHere = list.some((t) => t.id === treatment?.id);
            return (
              <div key={category || 'otros'} className={`category ${open ? 'open' : ''}`}>
                <button
                  type="button"
                  className="category-toggle"
                  onClick={() => setOpenCategory(open ? null : category)}
                  aria-expanded={open}
                >
                  <span>
                    {category || 'Otros tratamientos'}
                    {!open && chosenHere && <span className="category-chosen">{treatment.name}</span>}
                  </span>
                  <span className="chevron" aria-hidden="true">{open ? '−' : '+'}</span>
                </button>
                {open && (
                  <div className="treatments">
                    {list.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className={`treatment ${treatment?.id === t.id ? 'selected' : ''}`}
                        onClick={() => chooseTreatment(t)}
                        aria-pressed={treatment?.id === t.id}
                      >
                        <span className="treatment-name">{t.name}</span>
                        {t.description && <span className="treatment-desc">{t.description}</span>}
                        <span className="treatment-meta">
                          <span>⏱ {formatDuration(t.duration_min)} aprox.</span>
                          <span className="price">{formatPrice(t.price, t.currency, t.price_from)}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {treatment && (
        <section className="card">
          <h2><span className="step">2</span> Elegí día y horario</h2>
          {loadError && <p className="error">{loadError}</p>}
          {!days && !loadError && <p className="muted">Cargando horarios…</p>}
          {days && availableDates.length === 0 && (
            <p className="muted">No hay turnos libres para este tratamiento en las próximas semanas. Escribile a Pamela por WhatsApp.</p>
          )}
          {days && availableDates.length > 0 && (
            <div className="schedule">
              <Calendar
                month={month}
                setMonth={setMonth}
                days={days}
                selected={date}
                lastDate={availableDates[availableDates.length - 1]}
                onSelect={(d) => {
                  setDate(d);
                  setTime(null);
                }}
              />
              <div className="slots-panel">
                {!date && <p className="muted">Tocá un día resaltado para ver los horarios.</p>}
                {date && (
                  <>
                    <p className="slots-title">{formatDate(date)}</p>
                    {(days[date] ?? []).length === 0 && <p className="muted">Ya no quedan horarios este día.</p>}
                    <div className="slots">
                      {(days[date] ?? []).map((t) => (
                        <button key={t} type="button" className={`slot ${time === t ? 'selected' : ''}`} onClick={() => setTime(t)}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {treatment && date && time && (
        <section className="card">
          <h2><span className="step">3</span> Tus datos</h2>
          <p className="summary">
            {treatment.name} · {formatDate(date)} · {time} hs · {formatPrice(treatment.price, treatment.currency, treatment.price_from)}
          </p>
          <form onSubmit={submit} className="form">
            <label>
              Nombre y apellido
              <input required minLength={2} maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
            </label>
            <label>
              WhatsApp
              <input required type="tel" inputMode="tel" placeholder="099 123 456" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" />
            </label>
            <label>
              Comentario (opcional)
              <textarea rows={3} maxLength={500} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </label>
            <input className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
            {error && <p className="error">{error}</p>}
            <button className="btn" disabled={sending}>{sending ? 'Reservando…' : 'Confirmar reserva'}</button>
          </form>
        </section>
      )}
    </>
  );
}

function Calendar({ month, setMonth, days, selected, lastDate, onSelect }) {
  const now = new Date();
  const first = new Date(month.y, month.m, 1);
  const daysInMonth = new Date(month.y, month.m + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7; // semana empieza el lunes
  const canPrev = month.y > now.getFullYear() || (month.y === now.getFullYear() && month.m > now.getMonth());
  const canNext = isoDate(month.y, month.m, daysInMonth) < lastDate;
  const shift = (n) => {
    const d = new Date(month.y, month.m + n, 1);
    setMonth({ y: d.getFullYear(), m: d.getMonth() });
  };

  return (
    <div className="calendar">
      <div className="cal-head">
        <button type="button" onClick={() => shift(-1)} disabled={!canPrev} aria-label="Mes anterior">‹</button>
        <span>{MONTHS[month.m]} {month.y}</span>
        <button type="button" onClick={() => shift(1)} disabled={!canNext} aria-label="Mes siguiente">›</button>
      </div>
      <div className="cal-grid">
        {DAY_HEADERS.map((d, i) => <span key={i} className="cal-dow">{d}</span>)}
        {Array.from({ length: offset }, (_, i) => <span key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const iso = isoDate(month.y, month.m, i + 1);
          const available = (days[iso] ?? []).length > 0;
          return (
            <button
              key={iso}
              type="button"
              className={`cal-day ${available ? 'available' : ''} ${selected === iso ? 'selected' : ''}`}
              disabled={!available}
              onClick={() => onSelect(iso)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
