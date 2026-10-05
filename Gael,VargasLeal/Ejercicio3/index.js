import express from 'express';
import mysql from 'mysql2/promise';
import pkg from 'express-validator';
const { body, param, query, validationResult } = pkg;

const app = express();
app.use(express.json());


const dbConfig = {
  host: 'localhost',
  user: 'alumno',
  password: '12345',
  database: 'api_calificaciones'
};

const PORT = 3002;

// Escala de calificaciones adoptada: números de 1 a 10, con hasta 2 decimales.
const NOTA_MINIMA = 1;
const NOTA_MAXIMA = 10;

// Largo máximo del nombre del alumno (debe coincidir con el largo de la columna alumno)
const ALUMNO_MAX = 150;

// Largo máximo del nombre de la materia (columna nombre de la tabla materias)
const MATERIA_MAX = 100;

// Middleware para manejar errores de validación de express-validator
const validarCampos = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errores: errors.array() });
  }
  next();
};

// Criterio para comparar alumnos: se quitan los espacios del inicio y del final, los espacios
// repetidos se reducen a uno y no se distingue entre mayúsculas y minúsculas (LOWER en la consulta).
const normalizarNombre = (valor) => valor.trim().replace(/\s+/g, ' ');

const validarAlumno = body('alumno')
  .exists({ values: 'null' }).withMessage('El nombre del alumno es obligatorio').bail()
  .isString().withMessage('El nombre del alumno debe ser texto').bail()
  .customSanitizer(normalizarNombre)
  .notEmpty().withMessage('El nombre del alumno no puede estar vacío').bail()
  .isLength({ max: ALUMNO_MAX }).withMessage(`El nombre del alumno no puede superar los ${ALUMNO_MAX} caracteres`).bail()
  .matches(/^\p{L}[\p{L}\s'.-]*$/u).withMessage('El nombre del alumno solo puede contener letras, espacios, apóstrofes, puntos y guiones');

const validarNombreMateria = body('nombre')
  .exists({ values: 'null' }).withMessage('El nombre de la materia es obligatorio').bail()
  .isString().withMessage('El nombre de la materia debe ser texto').bail()
  .customSanitizer(normalizarNombre)
  .notEmpty().withMessage('El nombre de la materia no puede estar vacío').bail()
  .isLength({ max: MATERIA_MAX }).withMessage(`El nombre de la materia no puede superar los ${MATERIA_MAX} caracteres`);

const validarMateriaId = body('materia_id')
  .exists({ values: 'null' }).withMessage('El ID de la materia es obligatorio').bail()
  .isInt({ min: 1 }).withMessage('El ID de la materia debe ser un número entero positivo')
  .toInt();

const validarNota = (campo) => body(campo)
  .exists({ values: 'null' }).withMessage(`${campo} es obligatoria`).bail()
  .custom((v) => typeof v === 'number' && Number.isFinite(v)).withMessage(`${campo} debe ser un número`).bail()
  .isFloat({ min: NOTA_MINIMA, max: NOTA_MAXIMA }).withMessage(`${campo} debe estar entre ${NOTA_MINIMA} y ${NOTA_MAXIMA}`).bail()
  .custom((v) => Math.round(v * 100) / 100 === v).withMessage(`${campo} admite hasta 2 decimales`);

const validarId = param('id').isInt({ min: 1 }).withMessage('El ID de la ruta debe ser un número entero positivo');

const validarCuerpo = [
  validarAlumno,
  validarMateriaId,
  validarNota('nota1'),
  validarNota('nota2'),
  validarNota('nota3')
];

const responderError = (res, error) => {
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'Ya existe un registro de calificaciones para este alumno en esta materia' });
  }
  console.error(error);
  res.status(500).json({ error: 'Error interno del servidor' });
};


// GET: Listar todas las materias
app.get('/materias', async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute('SELECT * FROM materias');
    res.json(rows);
  } catch (error) {
    responderError(res, error);
  } finally {
    if (connection) await connection.end();
  }
});


// POST: Crear una materia
app.post('/materias', [
  validarNombreMateria,
  validarCampos
], async (req, res) => {
  let connection;
  try {
    const { nombre } = req.body;
    connection = await mysql.createConnection(dbConfig);

    const [existente] = await connection.execute(
      'SELECT id FROM materias WHERE LOWER(nombre) = LOWER(?)',
      [nombre]
    );
    if (existente.length > 0) {
      return res.status(409).json({ error: 'Ya existe una materia con ese nombre' });
    }

    const [result] = await connection.execute('INSERT INTO materias (nombre) VALUES (?)', [nombre]);
    res.status(201).json({ mensaje: 'Materia creada exitosamente', id: result.insertId, nombre });
  } catch (error) {
    responderError(res, error);
  } finally {
    if (connection) await connection.end();
  }
});

// PUT: Modificar una materia
app.put('/materias/:id', [
  validarId,
  validarNombreMateria,
  validarCampos
], async (req, res) => {
  let connection;
  try {
    const id = Number(req.params.id);
    const { nombre } = req.body;
    connection = await mysql.createConnection(dbConfig);

    const [actual] = await connection.execute('SELECT id FROM materias WHERE id = ?', [id]);
    if (actual.length === 0) {
      return res.status(404).json({ error: 'Materia no encontrada' });
    }

    const [duplicada] = await connection.execute(
      'SELECT id FROM materias WHERE LOWER(nombre) = LOWER(?) AND id != ?',
      [nombre, id]
    );
    if (duplicada.length > 0) {
      return res.status(409).json({ error: 'Ya existe otra materia con ese nombre' });
    }

    await connection.execute('UPDATE materias SET nombre = ? WHERE id = ?', [nombre, id]);
    res.json({ mensaje: 'Materia actualizada correctamente', id, nombre });
  } catch (error) {
    responderError(res, error);
  } finally {
    if (connection) await connection.end();
  }
});

// DELETE: Eliminar una materia (por la clave foránea con ON DELETE CASCADE,
// también se eliminan las calificaciones registradas en esa materia)
app.delete('/materias/:id', [
  validarId,
  validarCampos
], async (req, res) => {
  let connection;
  try {
    const id = Number(req.params.id);
    connection = await mysql.createConnection(dbConfig);

    const [result] = await connection.execute('DELETE FROM materias WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Materia no encontrada' });
    }

    res.json({ mensaje: 'Materia eliminada correctamente, junto con sus calificaciones' });
  } catch (error) {
    responderError(res, error);
  } finally {
    if (connection) await connection.end();
  }
});

// GET: Listar calificaciones (con opción de filtrar por materia_id)
app.get('/calificaciones', [
  query('materia_id').optional()
    .custom((valor) => typeof valor === 'string' && /^[1-9]\d*$/.test(valor))
    .withMessage('El ID de materia debe ser un número entero positivo'),
  validarCampos
], async (req, res) => {
  let connection;
  try {
    const { materia_id } = req.query;
    connection = await mysql.createConnection(dbConfig);

    let sql = `
      SELECT c.id, c.alumno, m.id AS materia_id, m.nombre AS materia, c.nota1, c.nota2, c.nota3
      FROM calificaciones c
      JOIN materias m ON c.materia_id = m.id
    `;
    let params = [];

    if (materia_id !== undefined) {
      sql += ' WHERE c.materia_id = ?';
      params.push(Number(materia_id));
    }

    const [rows] = await connection.execute(sql + ' ORDER BY c.id', params);
    res.json(rows);
  } catch (error) {
    responderError(res, error);
  } finally {
    if (connection) await connection.end();
  }
});

// POST: Crear un registro de calificaciones
app.post('/calificaciones', [
  ...validarCuerpo,
  validarCampos
], async (req, res) => {
  let connection;
  try {
    const { alumno, materia_id, nota1, nota2, nota3 } = req.body;
    connection = await mysql.createConnection(dbConfig);

    // 1. Verificar que la materia exista
    const [materias] = await connection.execute('SELECT id FROM materias WHERE id = ?', [materia_id]);
    if (materias.length === 0) {
      return res.status(400).json({ error: 'La materia especificada no existe en el sistema' });
    }

    // 2. Verificar regla de unicidad (alumno + materia)
    const [existente] = await connection.execute(
      'SELECT id FROM calificaciones WHERE LOWER(alumno) = LOWER(?) AND materia_id = ?',
      [alumno, materia_id]
    );

    if (existente.length > 0) {
      return res.status(409).json({ error: 'Ya existe un registro de calificaciones para este alumno en esta materia' });
    }

    // 3. Insertar el registro
    const [result] = await connection.execute(
      'INSERT INTO calificaciones (alumno, materia_id, nota1, nota2, nota3) VALUES (?, ?, ?, ?, ?)',
      [alumno, materia_id, nota1, nota2, nota3]
    );

    res.status(201).json({
      mensaje: 'Calificación creada exitosamente',
      id: result.insertId,
      alumno,
      materia_id,
      nota1, nota2, nota3
    });
  } catch (error) {
    responderError(res, error);
  } finally {
    if (connection) await connection.end();
  }
});

// PUT: Modificar un registro de calificaciones
app.put('/calificaciones/:id', [
  validarId,
  ...validarCuerpo,
  validarCampos
], async (req, res) => {
  let connection;
  try {
    const id = Number(req.params.id);
    const { alumno, materia_id, nota1, nota2, nota3 } = req.body;
    connection = await mysql.createConnection(dbConfig);

    // 1. Verificar que el registro exista
    const [actual] = await connection.execute('SELECT id FROM calificaciones WHERE id = ?', [id]);
    if (actual.length === 0) {
      return res.status(404).json({ error: 'El registro de calificación no fue encontrado' });
    }

    // 2. Verificar que la materia exista
    const [materias] = await connection.execute('SELECT id FROM materias WHERE id = ?', [materia_id]);
    if (materias.length === 0) {
      return res.status(400).json({ error: 'La materia especificada no existe' });
    }

    // 3. Verificar regla de unicidad excluyendo el registro actual
    const [duplicado] = await connection.execute(
      'SELECT id FROM calificaciones WHERE LOWER(alumno) = LOWER(?) AND materia_id = ? AND id != ?',
      [alumno, materia_id, id]
    );

    if (duplicado.length > 0) {
      return res.status(409).json({ error: 'Ya existe otro registro para este alumno en la misma materia' });
    }

    await connection.execute(
      'UPDATE calificaciones SET alumno = ?, materia_id = ?, nota1 = ?, nota2 = ?, nota3 = ? WHERE id = ?',
      [alumno, materia_id, nota1, nota2, nota3, id]
    );

    res.json({ mensaje: 'Calificación actualizada correctamente', id, alumno, materia_id, nota1, nota2, nota3 });
  } catch (error) {
    responderError(res, error);
  } finally {
    if (connection) await connection.end();
  }
});

// DELETE: Eliminar un registro
app.delete('/calificaciones/:id', [
  validarId,
  validarCampos
], async (req, res) => {
  let connection;
  try {
    const id = Number(req.params.id);
    connection = await mysql.createConnection(dbConfig);

    const [result] = await connection.execute('DELETE FROM calificaciones WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Calificación no encontrada' });
    }

    res.json({ mensaje: 'Calificación eliminada correctamente' });
  } catch (error) {
    responderError(res, error);
  } finally {
    if (connection) await connection.end();
  }
});

app.listen(PORT, () => {
  console.log(`Servidor del Ejercicio 3 corriendo en http://localhost:${PORT}`);
});