import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Diagnóstico de la conexión con la base. No muestra datos sensibles, solo qué paso de la configuración falta.
const HINTS = {
  '42P01': 'La base está conectada pero faltan las tablas: ejecutá db/schema.sql y db/seed.sql en el SQL Editor de Supabase.',
  '28P01': 'La clave de la base es incorrecta: revisá la parte [YOUR-PASSWORD] de DATABASE_URL (sin corchetes).',
  '3D000': 'El nombre de la base al final de DATABASE_URL es incorrecto (debería terminar en /postgres).',
  ENOTFOUND: 'No se encuentra el servidor de la base: revisá que DATABASE_URL esté copiada completa.',
  ECONNREFUSED: 'El servidor de la base rechazó la conexión: usá la dirección del Transaction pooler (puerto 6543).',
  ETIMEDOUT: 'La conexión a la base tardó demasiado: usá la dirección del Transaction pooler (puerto 6543).',
  ERR_INVALID_URL: 'DATABASE_URL no es una dirección válida: si la clave tiene símbolos como @ # / ?, cambiala en Supabase por una solo con letras y números.',
};

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, problema: 'Falta la variable DATABASE_URL en Vercel (y después hay que hacer Redeploy).' });
  }
  const checks = {
    ADMIN_PASSWORD: Boolean(process.env.ADMIN_PASSWORD),
    PUBLIC_URL: process.env.PUBLIC_URL || null,
  };
  try {
    const { sql } = await import('@/lib/db'); // dentro del try: una DATABASE_URL mal escrita falla al conectar
    const [{ count }] = await sql`select count(*)::int as count from treatments`;
    return NextResponse.json({ ok: true, tratamientos: count, ...checks });
  } catch (err) {
    const code = err.code || err.errno;
    return NextResponse.json({
      ok: false,
      codigo: code ?? null,
      problema: HINTS[code] ?? 'No se pudo conectar a la base de datos.',
      detalle: String(err.message || '').replace(/postgres(ql)?:\/\/\S+/g, '[oculto]').slice(0, 200),
      ...checks,
    });
  }
}
