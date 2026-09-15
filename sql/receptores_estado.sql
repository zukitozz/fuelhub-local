-- Eliminado logico de clientes: ejecutar una vez en la BD auxiliar del grifo antes de desplegar.
-- Los clientes existentes quedan activos (estado = 1).
IF COL_LENGTH('Receptores', 'estado') IS NULL
    ALTER TABLE Receptores ADD estado bit NOT NULL CONSTRAINT DF_Receptores_estado DEFAULT 1;
