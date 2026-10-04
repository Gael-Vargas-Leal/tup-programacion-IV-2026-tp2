import express from 'express';
import mysql from 'mysql2/promise';
import pkg from 'express-validator';
const { body, query, param, validationResult } = pkg;

const app = express();
app.use(express.json());

// Configuración de la conexión a MySQL con las credenciales del alumno
const dbConfig = {
    host: 'localhost',
    user: 'alumno',
    password: '12345',
    database: 'api_tareas'
};

// Middleware para verificar errores de express-validator
const validarResultados = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errores: errors.array() });
    }
    next();
};

// 1. OBTENER TAREAS (Con filtro opcional por estado: ?completada=true/false)
app.get('/tareas', [
    query('completada').optional().isBoolean().withMessage('El filtro de estado debe ser un booleano (true/false)')
], validarResultados, async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        let sql = 'SELECT * FROM tareas';
        let params = [];

        if (req.query.completada !== undefined) {
            sql += ' WHERE completada = ?';
            params.push(req.query.completada === 'true' ? 1 : 0);
        }

        const [rows] = await connection.execute(sql, params);
        await connection.end();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor', detalle: error.message });
    }
});

// 2. CREAR TAREA (Con validación de unicidad estricta y formato)
app.post('/tareas', [
    body('nombre')
        .exists().withMessage('El campo nombre es obligatorio')
        .isString().withMessage('El nombre debe ser una cadena de texto')
        .trim()
        .notEmpty().withMessage('El nombre no puede estar vacío')
        .isLength({ max: 150 }).withMessage('El nombre no puede superar los 150 caracteres'),
    body('completada')
        .optional()
        .isBoolean().withMessage('El estado completada debe ser un valor booleano')
], validarResultados, async (req, res) => {
    try {
        let { nombre, completada } = req.body;
        const connection = await mysql.createConnection(dbConfig);

        // Criterio de comparación consistente: insensible a mayúsculas/minúsculas
        const [existing] = await connection.execute(
            'SELECT * FROM tareas WHERE LOWER(nombre) = LOWER(?)', 
            [nombre]
        );

        if (existing.length > 0) {
            await connection.end();
            return res.status(400).json({ error: 'Ya existe una tarea con un nombre idéntico.' });
        }

        const estadoFinal = completada !== undefined ? completada : false;

        const [result] = await connection.execute(
            'INSERT INTO tareas (nombre, completada) VALUES (?, ?)',
            [nombre, estadoFinal]
        );

        await connection.end();
        res.status(201).json({ 
            mensaje: 'Tarea creada con éxito', 
            id: result.insertId, 
            nombre, 
            completada: estadoFinal 
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al crear la tarea', detalle: error.message });
    }
});

// 3. ACTUALIZAR TAREA (PUT)
app.put('/tareas/:id', [
    param('id').isInt({ gt: 0 }).withMessage('El ID debe ser un número entero positivo'),
    body('nombre')
        .exists().withMessage('El campo nombre es obligatorio')
        .isString().withMessage('El nombre debe ser texto')
        .trim()
        .notEmpty().withMessage('El nombre no puede estar vacío'),
    body('completada')
        .exists().withMessage('El campo completada es obligatorio')
        .isBoolean().withMessage('El estado completada debe ser un valor booleano')
], validarResultados, async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, completada } = req.body;

        const connection = await mysql.createConnection(dbConfig);

        // Verificar unicidad excluyendo el propio ID que estamos editando
        const [existing] = await connection.execute(
            'SELECT * FROM tareas WHERE LOWER(nombre) = LOWER(?) AND id != ?', 
            [nombre, id]
        );

        if (existing.length > 0) {
            await connection.end();
            return res.status(400).json({ error: 'Ya existe otra tarea con ese mismo nombre.' });
        }

        const [result] = await connection.execute(
            'UPDATE tareas SET nombre = ?, completada = ? WHERE id = ?',
            [nombre, completada, id]
        );

        await connection.end();

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }

        res.json({ mensaje: 'Tarea actualizada correctamente', id, nombre, completada });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar', detalle: error.message });
    }
});

// 4. ELIMINAR TAREA (DELETE)
app.delete('/tareas/:id', [
    param('id').isInt({ gt: 0 }).withMessage('El ID debe ser válido')
], validarResultados, async (req, res) => {
    try {
        const { id } = req.params;
        const connection = await mysql.createConnection(dbConfig);
        const [result] = await connection.execute('DELETE FROM tareas WHERE id = ?', [id]);
        await connection.end();

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }

        res.json({ mensaje: 'Tarea eliminada exitosamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar', detalle: error.message });
    }
});

// Configurado en el puerto 3001 para no chocar con el Ejercicio 1
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Servidor de Tareas corriendo in http://localhost:${PORT}`);
});