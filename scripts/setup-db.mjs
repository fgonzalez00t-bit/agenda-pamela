// Crea las tablas y carga datos de ejemplo (solo si están vacías).
// Uso: DATABASE_URL=postgres://... npm run db:setup
import { readFileSync } from 'node:fs';
import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  console.error('Falta la variable DATABASE_URL');
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { ssl: process.env.DATABASE_SSL === 'false' ? false : 'prefer' });
for (const file of ['db/schema.sql', 'db/seed.sql']) {
  await sql.unsafe(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'));
  console.log(`OK ${file}`);
}
await sql.end();
