// Toda la configuración sale de variables de entorno (ver .env.example).
export const config = {
  businessName: process.env.BUSINESS_NAME || 'Dra. Pamela Bertiz',
  tagline: process.env.BUSINESS_TAGLINE || 'Medicina estética',
  address: process.env.BUSINESS_ADDRESS || '',
  instagramUrl: process.env.INSTAGRAM_URL || 'https://www.instagram.com/drapamelabertiz',
  whatsappNumber: (process.env.WHATSAPP_NUMBER || '59899696027').replace(/\D/g, ''),
  timezone: process.env.TIMEZONE || 'America/Montevideo',
  countryCode: (process.env.COUNTRY_CODE || '598').replace(/\D/g, ''),
  slotStepMin: Number(process.env.SLOT_STEP_MIN || 30),
  daysAhead: Number(process.env.DAYS_AHEAD || 60),
  minNoticeHours: Number(process.env.MIN_NOTICE_HOURS || 12),
  publicUrl: (process.env.PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, ''),
};

export function publicConfig() {
  const { businessName, tagline, address, instagramUrl, whatsappNumber } = config;
  return { businessName, tagline, address, instagramUrl, whatsappNumber };
}
