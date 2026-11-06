-- Solicitudes de corrección de comprobantes (el grifero propone, el administrador aprueba).
-- Ejecutar UNA vez en la base AUXILIAR2 de CADA estación, ANTES de desplegar el código nuevo.
-- Es seguro repetirlo: si la tabla ya existe, no hace nada. Compatible con SQL Server 2012.
-- No modifica ninguna tabla existente (Comprobantes queda intacta, incluidos enviado/errors/url).

USE AUXILIAR2;
GO

IF OBJECT_ID('dbo.SolicitudesCorreccion', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.SolicitudesCorreccion (
        id                      INT IDENTITY(1,1) NOT NULL,

        -- Comprobante original: no se modifica, solo se referencia
        ComprobanteId           INT           NOT NULL,
        numeracion_comprobante  NVARCHAR(20)  NOT NULL,

        -- Datos propuestos por el grifero
        tipo_documento          NVARCHAR(5)   NOT NULL,   -- '1' = DNI, '6' = RUC (catálogo 06 de SUNAT)
        numero_documento        NVARCHAR(20)  NOT NULL,
        razon_social            NVARCHAR(250) NOT NULL,
        direccion               NVARCHAR(250) NULL,
        placa                   NVARCHAR(10)  NULL,
        celular                 NVARCHAR(20)  NULL,
        pago_efectivo           DECIMAL(18,2) NOT NULL CONSTRAINT DF_SolCorr_efectivo DEFAULT 0,
        pago_tarjeta            DECIMAL(18,2) NOT NULL CONSTRAINT DF_SolCorr_tarjeta  DEFAULT 0,
        pago_yape               DECIMAL(18,2) NOT NULL CONSTRAINT DF_SolCorr_yape     DEFAULT 0,
        observaciones           NVARCHAR(500) NOT NULL,   -- razón del cambio

        -- Quién y cuándo lo solicitó
        UsuarioId               INT           NOT NULL,
        IslaId                  INT           NOT NULL,
        fecha_solicitud         DATETIME      NOT NULL CONSTRAINT DF_SolCorr_fecha DEFAULT GETDATE(),

        -- Estado y resolución del administrador
        estado                  NVARCHAR(12)  NOT NULL CONSTRAINT DF_SolCorr_estado DEFAULT 'PENDIENTE',
        AdministradorId         INT           NULL,
        fecha_resolucion        DATETIME      NULL,
        motivo_rechazo          NVARCHAR(300) NULL,

        -- Comprobantes que generó la aprobación (permiten retomar si falla a la mitad)
        nc_numeracion           NVARCHAR(20)  NULL,       -- nota de crédito por anulación
        nuevo_numeracion        NVARCHAR(20)  NULL,       -- comprobante nuevo

        CONSTRAINT PK_SolicitudesCorreccion PRIMARY KEY (id),
        CONSTRAINT CK_SolCorr_estado CHECK (estado IN ('PENDIENTE', 'APROBADA', 'RECHAZADA'))
    );

    -- Un comprobante solo puede tener una solicitud de corrección
    CREATE UNIQUE INDEX UX_SolicitudesCorreccion_Comprobante ON dbo.SolicitudesCorreccion (ComprobanteId);
    CREATE INDEX IX_SolicitudesCorreccion_Estado ON dbo.SolicitudesCorreccion (estado);
END
GO

-- Comprobación: debe devolver 0 filas la primera vez y la tabla ya creada
SELECT COUNT(*) AS solicitudes FROM dbo.SolicitudesCorreccion;
GO
