import { NextResponse } from 'next/server';
import { getAvailability } from '@/lib/availability';
import { sql } from '@/lib/db';
import { isDate } from '@/lib/time';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const params = request.nextUrl.searchParams;
  const treatmentId = Number(params.get('treatmentId'));
  const from = params.get('from');
  const to = params.get('to');
  if (!Number.isInteger(treatmentId) || !isDate(from) || !isDate(to)) {
    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
  }
  const days = await getAvailability(sql, treatmentId, from, to);
  if (!days) return NextResponse.json({ error: 'Tratamiento no disponible' }, { status: 404 });
  return NextResponse.json({ days });
}
