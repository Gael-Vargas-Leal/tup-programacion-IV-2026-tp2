## Trabajo Práctico - Ejercicio1
## 1. Descripción del Proyecto
Desarrollo de una API REST orientada a servicios utilizando **Node.js**, **ExpressJS** y **MySQL** para la gestión de rectángulos. El sistema garantiza la persistencia relacional y asegura que los cálculos de perímetro y superficie se realicen de manera exclusiva en el servidor a partir de los lados provistos por el cliente.

## 2. Decisiones de Diseño del Modelo de Datos (`database.sql`)
- **Entidad Única (`rectangulos`)**: Se estructuró una tabla relacional con los campos fundamentales: `id` (clave primaria autoincremental), `lado_a`, `lado_b`, `perimetro` y `superficie`.
- **Tipos de Datos (`DECIMAL`)**: Se utilizó `DECIMAL(10,2)` para garantizar precisión numérica en las dimensiones y cálculos, evitando problemas de redondeo.
- **Restricción de Integridad (`CHECK`)**: Se incorporó una regla a nivel de base de datos (`CONSTRAINT chk_lados_positivos CHECK (lado_a > 0 AND lado_b > 0)`) para impedir físicamente el almacenamiento de valores negativos o nulos.

## 3. Decisiones de Diseño de la API (`index.js`)
- **Arquitectura de Endpoints**: Se exponen rutas claras bajo el recurso `/rectangulos`:
  - `POST /rectangulos`: Almacena un nuevo rectángulo procesando únicamente los lados enviados.
  - `GET /rectangulos`: Devuelve el listado completo de registros guardados.
  - `GET /rectangulos/:id`: Consulta un rectángulo específico filtrado por su identificador único.
  - `PUT /rectangulos/:id`: Actualiza las dimensiones de un registro existente y recalcula automáticamente sus métricas.
- **Procesamiento en el Servidor**: La API extrae exclusivamente `lado_a` y `lado_b` del cuerpo de la petición (`req.body`) y calcula de forma interna el perímetro `(2 * lado_a + 2 * lado_b)` y la superficie `(lado_a * lado_b)`.
- **Validaciones Robusta (`express-validator`)**: Se implementaron validadores en las rutas para verificar que los campos de entrada sean estrictamente numéricos y que los parámetros de la URL correspondan a enteros positivos, respondiendo con un código `400 Bad Request` ante anomalías.

## 4. Diagrama de Relaciones (EER)
El esquema relacional de la base de datos se encuentra exportado en la raíz del proyecto bajo el archivo `Diagrama-de-relacion-Ejercicio1.png`, reflejando la estructura de la tabla y sus restricciones de clave.

