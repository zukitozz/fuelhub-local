-- Ventas al credito (facturas y boletas). Las notas de despacho NO usan credito.
-- Un cliente con credito (Receptores.credito_limite, ver credito-clientes.sql) puede recibir facturas/boletas "al credito":
-- esas ventas no entran a la cuenta del grifero ni al total del cierre; aparecen aparte como "ventas al credito".
-- Saldo del cliente = credito_limite - ventas al credito (las notas de credito las restan) + abonos registrados por el administrador.
-- Ejecutar en AUXILIAR2 con un usuario con permisos de escritura, ANTES de desplegar el codigo. Requiere haber corrido
-- credito-clientes.sql (columna credito_limite). Es rapido: agrega columnas nulas (solo metadatos) y crea una tabla e indices pequenos.
USE AUXILIAR2;
SET QUOTED_IDENTIFIER ON;
GO

-- Marca de venta al credito (NULL/0 = venta normal)
IF COL_LENGTH('dbo.Comprobantes', 'es_credito') IS NULL
    ALTER TABLE dbo.Comprobantes ADD es_credito bit NULL;
GO

-- Foto del cierre de turno: lo vendido al credito en el turno
IF COL_LENGTH('dbo.Cierreturnosdetalle', 'credito_cantidad') IS NULL
    ALTER TABLE dbo.Cierreturnosdetalle ADD credito_cantidad decimal(12,3) NULL;
GO
IF COL_LENGTH('dbo.Cierreturnosdetalle', 'credito_soles') IS NULL
    ALTER TABLE dbo.Cierreturnosdetalle ADD credito_soles decimal(12,2) NULL;
GO

-- Pagos del cliente que liberan credito
IF OBJECT_ID('dbo.CreditoAbonos', 'U') IS NULL
    CREATE TABLE dbo.CreditoAbonos (
        id int IDENTITY(1,1) PRIMARY KEY,
        ReceptorId int NOT NULL,
        monto decimal(18,2) NOT NULL,
        fecha datetime NOT NULL CONSTRAINT DF_CreditoAbonos_fecha DEFAULT (GETDATE()),
        observacion nvarchar(200) NULL,
        UsuarioId int NULL
    );
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_CreditoAbonos_receptor' AND object_id = OBJECT_ID('dbo.CreditoAbonos'))
    CREATE NONCLUSTERED INDEX IX_CreditoAbonos_receptor ON dbo.CreditoAbonos (ReceptorId) INCLUDE (monto);
GO

-- Ventas al credito por cliente: es lo que consulta cada emision para calcular el saldo (indice pequeno, solo esas filas)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Comprobantes_credito' AND object_id = OBJECT_ID('dbo.Comprobantes'))
    CREATE NONCLUSTERED INDEX IX_Comprobantes_credito
        ON dbo.Comprobantes (ReceptorId)
        INCLUDE (total, tipo_comprobante)
        WHERE es_credito = 1;
GO

-- Ya no se usa (las notas de despacho no consumen credito)
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Comprobantes_despacho_pendiente' AND object_id = OBJECT_ID('dbo.Comprobantes'))
    DROP INDEX IX_Comprobantes_despacho_pendiente ON dbo.Comprobantes;
GO
