/*
    Corrige Comprobantes.fecha_abastecimiento en los comprobantes historicos.

    Hasta el fix, el driver leia Abastecimientos.fechaHora (hora local) como si fuera UTC y
    el modelo la formateaba en hora local, asi que la columna quedo 5 horas atrasada.

    EJECUTAR MANUALMENTE sobre la base auxiliar (AUXILIAR2), despues de desplegar el fix.

    Es idempotente: solo toca las filas que siguen con exactamente -300 minutos de
    diferencia, asi que volver a correrlo no suma 5 horas dos veces.

    El script deja la transaccion ABIERTA a proposito: revisa los resultados y recien ahi
    ejecuta COMMIT TRANSACTION (o ROLLBACK TRANSACTION si algo no cuadra).
*/

-- PASO 1: cuantas filas estan corridas (antes de tocar nada)
SELECT COUNT(*) AS filas_a_corregir
FROM Comprobantes c
INNER JOIN DEMOSQL.dbo.Abastecimientos a ON a.idAbastecimiento = c.id_abastecimiento
WHERE c.id_abastecimiento IS NOT NULL
  AND DATEPART(tzoffset, c.fecha_abastecimiento) = 0
  AND DATEDIFF(minute, a.fechaHora, CAST(c.fecha_abastecimiento AS datetime)) = -300;

BEGIN TRANSACTION;

-- PASO 2: respaldo del valor anterior (la tabla se crea la primera vez)
IF OBJECT_ID('dbo.Comprobantes_fecha_abastecimiento_bk') IS NULL
BEGIN
    CREATE TABLE dbo.Comprobantes_fecha_abastecimiento_bk (
        id                            int NOT NULL PRIMARY KEY,
        fecha_abastecimiento_anterior datetimeoffset(7) NOT NULL,
        fecha_respaldo                datetime NOT NULL CONSTRAINT DF_Comprobantes_fa_bk DEFAULT GETDATE()
    );
END;

INSERT INTO dbo.Comprobantes_fecha_abastecimiento_bk (id, fecha_abastecimiento_anterior)
SELECT c.id, c.fecha_abastecimiento
FROM Comprobantes c
INNER JOIN DEMOSQL.dbo.Abastecimientos a ON a.idAbastecimiento = c.id_abastecimiento
WHERE c.id_abastecimiento IS NOT NULL
  AND DATEPART(tzoffset, c.fecha_abastecimiento) = 0
  AND DATEDIFF(minute, a.fechaHora, CAST(c.fecha_abastecimiento AS datetime)) = -300
  AND NOT EXISTS (SELECT 1 FROM dbo.Comprobantes_fecha_abastecimiento_bk bk WHERE bk.id = c.id);

-- PASO 3: sumar las 5 horas (DATEADD conserva el tipo datetimeoffset y su offset)
UPDATE c
SET c.fecha_abastecimiento = DATEADD(hour, 5, c.fecha_abastecimiento)
FROM Comprobantes c
INNER JOIN DEMOSQL.dbo.Abastecimientos a ON a.idAbastecimiento = c.id_abastecimiento
WHERE c.id_abastecimiento IS NOT NULL
  AND DATEPART(tzoffset, c.fecha_abastecimiento) = 0
  AND DATEDIFF(minute, a.fechaHora, CAST(c.fecha_abastecimiento AS datetime)) = -300;

SELECT @@ROWCOUNT AS filas_actualizadas;

-- PASO 4: verificacion, debe quedar en 0
SELECT COUNT(*) AS filas_que_siguen_corridas
FROM Comprobantes c
INNER JOIN DEMOSQL.dbo.Abastecimientos a ON a.idAbastecimiento = c.id_abastecimiento
WHERE c.id_abastecimiento IS NOT NULL
  AND DATEDIFF(minute, a.fechaHora, CAST(c.fecha_abastecimiento AS datetime)) <> 0;

-- PASO 5: muestra de control
SELECT TOP 10 c.id, c.numeracion_comprobante,
       CONVERT(varchar(19), a.fechaHora, 120)                   AS hora_del_surtidor,
       CONVERT(varchar(19), c.fecha_abastecimiento, 120)        AS fecha_abastecimiento,
       DATEDIFF(minute, a.fechaHora, CAST(c.fecha_abastecimiento AS datetime)) AS diferencia_minutos
FROM Comprobantes c
INNER JOIN DEMOSQL.dbo.Abastecimientos a ON a.idAbastecimiento = c.id_abastecimiento
WHERE c.id_abastecimiento IS NOT NULL
ORDER BY c.id DESC;

-- PASO 6: si todo cuadra
-- COMMIT TRANSACTION;
-- si no
-- ROLLBACK TRANSACTION;
