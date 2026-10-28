import { config } from './config';
import { weekdayOf } from './format';
import { addDays, fromMin, nowIn, toMin } from './time';

const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

export function bookingWindow() {
  const now = nowIn(config.timezone);
  const earliestTotal = now.minutes + config.minNoticeHours * 60;
  return {
    today: now.date,
    lastDate: addDays(now.date, config.daysAhead),
    earliestDate: addDays(now.date, Math.floor(earliestTotal / 1440)),
    earliestMin: earliestTotal % 1440,
  };
}

// Devuelve { 'YYYY-MM-DD': ['09:00', '09:30', ...] } con los turnos libres de un tratamiento.
export async function getAvailability(db, treatmentId, from, to) {
  const [treatment] = await db`select * from treatments where id = ${treatmentId} and active`;
  if (!treatment) return null;

  const win = bookingWindow();
  if (from < win.today) from = win.today;
  if (to > win.lastDate) to = win.lastDate;
  if (from > to) return {};

  const [hours, blockedDays, blockedSlots, bookings] = await Promise.all([
    db`select weekday, start_time, end_time from weekly_hours`,
    db`select date from blocked_days where date between ${from} and ${to}`,
    db`select date, start_time, end_time from blocked_slots where date between ${from} and ${to}`,
    db`select date, start_time, end_time from bookings where date between ${from} and ${to} and status <> 'cancelled'`,
  ]);

  const blocked = new Set(blockedDays.map((r) => r.date));
  const busyByDate = {};
  for (const r of [...blockedSlots, ...bookings]) {
    (busyByDate[r.date] ??= []).push([toMin(r.start_time), toMin(r.end_time)]);
  }

  const result = {};
  for (let date = from; date <= to; date = addDays(date, 1)) {
    if (blocked.has(date) || date < win.earliestDate) continue;
    const busy = busyByDate[date] ?? [];
    const slots = [];
    for (const range of hours.filter((h) => h.weekday === weekdayOf(date))) {
      const end = toMin(range.end_time);
      for (let s = toMin(range.start_time); s + treatment.duration_min <= end; s += config.slotStepMin) {
        if (date === win.earliestDate && s < win.earliestMin) continue;
        const e = s + treatment.duration_min;
        if (busy.some(([bs, be]) => overlaps(s, e, bs, be))) continue;
        slots.push(fromMin(s));
      }
    }
    if (slots.length) result[date] = [...new Set(slots)].sort();
  }
  return result;
}
