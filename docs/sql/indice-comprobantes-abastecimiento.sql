-- Indice para la validacion "comprobante previo" (process-billing.ts: WHERE tipo_comprobante in ('01','03') AND id_abastecimiento = X).
-- Sin este indice cada consulta recorre toda la tabla Comprobantes (en MALA son ~2.7 GB por los PDF guardados) y
-- supera el tiempo limite de 15 s. Ejecutar en AUXILIAR2 con un usuario con permisos de escritura, en horario de poco movimiento
-- (SQL Express no tiene creacion de indices en linea: la tabla queda bloqueada mientras se construye, ~30-60 s).
USE AUXILIAR2;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Comprobantes_id_abastecimiento' AND object_id = OBJECT_ID('dbo.Comprobantes'))
    CREATE NONCLUSTERED INDEX IX_Comprobantes_id_abastecimiento
        ON dbo.Comprobantes (id_abastecimiento)
        INCLUDE (tipo_comprobante);
GO
