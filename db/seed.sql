-- Datos de ejemplo: reemplazar desde el panel de Pamela.
insert into treatments (name, description, duration_min, price, sort)
select * from (values
  ('Consulta de evaluación', 'Primera consulta para evaluar y armar un plan personalizado.', 30, 20000, 1),
  ('Toxina botulínica', 'Tercio superior: frente, entrecejo y patas de gallo.', 45, 180000, 2),
  ('Ácido hialurónico (labios)', 'Relleno y perfilado de labios.', 60, 220000, 3),
  ('Skinbooster', 'Hidratación profunda de la piel.', 45, 150000, 4),
  ('Limpieza facial profunda', 'Higiene facial con extracción y máscara.', 60, 45000, 5)
) as t(name, description, duration_min, price, sort)
where not exists (select 1 from treatments);

insert into weekly_hours (weekday, start_time, end_time)
select * from (values
  (1, '09:00', '13:00'), (1, '15:00', '19:00'),
  (2, '09:00', '13:00'), (2, '15:00', '19:00'),
  (3, '09:00', '13:00'), (3, '15:00', '19:00'),
  (4, '09:00', '13:00'), (4, '15:00', '19:00'),
  (5, '09:00', '14:00')
) as t(weekday, start_time, end_time)
where not exists (select 1 from weekly_hours);
