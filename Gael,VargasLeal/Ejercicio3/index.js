import express from 'express';
import mysql from 'mysql2/promise';
import { body, param, query, validationResult } from 'express-validator';

const app = express();
app.use(express.json());


const dbConfig = {
  host: 'localhost',
  user: 'root',       
  password: '',  
  database: 'api_calificaciones'
};

const PORT = 3002; 

// Middleware para manejar errores de validación de express-validator
const validarCampos = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errores: errors.array() });
  }
  next();
};


// GET: Listar todas las materias
app.get('/materias', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute('SELECT * FROM materias');
    await connection.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener las materias', detalle: error.message });
  }
});



// GET: Listar calificaciones (con opción de filtrar por materia_id o alumno)
app.get('/calificaciones', [
  query('materia_id').optional().isInt().withEl ('El ID de materia debe ser un número entero'),
  validarCampos
], async (req, res) => {
  try {
    const { materia_id } = req.query;
    const connection = await mysql.createConnection(dbConfig);
    
    let sql = `
      SELECT c.id, c.alumno, m.id AS materia_id, m.nombre AS materia, c.nota1, c.nota2, c.nota3 
      FROM calificaciones c
      JOIN materias m ON c.materia_id = m.id
    `;
    let params = [];

    if (materia_id) {
      sql += ' WHERE c.materia_id = ?';
      params.push(materia_id);
    }

    const [rows] = await connection.execute(sql, params);
    await connection.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener las calificaciones', detalle: error.message });
  }
});

// POST: Crear un registro de calificaciones
app.post('/calificaciones', [
  body('alumno').exists().notEmpty().isString().withEl('El nombre del alumno es obligatorio y debe ser texto'),
  body('materia_id').exists().isInt().withEl('El ID de la materia es obligatorio y debe ser un número entero'),
  body('nota1').exists().isFloat({ min: 1, max: 10 }).withEl('La nota 1 debe ser un número entre 1 y 10'),
  body('nota2').exists().isFloat({ min: 1, max: 10 }).withEl('La nota 2 debe ser un número entre 1 y 10'),
  body('nota3').exists().isFloat({ min: 1, max: 10 }).withEl('La nota 3 debe ser un número entre 1 y 10'),
  validarCampos
], async (req, res) => {
  try {
    const { alumno, materia_id, nota1, nota2, nota3 } = req.body;
    const connection = await mysql.createConnection(dbConfig);

    //Verificar que la materia exista
    const [materias] = await connection.execute('SELECT * FROM materias WHERE id = ?', [materia_id]);
    if (materias.length === 0) {
      await connection.end();
      return res.status(404).json({ error: 'La materia especificada no existe en el sistema' });
    }

    //  Verificar regla de unicidad 
    const [existente] = await connection.execute(
      'SELECT * FROM calificaciones WHERE LOWER(alumno) = LOWER(?) AND materia_id = ?',
      [alumno.trim(), materia_id]
    );

    if (existente.length > 0) {
      await connection.end();
      return res.status(400).json({ error: 'Ya existe un registro de calificaciones para este alumno en esta materia' });
    }

    // 3. Insertar el registro
    const [result] = await connection.execute(
      'INSERT INTO calificaciones (alumno, materia_id, nota1, nota2, nota3) VALUES (?, ?, ?, ?, ?)',
      [alumno.trim(), materia_id, nota1, nota2, nota3]
    );

    await connection.end();
    res.status(201).json({ 
      mensaje: 'Calificación creada exitosamente', 
      id: result.insertId,
      alumno,
      materia_id,
      nota1, nota2, nota3
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear la calificación', detalle: error.message });
  }
});

//  Modificar un registro de calificaciones
app.put('/calificaciones/:id', [
  param('id').isInt().withEl('El ID de la ruta debe ser un número entero'),
  body('alumno').exists().notEmpty().isString().withEl('El nombre del alumno es obligatorio'),
  body('materia_id').exists().isInt().withEl('El ID de la materia debe ser un número entero'),
  body('nota1').exists().isFloat({ min: 1, max: 10 }).withEl('La nota 1 debe estar entre 1 y 10'),
  body('nota2').exists().isFloat({ min: 1, max: 10 }).withEl('La nota 2 debe estar entre 1 y 10'),
  body('nota3').exists().isFloat({ min: 1, max: 10 }).withEl('La nota 3 debe estar entre 1 y 10'),
  validarCampos
], async (req, res) => {
  try {
    const { id } = req.params;
    const { alumno, materia_id, nota1, nota2, nota3 } = req.body;
    const connection = await mysql.createConnection(dbConfig);


    const [actual] = await connection.execute('SELECT * FROM calificaciones WHERE id = ?', [id]);
    if (actual.length === 0) {
      await connection.end();
      return res.status(404).json({ error: 'El registro de calificación no fue encontrado' });
    }

    // Verificar si la materia exista
    const [materias] = await connection.execute('SELECT * FROM materias WHERE id = ?', [materia_id]);
    if (materias.length === 0) {
      await connection.end();
      return res.status(404).json({ error: 'La materia especificada no existe' });
    }

    // Verificar regla de unicidad excluyendo el registro actual
    const [duplicado] = await connection.execute(
      'SELECT * FROM calificaciones WHERE LOWER(alumno) = LOWER(?) AND materia_id = ? AND id != ?',
      [alumno.trim(), materia_id, id]
    );

    if (duplicado.length > 0) {
      await connection.end();
      return res.status(400).json({ error: 'Ya existe otro registro para este alumno en la misma materia' });
    }

    await connection.execute(
      'UPDATE calificaciones SET alumno = ?, materia_id = ?, nota1 = ?, nota2 = ?, nota3 = ? WHERE id = ?',
      [alumno.trim(), materia_id, nota1, nota2, nota3, id]
    );

    await connection.end();
    res.json({ mensaje: 'Calificación actualizada correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar', detalle: error.message });
  }
});

//  Eliminar un registro
app.delete('/calificaciones/:id', [
  param('id').isInt().withEl('El ID debe ser un número entero'),
  validarCampos
], async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await mysql.createConnection(dbConfig);
    
    const [result] = await connection.execute('DELETE FROM calificaciones WHERE id = ?', [id]);
    await connection.end();

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Calificación no encontrada' });
    }

    res.json({ mensaje: 'Calificación eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar', detalle: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor del Ejercicio 3 corriendo en http://localhost:${PORT}`);
});