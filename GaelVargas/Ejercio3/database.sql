-- Base de datos del Ejercicio 3 (calificaciones de alumnos)
CREATE DATABASE IF NOT EXISTS api_calificaciones
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE api_calificaciones;

-- Materias: tabla independiente. La collation utf8mb4_unicode_ci compara sin
-- distinguir mayúsculas ni acentos, por lo que el índice UNIQUE aplica el
-- criterio de igualdad de nombres directamente en la base (ver README).
CREATE TABLE IF NOT EXISTS materias (
    id     INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_materias_nombre (nombre)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- Calificaciones: un registro por combinación (alumno, materia).
-- Escala de notas: de 0 a 10, con hasta 2 decimales.
CREATE TABLE IF NOT EXISTS calificaciones (
    id         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    alumno     VARCHAR(100)  NOT NULL,
    materia_id INT UNSIGNED  NOT NULL,
    nota1      DECIMAL(4,2)  NOT NULL,
    nota2      DECIMAL(4,2)  NOT NULL,
    nota3      DECIMAL(4,2)  NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_calificaciones_alumno_materia (alumno, materia_id),
    CONSTRAINT fk_calificaciones_materia
        FOREIGN KEY (materia_id) REFERENCES materias (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT chk_nota1 CHECK (nota1 BETWEEN 0 AND 10),
    CONSTRAINT chk_nota2 CHECK (nota2 BETWEEN 0 AND 10),
    CONSTRAINT chk_nota3 CHECK (nota3 BETWEEN 0 AND 10)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- Materias de ejemplo para poder probar la API (opcional)
INSERT IGNORE INTO materias (nombre) VALUES
    ('Programación I'),
    ('Programación II'),
    ('Base de Datos'),
    ('Matemática');