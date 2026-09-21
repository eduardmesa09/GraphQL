-- ════════════════════════════════════════════════════════════
--  AFIRMATIVE PILL — Verificacion post-seed
--  Ejecutar despues del seed y ANTES de borrar staging_medications.
-- ════════════════════════════════════════════════════════════

-- 1. Conteos esperados: 50 / 14 / 16
select
  (select count(*) from medications)   as medicamentos,
  (select count(*) from categories)    as categorias,
  (select count(*) from laboratories)  as laboratorios;

-- 2. Ningun medicamento quedo fuera por un join fallido
select s.sku, s.name, s.category, s.manufacturer
from staging_medications s
left join medications m on m.sku = trim(s.sku)
where m.id is null;

-- 3. Reparto OTC vs. con formula medica (Escenario B)
select
  count(*) filter (where requires_prescription)     as con_receta,
  count(*) filter (where not requires_prescription) as venta_libre
from medications;

-- 4. El join anidado que luego batcheara el DataLoader
select m.name, c.name as categoria, l.name as laboratorio, m.price, m.stock
from medications m
join categories   c on c.id = m.category_id
join laboratories l on l.id = m.laboratory_id
order by m.sku
limit 5;

-- 5. Los indices trigram se usan de verdad (busca "Index Scan", no "Seq Scan")
explain analyze
select id, name, price, presentation
from medications
where name ilike '%ibu%';
