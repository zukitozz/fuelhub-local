-- Libera espacio en AUXILIAR2 vaciando pdf_bytes SOLO de los comprobantes cuyo PDF el facturador ya subio (pdf_enviado = 1).
-- Los PDF de los comprobantes con pdf_enviado = 0 NO se tocan: todavia no estan en la web y se perderian.
-- Si alguien abre luego un comprobante vaciado, el sistema regenera el PDF desde los datos (el original lo tiene S3).
--
-- ANTES DE EJECUTAR: abrir 2 o 3 enlaces de la columna url de comprobantes con pdf_enviado = 1 y comprobar que el PDF existe en la web.
-- Ejecutar con un usuario con permisos de escritura, en AUXILIAR2. Corre por lotes para no inflar el log.
-- El archivo .mdf NO se reduce (no hace falta: el espacio liberado dentro del archivo se reutiliza y el limite de 10 GB de
-- SQL Express cuenta el espacio asignado, no el usado). No hacer SHRINK.
USE AUXILIAR2;
SET NOCOUNT ON;

-- 1) Cuanto se va a liberar (revisar antes de continuar)
SELECT COUNT(*) AS filas, SUM(DATALENGTH(pdf_bytes)) / 1048576 AS MB_a_liberar
FROM dbo.Comprobantes
WHERE pdf_enviado = 1 AND pdf_bytes IS NOT NULL;

-- 2) Vaciado por lotes de 500 filas (cada lote es una transaccion corta)
DECLARE @filas INT = 1;
WHILE @filas > 0
BEGIN
    UPDATE TOP (500) dbo.Comprobantes
       SET pdf_bytes = NULL
     WHERE pdf_enviado = 1 AND pdf_bytes IS NOT NULL;
    SET @filas = @@ROWCOUNT;
    WAITFOR DELAY '00:00:01';   -- da respiro a las ventas en curso
END

-- 3) Resultado: espacio usado vs asignado del archivo de datos
SELECT name, size * 8 / 1024 AS archivo_MB,
       FILEPROPERTY(name, 'SpaceUsed') * 8 / 1024 AS usado_MB,
       (size - FILEPROPERTY(name, 'SpaceUsed')) * 8 / 1024 AS libre_en_archivo_MB
FROM sys.database_files WHERE type = 0;
