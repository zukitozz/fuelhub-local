-- Credito de clientes para notas de despacho.
-- credito_limite (soles) lo asigna el administrador en el administrador de clientes. NULL o 0 = sin credito: no se pueden
-- emitir notas de despacho a ese cliente. Saldo = credito_limite - total de sus notas de despacho aun sin facturar.
-- Ejecutar en AUXILIAR2 con un usuario con permisos de escritura, ANTES de desplegar el codigo que lee esta columna.
USE AUXILIAR2;
SET QUOTED_IDENTIFIER ON;
GO

IF COL_LENGTH('dbo.Receptores', 'credito_limite') IS NULL
    ALTER TABLE dbo.Receptores ADD credito_limite decimal(18,2) NULL;
GO

-- Notas de despacho sin facturar por cliente: es lo que consulta cada emision para calcular el saldo. Indice pequeno
-- (solo contiene las notas pendientes), evita recorrer toda la tabla Comprobantes.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Comprobantes_despacho_pendiente' AND object_id = OBJECT_ID('dbo.Comprobantes'))
    CREATE NONCLUSTERED INDEX IX_Comprobantes_despacho_pendiente
        ON dbo.Comprobantes (ReceptorId)
        INCLUDE (total)
        WHERE tipo_comprobante = '50' AND estado_nota_despacho IS NULL;
GO
