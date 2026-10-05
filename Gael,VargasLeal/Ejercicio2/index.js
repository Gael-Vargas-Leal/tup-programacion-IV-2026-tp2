import express from 'express';
import mysql from 'mysql2/promise';
import pkg from 'express-validator';
const { body, query, param, validationResult } = pkg;

const app = express();
app.use(express.json());


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

// Criterio para comparar nombres: se quitan los espacios del inicio y del final, los espacios
// repetidos se reducen a uno y no se distingue entre mayúsculas y minúsculas (LOWER en la consulta).
const normalizarNombre = (valor) => valor.trim().replace(/\s+/g, ' ');

// Solo se aceptan los booleanos JSON true y false (no "true", "1", etc.)
const esBooleano = (valor) => typeof valor === 'boolean';

const responderError = (res, error) => {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
};

//  OBTENER TAREAS 
app.get('/tareas', [
    query('completada').optional()
        .custom((valor) => ['true', 'false'].includes(valor))
        .withMessage('El filtro completada solo admite los valores true o false')
], validarResultados, async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        let sql = 'SELECT * FROM tareas';
        let params = [];

        if (req.query.completada !== undefined) {
            sql += ' WHERE completada = ?';
            params.push(req.query.completada === 'true' ? 1 : 0);
        }

        const [rows] = await connection.execute(sql, params);
        res.json(rows.map((fila) => ({ ...fila, completada: Boolean(fila.completada) })));
    } catch (error) {
        responderError(res, error);
    } finally {
        if (connection) await connection.end();
    }
});

//  CREAR TAREA 
app.post('/tareas', [
    body('nombre')
        .exists({ values: 'null' }).withMessage('El campo nombre es obligatorio').bail()
        .isString().withMessage('El nombre debe ser una cadena de texto').bail()
        .customSanitizer(normalizarNombre)
        .notEmpty().withMessage('El nombre no puede estar vacío').bail()
        .isLength({ max: 150 }).withMessage('El nombre no puede superar los 150 caracteres'),
    body('completada')
        .optional()
        .custom(esBooleano).withMessage('El estado completada debe ser un valor booleano (true o false)')
], validarResultados, async (req, res) => {
    let connection;
    try {
        const { nombre, completada } = req.body;
        connection = await mysql.createConnection(dbConfig);

        const [existing] = await connection.execute(
            'SELECT id FROM tareas WHERE LOWER(nombre) = LOWER(?)',
            [nombre]
        );

        if (existing.length > 0) {
            return res.status(409).json({ error: 'Ya existe una tarea con un nombre idéntico.' });
        }

        const estadoFinal = completada !== undefined ? completada : false;

        const [result] = await connection.execute(
            'INSERT INTO tareas (nombre, completada) VALUES (?, ?)',
            [nombre, estadoFinal ? 1 : 0]
        );

        res.status(201).json({
            mensaje: 'Tarea creada con éxito',
            id: result.insertId,
            nombre,
            completada: estadoFinal
        });
    } catch (error) {
        responderError(res, error);
    } finally {
        if (connection) await connection.end();
    }
});

//  ACTUALIZAR TAREA 
app.put('/tareas/:id', [
    param('id').isInt({ gt: 0 }).withMessage('El ID debe ser un número entero positivo'),
    body('nombre')
        .exists({ values: 'null' }).withMessage('El campo nombre es obligatorio').bail()
        .isString().withMessage('El nombre debe ser texto').bail()
        .customSanitizer(normalizarNombre)
        .notEmpty().withMessage('El nombre no puede estar vacío').bail()
        .isLength({ max: 150 }).withMessage('El nombre no puede superar los 150 caracteres'),
    body('completada')
        .exists({ values: 'null' }).withMessage('El campo completada es obligatorio').bail()
        .custom(esBooleano).withMessage('El estado completada debe ser un valor booleano (true o false)')
], validarResultados, async (req, res) => {
    let connection;
    try {
        const id = Number(req.params.id);
        const { nombre, completada } = req.body;

        connection = await mysql.createConnection(dbConfig);

        // Primero se verifica que la tarea exista (404) y recién después el nombre repetido (409)
        const [tarea] = await connection.execute('SELECT id FROM tareas WHERE id = ?', [id]);
        if (tarea.length === 0) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }

        const [existing] = await connection.execute(
            'SELECT id FROM tareas WHERE LOWER(nombre) = LOWER(?) AND id != ?',
            [nombre, id]
        );

        if (existing.length > 0) {
            return res.status(409).json({ error: 'Ya existe otra tarea con ese mismo nombre.' });
        }

        await connection.execute(
            'UPDATE tareas SET nombre = ?, completada = ? WHERE id = ?',
            [nombre, completada ? 1 : 0, id]
        );

        res.json({ mensaje: 'Tarea actualizada correctamente', id, nombre, completada });
    } catch (error) {
        responderError(res, error);
    } finally {
        if (connection) await connection.end();
    }
});

//  ELIMINAR TAREA 
app.delete('/tareas/:id', [
    param('id').isInt({ gt: 0 }).withMessage('El ID debe ser válido')
], validarResultados, async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        connection = await mysql.createConnection(dbConfig);
        const [result] = await connection.execute('DELETE FROM tareas WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }

        res.json({ mensaje: 'Tarea eliminada exitosamente' });
    } catch (error) {
        responderError(res, error);
    } finally {
        if (connection) await connection.end();
    }
});


const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Servidor de Tareas corriendo en http://localhost:${PORT}`);
});