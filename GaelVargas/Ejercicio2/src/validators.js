import { body, param, query, validationResult } from 'express-validator';

export const NOMBRE_MAX = 100;
export const ESTADOS_VALIDOS = ['completadas', 'pendientes'];

// ---------- Reglas reutilizables ----------

// Normaliza el nombre (criterio de igualdad, parte 1): sin espacios al inicio/fin
// y con los espacios repetidos colapsados en uno solo.
// La parte 2 (mayúsculas/acentos) la resuelve la collation de MySQL.
const reglasNombre = (chain) =>
    chain
        .isString().withMessage('El nombre debe ser un texto').bail()
        .trim()
        .customSanitizer((valor) => valor.replace(/\s+/g, ' '))
        .notEmpty().withMessage('El nombre no puede estar vacío').bail()
        .isLength({ max: NOMBRE_MAX }).withMessage(`El nombre no puede superar los ${NOMBRE_MAX} caracteres`);

const esBooleano = (valor) => typeof valor === 'boolean';

const nombreObligatorio = reglasNombre(
    body('nombre').exists({ checkNull: true }).withMessage('El nombre es obligatorio').bail()
);

const nombreOpcional = reglasNombre(body('nombre').optional());

const completadaObligatoria = body('completada')
    .exists({ checkNull: true }).withMessage('El estado "completada" es obligatorio').bail()
    .custom(esBooleano).withMessage('"completada" debe ser un booleano (true o false)');

const completadaOpcional = body('completada')
    .optional()
    .custom(esBooleano).withMessage('"completada" debe ser un booleano (true o false)');

// ---------- Validaciones por operación ----------

export const validarId = param('id')
    .isInt({ min: 1 }).withMessage('El id debe ser un entero positivo');

export const validarFiltro = query('estado')
    .optional()
    .custom((valor) => typeof valor === 'string').withMessage('"estado" debe indicarse una sola vez').bail()
    .isIn(ESTADOS_VALIDOS).withMessage(`"estado" debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}`);

// POST: nombre obligatorio, completada opcional (por defecto false)
export const validarCuerpo = [nombreObligatorio, completadaOpcional];

// PUT: reemplazo completo, ambos campos obligatorios
export const validarCuerpoCompleto = [nombreObligatorio, completadaObligatoria];

// PATCH: modificación parcial, al menos un campo
export const validarCuerpoParcial = [
    nombreOpcional,
    completadaOpcional,
    body().custom((_, { req }) => {
        const cuerpo = req.body ?? {};
        if (cuerpo.nombre === undefined && cuerpo.completada === undefined) {
            throw new Error('Debe enviarse al menos "nombre" o "completada"');
        }
        return true;
    })
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