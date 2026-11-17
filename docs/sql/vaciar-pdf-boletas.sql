-- Vacia pdf_bytes de las BOLETAS (tipo 03). Las boletas se generan a demanda al abrir el PDF, asi que no hace falta
-- guardarlas. NO toca facturas (01) ni notas de credito (07): esas las sube el facturador.
-- Ejecutar en AUXILIAR2 con un usuario con permisos de escritura (sqlcmd: usar -I).
--
-- Pasos: 1) dejar @ejecutar = 0 y correr: solo MIDE cuantas boletas tienen PDF y cuantos MB ocupan (no cambia nada).
--        2) poner @ejecutar = 1 y correr: vacia por tandas (recorre la tabla por rangos de id, sin escanearla entera).
-- El espacio liberado queda libre DENTRO del archivo (la base no se achica), y eso es lo que cuenta para el limite de 10 GB.
-- Se puede interrumpir y volver a correr: solo toca las filas que aun tienen pdf_bytes.
-- Si el modelo de recuperacion es FULL, el log crece mientras corre; hacer un respaldo del log al terminar.
USE AUXILIAR2;
SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;

DECLARE @ejecutar bit = 0;          -- 0 = solo medir, 1 = vaciar
DECLARE @tanda int = 2000;          -- ids por tanda
DECLARE @desde int = (SELECT MIN(id) FROM Comprobantes);
DECLARE @max int = (SELECT MAX(id) FROM Comprobantes);
DECLARE @hasta int, @n int, @filas bigint = 0, @mb decimal(18,1) = 0, @mb_tanda decimal(18,1);

WHILE @desde <= @max
BEGIN
    SET @hasta = @desde + @tanda - 1;

    IF @ejecutar = 1
    BEGIN
        UPDATE Comprobantes SET pdf_bytes = NULL
        WHERE id BETWEEN @desde AND @hasta AND tipo_comprobante = '03' AND pdf_bytes IS NOT NULL;
        SET @n = @@ROWCOUNT;
        SET @filas += @n;
        IF @n > 0 WAITFOR DELAY '00:00:01';   -- da respiro a las ventas en curso
    END
    ELSE
    BEGIN
        SELECT @n = COUNT(*), @mb_tanda = ISNULL(SUM(DATALENGTH(pdf_bytes)), 0) / 1048576.0
        FROM Comprobantes
        WHERE id BETWEEN @desde AND @hasta AND tipo_comprobante = '03' AND pdf_bytes IS NOT NULL;
        SET @filas += @n;
        SET @mb += @mb_tanda;
    END

    SET @desde = @hasta + 1;
END

IF @ejecutar = 1
    PRINT 'Boletas vaciadas: ' + CAST(@filas AS varchar(20));
ELSE
    PRINT 'Solo medicion. Boletas con PDF: ' + CAST(@filas AS varchar(20)) + ', ocupan ' + CAST(@mb AS varchar(30)) + ' MB';
