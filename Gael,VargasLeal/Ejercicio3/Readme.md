# Ejercicio 3: 
## Decisiones de Diseño del Modelo de Datos
- **Modelo Relacional (1 a Muchos)**: Se estructuró la base de datos dividiéndola en dos tablas principales para evitar redundancias:
  - `materias` (Lado "1"): Almacena el catálogo oficial de asignaturas de la carrera.
  - `calificaciones` (Lado "Muchos"): Contiene los datos del alumno, la referencia a la materia mediante una clave foránea (`materia_id`) con borrado en cascada, y las tres notas numéricas asociadas.
- **Escala de Notas**: Se estableció y documentó una escala numérica decimal estrictamente comprendida entre **1.0 y 10.0** para cada una de las tres evaluaciones.
- **Restricción de Unicidad Compuesta**: Se implementó un índice único (`UNIQUE`) a nivel de base de datos y validación estricta de negocio combinando `LOWER(alumno)` y `materia_id`. Esto impide de forma categórica que un alumno posea más de un registro de notas para una misma materia.

---

## Decisiones de Diseño de la API
- **Arquitectura RESTful**: Exposición de recursos claros bajo las rutas `/materias` y `/calificaciones` utilizando métodos HTTP semánticos (`GET`, `POST`, `PUT`, `DELETE`).
- **Validación Integral**: Uso intensivo de `express-validator` para auditar rigurosamente los cuerpos (`body`), parámetros de ruta (`param`) y filtros de consulta (`query`), asegurando la integridad de los tipos de datos y rechazando entradas maliciosas o vacías antes de impactar en MySQL.
- **Gestión de Puertos**: Configurado de manera aislada en el **puerto 3002** para coexistir sin conflictos con los demás ejercicios de la entrega.