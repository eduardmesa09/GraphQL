-- ════════════════════════════════════════════════════════════
--  AFIRMATIVE PILL — 001: Esquema base (write model + read model)
--  Ejecutar en el SQL Editor de Supabase. Idempotente solo en
--  extensiones/schema: las tablas fallan si ya existen (a propósito).
-- ════════════════════════════════════════════════════════════

create extension if not exists pg_trgm;

-- El read model vive en su propio schema: la segregación CQRS es física,
-- no solo una convención de nombres.
create schema if not exists read_model;

-- ─────────────── ENUMS (mapean 1:1 a enums de GraphQL) ───────────────

create type order_status as enum (
  'PENDING_APPROVAL', 'APPROVED', 'DISPATCHED', 'CANCELLED'
);

create type prescription_status as enum (
  'PENDING', 'VALIDATED', 'REJECTED'
);

-- ═══════════════════ WRITE MODEL (schema public) ═══════════════════

create table categories (
  id   smallint generated always as identity primary key,
  name text not null unique
);

create table laboratories (
  id   smallint generated always as identity primary key,
  name text not null unique
);

create table medications (
  id                    uuid primary key default gen_random_uuid(),
  sku                   text not null unique,
  name                  text not null,
  active_ingredient     text not null,
  category_id           smallint not null references categories(id),
  laboratory_id         smallint not null references laboratories(id),
  dosage                text not null,
  presentation          text not null,
  price                 numeric(12,2) not null check (price >= 0),
  -- La invariante de inventario se defiende tambien en el motor:
  -- ningun bug de aplicacion puede dejar stock negativo.
  stock                 integer not null check (stock >= 0),
  requires_prescription boolean not null default false,
  description           text,
  created_at            timestamptz not null default now()
);

create table patients (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  full_name     text not null,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

create table orders (
  id         uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id),
  status     order_status not null default 'PENDING_APPROVAL',
  total      numeric(12,2) not null default 0 check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references orders(id) on delete cascade,
  medication_id uuid not null references medications(id),
  quantity      integer not null check (quantity > 0),
  -- Precio congelado al momento de la compra: la orden no debe cambiar
  -- de total si el catalogo sube de precio manana.
  unit_price    numeric(12,2) not null check (unit_price >= 0),
  unique (order_id, medication_id)
);

create table prescriptions (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references orders(id) on delete cascade,
  medication_id  uuid not null references medications(id),
  doctor_name    text not null,
  doctor_license text not null,
  issued_at      date not null,
  document_url   text,
  status         prescription_status not null default 'PENDING',
  created_at     timestamptz not null default now(),
  unique (order_id, medication_id)
);

-- Bitacora de eventos de dominio: el puente write -> read.
-- Cada comando exitoso escribe aqui dentro de la misma transaccion,
-- y el EventBus dispara la reproyeccion a partir de estas filas.
create table domain_events (
  id             bigint generated always as identity primary key,
  aggregate_type text not null,
  aggregate_id   uuid not null,
  event_type     text not null,
  payload        jsonb not null,
  occurred_at    timestamptz not null default now()
);

-- ═══════════════════ READ MODEL (schema read_model) ═══════════════════
-- Deliberadamente SIN foreign keys hacia public: esta tabla podria vivir
-- en otra base de datos sin cambiar una linea de los resolvers de lectura.

create table read_model.order_projections (
  order_id              uuid primary key,
  patient_id            uuid not null,
  status                text not null,
  total                 numeric(12,2) not null,
  item_count            integer not null default 0,
  items                 jsonb not null default '[]'::jsonb,
  pending_prescriptions boolean not null default false,
  placed_at             timestamptz not null,
  projected_at          timestamptz not null default now()
);

-- ═══════════════════ INDICES ═══════════════════

-- Busqueda facetada del Escenario A: GIN trigram para ILIKE '%texto%'
create index idx_med_name_trgm       on medications using gin (name gin_trgm_ops);
create index idx_med_ingredient_trgm on medications using gin (active_ingredient gin_trgm_ops);

-- FKs: sin estos indices el WHERE id = ANY($1) del DataLoader hace seq scan
create index idx_med_category   on medications (category_id);
create index idx_med_laboratory on medications (laboratory_id);
create index idx_med_rx         on medications (requires_prescription);

create index idx_items_order      on order_items (order_id);
create index idx_items_medication on order_items (medication_id);
create index idx_rx_order         on prescriptions (order_id);
create index idx_orders_patient   on orders (patient_id, created_at desc);
create index idx_events_aggregate on domain_events (aggregate_id, id);

create index idx_proj_patient on read_model.order_projections (patient_id, placed_at desc);
