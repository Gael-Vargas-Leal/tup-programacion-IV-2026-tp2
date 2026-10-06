# Ejercicio 1 – API de rectángulos

## Puesta en marcha
1. Crear la base y la tabla con `database.sql`.
2. Copiar `.env.example` a `.env` y completar el usuario y la contraseña de MySQL (el archivo `.env` no se sube al repositorio).
3. `npm install` y luego `node --env-file=.env index.js` (puerto 3000).
4. Probar con `rectangulos.http`.

## Estructura
- `index.js`: rutas de la API y cálculo del perímetro y la superficie.
- `src/db.js`: conexión a MySQL, con los datos tomados de las variables de entorno.
- `src/validators.js`: validaciones con `express-validator`.
- `database.sql`: creación de la base y la tabla. `der.md`: diagrama de entidades y relaciones.
- `rectangulos.http`: pruebas de los endpoints.

## Recurso y endpoints
| Método | Ruta | Descripción | Respuestas |
|---|---|---|---|
| GET | `/rectangulos` | Lista todos los rectángulos | 200 |
| GET | `/rectangulos/:id` | Obtiene uno | 200, 400, 404 |
| POST | `/rectangulos` | Crea (recibe solo `lado_a` y `lado_b`) | 201 con `Location`, 400 |
| PUT | `/rectangulos/:id` | Modifica los lados y recalcula | 200, 400, 404 |
| DELETE | `/rectangulos/:id` | Elimina | 204, 400, 404 |

## Decisiones de diseño

**Modelo de datos**
- Se guardan `lado_a`, `lado_b`, `perimetro` y `superficie`, como pide el enunciado. Los dos últimos los
  calcula el servidor (función `calcular` de `index.js`) en cada alta o modificación, así nunca quedan desfasados de los lados.
- `DECIMAL(10,2)` en lugar de `FLOAT`: evita errores de redondeo. Los lados admiten hasta 2 decimales y un
  máximo de 9999, para que la superficie (como mucho 99.980.001) entre en la columna. El servidor redondea
  perímetro y superficie a 2 decimales antes de guardarlos.
- `CHECK (lado_a > 0 AND lado_b > 0)` como segunda barrera en la base, además de la validación de la API.
- Clave primaria autoincremental `id`.

**API**
- Un único recurso en plural, `/rectangulos`; la acción la expresa el método HTTP.
- `PUT` y no `PATCH`: el perímetro y la superficie dependen de ambos lados, así que la modificación
  recibe siempre el par completo.
- Si el cuerpo trae cualquier campo distinto de `lado_a` y `lado_b` (por ejemplo `perimetro` o `superficie`),
  se responde 400 en lugar de ignorarlo.
- Validación con `express-validator`: `body` (lados presentes, numéricos, mayores que 0) y `param` (`id` entero positivo).
- Códigos: 201 al crear, 204 al eliminar, 400 por datos inválidos, 404 si el id no existe, 500 por errores internos.
- Consultas SQL parametrizadas.