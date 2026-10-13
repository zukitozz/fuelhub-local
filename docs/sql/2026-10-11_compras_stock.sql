-- Módulo de Compras/Stock
-- stock pasa a numérico real (hoy es nvarchar, siempre "0", sin uso)

-- La columna tiene un default constraint autogenerado (DF__Productos__stock__...);
-- hay que soltarlo antes del ALTER COLUMN o SQL Server lo rechaza (error 5074/4922).
-- Se busca por nombre real en vez de hardcodear el sufijo, que varía por entorno.
DECLARE @constraintName NVARCHAR(200);
SELECT @constraintName = dc.name
FROM sys.default_constraints dc
INNER JOIN sys.columns c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
WHERE dc.parent_object_id = OBJECT_ID('Productos') AND c.name = 'stock';
IF @constraintName IS NOT NULL
    EXEC('ALTER TABLE Productos DROP CONSTRAINT [' + @constraintName + ']');

ALTER TABLE Productos ALTER COLUMN stock FLOAT NULL;
UPDATE Productos SET stock = 0 WHERE stock IS NULL;
ALTER TABLE Productos ADD CONSTRAINT DF_Productos_stock DEFAULT 0 FOR stock;

-- Compras (cabecera) y detalle de líneas
CREATE TABLE Compras (
    id INT IDENTITY PRIMARY KEY,
    fecha NVARCHAR(50) NOT NULL,
    numero_comprobante NVARCHAR(50) NULL,
    proveedor NVARCHAR(200) NOT NULL,
    total FLOAT NOT NULL,
    UsuarioId INT NOT NULL,
    fecha_registro NVARCHAR(50) NOT NULL
);

CREATE TABLE ComprasDetalle (
    id INT IDENTITY PRIMARY KEY,
    CompraId INT NOT NULL FOREIGN KEY REFERENCES Compras(id),
    ProductoId INT NOT NULL FOREIGN KEY REFERENCES Productos(id),
    cantidad FLOAT NOT NULL,
    costo_unitario FLOAT NOT NULL,
    subtotal FLOAT NOT NULL
);
