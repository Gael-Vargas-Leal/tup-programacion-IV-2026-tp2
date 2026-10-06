import 'dotenv/config';
import express from 'express';
import { conectar } from './src/db.js';
import { validarCuerpo, validarId, validarResultados } from './src/validators.js';

const app = express();
app.use(express.json());

// ---------- Cálculo de los valores derivados (siempre en el servidor) ----------

// Ambos valores se redondean a 2 decimales, igual que las columnas DECIMAL(10,2).
const redondear = (n) => Number(n.toFixed(2));

const calcular = (ladoA, ladoB) => ({
    perimetro: redondear(2 * (ladoA + ladoB)),
    superficie: redondear(ladoA * ladoB)
});

// mysql2 devuelve los DECIMAL como texto; se convierten a número para la respuesta.
const aRespuesta = (fila) => ({
    id: fila.id,
    lado_a: Number(fila.lado_a),
    lado_b: Number(fila.lado_b),
    perimetro: Number(fila.perimetro),
    superficie: Number(fila.superficie)
});

const responderError = (res, error) => {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
};

// ---------- Rutas ----------

// Crear un rectángulo (recibe solo los lados, calcula perímetro y superficie)
app.post('/rectangulos', validarCuerpo, validarResultados, async (req, res) => {
    let connection;
    try {
        const { lado_a, lado_b } = req.body;
        const { perimetro, superficie } = calcular(lado_a, lado_b);

        connection = await conectar();
        const [result] = await connection.execute(
            'INSERT INTO rectangulos (lado_a, lado_b, perimetro, superficie) VALUES (?, ?, ?, ?)',
            [lado_a, lado_b, perimetro, superficie]
        );

        res.status(201).location(`/rectangulos/${result.insertId}`).json({
            mensaje: 'Rectángulo guardado con éxito',
            id: result.insertId,
            lado_a,
            lado_b,
            perimetro,
            superficie
        });
    } catch (error) {
        responderError(res, error);
    } finally {
        if (connection) await connection.end();
    }
});

// Ver todos los rectángulos
app.get('/rectangulos', async (req, res) => {
    let connection;
    try {
        connection = await conectar();
        const [rows] = await connection.execute('SELECT * FROM rectangulos ORDER BY id');

        res.json(rows.map(aRespuesta));
    } catch (error) {
        responderError(res, error);
    } finally {
        if (connection) await connection.end();
    }
});

// Buscar un rectángulo específico por ID
app.get('/rectangulos/:id', [validarId], validarResultados, async (req, res) => {
    let connection;
    try {
        connection = await conectar();
        const [rows] = await connection.execute('SELECT * FROM rectangulos WHERE id = ?', [Number(req.params.id)]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Rectángulo no encontrado' });
        }

        res.json(aRespuesta(rows[0]));
    } catch (error) {
        responderError(res, error);
    } finally {
        if (connection) await connection.end();
    }
});

// Modificar un rectángulo existente (recibe solo los lados y recalcula)
app.put('/rectangulos/:id', [validarId, ...validarCuerpo], validarResultados, async (req, res) => {
    let connection;
    try {
        const id = Number(req.params.id);
        const { lado_a, lado_b } = req.body;
        const { perimetro, superficie } = calcular(lado_a, lado_b);

        connection = await conectar();

        const [rows] = await connection.execute('SELECT id FROM rectangulos WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Rectángulo no encontrado para modificar' });
        }

        await connection.execute(
            'UPDATE rectangulos SET lado_a = ?, lado_b = ?, perimetro = ?, superficie = ? WHERE id = ?',
            [lado_a, lado_b, perimetro, superficie, id]
        );

        res.json({
            mensaje: 'Rectángulo modificado con éxito',
            id,
            lado_a,
            lado_b,
            perimetro,
            superficie
        });
    } catch (error) {
        responderError(res, error);
    } finally {
        if (connection) await connection.end();
    }
});

// Eliminar un rectángulo
app.delete('/rectangulos/:id', [validarId], validarResultados, async (req, res) => {
    let connection;
    try {
        connection = await conectar();
        const [result] = await connection.execute('DELETE FROM rectangulos WHERE id = ?', [Number(req.params.id)]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Rectángulo no encontrado' });
        }

        res.status(204).send();
    } catch (error) {
        responderError(res, error);
    } finally {
        if (connection) await connection.end();
    }
});

// Encender el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});