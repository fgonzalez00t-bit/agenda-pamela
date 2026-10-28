-- Tratamientos y horario inicial de la Dra. Pamela Bertiz. Solo se cargan si las tablas están vacías;
-- después se editan desde el panel (/admin). Las duraciones son estimadas.
insert into treatments (category, name, description, duration_min, price, currency, price_from, sort)
select * from (values
  ('Tratamientos faciales', 'Limpieza facial profunda', 'Incluye peeling y aparatología con punta de diamante, alta frecuencia y lámpara LED.', 60, 1990, 'UYU', false, 10),
  ('Tratamientos faciales', 'Dermapen', '', 45, 2500, 'UYU', false, 11),
  ('Tratamientos faciales', 'Mesoterapia', '', 45, 2500, 'UYU', false, 12),
  ('Tratamientos faciales', 'Dermapen + Mesoterapia', '', 60, 4000, 'UYU', false, 13),
  ('Tratamientos faciales', 'Limpieza facial profunda + Dermaplaning', '', 75, 2100, 'UYU', false, 14),

  ('Toxina botulínica (bótox)', 'Tercio superior', 'Frente, entrecejo y patas de gallo.', 30, 280, 'USD', false, 20),
  ('Toxina botulínica (bótox)', 'Maseteros (bruxismo)', '', 30, 300, 'USD', false, 21),
  ('Toxina botulínica (bótox)', 'Bandas platismales (cuello)', '', 30, 300, 'USD', false, 22),
  ('Toxina botulínica (bótox)', 'Sonrisa gingival', '', 30, 180, 'USD', false, 23),

  ('Bioestimuladores', 'Profhilo · 1 sesión', '', 30, 400, 'USD', false, 30),
  ('Bioestimuladores', 'Profhilo · protocolo de 2 sesiones', 'Se reserva la primera sesión; la segunda se coordina en la consulta.', 30, 750, 'USD', false, 31),
  ('Bioestimuladores', 'Facetem · 1 sesión', '', 30, 400, 'USD', false, 32),
  ('Bioestimuladores', 'Facetem · protocolo de 2 sesiones', 'Se reserva la primera sesión; la segunda se coordina en la consulta.', 30, 750, 'USD', false, 33),
  ('Bioestimuladores', 'Long Lasting · 1 sesión', '', 45, 700, 'USD', false, 34),

  ('Hilos tensores', '8 hilos', 'El presupuesto final depende de la cantidad de hilos necesarios para cada paciente.', 60, 550, 'USD', false, 40),
  ('Hilos tensores', '12 hilos', 'El presupuesto final depende de la cantidad de hilos necesarios para cada paciente.', 60, 700, 'USD', false, 41),
  ('Hilos tensores', '16 hilos', 'El presupuesto final depende de la cantidad de hilos necesarios para cada paciente.', 75, 900, 'USD', false, 42),
  ('Hilos tensores', '20 hilos', 'El presupuesto final depende de la cantidad de hilos necesarios para cada paciente.', 90, 1100, 'USD', false, 43),

  ('Ácido hialurónico', 'Labios', '1 jeringa.', 45, 280, 'USD', false, 50),
  ('Ácido hialurónico', 'Mentón', '1 jeringa.', 45, 250, 'USD', false, 51),
  ('Ácido hialurónico', 'Reborde mandibular', '', 60, 250, 'USD', true, 52),
  ('Ácido hialurónico', 'Tercio medio facial', '', 60, 250, 'USD', true, 53)
) as t(category, name, description, duration_min, price, currency, price_from, sort)
where not exists (select 1 from treatments);

-- Lunes a viernes de 9 a 18
insert into weekly_hours (weekday, start_time, end_time)
select d, '09:00', '18:00' from generate_series(1, 5) as d
where not exists (select 1 from weekly_hours);
