import postgres from 'postgres';

// Reutiliza la conexión entre recargas en desarrollo y entre invocaciones en serverless.
const globalForDb = globalThis;

export const sql =
  globalForDb.__sql ??
  postgres(process.env.DATABASE_URL, {
    ssl: process.env.DATABASE_SSL === 'false' ? false : 'prefer',
    max: 5,
    prepare: false, // compatible con el pooler de Supabase
    types: { numeric: { to: 1700, from: [1700], parse: Number, serialize: String } },
  });

if (process.env.NODE_ENV !== 'production') globalForDb.__sql = sql;
