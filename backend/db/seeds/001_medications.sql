-- ════════════════════════════════════════════════════════════
--  AFIRMATIVE PILL — SEED: normalizacion del dataset
--
--  PRERREQUISITO: haber importado el CSV en staging_medications
--  (Table Editor -> staging_medications -> Insert -> Import data from CSV)
--
--  El CSV trae 'category' y 'manufacturer' como texto plano repetido.
--  Al normalizarlos en tablas propias creamos las relaciones anidadas
--  que provocan el problema N+1 en los resolvers -- que es justo lo que
--  el DataLoader debe resolver por lotes.
-- ════════════════════════════════════════════════════════════

begin;

-- 14 categorias distintas
insert into categories (name)
select distinct trim(category)
from staging_medications
where nullif(trim(category), '') is not null
on conflict (name) do nothing;

-- 16 laboratorios distintos
insert into laboratories (name)
select distinct trim(manufacturer)
from staging_medications
where nullif(trim(manufacturer), '') is not null
on conflict (name) do nothing;

-- 50 medicamentos con las FKs ya resueltas
insert into medications (
  sku, name, active_ingredient, category_id, laboratory_id,
  dosage, presentation, price, stock, requires_prescription, description
)
select
  trim(s.sku),
  trim(s.name),
  trim(s.active_ingredient),
  c.id,
  l.id,
  trim(s.dosage),
  trim(s.presentation),
  s.price::numeric(12,2),
  s.stock::integer,
  s.requires_prescription::boolean,
  nullif(trim(s.description), '')
from staging_medications s
join categories   c on c.name = trim(s.category)
join laboratories l on l.name = trim(s.manufacturer)
on conflict (sku) do nothing;

commit;

-- Verifica los conteos con db/verify.sql ANTES de ejecutar esto:
-- drop table staging_medications;
