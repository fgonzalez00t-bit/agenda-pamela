import { config } from '@/lib/config';
import './globals.css';

export const metadata = {
  title: `${config.businessName} · Turnos`,
  description: `Reservá tu turno online con ${config.businessName}, ${config.tagline.toLowerCase()}.`,
};

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#F5ECEE' };

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&family=Marcellus&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
