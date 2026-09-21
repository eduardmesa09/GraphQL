# **TALLER PRÁCTICO AVANZADO: CASO DE ESTUDIO "AFIRMATIVE-PILL"**

# **Arquitectura de Software Basada en GraphQL y CQRS para E-Commerce Farmacéutico**

## **1\. INFORMACIÓN GENERAL DEL TALLER**

* **Institución:** Facultad de Ingeniería de Sistemas  
* **Materia:** Ingeniería de Software Avanzada / Patrones Arquitectónicos  
* **Modalidad:** Grupos de máximo 3 estudiantes (o individual)  
* **Ponderación:** Calificación sobre 5.0 puntos  
* **Enfoque evaluativo:** Arquitectura de solución, autonomía técnica y diseño de contratos.

## **2\. CONTEXTO Y CASO DE ESTUDIO: AFIRMATIVE PILL**

**Afirmative Pill** es una compañía tecnológica de salud (HealthTech / E-Commerce Farmacéutico) en rápida expansión que conecta a pacientes, farmacias aliadas y entidades promotoras de salud para la distribución y venta minorista de medicamentos en línea.

&nbsp;

A diferencia del comercio electrónico convencional, el sector farmacéutico impone retos operacionales y regulatorios severos:

&nbsp;

1. **Regulación estricta sobre formulación médica:** Ciertos medicamentos son de venta libre (OTC), mientras que otros exigen obligatoriamente prescripción médica verificada antes de autorizar la orden.  
2. **Concurrencia crítica de inventario:** En situaciones de alta demanda de tratamientos especializados, el inventario debe reservarse de forma atómica y consistente; vender un medicamento no disponible a un paciente crítico acarrea consecuencias de salud y sanciones legales graves.  
3. **Experiencia de usuario fluida vs. catálogos complejos:** Los usuarios finales consultan catálogos con fichas técnicas profundas (principios activos, presentaciones, contraindicaciones, laboratorios), lo que bajo APIs tradicionales genera problemas masivos de *over-fetching* y latencias elevadas en redes móviles.  
4. **Desacoplamiento de flujos de alta lectura y alta escritura:** El catálogo experimenta millones de lecturas y búsquedas facetadas concurrentes, mientras que el procesamiento de pagos, validación médica y confirmación de despachos son comandos transaccionales complejos con tiempos de respuesta asíncronos.

&nbsp;

Para solventar esta problemática, el equipo de arquitectura de **Afirmative Pill** ha ordenado rediseñar la plataforma bajo dos pilares:

&nbsp;

* **Comunicación exclusiva cliente-servidor mediante GraphQL:** Prohibición absoluta de APIs REST en el canal de clientes.  
* **Separación de responsabilidades de lectura y escritura (CQRS):** Aislamiento de los modelos de consulta y los modelos transaccionales de mutación.

## **3\. REQUERIMIENTOS Y LIBERTAD DE IMPLEMENTACIÓN**

**Nota metodológica:** Este taller NO contiene tutoriales paso a paso ni recetas de código. Cada equipo tiene completa libertad técnica para diseñar el schema SDL, la persistencia en base de datos, la organización de carpetas y los algoritmos de resolución, siempre que satisfagan los siguientes requerimientos arquitectónicos no negociables:

### **3.1. Prohibición Absoluta de REST (Zero-REST Mandate)**

* Todas las interacciones de red entre el frontend y el backend deben cursar exclusivamente mediante operaciones GraphQL (**Queries, Mutations y Subscriptions**).  
* Ninguna vista del cliente puede consultar endpoints HTTP REST para obtener catálogos, autenticar o despachar órdenes.

### **3.2. Ecosistema Apollo**

* **Backend:** Implementado utilizando el ecosistema **Apollo Server** (monolito modular o arquitectura federada de subgraphs con Apollo Gateway/Router).  
* **Frontend:** Implementado en React / Next.js conectado mediante **Apollo Client** configurado con el árbol de contexto de Apollo (`ApolloProvider` / Apollo Context) para la gestión unificada de estados y caché.

### **3.3. Aplicación del Patrón CQRS (Command Query Responsibility Segregation)**

* **Comandos (Write Model / Mutations):**  
  * Toda modificación de estado (creación de carritos, adición de medicamentos, validación de recetas, reserva de inventario, confirmación de orden) debe modelarse como un comando que exprese intención de negocio.  
  * Deben protegerse las invariantes de negocio (no permitir órdenes de medicamentos con fórmula médica sin validación, no procesar compras de ítems agotados).  
* **Consultas y Proyecciones (Read Model / Queries):**  
  * Las pantallas de exploración de medicamentos, fichas técnicas y resúmenes de órdenes deben alimentarse de modelos proyectados optimizados para lectura.  
  * El diseño debe contemplar la **consistencia eventual** inherente al flujo: ¿qué ve el usuario mientras la orden está siendo validada o el stock se está sincronizando?

### **3.4. Catálogo de Medicamentos y Persistencia (Supabase)**

* El backend debe persistir y consultar los datos en una base de datos PostgreSQL alojada en **Supabase**.  
* Se suministra una tabla base con **50 registros de medicamentos reales**, clasificados por principio activo, presentación, laboratorio, precio, stock y requisito de fórmula médica (consultar File).

## **4\. HISTORIAS DE USUARIO Y ESCENARIOS A RESOLVER**

### **Escenario A: Exploración Eficiente de Fármacos (Lecturas Optimizadas)**

* Como paciente, quiero buscar medicamentos filtrando por nombre comercial, principio activo o categoría terapéutica, visualizando una vista condensada (nombre, precio, presentación) sin sobrecargar mi conexión móvil con el resto de información clínica.  
* Como paciente, quiero abrir la ficha detallada de un medicamento específico para inspeccionar laboratorio, indicaciones y si requiere prescripción médica.  
* **Restricción de rendimiento backend:** El servidor debe resolver estas consultas complejas y anidadas sin caer en el **problema N+1** al asociar entidades (ejemplo: medicamentos y sus categorías o recetas asociadas).

### **Escenario B: Creación de Pedido y Control de Prescripción (Comandos de Dominio)**

* Como paciente, quiero armar un pedido con múltiples ítems y cantidades.  
* Si alguno de los medicamentos seleccionados tiene la bandera `requires_prescription = true`, la mutación debe exigir la información de soporte de la fórmula médica antes de transicionar la orden a estado aceptado.  
* El comando debe validar la disponibilidad del stock en bodega y decrementar la cantidad de forma consistente.

### **Escenario C: Seguimiento y Proyección del Pedido (Eventual Consistency & Real-Time)**

* Una vez emitido el comando de compra, el cliente debe poder consultar una proyección del pedido con su costo total, detalle de ítems y estado operacional (`PENDING_APPROVAL`, `APPROVED`, `DISPATCHED`, `CANCELLED`).  
* Se valorará la integración de actualizaciones en tiempo real (vía GraphQL Subscriptions) cuando el estado del pedido cambie en el backend.

## **5\. RÚBRICA DE EVALUACIÓN DETALLADA (CALIFICACIÓN SOBRE 5.0)**

La evaluación da máxima prioridad al diseño riguroso y profesional de GraphQL y al entendimiento del desacoplamiento arquitectónico.

&nbsp;

| Criterio de Evaluación | Ponderación | Descripción de Expectativa y Nivel de Calidad |
| :---- | :---- | :---- |
| **1\. Diseño e Implementación de GraphQL** | **40% (2.0 pts)** | \* **Schema SDL Riguroso:** Modelado coherente de Object Types, Scalars personalizados, Enums, Inputs y Payloads tipados.\* **Operaciones de Lectura y Escritura:** Queries bien estructuradas que aprovechan la selección selectiva de campos contra el over-fetching; Mutations orientadas a intenciones del dominio con respuestas ricas en errores de validación.\* **Mitigación del Problema N+1:** Implementación demostrable de técnicas de resolución en lotes y caché por request (patrón DataLoader o equivalente en resolvers anidados).\* **Zero-REST:** Cumplimiento total de la restricción de cero endpoints REST. |
| **2\. Arquitectura CQRS y Modelo de Dominio** | **25% (1.25 pts)** | \* **Segregación Conceptual y Técnica:** Clara diferenciación entre las operaciones de comando (mutaciones transaccionales) y los modelos de lectura/proyección.\* **Manejo de Invariantes:** Validación estricta de las reglas de negocio farmacéuticas (stock, recetas médicas).\* **Tratamiento de Consistencia Eventual:** Estrategia clara para manejar la latencia entre la confirmación del comando y la actualización de la proyección en la UI. |
| **3\. Frontend con Apollo Client & Context** | **20% (1.0 pts)** | \* **Configuración del Cliente:** Uso correcto del `ApolloProvider` / Apollo Context en el árbol raíz de la aplicación.\* **Consumo y Caché Local:** Uso idiomático de hooks (`useQuery`, `useMutation`, `useSubscription`), manejo reactivo de estados (`loading`, `error`, `data`) y actualización inteligente de la caché en memoria tras una mutación. |
| **4\. Persistencia en Supabase, Calidad y Sustentación** | **15% (0.75 pts)** | \* **Base de Datos:** Carga exitosa del dataset de 50 medicamentos provisto en Supabase (PostgreSQL) y consultas bien indexadas.\* **Estructura y Documentación:** Repositorio limpio con diagrama arquitectónico del sistema, instrucciones de arranque y justificación de decisiones tomadas en el diseño del schema. |

## **6\. ENTREGABLES ESPERADOS**

1. **Enlace al Repositorio de Código:**  
   * Código fuente completo del Frontend y Backend.  
   * `README.md` detallado que incluya:  
     * Diagrama de arquitectura (relación entre React Apollo Client, Apollo Server, resolvers/DataLoader y Supabase).  
     * Definición completa del Schema SDL (`schema.graphql`).  
     * Breve justificación de cómo se aplicó CQRS y cómo mitigaron el problema N+1.  
2. **Video Demostrativo / Sustentación (5 a 8 minutos):**  
   * Demostración en vivo del flujo: Catálogo $\\rightarrow$ Selección $\\rightarrow$ Carrito $\\rightarrow$ Ejecución de Mutation $\\rightarrow$ Consulta de la orden proyectada.  
   * Inspección en DevTools de la pestaña *Network*: Evidencia de que **todas las llamadas van a `/graphql`** y que la respuesta devuelve exactamente los campos pedidos sin over-fetching.  
   * Evidencia en logs del servidor de cómo el DataLoader agrupa las consultas a Supabase en una única operación en lote.

## **7\. RECURSOS Y ANEXOS**

* **Dataset de Medicamentos:**  [Link aquí](https://docs.google.com/spreadsheets/d/1a66FvqePShIaHousePfuBGbOGHh0l-g7fNPvCApiuGU/edit?usp=sharing)  
* **Documentación de Referencia:**  
  * Apollo Server Docs (Schemas, Resolvers & Federation)  
  * Apollo Client React Docs (Queries, Mutations & Cache)  
  * DataLoader Specification (GitHub / NPM)  
  * Supabase PostgreSQL Quickstart

&nbsp;