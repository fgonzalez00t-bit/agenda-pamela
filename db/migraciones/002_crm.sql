-- CRM de clientes: fichas, presupuestos, tratamientos realizados, notas y seguimiento.
-- Se puede correr varias veces sin romper nada (todo es "if not exists").
-- Para aplicarla en producción: pegar este archivo en el SQL Editor de la base y ejecutarlo.

create table if not exists clients (
  id serial primary key,
  name text not null,
  phone text not null default '',
  phone_key text unique,               -- teléfono normalizado (solo dígitos, con código de país) para no duplicar fichas
  email text not null default '',
  instagram text not null default '',
  birthdate text check (birthdate is null or birthdate ~ '^\d{4}-\d{2}-\d{2}$'),
  notes text not null default '',       -- notas fijas (alergias, preferencias, etc.)
  next_followup text check (next_followup is null or next_followup ~ '^\d{4}-\d{2}-\d{2}$'),
  followup_reason text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists quotes (
  id serial primary key,
  client_id integer not null references clients(id) on delete cascade,
  treatment text not null,
  amount numeric(12,2) not null default 0,
  currency text not null default 'UYU',
  sent_on text not null check (sent_on ~ '^\d{4}-\d{2}-\d{2}$'),
  status text not null default 'sent' check (status in ('sent', 'accepted', 'rejected')),
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists client_treatments (
  id serial primary key,
  client_id integer not null references clients(id) on delete cascade,
  booking_id integer unique references bookings(id) on delete set null,
  treatment text not null,
  done_on text not null check (done_on ~ '^\d{4}-\d{2}-\d{2}$'),
  amount numeric(12,2),
  currency text not null default 'UYU',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists client_notes (
  id serial primary key,
  client_id integer not null references clients(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table bookings add column if not exists client_id integer references clients(id) on delete set null;

create index if not exists bookings_client_idx on bookings (client_id);
create index if not exists quotes_client_idx on quotes (client_id);
create index if not exists client_treatments_client_idx on client_treatments (client_id);
create index if not exists client_notes_client_idx on client_notes (client_id);
create index if not exists clients_followup_idx on clients (next_followup);

-- Crear una ficha por cada persona que ya reservó (agrupando por teléfono) y vincular sus reservas.
-- El 598 es el código de Uruguay (igual que COUNTRY_CODE).
with b as (
  select distinct on (key) key, client_name, client_phone
  from (
    select *,
      case when trim(client_phone) like '+%' or regexp_replace(client_phone, '\D', '', 'g') like '598%'
        then regexp_replace(client_phone, '\D', '', 'g')
        else '598' || ltrim(regexp_replace(client_phone, '\D', '', 'g'), '0') end as key
    from bookings where client_id is null
  ) x
  order by key, created_at desc
)
insert into clients (name, phone, phone_key)
select client_name, client_phone, key from b
on conflict (phone_key) do nothing;

update bookings bk set client_id = c.id
from clients c
where bk.client_id is null and c.phone_key =
  case when trim(bk.client_phone) like '+%' or regexp_replace(bk.client_phone, '\D', '', 'g') like '598%'
    then regexp_replace(bk.client_phone, '\D', '', 'g')
    else '598' || ltrim(regexp_replace(bk.client_phone, '\D', '', 'g'), '0') end;
