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

-- ════════════════════════════════════════════════════════════
--  Verificacion de 003_unaccent.sql
-- ════════════════════════════════════════════════════════════

-- 6. Diagnostico: en que schema quedo la extension unaccent.
--    Solo importa si la consulta 7 falla con "function does not exist".
select e.extname, n.nspname as schema
from pg_extension e
join pg_namespace n on n.oid = e.extnamespace
where e.extname in ('unaccent', 'pg_trgm');

-- 7. El wrapper funciona
select immutable_unaccent('Acetaminofén Forte')     as sin_tildes,   -- Acetaminofen Forte
       immutable_unaccent('Ácido Clavulánico')      as sin_tildes_2; -- Acido Clavulanico

-- 8. Busqueda sin tildes encuentra registros CON tildes.
--    Sin la migracion 003 esto devuelve 0 filas.
select name, active_ingredient
from medications
where immutable_unaccent(name)              ilike immutable_unaccent('%acetaminofen%')
   or immutable_unaccent(active_ingredient) ilike immutable_unaccent('%acetaminofen%');

-- 9. Y al reves: buscar CON tilde tambien encuentra.
select count(*) as con_tilde
from medications
where immutable_unaccent(name) ilike immutable_unaccent('%Acetaminofén%');

-- 10. El indice de expresion se usa de verdad.
--     Buscar "Bitmap Index Scan on idx_med_name_unaccent_trgm".
--     Nota: con 50 filas el planner puede preferir Seq Scan por costo;
--     para forzar la comprobacion: set enable_seqscan = off;
explain analyze
select id, name, price
from medications
where immutable_unaccent(name) ilike immutable_unaccent('%ibu%');
