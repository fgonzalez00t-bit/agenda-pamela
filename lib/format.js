// Utilidades compartidas entre servidor y navegador.
export const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Precios como los publica Pamela: "$ 1.990" en pesos uruguayos, "USD 280" en dólares.
export function formatPrice(value, currency = 'UYU', from = false) {
  const amount = new Intl.NumberFormat('es-UY', { maximumFractionDigits: 2 }).format(value);
  return `${from ? 'desde ' : ''}${currency === 'USD' ? 'USD' : '$'} ${amount}`;
}

// Arma el número internacional para wa.me a partir de lo que escribió la clienta (ej. "099 123 456").
export function intlPhone(phone, countryCode) {
  const digits = String(phone).replace(/\D/g, '');
  if (String(phone).trim().startsWith('+') || digits.startsWith(countryCode)) return digits;
  return countryCode + digits.replace(/^0+/, '');
}

export function formatDuration(min) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function weekdayOf(date) {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

export function formatDate(date) {
  const [y, m, d] = date.split('-').map(Number);
  return `${WEEKDAYS[weekdayOf(date)]} ${d} de ${MONTHS[m - 1]}${y !== new Date().getFullYear() ? ` de ${y}` : ''}`;
}

export function waLink(number, text) {
  const digits = String(number || '').replace(/\D/g, '');
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

// "Vencido hace 3 días", "Hoy", "Mañana", "En 5 días"… para la fecha de próximo seguimiento.
export function followupLabel(date, today) {
  if (!date) return null;
  const days = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
  if (days < 0) return { text: days === -1 ? 'Venció ayer' : `Venció hace ${-days} días`, tone: 'late' };
  if (days === 0) return { text: 'Hoy', tone: 'today' };
  if (days === 1) return { text: 'Mañana', tone: 'soon' };
  if (days <= 7) return { text: `En ${days} días`, tone: 'soon' };
  return { text: formatDate(date), tone: 'later' };
}

export function shortDate(date) {
  if (!date) return '';
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y.slice(2)}`;
}
