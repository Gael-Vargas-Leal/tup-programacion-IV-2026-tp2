import 'dotenv/config';
import mysql from 'mysql2/promise';

// Validación de las variables de entorno al arrancar.
// DB_PASSWORD no se exige porque puede estar vacía en una base local.
const requeridas = ['DB_HOST', 'DB_USER', 'DB_NAME'];
const faltantes = requeridas.filter((v) => !process.env[v]);

if (faltantes.length > 0) {
    console.error(
        `Faltan las variables de entorno ${faltantes.join(', ')}. Copiar .env.example a .env y completarlo.`
    );
    process.exit(1);
}

export const conectar = () =>
    mysql.createConnection({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD ?? '',
        database: process.env.DB_NAME
    });
