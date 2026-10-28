# Agenda de turnos · Dra. Pamela

Web de reservas para un consultorio de medicina estética.

- **Clientas** (`/`): eligen un tratamiento (con duración y precio), ven los días y horarios libres y reservan. Al terminar pueden avisarle a Pamela por WhatsApp con un botón.
- **Pamela** (`/admin`): confirma o rechaza reservas, edita o pausa tratamientos, define su horario semanal y bloquea días completos o franjas puntuales.
- **Aviso por WhatsApp**: con cada reserva nueva, Pamela recibe un mensaje con el link para confirmarla (vía CallMeBot, gratis).

Hecho con Next.js 15 y Postgres. Los tratamientos, precios (en $ o USD) y el horario inicial (lunes a viernes de 9 a 18, hora de Uruguay) están en `db/seed.sql`; las duraciones son estimadas y se corrigen desde el panel.

## Puesta en marcha

1. **Base de datos**: crear un proyecto gratis en [Supabase](https://supabase.com). En *Project Settings → Database*, copiar la *connection string* del **Transaction pooler**.
2. **Tablas y datos de ejemplo**:
   ```bash
   npm install
   DATABASE_URL="postgres://..." npm run db:setup
   ```
3. **Publicar en Vercel**: importar este repositorio en [vercel.com/new](https://vercel.com/new) y cargar las variables de `.env.example` (como mínimo `DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `INSTAGRAM_URL`, `WHATSAPP_NUMBER` y `PUBLIC_URL`).
4. **Aviso por WhatsApp** (opcional): desde el WhatsApp de Pamela, seguir los pasos de [CallMeBot](https://www.callmebot.com/blog/free-api-whatsapp-messages/) (agregar el contacto del bot y mandarle el mensaje de activación). La clave que responde va en `CALLMEBOT_APIKEY`.

## Desarrollo local

```bash
cp .env.example .env.local   # completar DATABASE_URL (y DATABASE_SSL=false si es un Postgres local)
npm run db:setup
npm run dev
```

## Reglas de la agenda

Se ajustan con variables de entorno: intervalo entre turnos (`SLOT_STEP_MIN`), cuántos días hacia adelante se puede reservar (`DAYS_AHEAD`) y la anticipación mínima en horas (`MIN_NOTICE_HOURS`). Las reservas pendientes ya ocupan el horario, así que nadie más puede tomarlo hasta que Pamela la rechace.
