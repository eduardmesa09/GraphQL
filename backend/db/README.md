# Base de datos — Afirmative Pill

PostgreSQL alojado en Supabase. Todo se ejecuta desde el **SQL Editor**
del proyecto, en este orden.

## Orden de ejecución

| # | Archivo | Qué hace |
|---|---------|----------|
| 1 | `migrations/001_schema.sql` | Extensiones, enums, write model, read model e índices |
| 2 | `migrations/002_staging.sql` | Tabla temporal que refleja el CSV tal cual |
| 3 | *(manual)* | Importar el CSV en `staging_medications` desde el Table Editor |
| 4 | `seeds/001_medications.sql` | Normaliza staging → `categories` / `laboratories` / `medications` |
| 5 | `migrations/003_unaccent.sql` | Búsqueda insensible a tildes (`immutable_unaccent` + índices) |
| 6 | `verify.sql` | Comprueba conteos, joins, índices y normalización de tildes |
| 7 | *(manual)* | `drop table staging_medications;` |

### Paso 3 en detalle

Table Editor → `staging_medications` → **Insert** → **Import data from CSV**.
Las 12 columnas del CSV coinciden por nombre con las de la tabla, así que el
mapeo automático no requiere ajustes. Confirmar con `select count(*)` = 50.

## Modelo

**Write model (`public`)** — normalizado, con constraints que defienden las
invariantes en el motor: `stock >= 0`, `quantity > 0`, FKs reales.
`order_items.unit_price` guarda el precio congelado al momento de comprar.

**Read model (`read_model`)** — `order_projections` desnormaliza la orden
completa (total, ítems en `jsonb`) para servir el Escenario C sin joins.
No tiene FKs hacia `public` a propósito: podría vivir en otra base de datos.

**`domain_events`** es el puente entre ambos. Los comandos escriben el evento
dentro de la misma transacción que la mutación; el EventBus reproyecta a
partir de ahí. Ese desfase es la consistencia eventual que la UI debe manejar.

### Por qué el catálogo no tiene proyección persistida

Desnormalizar categoría y laboratorio en una vista materializada eliminaría
el join anidado — y con él la razón de existir del DataLoader. El read model
del catálogo vive en la capa de aplicación: queries dedicadas que seleccionan
solo las columnas pedidas, más batching por request. La proyección persistida
se reserva para las órdenes, donde la consistencia eventual sí es real.

## Búsqueda y tildes

El dataset está en español (*Acetaminofén*, *Antimicóticos*, *Ácido Clavulánico*)
pero nadie escribe tildes en un buscador. `pg_trgm` normaliza mayúsculas, pero no
acentos, así que `name ilike '%acetaminofen%'` no encontraría nada.

`003_unaccent.sql` resuelve esto con la función `immutable_unaccent(text)` y dos
índices GIN sobre esa expresión. La regla al escribir resolvers es una sola:

```sql
where immutable_unaccent(m.name) ilike immutable_unaccent('%' || $1 || '%')
```

**Ambos lados normalizados.** Si solo se normaliza el patrón, el índice deja de
aplicar y la búsqueda sigue fallando con tildes.

La función existe porque `unaccent()` de un solo argumento no es `IMMUTABLE` y
Postgres solo indexa expresiones inmutables; la forma de dos argumentos con un
`regdictionary` explícito sí es determinista.

## Conexión

Usar el **Session Pooler** (`aws-0-<región>.pooler.supabase.com`, puerto `5432`):

- La conexión directa (`db.<ref>.supabase.co`) es IPv6-only y falla desde
  la mayoría de redes domésticas con `ENETUNREACH`.
- El Transaction Pooler (puerto `6543`) rompe los prepared statements de
  `node-postgres`, que es exactamente lo que el DataLoader usa de forma
  intensiva.

```
DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-<región>.pooler.supabase.com:5432/postgres
```

## Sobre RLS

El Security Advisor marcará las tablas por no tener Row Level Security.
Es esperado: no se usa PostgREST, la conexión es con el rol `postgres`
(que hace bypass de RLS) y la autorización vive en los resolvers de GraphQL.
