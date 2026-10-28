import BookingFlow from '@/components/BookingFlow';
import { InstagramIcon, WhatsAppIcon } from '@/components/Icons';
import { config, publicConfig } from '@/lib/config';
import { sql } from '@/lib/db';
import { waLink } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const treatments = await sql`
    select id, category, name, description, duration_min, price, currency, price_from
    from treatments where active order by sort, name`;

  return (
    <main className="page">
      <header className="hero">
        <p className="eyebrow">{config.tagline}</p>
        <h1>{config.businessName}</h1>
        {config.address && <p className="muted">{config.address}</p>}
        <nav className="social">
          <a href={config.instagramUrl} target="_blank" rel="noopener noreferrer" className="pill">
            <InstagramIcon /> Instagram
          </a>
          {config.whatsappNumber && (
            <a href={waLink(config.whatsappNumber, 'Hola Pamela! Te escribo por una consulta.')} target="_blank" rel="noopener noreferrer" className="pill">
              <WhatsAppIcon /> WhatsApp
            </a>
          )}
        </nav>
      </header>

      <BookingFlow treatments={treatments} business={publicConfig()} />

      <footer className="footer muted">
        Los turnos quedan pendientes hasta que {config.businessName} los confirme por WhatsApp.
      </footer>
    </main>
  );
}
