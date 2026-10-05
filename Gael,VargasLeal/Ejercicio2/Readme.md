# Ejercicio 2 – API de tareas

## Puesta en marcha
1. Crear la base de datos api_tareas y la tabla ejecutando el script database.sql.
2. Instalar dependencias:
   npm install express mysql2 express-validator
3. Iniciar el servidor (puerto 3001):
   node index.js
4. Realizar las pruebas utilizando el archivo pruebas.http.

---

## Endpoints y Métodos
- GET /tareas: Lista todas las tareas. Permite filtrar por estado (?completada=true/false). [Respuestas: 200, 400]
- POST /tareas: Crea una nueva tarea (nombre requerido, completada opcional). [Respuestas: 201, 400, 409]
- PUT /tareas/:id: Modifica por completo el nombre y el estado de una tarea existente. [Respuestas: 200, 400, 404, 409]
- DELETE /tareas/:id: Elimina una tarea según su ID. [Respuestas: 200, 400, 404]