# Ejercicio 2: 


---

## Decisiones de Diseño del Modelo de Datos
* **Estructura de la Tabla (`tareas`)**: Se definió un modelo relacional simple y eficiente compuesto por tres atributos principales:
  * `id`: Clave primaria (`PK`) autoincremental que garantiza una identificación unívoca para cada registro[cite: 3].
  * `nombre`: Campo de tipo `VARCHAR(150)` destinado a almacenar la descripción textual de la tarea[cite: 3].
  * `completada`: Campo de tipo `TINYINT` (booleano) que refleja el estado actual de la tarea (`0` para pendiente, `1` para completada)[cite: 2, 3].
* **Criterio de Unicidad Consistente**: Para impedir la creación de tareas duplicadas bajo un criterio uniforme, se implementó una validación lógica utilizando la función `LOWER()` tanto en el motor de la base de datos como en los controladores. Esto asegura que nombres como `"Estudiar"` y `"estudiar"` sean reconocidos como idénticos, evitando inconsistencias.

---

## Decisiones de Diseño de la API
* **Arquitectura RESTful**: Se expusieron endpoints semánticos bajo el recurso base `/tareas` utilizando los métodos HTTP estándar:
  * `GET /tareas`: Permite listar todas las tareas o filtrarlas de forma dinámica según su estado mediante el parámetro opcional `?completada=true/false`[cite: 2].
  * `POST /tareas`: Inserta una nueva tarea aplicando validaciones estrictas de unicidad y formato[cite: 2].
  * `PUT /tareas/:id`: Actualiza una tarea existente validando su ID y asegurando que no colisione con el nombre de otra tarea.
  * `DELETE /tareas/:id`: Elimina un registro de manera segura a partir de su ID[cite: 2].
* **Validación de Datos Robusta**: Se integró la librería `express-validator` para auditar rigurosamente el cuerpo (`body`), los parámetros de ruta (`param`) y las consultas (`query`), garantizando que los campos requeridos estén presentes, cumplan con los tipos de datos correctos (como booleanos estrictos para los estados) y rechacen entradas inválidas antes de impactar en la base de datos[cite: 2].
* **Gestión de Puertos**: El servidor se configuró de manera aislada en el **puerto 3001** para evitar conflictos de ejecución simultánea con otros proyectos del entorno de desarrollo local.

---

