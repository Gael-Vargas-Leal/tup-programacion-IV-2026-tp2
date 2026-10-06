# Diagrama de entidades y relaciones – Ejercicio 3

```mermaid
erDiagram
    MATERIAS ||--o{ CALIFICACIONES : "tiene"

    MATERIAS {
        int id PK "AUTO_INCREMENT"
        varchar(100) nombre UK "NOT NULL, único sin distinguir mayúsculas ni acentos"
    }

    CALIFICACIONES {
        int id PK "AUTO_INCREMENT"
        varchar(100) alumno UK "NOT NULL, único junto con materia_id"
        int materia_id FK "NOT NULL, ON DELETE RESTRICT"
        decimal(4,2) nota1 "NOT NULL, entre 0 y 10"
        decimal(4,2) nota2 "NOT NULL, entre 0 y 10"
        decimal(4,2) nota3 "NOT NULL, entre 0 y 10"
    }
```

- Una materia puede tener muchas calificaciones; cada calificación pertenece a una sola materia.
- Restricción única compuesta: `UNIQUE (alumno, materia_id)`, que impide más de un registro por alumno y materia.