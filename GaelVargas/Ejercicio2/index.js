import 'dotenv/config';
import express from 'express';
import { conectar } from './src/db.js';
import {
    validarCuerpo,
    validarCuerpoCompleto,
    validarCuerpoParcial,
    validarFiltro,
    validarId,
    validarResultados
} from './src/validators.js';

const app = express();
app.use(express.json());

// ---------- Utilidades ----------

// Valor de la columna "completada" según el filtro ?estado=
const ESTADOS = { completadas: 1, pendientes: 0 };

// MySQL devuelve TINYINT(1) como 0/1; se convierte a booleano para la respuesta.
const aRespuesta = (fila) => ({
    id: fila.id,
    nombre: fila.nombre,
    completada: Boolean(fila.completada)
});

const responderError = (res, error) => {
    // El índice UNIQUE de "nombre" rechaza duplicados incluso ante peticiones simultáneas.
    if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Ya existe una tarea con ese nombre' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
};

// ---------- Rutas ----------

// Crear una tarea (nombre obligatorio, completada opcional: por defecto false)
app.post('/tareas', validarCuerpo, validarResultados, async (req, res) => {
    let connection;
    try {
        const { nombre } = req.body;
        const completada = req.body.completada ?? false;

        connection = await conectar();
        const [result] = await connection.execute(
            'INSERT INTO tareas (nombre, completada) VALUES (?, ?)',
            [nombre, completada ? 1 : 0]
        );

        res.status(201).location(`/tareas/${result.insertId}`).json({
            mensaje: 'Tarea guardada con éxito',
            id: result.insertId,
            nombre,
            completada
        });
    } catch (error) {
        responderError(res, error);
    } finally {
        if (connection) await connection.end();
    }
});

// Ver todas las tareas, con filtro opcional: /tareas?estado=completadas|pendientes
app.get('/tareas', [validarFiltro], validarResultados, async (req, res) => {
    let connection;
    try {
        const { estado } = req.query;
        let sql = 'SELECT id, nombre, completada FROM tareas';
        const params = [];

        if (estado) {
            sql += ' WHERE completada = ?';
            params.push(ESTADOS[estado]);
        }
        sql += ' ORDER BY id';

        connection = await conectar();
        const [rows] = await connection.execute(sql, params);

        res.json(rows.map(aRespuesta));
    } catch (error) {
        responderError(res, error);
    } finally {
        if (connection) await connection.end();
    }
});

// Buscar una tarea específica por ID
app.get('/tareas/:id', [validarId], validarResultados, async (req, res) => {
    let connection;
    try {
        connection = await conectar();
        const [rows] = await connection.execute(
            'SELECT id, nombre, completada FROM tareas WHERE id = ?',
            [Number(req.params.id)]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }

        res.json(aRespuesta(rows[0]));
    } catch (error) {
        responderError(res, error);
    } finally {
        if (connection) await connection.end();
    }
});

// Reemplazar una tarea completa (nombre y completada obligatorios)
app.put('/tareas/:id', [validarId, ...validarCuerpoCompleto], validarResultados, async (req, res) => {
    let connection;
    try {
        const id = Number(req.params.id);
        const { nombre, completada } = req.body;

        connection = await conectar();
        const [result] = await connection.execute(
            'UPDATE tareas SET nombre = ?, completada = ? WHERE id = ?',
            [nombre, completada ? 1 : 0, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Tarea no encontrada para modificar' });
        }

        res.json({
            mensaje: 'Tarea modificada con éxito',
            id,
            nombre,
            completada
        });
    } catch (error) {
        responderError(res, error);
    } finally {
        if (connection) await connection.end();
    }
});

// Modificar parcialmente una tarea (por ejemplo, solo marcarla como completada)
app.patch('/tareas/:id', [validarId, ...validarCuerpoParcial], validarResultados, async (req, res) => {
    let connection;
    try {
        const id = Number(req.params.id);
        const { nombre, completada } = req.body;

        const campos = [];
        const valores = [];
        if (nombre !== undefined) {
            campos.push('nombre = ?');
            valores.push(nombre);
        }
        if (completada !== undefined) {
            campos.push('completada = ?');
            valores.push(completada ? 1 : 0);
        }

        connection = await conectar();
        const [result] = await connection.execute(
            `UPDATE tareas SET ${campos.join(', ')} WHERE id = ?`,
            [...valores, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Tarea no encontrada para modificar' });
        }

        const [rows] = await connection.execute(
            'SELECT id, nombre, completada FROM tareas WHERE id = ?',
            [id]
        );

        res.json({
            mensaje: 'Tarea modificada con éxito',
            ...aRespuesta(rows[0])
        });
    } catch (error) {
        responderError(res, error);
    } finally {
        if (connection) await connection.end();
    }
});

// Eliminar una tarea
app.delete('/tareas/:id', [validarId], validarResultados, async (req, res) => {
    let connection;
    try {
        connection = await conectar();
        const [result] = await connection.execute('DELETE FROM tareas WHERE id = ?', [Number(req.params.id)]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }

        res.status(204).send();
    } catch (error) {
        responderError(res, error);
    } finally {
        if (connection) await connection.end();
    }
});

// JSON mal formado en el cuerpo -> 400 en lugar de un 500
app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'El cuerpo de la solicitud no es un JSON válido' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
});

// Encender el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});