import 'dotenv/config';
import express from 'express';
import { conectar } from './src/db.js';
import {
    normalizarTexto,
    validarCuerpo,
    validarCuerpoParcial,
    validarFiltro,
    validarId,
    validarMateria,
    validarResultados
} from './src/validators.js';

const app = express();
app.use(express.json());

// ---------- Utilidades ----------

const redondear = (n) => Number(n.toFixed(2));

// Una calificación siempre se lee junto con el nombre de su materia.
const SELECT_CALIFICACION = `
    SELECT c.id, c.alumno, c.materia_id, m.nombre AS materia, c.nota1, c.nota2, c.nota3
    FROM calificaciones c
    JOIN materias m ON m.id = c.materia_id`;

// mysql2 devuelve los DECIMAL como texto; se convierten a número. El promedio
// no se guarda en la base: se calcula siempre a partir de las tres notas.
const aRespuestaCalificacion = (fila) => {
    const notas = [fila.nota1, fila.nota2, fila.nota3].map(Number);
    return {
        id: fila.id,
        alumno: fila.alumno,
        materia: { id: fila.materia_id, nombre: fila.materia },
        notas,
        promedio: redondear((notas[0] + notas[1] + notas[2]) / 3)
    };
};

const obtenerCalificacion = async (connection, id) => {
    const [rows] = await connection.execute(`${SELECT_CALIFICACION} WHERE c.id = ?`, [id]);
    return rows.length === 0 ? null : aRespuestaCalificacion(rows[0]);
};

const responderError = (res, error) => {
    switch (error.code) {
        // Los índices UNIQUE rechazan duplicados incluso ante peticiones simultáneas.
        case 'ER_DUP_ENTRY': {
            const esMateria = error.sqlMessage?.includes('uq_materias_nombre');
            return res.status(409).json({
                error: esMateria
                    ? 'Ya existe una materia con ese nombre'
                    : 'Ya existe una calificación de ese alumno en esa materia'
            });
        }
        // La clave foránea rechaza una materia inexistente.
        case 'ER_NO_REFERENCED_ROW_2':
            return res.status(400).json({
                errores: [{ campo: 'materia_id', ubicacion: 'body', mensaje: 'La materia indicada no existe' }]
            });
        // No se puede borrar una materia que tiene calificaciones.
        case 'ER_ROW_IS_REFERENCED_2':
            return res.status(409).json({
                error: 'No se puede eliminar la materia porque tiene calificaciones asociadas'
            });
        default:
            console.error(error);
            return res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// ======================== MATERIAS ========================

// Crear una materia
app.post('/materias', validarMateria, validarResultados, async (req, res) => {
    let connection;
    try {
        const { nombre } = req.body;

        connection = await conectar();
        const [result] = await connection.execute('INSERT INTO materias (nombre) VALUES (?)', [nombre]);

        res.status(201).location(`/materias/${result.insertId}`).json({
            mensaje: 'Materia guardada con éxito',
            id: result.insertId,
            nombre
        });
    } catch (error) {
        responderError(res, error);
    } finally {
        if (connection) await connection.end();
    }
});

// Ver todas las materias
app.get('/materias', async (req, res) => {
    let connection;
    try {
        connection = await conectar();
        const [rows] = await connection.execute('SELECT id, nombre FROM materias ORDER BY nombre');

        res.json(rows);
    } catch (error) {
        responderError(res, error);
    } finally {
        if (connection) await connection.end();
    }
});

// Buscar una materia específica por ID
app.get('/materias/:id', [validarId], validarResultados, async (req, res) => {
    let connection;
    try {
        connection = await conectar();
        const [rows] = await connection.execute('SELECT id, nombre FROM materias WHERE id = ?', [Number(req.params.id)]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Materia no encontrada' });
        }

        res.json(rows[0]);
    } catch (error) {
        responderError(res, error);
    } finally {
        if (connection) await connection.end();
    }
});

// Modificar una materia
app.put('/materias/:id', [validarId, ...validarMateria], validarResultados, async (req, res) => {
    let connection;
    try {
        const id = Number(req.params.id);
        const { nombre } = req.body;

        connection = await conectar();
        const [result] = await connection.execute('UPDATE materias SET nombre = ? WHERE id = ?', [nombre, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Materia no encontrada para modificar' });
        }

        res.json({ mensaje: 'Materia modificada con éxito', id, nombre });
    } catch (error) {
        responderError(res, error);
    } finally {
        if (connection) await connection.end();
    }
});

// Eliminar una materia (solo si no tiene calificaciones)
app.delete('/materias/:id', [validarId], validarResultados, async (req, res) => {
    let connection;
    try {
        connection = await conectar();
        const [result] = await connection.execute('DELETE FROM materias WHERE id = ?', [Number(req.params.id)]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Materia no encontrada' });
        }

        res.status(204).send();
    } catch (error) {
        responderError(res, error);
    } finally {
        if (connection) await connection.end();
    }
});

// ===================== CALIFICACIONES =====================

// Crear una calificación (alumno, materia_id y tres notas)
app.post('/calificaciones', validarCuerpo, validarResultados, async (req, res) => {
    let connection;
    try {
        const { alumno, materia_id, notas } = req.body;

        connection = await conectar();
        const [result] = await connection.execute(
            'INSERT INTO calificaciones (alumno, materia_id, nota1, nota2, nota3) VALUES (?, ?, ?, ?, ?)',
            [alumno, materia_id, ...notas]
        );

        const calificacion = await obtenerCalificacion(connection, result.insertId);

        res.status(201).location(`/calificaciones/${result.insertId}`).json({
            mensaje: 'Calificación guardada con éxito',
            ...calificacion
        });
    } catch (error) {
        responderError(res, error);
    } finally {
        if (connection) await connection.end();
    }
});

// Ver las calificaciones, con filtros opcionales: ?alumno=...&materia_id=...
app.get('/calificaciones', validarFiltro, validarResultados, async (req, res) => {
    let connection;
    try {
        const { alumno, materia_id } = req.query;
        const condiciones = [];
        const params = [];

        if (alumno) {
            condiciones.push('c.alumno = ?');
            params.push(normalizarTexto(alumno));
        }
        if (materia_id) {
            condiciones.push('c.materia_id = ?');
            params.push(Number(materia_id));
        }

        const where = condiciones.length > 0 ? ` WHERE ${condiciones.join(' AND ')}` : '';

        connection = await conectar();
        const [rows] = await connection.execute(`${SELECT_CALIFICACION}${where} ORDER BY c.alumno, m.nombre`, params);

        res.json(rows.map(aRespuestaCalificacion));
    } catch (error) {
        responderError(res, error);
    } finally {
        if (connection) await connection.end();
    }
});

// Buscar una calificación específica por ID
app.get('/calificaciones/:id', [validarId], validarResultados, async (req, res) => {
    let connection;
    try {
        connection = await conectar();
        const calificacion = await obtenerCalificacion(connection, Number(req.params.id));

        if (!calificacion) {
            return res.status(404).json({ error: 'Calificación no encontrada' });
        }

        res.json(calificacion);
    } catch (error) {
        responderError(res, error);
    } finally {
        if (connection) await connection.end();
    }
});

// Reemplazar una calificación completa
app.put('/calificaciones/:id', [validarId, ...validarCuerpo], validarResultados, async (req, res) => {
    let connection;
    try {
        const id = Number(req.params.id);
        const { alumno, materia_id, notas } = req.body;

        connection = await conectar();
        const [result] = await connection.execute(
            'UPDATE calificaciones SET alumno = ?, materia_id = ?, nota1 = ?, nota2 = ?, nota3 = ? WHERE id = ?',
            [alumno, materia_id, ...notas, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Calificación no encontrada para modificar' });
        }

        res.json({
            mensaje: 'Calificación modificada con éxito',
            ...(await obtenerCalificacion(connection, id))
        });
    } catch (error) {
        responderError(res, error);
    } finally {
        if (connection) await connection.end();
    }
});

// Modificar parcialmente una calificación (por ejemplo, solo las notas)
app.patch('/calificaciones/:id', [validarId, ...validarCuerpoParcial], validarResultados, async (req, res) => {
    let connection;
    try {
        const id = Number(req.params.id);
        const { alumno, materia_id, notas } = req.body;

        const campos = [];
        const valores = [];
        if (alumno !== undefined) {
            campos.push('alumno = ?');
            valores.push(alumno);
        }
        if (materia_id !== undefined) {
            campos.push('materia_id = ?');
            valores.push(materia_id);
        }
        if (notas !== undefined) {
            campos.push('nota1 = ?', 'nota2 = ?', 'nota3 = ?');
            valores.push(...notas);
        }

        connection = await conectar();
        const [result] = await connection.execute(
            `UPDATE calificaciones SET ${campos.join(', ')} WHERE id = ?`,
            [...valores, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Calificación no encontrada para modificar' });
        }

        res.json({
            mensaje: 'Calificación modificada con éxito',
            ...(await obtenerCalificacion(connection, id))
        });
    } catch (error) {
        responderError(res, error);
    } finally {
        if (connection) await connection.end();
    }
});

// Eliminar una calificación
app.delete('/calificaciones/:id', [validarId], validarResultados, async (req, res) => {
    let connection;
    try {
        connection = await conectar();
        const [result] = await connection.execute('DELETE FROM calificaciones WHERE id = ?', [Number(req.params.id)]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Calificación no encontrada' });
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