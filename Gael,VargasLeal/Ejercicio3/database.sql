CREATE DATABASE IF NOT EXISTS api_calificaciones;
USE api_calificaciones;

-- 1. Tabla de Materias
CREATE TABLE materias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL
);

-- 2. Tabla de Calificaciones (con relación a Materias)
CREATE TABLE calificaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alumno VARCHAR(150) NOT NULL,
    materia_id INT NOT NULL,
    nota1 DECIMAL(4,2),
    nota2 DECIMAL(4,2),
    nota3 DECIMAL(4,2),
    CONSTRAINT fk_materia 
        FOREIGN KEY (materia_id) 
        REFERENCES materias(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
);