# Evidencia del problema N+1

Este documento registra el comportamiento del servidor GraphQL **antes y después**
de aplicar el patrón DataLoader, medido sobre los logs reales de SQL que emite
`shared/db/pool.ts` en cada consulta a Supabase.

Es la evidencia que respalda el criterio *"Mitigación del Problema N+1"* de la
rúbrica y el material de la demostración en video.

---

## Cómo reproducir

1. Arrancar el backend con `npm run dev` desde `backend/`
2. Abrir el Sandbox de Apollo en <http://localhost:4000/graphql>
3. Lanzar una query de calentamiento (`query { health { ok } }`) para que el pool
   abra conexiones — sin esto, los primeros tiempos incluyen el handshake TLS
   contra el pooler de Supabase y no son comparables
4. Ejecutar los escenarios de abajo y observar la terminal del servidor

Cada línea `[sql]` de la terminal equivale a **un viaje de ida y vuelta a la base
de datos**. Contarlas es contar el problema.

---

## Escenario 1 — Relación N:1 (medicamento → categoría, laboratorio)

### Query

```graphql
query CatalogoConRelaciones {
  medications(limit: 20) {
    totalCount
    items {
      name
      category { name }
      laboratory { name }
    }
  }
}
```

### Resultado: 42 consultas

| Consulta | Veces | Origen |
| :--- | ---: | :--- |
| `count(*)` del total | 1 | `Query.medications` |
| Búsqueda paginada | 1 | `Query.medications` |
| `categories where id = any(...)` | **20** | `Medication.category`, una por medicamento |
| `laboratories where id = any(...)` | **20** | `Medication.laboratory`, una por medicamento |
| **Total** | **42** | |

Tiempo de pared del bloque completo: de 589 ms a 808 ms acumulados.

### Log (fragmento)

Las 40 consultas de relación son idénticas salvo por el parámetro. Se muestran
las primeras; el log completo está al final del documento.

```
[sql] (589ms, 1 filas)  select count(*)::int as total from medications m join categories c ...
[sql] (643ms, 20 filas) select m.id, m.sku, m.name, ... from medications m join categories c ... limit $1 offset $2
[sql] (71ms,  1 filas)  select id, name from laboratories where id = any($1::smallint[])
[sql] (73ms,  1 filas)  select id, name from categories   where id = any($1::smallint[])
[sql] (140ms, 1 filas)  select id, name from categories   where id = any($1::smallint[])
[sql] (146ms, 1 filas)  select id, name from laboratories where id = any($1::smallint[])
                                    ... (× 36 más) ...
[sql] (808ms, 1 filas)  select id, name from laboratories where id = any($1::smallint[])
```

### Dos cosas que delatan el desperdicio

**`1 filas` en cada consulta de relación.** El SQL usa `= any($1::smallint[])`,
una sintaxis preparada para recibir muchos ids, pero cada llamada trae uno solo.
La consulta está lista para el lote; lo que falta es alguien que arme el lote.

**Hay 20 medicamentos pero solo 11 categorías distintas entre ellos** (cifra
confirmada por el lote del apartado siguiente). Nueve de esas 20 consultas piden
una categoría **que ya se había traído en la misma request**. Se paga la latencia
de red para recibir una fila que ya estaba en memoria. Con los laboratorios pasa
lo mismo: 20 consultas para 10 valores distintos.

---

## Escenario 2 — Relación 1:N (categoría → medicamentos)

### Query

```graphql
query CategoriasConMedicamentos {
  categories {
    name
    medications { name }
  }
}
```

### Resultado: 15 consultas

| Consulta | Veces | Origen |
| :--- | ---: | :--- |
| Listado de categorías | 1 | `Query.categories` |
| `medications where category_id = any(...)` | **14** | `Category.medications`, una por categoría |
| **Total** | **15** | |

### Log completo

```
[sql] (68ms, 14 filas) select id, name from categories order by name
[sql] (74ms, 2 filas) select m.id, ... from medications m where m.category_id = any($1::smallint[]) order by m.name
[sql] (75ms, 6 filas) select m.id, ... from medications m where m.category_id = any($1::smallint[]) order by m.name
[sql] (75ms, 3 filas) select m.id, ... from medications m where m.category_id = any($1::smallint[]) order by m.name
[sql] (75ms, 4 filas) select m.id, ... from medications m where m.category_id = any($1::smallint[]) order by m.name
[sql] (77ms, 4 filas) select m.id, ... from medications m where m.category_id = any($1::smallint[]) order by m.name
[sql] (77ms, 1 filas) select m.id, ... from medications m where m.category_id = any($1::smallint[]) order by m.name
[sql] (78ms, 2 filas) select m.id, ... from medications m where m.category_id = any($1::smallint[]) order by m.name
[sql] (78ms, 1 filas) select m.id, ... from medications m where m.category_id = any($1::smallint[]) order by m.name
[sql] (79ms, 9 filas) select m.id, ... from medications m where m.category_id = any($1::smallint[]) order by m.name
[sql] (85ms, 3 filas) select m.id, ... from medications m where m.category_id = any($1::smallint[]) order by m.name
[sql] (150ms, 7 filas) select m.id, ... from medications m where m.category_id = any($1::smallint[]) order by m.name
[sql] (150ms, 4 filas) select m.id, ... from medications m where m.category_id = any($1::smallint[]) order by m.name
[sql] (151ms, 3 filas) select m.id, ... from medications m where m.category_id = any($1::smallint[]) order by m.name
[sql] (151ms, 1 filas) select m.id, ... from medications m where m.category_id = any($1::smallint[]) order by m.name
```

Este escenario es el más ilustrativo: **una sola línea en la query** —
`medications { name }` anidado dentro de `categories` — multiplica por catorce
el número de viajes a la base de datos. El costo no está escrito en ninguna
parte del código; emerge de la forma del árbol de la consulta.

---

## Por qué ocurre

GraphQL resuelve un árbol, y ejecuta **un resolver por cada campo de cada nodo**.

```
Query.medications          → 1 resolver  → 2 consultas
  └── Medication (× 20)
        ├── category       → 20 resolvers → 20 consultas
        └── laboratory     → 20 resolvers → 20 consultas
```

Cada invocación de `Medication.category` es independiente de las otras 19: recibe
su propio `parent`, no sabe que existen hermanos y no tiene forma de coordinarse
con ellos. Lanza su consulta y espera.

De ahí el nombre: **1** consulta para traer la lista, **N** consultas para
resolver la relación de cada elemento.

El problema escala con lo que pida el cliente, no con lo que escribió el backend.
Un catálogo de 200 medicamentos con dos relaciones son 402 consultas, y el código
de los resolvers es exactamente el mismo.

## Por qué no se arregla con un JOIN

La tentación es traer todo de una vez:

```sql
select m.*, c.name as category_name, l.name as laboratory_name
from medications m
join categories c on c.id = m.category_id
join laboratories l on l.id = m.laboratory_id
```

No sirve, por dos razones.

**Rompe la composición de GraphQL.** El cliente decide en tiempo de ejecución si
pide `category`. Con el JOIN fijo, se paga siempre — incluso cuando la query solo
pide `{ name price }`. Se cambia un problema de N+1 por uno de over-fetching, que
es justamente lo que el proyecto busca evitar.

**No escala a las relaciones 1:N.** En el escenario 2 un JOIN devolvería el
producto cartesiano: los datos de cada categoría repetidos tantas veces como
medicamentos tenga, para después descartarlos al agrupar en memoria.

La solución correcta no es traer menos veces, sino **agrupar las peticiones que
ocurren dentro de una misma request**. Eso es el patrón DataLoader.

---

## Después: con DataLoader

Implementado en `modules/catalog/queries/loaders/catalogLoaders.ts`, instanciado
una vez por request desde `shared/graphql/context.ts`.

### Escenario 1 — de 42 consultas a 4

```
[sql] (534ms,  1 filas) select count(*)::int as total from medications m join categories c ...
[sql] (541ms, 20 filas) select m.id, ... from medications m join categories c ... limit $1 offset $2
[sql] (69ms,  11 filas) select id, name from categories   where id = any($1::smallint[])
[sql] (70ms,  10 filas) select id, name from laboratories where id = any($1::smallint[])
```

Las 40 consultas de relación se convirtieron en 2. Y el conteo de filas prueba
que la caché por request también actuó: **11 categorías** para 20 medicamentos y
**10 laboratorios** para 20 medicamentos. Los ids repetidos viajaron una sola vez.

### Escenario 2 — de 15 consultas a 2

```
[sql] (68ms, 14 filas) select id, name from categories order by name
[sql] (73ms, 50 filas) select m.id, ... from medications m where m.category_id = any($1::smallint[]) order by m.name
```

Una consulta trae los 50 medicamentos de las 14 categorías, y el loader los
reparte en memoria agrupándolos por `category_id`.

### Resumen

| Escenario | Antes | Después | Reducción |
| :--- | ---: | ---: | ---: |
| N:1 — 20 medicamentos con categoría y laboratorio | 42 | **4** | −90 % |
| 1:N — 14 categorías con sus medicamentos | 15 | **2** | −87 % |

### Sobre los tiempos

La comparación honesta excluye las dos primeras consultas de cada corrida, que
incluyen el handshake TLS contra el pooler de Supabase.

Aislando la fase de relaciones del escenario 1: **de ~737 ms a ~70 ms**. La
mejora es mayor que la simple división por diez porque el pool está limitado a
10 conexiones (`max: 10` en `shared/db/pool.ts`): las 40 consultas simultáneas
formaban cola, y por eso los tiempos crecían de 71 ms a 808 ms a medida que
avanzaba el lote. Con 2 consultas no hay cola.

En el escenario 2 la ganancia en tiempo de pared es menor (~83 ms frente a
~73 ms) porque 14 consultas concurrentes todavía caben casi enteras en el pool.
La ganancia real ahí no está en el reloj sino en la **carga sobre la base de
datos**: 15 planes de ejecución contra 2. Es la diferencia que decide si el
sistema aguanta las "millones de lecturas concurrentes" del caso de estudio.

### Por qué funciona

`.load(id)` no consulta: registra la petición y devuelve una promesa. DataLoader
acumula todas las llamadas que ocurren dentro del mismo tick del event loop y,
cuando el ciclo se vacía, ejecuta la función de lote una sola vez con todos los
ids juntos.

Encaja con GraphQL de forma natural porque el motor resuelve en paralelo todos
los nodos hermanos de un mismo nivel: los 20 `Medication.category` caen en la
misma ventana.

La función de lote debe devolver **un resultado por id y en el mismo orden**.
DataLoader empareja por posición, no por clave, así que los loaders reconstruyen
el orden con un `Map` antes de devolver. Omitir ese paso produciría un error
silencioso: cada medicamento recibiría la categoría de otro.

Los loaders se crean **una vez por request** en `createContext`. Si vivieran a
nivel de módulo, la caché sobreviviría entre peticiones y un usuario podría ver
datos obsoletos de la request de otro.

---

## Anexo — Log íntegro del escenario 1

<details>
<summary>42 líneas</summary>

```
[sql] (589ms, 1 filas) select count(*)::int as total from medications m join categories c on c.id = m.category_id
[sql] (643ms, 20 filas) select m.id, m.sku, m.name, m.active_ingredient as "activeIngredient", m.category_id as "categoryId", m.laboratory_id as "laboratoryId", m.dosage, m.presentation, m.price, m.stock, m.requires_prescription as "requiresPrescription", m.description from medications m join categories c on c.id = m.category_id order by m.name limit $1 offset $2
[sql] (71ms, 1 filas) select id, name from laboratories where id = any($1::smallint[])
[sql] (73ms, 1 filas) select id, name from categories where id = any($1::smallint[])
[sql] (140ms, 1 filas) select id, name from categories where id = any($1::smallint[])
[sql] (146ms, 1 filas) select id, name from laboratories where id = any($1::smallint[])
[sql] (216ms, 1 filas) select id, name from categories where id = any($1::smallint[])
[sql] (224ms, 1 filas) select id, name from laboratories where id = any($1::smallint[])
[sql] (297ms, 1 filas) select id, name from categories where id = any($1::smallint[])
[sql] (306ms, 1 filas) select id, name from laboratories where id = any($1::smallint[])
[sql] (378ms, 1 filas) select id, name from categories where id = any($1::smallint[])
[sql] (491ms, 1 filas) select id, name from categories where id = any($1::smallint[])
[sql] (493ms, 1 filas) select id, name from laboratories where id = any($1::smallint[])
[sql] (590ms, 1 filas) select id, name from laboratories where id = any($1::smallint[])
[sql] (591ms, 1 filas) select id, name from categories where id = any($1::smallint[])
[sql] (661ms, 1 filas) select id, name from laboratories where id = any($1::smallint[])
[sql] (662ms, 1 filas) select id, name from categories where id = any($1::smallint[])
[sql] (668ms, 1 filas) select id, name from categories where id = any($1::smallint[])
[sql] (668ms, 1 filas) select id, name from categories where id = any($1::smallint[])
[sql] (671ms, 1 filas) select id, name from categories where id = any($1::smallint[])
[sql] (673ms, 1 filas) select id, name from categories where id = any($1::smallint[])
[sql] (673ms, 1 filas) select id, name from laboratories where id = any($1::smallint[])
[sql] (675ms, 1 filas) select id, name from laboratories where id = any($1::smallint[])
[sql] (675ms, 1 filas) select id, name from laboratories where id = any($1::smallint[])
[sql] (676ms, 1 filas) select id, name from laboratories where id = any($1::smallint[])
[sql] (732ms, 1 filas) select id, name from laboratories where id = any($1::smallint[])
[sql] (735ms, 1 filas) select id, name from categories where id = any($1::smallint[])
[sql] (736ms, 1 filas) select id, name from laboratories where id = any($1::smallint[])
[sql] (736ms, 1 filas) select id, name from categories where id = any($1::smallint[])
[sql] (737ms, 1 filas) select id, name from laboratories where id = any($1::smallint[])
[sql] (741ms, 1 filas) select id, name from categories where id = any($1::smallint[])
[sql] (741ms, 1 filas) select id, name from laboratories where id = any($1::smallint[])
[sql] (742ms, 1 filas) select id, name from categories where id = any($1::smallint[])
[sql] (742ms, 1 filas) select id, name from laboratories where id = any($1::smallint[])
[sql] (742ms, 1 filas) select id, name from categories where id = any($1::smallint[])
[sql] (799ms, 1 filas) select id, name from laboratories where id = any($1::smallint[])
[sql] (803ms, 1 filas) select id, name from laboratories where id = any($1::smallint[])
[sql] (803ms, 1 filas) select id, name from laboratories where id = any($1::smallint[])
[sql] (804ms, 1 filas) select id, name from categories where id = any($1::smallint[])
[sql] (804ms, 1 filas) select id, name from categories where id = any($1::smallint[])
[sql] (807ms, 1 filas) select id, name from categories where id = any($1::smallint[])
[sql] (808ms, 1 filas) select id, name from laboratories where id = any($1::smallint[])
```

</details>
