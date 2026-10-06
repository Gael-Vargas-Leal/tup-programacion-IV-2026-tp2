
Database · SQL
CREATE DATABASE IF NOT EXISTS api_rectangulos;
USE api_rectangulos;
 
CREATE TABLE IF NOT EXISTS rectangulos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lado_a DECIMAL(10,2) NOT NULL,
    lado_b DECIMAL(10,2) NOT NULL,
    perimetro DECIMAL(10,2) NOT NULL,
    superficie DECIMAL(10,2) NOT NULL,
    CONSTRAINT chk_lados_positivos CHECK (lado_a > 0 AND lado_b > 0)
);
 