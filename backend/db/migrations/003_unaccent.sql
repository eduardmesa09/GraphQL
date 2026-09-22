-- ════════════════════════════════════════════════════════════
--  AFIRMATIVE PILL — 003: Busqueda insensible a tildes
--
--  PROBLEMA
--  El dataset esta en espanol con tildes ("Acetaminofen" se escribe
--  Acetaminofén, "Antimicoticos" -> Antimicóticos, "Acido Clavulanico"
--  -> Ácido Clavulánico) pero nadie escribe tildes en un buscador.
--  pg_trgm normaliza mayusculas, pero NO acentos:
--
--      where name ilike '%acetaminofen%'   -- no encuentra "Acetaminofén"
--
--  SOLUCION
--  Normalizar ambos lados de la comparacion con unaccent(), e indexar
--  la expresion normalizada.
--
--  EL TRUCO
--  unaccent() de una sola argumento NO es IMMUTABLE (depende del
--  diccionario que resuelva el search_path en tiempo de ejecucion), y
--  Postgres solo indexa expresiones inmutables. La forma de dos
--  argumentos con un regdictionary explicito si es determinista, asi
--  que la envolvemos en una funcion propia marcada IMMUTABLE.
-- ════════════════════════════════════════════════════════════

create extension if not exists unaccent;

-- ─────────────── Wrapper inmutable ───────────────
-- El SET search_path la hace funcionar sin importar si la extension
-- quedo instalada en public o en el schema "extensions" de Supabase.

create or replace function immutable_unaccent(text)
returns text
language sql
immutable
parallel safe
strict
set search_path = public, extensions, pg_catalog
as $func$
  select unaccent('unaccent'::regdictionary, $1)
$func$;

comment on function immutable_unaccent(text) is
  'Version indexable de unaccent(). Usar SIEMPRE en ambos lados de una '
  'comparacion de busqueda: el indice solo aplica si la expresion de la '
  'consulta es identica a la del indice.';

-- ─────────────── Indices sobre la expresion normalizada ───────────────

create index idx_med_name_unaccent_trgm
  on medications using gin (immutable_unaccent(name) gin_trgm_ops);

create index idx_med_ingredient_unaccent_trgm
  on medications using gin (immutable_unaccent(active_ingredient) gin_trgm_ops);

-- Los indices trigram originales de 001 quedan obsoletos: toda busqueda
-- del catalogo pasa ahora por immutable_unaccent(), y un indice sobre la
-- columna cruda nunca seria elegido para esa expresion.
drop index if exists idx_med_name_trgm;
drop index if exists idx_med_ingredient_trgm;

-- categories solo tiene 14 filas: no lleva indice, pero la BUSQUEDA si
-- debe normalizarse para que "antimicoticos" encuentre "Antimicóticos".

-- ════════════════════════════════════════════════════════════
--  USO EN LOS RESOLVERS
--
--  Ambos lados normalizados, y la expresion de la izquierda IDENTICA
--  a la del indice:
--
--    select m.id, m.name, m.price, m.presentation
--    from medications m
--    join categories c on c.id = m.category_id
--    where $1::text is null
--       or immutable_unaccent(m.name)              ilike immutable_unaccent('%' || $1 || '%')
--       or immutable_unaccent(m.active_ingredient) ilike immutable_unaccent('%' || $1 || '%')
--       or immutable_unaccent(c.name)              ilike immutable_unaccent('%' || $1 || '%');
--
--  Error tipico: normalizar solo el patron. Si escribes
--      where m.name ilike immutable_unaccent(...)
--  el indice no se usa Y "Acetaminofén" sigue sin aparecer.
-- ════════════════════════════════════════════════════════════
