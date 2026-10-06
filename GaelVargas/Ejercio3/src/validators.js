import { body, param, query, validationResult } from 'express-validator';

// ---------- Escala y límites (documentados en el README) ----------
export const NOMBRE_MAX = 100;
export const NOMBRE_MIN = 2;
export const NOTA_MIN = 0;
export const NOTA_MAX = 10;
export const NOTA_DECIMALES = 2;
export const CANTIDAD_NOTAS = 3;

// Criterio de igualdad de nombres (parte 1): sin espacios al inicio/fin y con los
// espacios repetidos colapsados en uno solo. La parte 2 (mayúsculas/acentos)
// la resuelve la collation de MySQL.
export const normalizarTexto = (valor) => valor.trim().replace(/\s+/g, ' ');

// Alumno: empieza con una letra; admite letras (con acentos), espacios, apóstrofes, puntos y guiones.
const REGEX_ALUMNO = /^\p{L}[\p{L}\s'.-]*$/u;
// Materia: empieza con letra o número; además admite . , ' ( ) y guiones.
const REGEX_MATERIA = /^[\p{L}\p{N}][\p{L}\p{N}\s.,'()-]*$/u;

// ---------- Reglas reutilizables ----------

const reglasTexto = (chain, etiqueta, regex, mensajeRegex) =>
    chain
        .isString().withMessage(`${etiqueta} debe ser un texto`).bail()
        .customSanitizer(normalizarTexto)
        .notEmpty().withMessage(`${etiqueta} no puede estar vacío`).bail()
        .isLength({ min: NOMBRE_MIN, max: NOMBRE_MAX })
        .withMessage(`${etiqueta} debe tener entre ${NOMBRE_MIN} y ${NOMBRE_MAX} caracteres`).bail()
        .matches(regex).withMessage(mensajeRegex);

const mensajeAlumno = 'El nombre del alumno solo puede contener letras, espacios, apóstrofes, puntos y guiones';
const mensajeMateria = 'El nombre de la materia solo puede contener letras, números, espacios y . , \' ( ) -';

const alumnoObligatorio = reglasTexto(
    body('alumno').exists({ checkNull: true }).withMessage('El nombre del alumno es obligatorio').bail(),
    'El nombre del alumno', REGEX_ALUMNO, mensajeAlumno
);
const alumnoOpcional = reglasTexto(body('alumno').optional(), 'El nombre del alumno', REGEX_ALUMNO, mensajeAlumno);

const esEnteroPositivo = (valor) => typeof valor === 'number' && Number.isInteger(valor) && valor >= 1;

const materiaIdObligatoria = body('materia_id')
    .exists({ checkNull: true }).withMessage('"materia_id" es obligatorio').bail()
    .custom(esEnteroPositivo).withMessage('"materia_id" debe ser un entero positivo');
const materiaIdOpcional = body('materia_id')
    .optional()
    .custom(esEnteroPositivo).withMessage('"materia_id" debe ser un entero positivo');

// Exactamente 3 notas, numéricas (números JSON, no texto), entre 0 y 10, con hasta 2 decimales.
const validarNotas = (valor) => {
    if (!Array.isArray(valor) || valor.length !== CANTIDAD_NOTAS) {
        throw new Error(`"notas" debe ser un arreglo con exactamente ${CANTIDAD_NOTAS} números`);
    }
    valor.forEach((nota, i) => {
        const n = i + 1;
        if (typeof nota !== 'number' || !Number.isFinite(nota)) {
            throw new Error(`La nota ${n} debe ser un número`);
        }
        if (nota < NOTA_MIN || nota > NOTA_MAX) {
            throw new Error(`La nota ${n} debe estar entre ${NOTA_MIN} y ${NOTA_MAX}`);
        }
        const factor = 10 ** NOTA_DECIMALES;
        if (Math.abs(nota * factor - Math.round(nota * factor)) > 1e-9) {
            throw new Error(`La nota ${n} admite como máximo ${NOTA_DECIMALES} decimales`);
        }
    });
    return true;
};

const notasObligatorias = body('notas')
    .exists({ checkNull: true }).withMessage('"notas" es obligatorio').bail()
    .custom(validarNotas);
const notasOpcionales = body('notas').optional().custom(validarNotas);

const unSoloValor = (valor) => typeof valor === 'string';

// ---------- Validaciones por operación ----------

export const validarId = param('id')
    .isInt({ min: 1 }).withMessage('El id debe ser un entero positivo');

// Materias (POST y PUT)
export const validarMateria = [
    reglasTexto(
        body('nombre').exists({ checkNull: true }).withMessage('El nombre de la materia es obligatorio').bail(),
        'El nombre de la materia', REGEX_MATERIA, mensajeMateria
    )
];

// Calificaciones: POST y PUT (todos los campos obligatorios)
export const validarCuerpo = [alumnoObligatorio, materiaIdObligatoria, notasObligatorias];

// Calificaciones: PATCH (al menos un campo)
export const validarCuerpoParcial = [
    alumnoOpcional,
    materiaIdOpcional,
    notasOpcionales,
    body().custom((_, { req }) => {
        const cuerpo = req.body ?? {};
        if (cuerpo.alumno === undefined && cuerpo.materia_id === undefined && cuerpo.notas === undefined) {
            throw new Error('Debe enviarse al menos "alumno", "materia_id" o "notas"');
        }
        return true;
    })
];

// Calificaciones: filtros GET /calificaciones?alumno=...&materia_id=...
export const validarFiltro = [
    query('alumno')
        .optional()
        .custom(unSoloValor).withMessage('"alumno" debe indicarse una sola vez').bail()
        .notEmpty().withMessage('"alumno" no puede estar vacío').bail()
        .isLength({ max: NOMBRE_MAX }).withMessage(`"alumno" no puede superar los ${NOMBRE_MAX} caracteres`),
    query('materia_id')
        .optional()
        .custom(unSoloValor).withMessage('"materia_id" debe indicarse una sola vez').bail()
        .isInt({ min: 1 }).withMessage('"materia_id" debe ser un entero positivo')
];

// Responde 400 con el detalle de todos los errores de validación
export const validarResultados = (req, res, next) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({
            errores: errores.array().map(({ path, location, msg }) => ({
                campo: path,
                ubicacion: location,
                mensaje: msg
            }))
        });
    }
    next();
};