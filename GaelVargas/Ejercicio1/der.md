Diagrama de entidades y relaciones
erDiagram
    RECTANGULOS {
        INT id PK "AUTO_INCREMENT"
        DECIMAL_10_2 lado_a "NOT NULL, mayor que 0"
        DECIMAL_10_2 lado_b "NOT NULL, mayor que 0"
        DECIMAL_10_2 perimetro "NOT NULL, calculado en el servidor"
        DECIMAL_10_2 superficie "NOT NULL, calculado en el servidor"
    }

La base de datos api_rectangulos contiene una única tabla, sin relaciones con otras entidades.

Script de creación: database.sql.
