-- Fechas como 'YYYY-MM-DD' y horas como 'HH:MM' (texto), siempre en la zona horaria del consultorio.

create table if not exists treatments (
  id serial primary key,
  name text not null,
  description text not null default '',
  duration_min integer not null check (duration_min > 0),
  price numeric(12,2) not null default 0,
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists weekly_hours (
  id serial primary key,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = domingo
  start_time text not null check (start_time ~ '^\d{2}:\d{2}$'),
  end_time text not null check (end_time ~ '^\d{2}:\d{2}$'),
  check (start_time < end_time)
);

create table if not exists blocked_days (
  id serial primary key,
  date text not null unique check (date ~ '^\d{4}-\d{2}-\d{2}$'),
  reason text not null default ''
);

create table if not exists blocked_slots (
  id serial primary key,
  date text not null check (date ~ '^\d{4}-\d{2}-\d{2}$'),
  start_time text not null check (start_time ~ '^\d{2}:\d{2}$'),
  end_time text not null check (end_time ~ '^\d{2}:\d{2}$'),
  reason text not null default '',
  check (start_time < end_time)
);

create table if not exists bookings (
  id serial primary key,
  treatment_id integer not null references treatments(id),
  treatment_name text not null,
  price numeric(12,2) not null,
  date text not null check (date ~ '^\d{4}-\d{2}-\d{2}$'),
  start_time text not null,
  end_time text not null,
  client_name text not null,
  client_phone text not null,
  notes text not null default '',
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists bookings_date_idx on bookings (date);
create index if not exists blocked_slots_date_idx on blocked_slots (date);
