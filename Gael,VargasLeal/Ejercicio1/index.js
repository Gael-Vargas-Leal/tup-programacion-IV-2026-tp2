import express from 'express';
import mysql from 'mysql2/promise';
import { body, param, validationResult } from 'express-validator';

const app = express();
app.use(express.json());

// Configuración de la base de datos
const dbConfig = {
    host: 'localhost',
    user: 'alumno',
    password: '12345',
    database: 'api_rectangulos'
};

// Recibe solo los lados, calcula perímetro y superficie)
app.post('/rectangulos', [
    body('lado_a').isNumeric().withMessage('El lado A debe ser un número obligatorio'),
    body('lado_b').isNumeric().withMessage('El lado B debe ser un número obligatorio')
], async (req, res) => {
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errores: errors.array() });
    }

    const { lado_a, lado_b } = req.body;
    const perimetro = (2 * lado_a) + (2 * lado_b);
    const superficie = lado_a * lado_b;

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [result] = await connection.execute(
            'INSERT INTO rectangulos (lado_a, lado_b, perimetro, superficie) VALUES (?, ?, ?, ?)',
            [lado_a, lado_b, perimetro, superficie]
        );
        await connection.end(); 

        res.status(201).json({
            mensaje: 'Rectángulo guardado con éxito',
            id: result.insertId,
            lado_a,
            lado_b,
            perimetro,
            superficie
        });
    } catch (error) {
        res.status(500).json({ error: 'Error de base de datos', detalle: error.message });
    }
});

//Ve todos los rectángulos
app.get('/rectangulos', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT * FROM rectangulos');
        await connection.end();
        
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al consultar la base de datos' });
    }
});

//Buscar un rectángulo específico por ID
app.get('/rectangulos/:id', [
    param('id').isInt({ min: 1 }).withMessage('El ID de la URL debe ser un número entero positivo')
], async (req, res) => {
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errores: errors.array() });
    }

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT * FROM rectangulos WHERE id = ?', [req.params.id]);
        await connection.end();

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Rectángulo no encontrado' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar en la base de datos' });
    }
});

// 4. PUT: Modificar un rectángulo existente (Recibe solo los lados y recalcula)
app.put('/rectangulos/:id', [
    param('id').isInt({ min: 1 }).withMessage('El ID de la URL debe ser un número entero'),
    body('lado_a').isNumeric().withMessage('El lado A debe ser un número obligatorio'),
    body('lado_b').isNumeric().withMessage('El lado B debe ser un número obligatorio')
], async (req, res) => {
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errores: errors.array() });
    }

    const { lado_a, lado_b } = req.body;
    const { id } = req.params;
    
    const perimetro = (2 * lado_a) + (2 * lado_b);
    const superficie = lado_a * lado_b;

    try {
        const connection = await mysql.createConnection(dbConfig);
        
        const [rows] = await connection.execute('SELECT * FROM rectangulos WHERE id = ?', [id]);
        if (rows.length === 0) {
            await connection.end();
            return res.status(404).json({ error: 'Rectángulo no encontrado para modificar' });
        }

        await connection.execute(
            'UPDATE rectangulos SET lado_a = ?, lado_b = ?, perimetro = ?, superficie = ? WHERE id = ?',
            [lado_a, lado_b, perimetro, superficie, id]
        );
        await connection.end();

        res.json({
            mensaje: 'Rectángulo modificado con éxito',
            id: parseInt(id),
            lado_a,
            lado_b,
            perimetro,
            superficie
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar en la base de datos' });
    }
});

// Encender el servidor
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});