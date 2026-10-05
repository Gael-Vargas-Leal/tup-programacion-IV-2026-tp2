# Ejercicio 3 – API de calificaciones

## Puesta en marcha
1. Crear la base de datos api_calificaciones y sus tablas ejecutando el script database.sql.
2. Instalar dependencias:
   npm install express mysql2 express-validator
3. Iniciar el servidor (puerto 3002):
   node index.js
4. Probar con pruebas.http.

---

## Recursos y Endpoints
- Materias:
  - GET /materias: Lista las materias. [Respuesta: 200]
  - POST /materias: Crea una materia (nombre requerido). [Respuestas: 201, 400, 409]
  - PUT /materias/:id: Modifica el nombre de una materia. [Respuestas: 200, 400, 404, 409]
  - DELETE /materias/:id: Elimina una materia y sus calificaciones asociadas. [Respuestas: 200, 400, 404]

- Calificaciones:
  - GET /calificaciones: Lista los registros. Permite filtrar por materia (?materia_id=). [Respuestas: 200, 400]
  - POST /calificaciones: Crea un registro (alumno, materia_id, nota1, nota2, nota3). [Respuestas: 201, 400, 409]
  - PUT /calificaciones/:id: Modifica un registro completo. [Respuestas: 200, 400, 404, 409]
  - DELETE /calificaciones/:id: Elimina un registro de calificación. [Respuestas: 200, 400, 404]