# Ejercicio 2 – API de lista de tareas

API REST con Express y MySQL para administrar tareas (nombre + estado completada/pendiente).

## Puesta en marcha

1. Crear la base y la tabla ejecutando `database.sql` en MySQL Workbench.
2. Completar el archivo `.env` con los datos de conexión (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `PORT`).
3. `npm install`
4. `node index.js`
5. Probar con `tareas.http` (extensión REST Client de VS Code).

## Recurso y endpoints

Recurso: **`/tareas`** (sustantivo en plural; el método HTTP expresa la acción).

| Método | Ruta | Descripción | Respuestas |
|--------|------|-------------|------------|
| POST | `/tareas` | Crea una tarea. Body: `nombre` (obligatorio), `completada` (opcional, por defecto `false`) | 201 + `Location`, 400, 409 |
| GET | `/tareas` | Lista las tareas. Filtro opcional `?estado=completadas` o `?estado=pendientes` | 200, 400 |
| GET | `/tareas/:id` | Obtiene una tarea | 200, 400, 404 |
| PUT | `/tareas/:id` | Reemplaza la tarea completa (`nombre` y `completada` obligatorios) | 200, 400, 404, 409 |
| PATCH | `/tareas/:id` | Modificación parcial (al menos `nombre` o `completada`) | 200, 400, 404, 409 |
| DELETE | `/tareas/:id` | Elimina la tarea | 204, 400, 404 |

Los errores de validación devuelven `400` con el detalle de cada campo:

```json
{ "errores": [ { "campo": "nombre", "ubicacion": "body", "mensaje": "El nombre es obligatorio" } ] }
```

## Diagrama de entidades y relaciones

Ver [`der.md`](der.md). Hay una única tabla (`tareas`), sin relaciones con otras entidades.

## Decisiones de diseño

**Modelo de datos**
- `id` entero autoincremental como clave primaria: es estable aunque la tarea se renombre, y es lo que se usa en la URL.
- `nombre VARCHAR(100) NOT NULL`: el límite de 100 caracteres evita nombres desmedidos y coincide entre la validación y la columna.
- `completada TINYINT(1)` (el `BOOLEAN` de MySQL) con `DEFAULT 0`: una tarea nueva nace pendiente. Se usa un booleano y no un texto ("pendiente"/"completada") porque solo hay dos estados y evita valores inválidos. La API lo expone como `true`/`false`.

**Criterio de igualdad de nombres**

Dos nombres son iguales si coinciden después de:
1. quitar los espacios del inicio y del final,
2. reducir los espacios repetidos a uno solo, y
3. ignorar mayúsculas/minúsculas y acentos.

Así, `"Comprar café"`, `"  comprar   CAFE "` y `"COMPRAR CAFÉ"` son la misma tarea. Los pasos 1 y 2 los hace el sanitizador de `express-validator` (y por eso se guarda el nombre ya normalizado). El paso 3 lo hace la collation `utf8mb4_unicode_ci` de la columna.

**Unicidad garantizada por la base de datos**

La regla se aplica con un índice `UNIQUE` sobre `nombre`, y la API traduce el error `ER_DUP_ENTRY` a `409 Conflict`. Consultar primero ("¿existe?") y luego insertar dejaría una ventana donde dos peticiones simultáneas pasan ambas la comprobación. Con el índice, la base decide de forma atómica.

**API**
- El filtro es un *query param* (`?estado=`) y no una ruta aparte, porque filtra la misma colección y no es otro recurso. Los valores admitidos son `completadas` y `pendientes`; cualquier otro da `400`. Sin el parámetro se devuelven todas.
- `PUT` reemplaza el recurso completo y `PATCH` modifica solo lo enviado (por ejemplo, marcar como completada sin reenviar el nombre).
- `completada` solo acepta booleanos JSON reales (`true`/`false`); `"si"`, `1` o `"true"` se rechazan para no tener ambigüedad.
- Códigos de estado: `201` con cabecera `Location` al crear, `204` sin cuerpo al eliminar, `404` si el id no existe, `409` ante nombre duplicado, `400` ante datos inválidos.
- Los valores derivados del cuerpo y los parámetros se validan con `express-validator` (`params`: id entero positivo; `query`: estado permitido; `body`: nombre y completada).