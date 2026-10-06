# Ejercicio 3 – API de calificaciones de alumnos

API REST con Express y MySQL para gestionar las calificaciones de alumnos en las materias de una carrera.
Cada registro guarda el alumno, la materia cursada y tres notas.

## Puesta en marcha

1. Ejecutar `database.sql` en MySQL Workbench (crea la base `api_calificaciones`, las tablas y cuatro materias de ejemplo).
2. Completar el archivo `.env` con los datos de conexión (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `PORT`).
3. `npm install`
4. `node index.js`
5. Probar con `calificaciones.http` (extensión REST Client de VS Code).

## Escala de notas

- Las notas van de **0 a 10**, ambos extremos incluidos.
- Se admiten **hasta 2 decimales** (por ejemplo `7.25`; `7.125` se rechaza).
- Deben ser **números JSON** (`8`, no `"8"`).
- Son **exactamente tres** por registro.
- El **promedio** de las tres notas se calcula en cada respuesta, redondeado a 2 decimales; no se guarda en la base.

La escala se controla en dos lugares: en la API con `express-validator` y en la base con restricciones `CHECK` (0 a 10).

## Recursos y endpoints

Recursos: **`/materias`** y **`/calificaciones`**. El alumno no es un recurso aparte: es un dato de la calificación, y se consulta filtrando (`?alumno=`).

### Materias

| Método | Ruta | Descripción | Respuestas |
|--------|------|-------------|------------|
| POST | `/materias` | Crea una materia. Body: `nombre` | 201 + `Location`, 400, 409 |
| GET | `/materias` | Lista las materias | 200 |
| GET | `/materias/:id` | Obtiene una materia | 200, 400, 404 |
| PUT | `/materias/:id` | Modifica el nombre | 200, 400, 404, 409 |
| DELETE | `/materias/:id` | Elimina la materia, solo si no tiene calificaciones | 204, 400, 404, 409 |

### Calificaciones

| Método | Ruta | Descripción | Respuestas |
|--------|------|-------------|------------|
| POST | `/calificaciones` | Crea una calificación. Body: `alumno`, `materia_id`, `notas` (arreglo de 3) | 201 + `Location`, 400, 409 |
| GET | `/calificaciones` | Lista; filtros opcionales `?alumno=` y `?materia_id=` | 200, 400 |
| GET | `/calificaciones/:id` | Obtiene una calificación | 200, 400, 404 |
| PUT | `/calificaciones/:id` | Reemplaza el registro completo (los 3 campos obligatorios) | 200, 400, 404, 409 |
| PATCH | `/calificaciones/:id` | Modificación parcial (al menos `alumno`, `materia_id` o `notas`) | 200, 400, 404, 409 |
| DELETE | `/calificaciones/:id` | Elimina la calificación | 204, 400, 404 |

Ejemplo de cuerpo para crear:

```json
{ "alumno": "María José Pérez", "materia_id": 1, "notas": [7, 8.5, 9] }
```

Ejemplo de respuesta:

```json
{
  "id": 1,
  "alumno": "María José Pérez",
  "materia": { "id": 1, "nombre": "Programación I" },
  "notas": [7, 8.5, 9],
  "promedio": 8.17
}
```

Los errores de validación devuelven `400` con el detalle de cada campo:

```json
{ "errores": [ { "campo": "notas", "ubicacion": "body", "mensaje": "La nota 2 debe estar entre 0 y 10" } ] }
```

## Diagrama de entidades y relaciones

Ver [`der.md`](der.md). Una materia tiene muchas calificaciones (relación 1 a N mediante `calificaciones.materia_id`).

## Decisiones de diseño

**Modelo de datos**
- **Materias en tabla propia**, como pide el enunciado: el nombre de la materia se escribe una sola vez, y renombrarla se refleja en todas las calificaciones sin tocarlas.
- **Clave foránea `materia_id`** con `ON DELETE RESTRICT`: una materia con calificaciones no se puede borrar, así no se pierden notas por accidente (la API responde `409`). Con `ON UPDATE CASCADE`, un cambio de id se propagaría.
- **El alumno es una columna** de `calificaciones` y no una tabla aparte, porque el enunciado define el registro con el nombre del alumno y el alumno no tiene más atributos. Limitación: dos alumnos distintos con el mismo nombre se tratarían como uno solo. En un sistema real convendría una tabla `alumnos` con un identificador propio (legajo o DNI).
- **Tres columnas `nota1`, `nota2`, `nota3`** en lugar de una tabla de notas: son exactamente tres y siempre juntas, así que la cantidad queda garantizada por el propio esquema. La API las expone como un arreglo `notas`, que hace natural validar "exactamente tres".
- **`DECIMAL(4,2)`** y no `FLOAT`: representa los decimales de forma exacta (sin errores de redondeo como `7.1000000001`).
- **El promedio no se guarda**: es un dato derivado, y guardarlo permitiría que quede desactualizado respecto de las notas.

**Criterio de igualdad de nombres (alumno y materia)**

Dos nombres son iguales si coinciden después de:
1. quitar los espacios del inicio y del final,
2. reducir los espacios repetidos a uno solo, y
3. ignorar mayúsculas/minúsculas y acentos.

Así, `"María José Pérez"` y `"  maria jose   PEREZ "` son el mismo alumno. Los pasos 1 y 2 los hace el sanitizador de `express-validator` (se guarda el nombre ya normalizado, y el filtro `?alumno=` también se normaliza); el paso 3 lo hace la collation `utf8mb4_unicode_ci` de las columnas.

**Unicidad garantizada por la base de datos**

La regla "un solo registro por alumno y materia" se aplica con un índice `UNIQUE (alumno, materia_id)`, y lo mismo para el nombre de la materia. Como lo decide la base, vale tanto al crear como al modificar (PUT y PATCH), y también ante dos peticiones simultáneas: consultar primero y luego insertar dejaría una ventana donde ambas pasan la comprobación. La API traduce el error `ER_DUP_ENTRY` a `409 Conflict`.

**Existencia de la materia**

También la resuelve la base: la clave foránea rechaza un `materia_id` inexistente y la API lo informa como `400` sobre el campo `materia_id`. Evita una consulta previa y no tiene la misma ventana entre la comprobación y la escritura.

**API**
- **Recursos en plural y sustantivos**; el método HTTP expresa la acción. Las calificaciones tienen su propio recurso porque son lo que se crea, modifica y borra; el filtro por alumno o materia es un *query param* porque filtra la misma colección.
- **`PUT` reemplaza y `PATCH` modifica parcialmente**: con `PATCH` se pueden corregir solo las notas sin reenviar el alumno. Si se envían `notas`, deben ser siempre las tres.
- **Códigos de estado**: `201` con cabecera `Location` al crear, `204` sin cuerpo al eliminar, `404` si el id no existe, `409` ante duplicado o al borrar una materia en uso, `400` ante datos inválidos.
- **Validaciones con `express-validator`**:
  - `params`: `id` entero positivo.
  - `query`: `materia_id` entero positivo y `alumno` texto, cada uno indicado una sola vez.
  - `body`: `alumno` texto de 2 a 100 caracteres (letras, espacios, apóstrofes, puntos y guiones); `materia_id` entero positivo; `notas` arreglo de exactamente 3 números entre 0 y 10 con hasta 2 decimales; para materias, `nombre` de 2 a 100 caracteres.