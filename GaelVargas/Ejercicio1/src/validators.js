import pkg from 'express-validator';
const { body, param, validationResult } = pkg;

const LADOS_PERMITIDOS = ['lado_a', 'lado_b'];
const LADO_MAXIMO = 9999; // la superficie máxima (99.980.001) entra en DECIMAL(10,2)

// Middleware que responde 400 si alguna validación falló
export const validarResultados = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errores: errors.array() });
    }
    next();
};

// El lado debe estar presente, ser un número mayor que 0, con hasta 2 decimales
const validarLado = (nombre) =>
    body(nombre)
        .exists({ values: 'null' }).withMessage(`${nombre} es obligatorio`).bail()
        .custom((v) => typeof v === 'number' && Number.isFinite(v))
            .withMessage(`${nombre} debe ser un número`).bail()
        .isFloat({ gt: 0, max: LADO_MAXIMO })
            .withMessage(`${nombre} debe ser mayor que 0 y no superar ${LADO_MAXIMO}`).bail()
        .custom((v) => Math.round(v * 100) / 100 === v)
            .withMessage(`${nombre} admite hasta 2 decimales`);

// Rechaza cualquier campo distinto de los lados (por ejemplo perimetro o superficie).
const soloLados = body().custom((cuerpo) => {
    const extras = Object.keys(cuerpo ?? {}).filter((k) => !LADOS_PERMITIDOS.includes(k));
    if (extras.length) {
        throw new Error(`Campos no permitidos: ${extras.join(', ')}. Solo se reciben lado_a y lado_b`);
    }
    return true;
});

export const validarId = param('id').isInt({ min: 1 }).withMessage('El ID de la URL debe ser un número entero positivo');

export const validarCuerpo = [soloLados, validarLado('lado_a'), validarLado('lado_b')];