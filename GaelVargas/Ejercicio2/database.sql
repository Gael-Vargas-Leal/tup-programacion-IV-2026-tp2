-- Base de datos del Ejercicio 2 (lista de tareas)
CREATE DATABASE IF NOT EXISTS api_tareas
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE api_tareas;

-- La collation utf8mb4_unicode_ci compara sin distinguir mayúsculas ni acentos,
-- por lo que el índice UNIQUE sobre "nombre" aplica el criterio de igualdad
-- directamente en la base de datos (ver README).
CREATE TABLE IF NOT EXISTS tareas (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre     VARCHAR(100) NOT NULL,
    completada TINYINT(1)   NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tareas_nombre (nombre)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;