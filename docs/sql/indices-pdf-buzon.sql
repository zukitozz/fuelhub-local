-- Indices parciales para el buzon de PDF (pdf_bytes como buzon temporal). Sin ellos, cada ciclo del generador recorreria
-- toda la tabla Comprobantes (GBs). Son pequenos: solo contienen las filas que cumplen el filtro.
-- Ejecutar en AUXILIAR2 con un usuario con permisos de escritura, en horario de poco movimiento (SQL Express no crea
-- indices en linea; en tablas grandes, como Pachacutec, la construccion tarda y bloquea la tabla mientras dura).
-- Requiere QUOTED_IDENTIFIER ON en las sesiones que escriben en Comprobantes (sqlcmd: usar -I). El sistema, el facturador
-- y el generador ya trabajan asi.
USE AUXILIAR2;
SET QUOTED_IDENTIFIER ON;
GO

-- PDF generados que esperan a que el facturador los suba (cuenta del tope del buzon y limpieza de los que nunca se aceptaron)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Comprobantes_pdf_listo' AND object_id = OBJECT_ID('dbo.Comprobantes'))
    CREATE NONCLUSTERED INDEX IX_Comprobantes_pdf_listo
        ON dbo.Comprobantes (id)
        INCLUDE (tipo_comprobante, enviado, fecha_hora)
        WHERE pdf_enviado = 0 AND pdf_bytes IS NOT NULL;
GO

-- Comprobantes aceptados que aun no tienen PDF ni se han subido (los que genera el worker)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Comprobantes_pdf_pendiente' AND object_id = OBJECT_ID('dbo.Comprobantes'))
    CREATE NONCLUSTERED INDEX IX_Comprobantes_pdf_pendiente
        ON dbo.Comprobantes (id)
        INCLUDE (tipo_comprobante)
        WHERE enviado = 1 AND pdf_enviado = 0 AND pdf_bytes IS NULL;
GO

-- Subidos que todavia conservan el PDF (limpieza de respaldo)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Comprobantes_pdf_por_vaciar' AND object_id = OBJECT_ID('dbo.Comprobantes'))
    CREATE NONCLUSTERED INDEX IX_Comprobantes_pdf_por_vaciar
        ON dbo.Comprobantes (id)
        WHERE pdf_enviado = 1 AND pdf_bytes IS NOT NULL;
GO

-- Crecimiento del archivo de datos de 1 MB a 256 MB (evita una ampliacion cada pocas ventas)
DECLARE @arch sysname = (SELECT name FROM sys.database_files WHERE type = 0);
DECLARE @sql nvarchar(400) = N'ALTER DATABASE AUXILIAR2 MODIFY FILE (NAME = ' + QUOTENAME(@arch) + N', FILEGROWTH = 256MB)';
EXEC (@sql);
GO
