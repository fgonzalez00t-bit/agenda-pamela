// Toda la configuración sale de variables de entorno (ver .env.example).
export const config = {
  businessName: process.env.BUSINESS_NAME || 'Dra. Pamela',
  tagline: process.env.BUSINESS_TAGLINE || 'Medicina estética',
  address: process.env.BUSINESS_ADDRESS || '',
  instagramUrl: process.env.INSTAGRAM_URL || 'https://instagram.com/',
  whatsappNumber: (process.env.WHATSAPP_NUMBER || '').replace(/\D/g, ''),
  timezone: process.env.TIMEZONE || 'America/Argentina/Buenos_Aires',
  currency: process.env.CURRENCY || 'ARS',
  slotStepMin: Number(process.env.SLOT_STEP_MIN || 30),
  daysAhead: Number(process.env.DAYS_AHEAD || 60),
  minNoticeHours: Number(process.env.MIN_NOTICE_HOURS || 12),
  publicUrl: (process.env.PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, ''),
};

export function publicConfig() {
  const { businessName, tagline, address, instagramUrl, whatsappNumber, currency } = config;
  return { businessName, tagline, address, instagramUrl, whatsappNumber, currency };
}
