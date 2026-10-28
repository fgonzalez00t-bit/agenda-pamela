// Utilidades compartidas entre servidor y navegador.
export const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function formatPrice(value, currency = 'ARS') {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
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
