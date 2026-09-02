import { ICierreTurnoDetalle, ICierreTurnoSoles, IComprobanteAdmin, ICierreTurnoResponse, IProduct, IProductoStoreResponse } from '@/interfaces';
import sql, { ConnectionPool, ISqlTypeFactoryWithLength, ISqlTypeFactoryWithNoParams, Transaction } from 'mssql';
import { Constants } from './constants';
import { Session } from 'next-auth';
import { toLocaleStorage } from './formats';

    const config: sql.config = {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        server: process.env.DB_SERVER||"", // e.g., 'localhost\\SQLEXPRESS' or 'your-azure-sql-server.database.windows.net'
        database: "",
        options: {
            encrypt: false, // Use for Azure SQL Database or if you have SSL/TLS configured
            trustServerCertificate: false // Change to false in production with a valid certificate
        }
    };

    interface PaginationParams {
        page: number; // Current page number
        limit: number; // Items per page
    }

    export function getOffset(params: PaginationParams): number {
        return (params.page - 1) * params.limit;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export async function executeQuery<T>(database: string, query: string, params?: { name: string, value: any, type: ISqlTypeFactoryWithLength|ISqlTypeFactoryWithNoParams }[]): Promise<T> {
        try {
            config.database = database;
            const pool = await sql.connect(config);
            const request = pool.request();

            if (params) {
                params.forEach(p => {
                    request.input(p.name, p.type, p.value);
                });
            }
            const result = await request.query(query);
            return result.recordset as unknown as T;
        } catch (err) {
            console.error("Error fetching executeQuery:");
            console.error(JSON.stringify(err));
            throw err;
        }
    }

    export async function saveBillingTransaction(comprobante: IComprobanteAdmin): Promise<IComprobanteAdmin> {
        config.database = process.env.DB_DATABASE_AUXILIAR||"";
        try {
            const { 
                tipo_comprobante, fecha_emision, tipo_moneda, tipo_operacion, tipo_nota,
                tipo_documento_afectado, fecha_documento_afectado, numeracion_documento_afectado,
                motivo_documento_afectado, gravadas, igv, total, monto_letras, fecha_abastecimiento,
                id_abastecimiento, pistola, codigo_combustible, dec_combustible, volumen,
                inicio_medidor, fin_medidor, tiempo_abastecimiento, volumen_tanque,
                comentario, tarjeta, efectivo, yape, placa, billete, producto_precio, ruc, 
                enviado, estado_nota_despacho, comprobante_nota_despacho, fecha_facturado_nota_despacho,
                Receptor, UsuarioId, fecha_hora, impresion, IslaId
            } = comprobante;
            const pool: ConnectionPool = await sql.connect(config);
            const transaction: Transaction = new sql.Transaction(pool);
            await transaction.begin();

            try {
                    //Validar que el documento afectado no tenga ya una nota de credito vigente.
                    //Va dentro de la transaccion y antes de pedir correlativo para no consumir uno.
                    //Una NC con errors se considera no vigente: debe poder reemitirse.
                    if (tipo_comprobante === Constants.TIPO_COMPROBANTE.NOTA_CREDITO) {
                        //Sin documento afectado no se puede comprobar nada: se rechaza en vez
                        //de dejar pasar una NC que ademas quedaria huerfana
                        if (!numeracion_documento_afectado) {
                            throw new Error('La nota de crédito no indica a qué comprobante afecta');
                        }
                        const sqlNotaCreditoRequest = new sql.Request(transaction);
                        sqlNotaCreditoRequest.input('numeracion_documento_afectado', sql.NVarChar, numeracion_documento_afectado);
                        const notaPrevia = await sqlNotaCreditoRequest.query(`
                            SELECT TOP 1 numeracion_comprobante FROM Comprobantes
                            WHERE tipo_comprobante = '07'
                            AND numeracion_documento_afectado = @numeracion_documento_afectado
                            AND ISNULL(errors, '') = ''
                        `);
                        const numeracionPrevia = notaPrevia.recordset[0]?.numeracion_comprobante;
                        if (numeracionPrevia) {
                            throw new Error(`El comprobante ${numeracion_documento_afectado} ya tiene la nota de crédito ${numeracionPrevia}`);
                        }
                    }
                    //Obtiene prefijo
                    let prefijo: string = '';
                    if (tipo_comprobante === '07' && tipo_documento_afectado === '01') {
                        prefijo = 'FC';
                    } else if (tipo_comprobante === '07' && tipo_documento_afectado === '03') {    
                        prefijo = 'BC';
                    } else if (tipo_comprobante === '01') {
                        prefijo = 'F';
                    } else if (tipo_comprobante === '03') {
                        prefijo = 'B';
                    } else if (tipo_comprobante === '50') {
                        prefijo = 'N';                        
                    } else if (tipo_comprobante === '51') {
                        prefijo = 'C';
                    } else if (tipo_comprobante === '52') {
                        prefijo = 'I';                                                
                    }
                    //Obtener Serie
                    const sqlSerieRequest = new sql.Request(transaction);
                    sqlSerieRequest.input('tipo_comprobante', sql.NVarChar, tipo_comprobante);
                    sqlSerieRequest.input('tipo_facturacion', sql.NVarChar, 'FACTURAS_BOLETAS_NC_INTERNA');
                    const serie = await sqlSerieRequest.query(`SELECT serie from Series c where tipo_comprobante = @tipo_comprobante and codigo_proposito= @tipo_facturacion`);
                    
                    const serieId = serie.recordset[0]?.serie;
                    const sqlCorrelativoRequest = new sql.Request(transaction);
                    sqlCorrelativoRequest.input('idTipoDocumento', sql.NVarChar, tipo_comprobante);//07
                    sqlCorrelativoRequest.input('idSerie', sql.NVarChar, serieId);//001
                    sqlCorrelativoRequest.input('prefijo', sql.NVarChar, prefijo);//BC
                    sqlCorrelativoRequest.input('ruc', sql.NVarChar, ruc);
                    sqlCorrelativoRequest.output('correlativo', sql.NVarChar);
                    sqlCorrelativoRequest.output('resultado', sql.Char);
                    const correlativo = await sqlCorrelativoRequest.execute(`dbo.spCorrelativoObtener`);
                    
                    if (correlativo.output['resultado'].trim() !== Constants.STATE_SQL_TRANSACTION.SUCCESS) {
                        throw new Error('Error al obtener correlativo: ' + correlativo.output['resultado'].trim());
                    }
                    const numeracion_comprobante = correlativo.output['correlativo'];
                    comprobante.numeracion_comprobante = numeracion_comprobante;
                    //Obtener receptor
                    const sqlReceptorRequest = new sql.Request(transaction);
                    sqlReceptorRequest.input('numero', sql.NVarChar, Receptor.numero_documento);
                    sqlReceptorRequest.input('razon', sql.NVarChar, Receptor.razon_social);
                    sqlReceptorRequest.input('direccion', sql.NVarChar, Receptor.direccion);
                    sqlReceptorRequest.input('correo', sql.NVarChar, Receptor.correo);
                    sqlReceptorRequest.input('placa', sql.NVarChar, Receptor.placa);
                    sqlReceptorRequest.input('usuario', sql.Int, UsuarioId);
                    sqlReceptorRequest.output('resultado', sql.Int);
                    const receptor = await sqlReceptorRequest.execute(`dbo.spReceptorCrear`);
                    const id_receptor = receptor.output['resultado']
                    //Insertar comprobante
                    const sqlRequest = new sql.Request(transaction);
                    sqlRequest.input('tipo_comprobante', sql.NVarChar, tipo_comprobante);
                    sqlRequest.input('numeracion_comprobante', sql.NVarChar, numeracion_comprobante);
                    sqlRequest.input('fecha_emision', sql.NVarChar, fecha_emision);
                    sqlRequest.input('tipo_moneda', sql.NVarChar, tipo_moneda);
                    sqlRequest.input('tipo_operacion', sql.NVarChar, tipo_operacion);
                    sqlRequest.input('tipo_nota', sql.NVarChar, tipo_nota);
                    sqlRequest.input('tipo_documento_afectado', sql.NVarChar, tipo_documento_afectado);
                    sqlRequest.input('fecha_documento_afectado', sql.NVarChar, fecha_documento_afectado);
                    sqlRequest.input('numeracion_documento_afectado', sql.NVarChar, numeracion_documento_afectado);
                    sqlRequest.input('motivo_documento_afectado', sql.NVarChar, motivo_documento_afectado);
                    sqlRequest.input('gravadas', sql.Float, gravadas);
                    sqlRequest.input('igv', sql.Float, igv);
                    sqlRequest.input('total', sql.Float, total);
                    sqlRequest.input('monto_letras', sql.NVarChar, monto_letras);
                    sqlRequest.input('id_abastecimiento', sql.Int, id_abastecimiento);
                    sqlRequest.input('pistola', sql.Float, pistola);
                    sqlRequest.input('codigo_combustible', sql.NVarChar, codigo_combustible);
                    sqlRequest.input('dec_combustible', sql.NVarChar, dec_combustible);
                    sqlRequest.input('volumen', sql.Float, volumen);
                    sqlRequest.input('fecha_abastecimiento', sql.NVarChar,fecha_abastecimiento);
                    sqlRequest.input('inicio_medidor', sql.Float, inicio_medidor);
                    sqlRequest.input('fin_medidor', sql.Float, fin_medidor);
                    sqlRequest.input('tiempo_abastecimiento', sql.Int, tiempo_abastecimiento);
                    sqlRequest.input('volumen_tanque', sql.Float, volumen_tanque);
                    sqlRequest.input('comentario', sql.NVarChar, comentario);
                    sqlRequest.input('pago_tarjeta', sql.Float, tarjeta);
                    sqlRequest.input('pago_efectivo', sql.Float, efectivo);
                    sqlRequest.input('pago_yape', sql.Float, yape);
                    sqlRequest.input('placa', sql.NVarChar, placa);
                    sqlRequest.input('billete', sql.Float, billete);
                    sqlRequest.input('producto_precio', sql.Float, producto_precio);
                    sqlRequest.input('ruc', sql.NVarChar, ruc);
                    sqlRequest.input('enviado', sql.Bit, enviado);
                    //La columna es bit: enlazarla como NVarChar rompe si el valor no es null
                    sqlRequest.input('estado_nota_despacho', sql.Bit, estado_nota_despacho);
                    sqlRequest.input('comprobante_nota_despacho', sql.NVarChar, comprobante_nota_despacho);
                    sqlRequest.input('fecha_facturado_nota_despacho', sql.NVarChar, fecha_facturado_nota_despacho);
                    sqlRequest.input('ReceptorId', sql.Int, id_receptor);
                    sqlRequest.input('UsuarioId', sql.Int, UsuarioId);
                    sqlRequest.input('CierreTurnoId', sql.Int, null);
                    sqlRequest.input('fecha_hora', sql.NVarChar, fecha_hora);
                    sqlRequest.input('impresion', sql.Int, Receptor.numero_documento === '0'?1:impresion);
                    sqlRequest.input('IslaId', sql.Int, IslaId);

                    const query_insert = `INSERT INTO Comprobantes (
                            tipo_comprobante, numeracion_comprobante, fecha_emision, tipo_moneda, tipo_operacion, tipo_nota,
                            tipo_documento_afectado, fecha_documento_afectado, numeracion_documento_afectado,
                            motivo_documento_afectado, total_gravadas, total_igv, total_venta, monto_letras,
                            id_abastecimiento, pistola, codigo_combustible, dec_combustible, volumen,
                            fecha_abastecimiento, inicio_medidor, fin_medidor, tiempo_abastecimiento,
                            volumen_tanque, comentario, pago_tarjeta, pago_efectivo, pago_yape, 
                            placa, billete, producto_precio, ruc, enviado, 
                            estado_nota_despacho, comprobante_nota_despacho, fecha_facturado_nota_despacho, 
                            ReceptorId, UsuarioId, CierreTurnoId, fecha_hora, 
                            gravadas, igv, total, impresion, IslaId
                        ) VALUES (@tipo_comprobante, @numeracion_comprobante, @fecha_emision, @tipo_moneda, @tipo_operacion, @tipo_nota,
                            @tipo_documento_afectado, @fecha_documento_afectado, @numeracion_documento_afectado,
                            @motivo_documento_afectado, @gravadas, @igv, @total, @monto_letras,
                            @id_abastecimiento, @pistola, @codigo_combustible, @dec_combustible, @volumen,
                            @fecha_abastecimiento, @inicio_medidor, @fin_medidor, @tiempo_abastecimiento,
                            @volumen_tanque, @comentario, @pago_tarjeta, @pago_efectivo, @pago_yape,
                            @placa, @billete, @producto_precio, @ruc, @enviado, 
                            @estado_nota_despacho, @comprobante_nota_despacho, @fecha_facturado_nota_despacho,
                            @ReceptorId, @UsuarioId, @CierreTurnoId, @fecha_hora, 
                            @gravadas, @igv, @total, @impresion, @IslaId
                        ); SELECT SCOPE_IDENTITY() AS id;`
                    const result = await sqlRequest.query(query_insert);
                    const comprobanteId = result.recordset[0]?.id;
                    //Insertar items
                    for (const item of comprobante.items) {
                        const itemRequest = new sql.Request(transaction);
                        itemRequest.input('ComprobanteId', sql.Int, comprobanteId);
                        itemRequest.input('cantidad', sql.VarChar, item.cantidad);
                        itemRequest.input('valor_unitario', sql.NVarChar, item.valor_unitario);
                        itemRequest.input('precio_unitario',  sql.NVarChar, item.precio_unitario);
                        itemRequest.input('igv',  sql.NVarChar, item.igv);
                        itemRequest.input('descripcion', sql.NVarChar, item.descripcion);
                        itemRequest.input('codigo_producto', sql.NVarChar, item.codigo_producto);
                        itemRequest.input('medida', sql.NVarChar, item.medida);
                        itemRequest.input('valor_venta', sql.Float, item.valor_venta);
                        itemRequest.input('precio_venta', sql.Decimal(18,2), item.precio_venta);
                        itemRequest.input('valor', sql.Float, item.valor);
                        itemRequest.input('precio', sql.Float, item.precio);
                        itemRequest.input('igv_venta', sql.Float, item.igv_venta);
                        itemRequest.input('codigo', sql.Int, item.codigo);
                        itemRequest.input('cantidad_venta', sql.Float, item.cantidad_venta);
                        await itemRequest.query(`INSERT INTO Items (
                                ComprobanteId, cantidad, valor_unitario, precio_unitario, igv, descripcion,
                                codigo_producto, medida, valor_venta, precio_venta, valor, precio, igv_venta, codigo, cantidad_venta
                            ) VALUES (@ComprobanteId, @cantidad, @valor_unitario, @precio_unitario, @igv, @descripcion,
                                @codigo_producto, @medida, @valor_venta, @precio_venta, @valor, @precio, @igv_venta, @codigo, @cantidad_venta
                            );`);
                    }   
                    //Actualizar notas relacionadas
                    if(comprobante.notas && comprobante.notas.length > 0){

                        for (const notaId of comprobante.notas) {
                            const sqlRequestNotas = new sql.Request(transaction);
                            sqlRequestNotas.input('comprobante_nota_despacho', sql.NVarChar, numeracion_comprobante);
                            sqlRequestNotas.input('fecha_facturado_nota_despacho', sql.NVarChar, fecha_emision);
                            sqlRequestNotas.input('id_comprobante', sql.Int, notaId);
                            await sqlRequestNotas.query(`UPDATE Comprobantes SET estado_nota_despacho = 1, comprobante_nota_despacho = @comprobante_nota_despacho, fecha_facturado_nota_despacho = @fecha_facturado_nota_despacho WHERE id = @id_comprobante`);
                        }
                    }
                    //Actualizar abastecimientos
                    const sqlRequestAbatecimientos = new sql.Request(transaction);
                    sqlRequestAbatecimientos.input('idAbastecimiento', sql.Int, id_abastecimiento);
                    await sqlRequestAbatecimientos.query(`Update DEMOSQL.dbo.Abastecimientos set estado = 1 where idAbastecimiento = @idAbastecimiento`);
                await transaction.commit();
                return comprobante;
            } catch (err) {
                console.error("Error executing transaction:");
                console.error(JSON.stringify(err));
                await transaction.rollback();
                throw err;
            }
        } catch (error) {
            console.error("Error executing transaction:");
            console.error(JSON.stringify(error));
            throw error;
        }
    }

    export async function getComprobantePdfBytes(id: number): Promise<Buffer | null> {
        config.database = process.env.DB_DATABASE_AUXILIAR || "";
        const pool = await sql.connect(config);
        const request = pool.request();
        request.input('id', sql.Int, id);
        const result = await request.query(`SELECT pdf_bytes FROM Comprobantes WHERE id = @id`);
        const bytes = result.recordset[0]?.pdf_bytes;
        return bytes ? Buffer.from(bytes) : null;
    }

    export async function saveComprobantePdfBytes(id: number, pdfBytes: Buffer): Promise<void> {
        config.database = process.env.DB_DATABASE_AUXILIAR || "";
        const pool = await sql.connect(config);
        const request = pool.request();
        request.input('id', sql.Int, id);
        request.input('pdf_bytes', sql.VarBinary(sql.MAX), pdfBytes);
        await request.query(`UPDATE Comprobantes SET pdf_bytes = @pdf_bytes WHERE id = @id`);
    }

    export async function saveCierreTurnoTransaction(session: Session|null, total: number, soles: ICierreTurnoSoles, productos: ICierreTurnoDetalle[]): Promise<ICierreTurnoResponse>{
        config.database = process.env.DB_DATABASE_AUXILIAR||"";
        const pool: ConnectionPool = await sql.connect(config);
        try {
            
            const transaction: Transaction = new sql.Transaction(pool);
            try {
                const usuarioId = +(session?.user.id || 0);
                const turno = session?.user.jornada || "";
                const isla = session?.user.isla || "";
                const fecha_inicio = session?.user.fecha_registro || "";
                await transaction.begin();

                //Los totales llegan del navegador, calculados al abrir la pantalla. Si entraron
                //ventas despues, quedarian fuera del cierre aunque el barrido de mas abajo si las
                //marca. Se recalcula aqui con el MISMO criterio que usa ese barrido
                //(CierreturnoId IS NULL) para que ambos correspondan al mismo instante.
                const reqProductos = new sql.Request(transaction);
                const productosActuales = (await reqProductos.query(`
                    select i.descripcion as producto, i.medida as medida, i.codigo_producto as codigo,
                    sum(CASE when tipo_comprobante in ('01','03','52') then i.cantidad_venta else 0 END) as total_cantidad,
                    sum(CASE when tipo_comprobante = '50' then i.cantidad_venta else 0 END) as despacho_cantidad,
                    sum(CASE when tipo_comprobante = '51' then i.cantidad_venta else 0 END) as calibracion_cantidad,
                    sum(CASE when tipo_comprobante in ('01','03','52') then i.precio_venta else 0 END) as total_soles,
                    sum(CASE when tipo_comprobante = '50' then i.precio_venta else 0 END) as despacho_soles,
                    sum(CASE when tipo_comprobante = '51' then i.precio_venta else 0 END) as calibracion_soles
                    from Comprobantes c
                    inner join Items i on c.id = i.ComprobanteId
                    where CierreturnoId is null and UsuarioId = ${usuarioId}
                    group by i.descripcion, i.medida, i.codigo_producto;
                `)).recordset as ICierreTurnoDetalle[];

                const reqSoles = new sql.Request(transaction);
                const solesActuales = (await reqSoles.query(`
                    select ISNULL(sum(pago_efectivo),0) as efectivo,
                           ISNULL(sum(pago_tarjeta),0) as tarjeta,
                           ISNULL(sum(pago_yape),0) as yape
                    from Comprobantes
                    where CierreturnoId is null and tipo_comprobante in ('01','03','52') and UsuarioId = ${usuarioId};
                `)).recordset[0] as ICierreTurnoSoles;

                const totalActual = solesActuales.efectivo + solesActuales.tarjeta + solesActuales.yape;

                //No se guarda en silencio una cifra distinta a la que vio el despachador: el
                //voucher saldria con un monto que nunca tuvo en pantalla.
                if (Math.abs(totalActual - total) > 0.01) {
                    throw new Error(
                        `Ingresaron ventas nuevas mientras la pantalla estaba abierta. ` +
                        `La pantalla muestra S/ ${total.toFixed(2)} y el sistema tiene S/ ${totalActual.toFixed(2)}. ` +
                        `Actualiza la pantalla y vuelve a cerrar el turno.`
                    );
                }

                //Insertar cierre
                const sqlRequest = new sql.Request(transaction);
                sqlRequest.input('total', sql.Float, totalActual);
                sqlRequest.input('fecha', sql.NVarChar, toLocaleStorage(new Date()));
                sqlRequest.input('fecha_inicio', sql.NVarChar, fecha_inicio);
                sqlRequest.input('turno', sql.NVarChar, turno);
                sqlRequest.input('isla', sql.NVarChar, isla);
                sqlRequest.input('efectivo', sql.Float, solesActuales.efectivo);
                sqlRequest.input('tarjeta', sql.Float, solesActuales.tarjeta);
                sqlRequest.input('yape', sql.Float, solesActuales.yape);
                sqlRequest.input('UsuarioId', sql.Int, usuarioId);
                
                

                const result = await sqlRequest.query(`INSERT INTO Cierreturnos (
                    total, fecha, fecha_inicio, turno, isla, efectivo, tarjeta, yape, UsuarioId
                ) VALUES ( 
                    @total, @fecha, @fecha_inicio, @turno, @isla, @efectivo, @tarjeta, @yape, @UsuarioId
                ); SELECT SCOPE_IDENTITY() AS id;`);
                
                const cierreturnoId = result.recordset[0]?.id;

                //Insertar detalle cierre
                const products_insert = productosActuales.map(n => `(${cierreturnoId},${Object.values(n).map(v => `'${v}'`).join(", ")})`).join(', ')

                

                const sqlRequestCierreDetalle = new sql.Request(transaction);
                const query_detalle = `INSERT INTO Cierreturnosdetalle (
                    CierreturnoId,producto,medida,codigo,total_cantidad,despacho_cantidad,calibracion_cantidad,total_soles,despacho_soles, calibracion_soles  
                ) VALUES ${products_insert}`

                await sqlRequestCierreDetalle.query(query_detalle);

                //Actualizar abastecimientos
                const sqlRequestComprobantes = new sql.Request(transaction);
                sqlRequestComprobantes.input('CierreturnoId', sql.Int, cierreturnoId);
                sqlRequestComprobantes.input('UsuarioId', sql.Int, usuarioId);
                await sqlRequestComprobantes.query(`Update Comprobantes set CierreturnoId = @CierreturnoId where UsuarioId = @UsuarioId and CierreturnoId is null`);

                //Actualizar gastos
                const sqlRequestGastos = new sql.Request(transaction);
                sqlRequestGastos.input('CierreturnoId', sql.Int, cierreturnoId);
                sqlRequestGastos.input('UsuarioId', sql.Int, usuarioId);
                await sqlRequestGastos.query(`Update Gastos set CierreturnoId = @CierreturnoId where UsuarioId = @UsuarioId and CierreturnoId is null`);

                //Actualizar gastos
                const sqlRequestDepositos = new sql.Request(transaction);
                sqlRequestDepositos.input('CierreturnoId', sql.Int, cierreturnoId);
                sqlRequestDepositos.input('UsuarioId', sql.Int, usuarioId);
                await sqlRequestDepositos.query(`Update Depositos set CierreturnoId = @CierreturnoId where UsuarioId = @UsuarioId and CierreturnoId is null`);


                // Cierra TODAS las sesiones abiertas del usuario, sin filtrar por jornada:
                // las de otras jornadas nunca serían cerradas por ningún cierre y se acumulan
                const sqlRequestLogins = new sql.Request(transaction);
                sqlRequestLogins.input('UsuarioId', sql.Int, usuarioId);
                sqlRequestLogins.input('fecha_fin', sql.NVarChar, toLocaleStorage(new Date()));
                await sqlRequestLogins.query(`Update Logins set fecha_fin = @fecha_fin where UsuarioId = @UsuarioId and fecha_fin is null`);

                await transaction.commit();

                return {
                    message: "Cierre realizado correctamente",
                    status: true,                    
                }
            }catch(error){
                console.error("Error executing transaction: saveCierreTurnoTransaction");
                console.error(JSON.stringify(error));
                await transaction.rollback();
                return {
                    message: `Error al cerrar turno | ${JSON.stringify(error)}`,
                    status: false,                    
                }
            }            
        } catch (error) {
            console.error("Pool connection error:", error);
            return {
                message: `Error al cerrar turno | ${JSON.stringify(error)}`,
                status: false,                    
            }            
        } finally {
            if (pool) await pool.close();
        }
    }

    export async function saveCierreDiaTransaction(session: Session|null, total: number): Promise<ICierreTurnoResponse>{
        config.database = process.env.DB_DATABASE_AUXILIAR||"";
        try {
            const pool: ConnectionPool = await sql.connect(config);
            const transaction: Transaction = new sql.Transaction(pool);
            const isla = session?.user.isla || "";

            await transaction.begin();
            try {
                //El total llega del navegador, calculado al abrir la pantalla. Si un despachador
                //cierra turno despues, ese turno igual entra por el barrido de mas abajo
                //(CierrediaId IS NULL) y la cabecera queda por debajo de su propio detalle.
                //Se recalcula aqui con el MISMO criterio del barrido para contrastarlo con lo
                //que el administrador tiene a la vista.
                const reqPendiente = new sql.Request(transaction);
                const pendiente = Number((await reqPendiente.query(`
                    select ISNULL(sum(total), 0) as total from Cierreturnos where CierrediaId is null
                `)).recordset[0]?.total || 0);

                //No se cierra en silencio con una cifra que el administrador nunca vio: contra el
                //voucher impreso se cuadra el efectivo del dia.
                //Se compara en centavos enteros: en punto flotante una diferencia de
                //exactamente un centavo da 0.010000000000218 y disparaba el bloqueo de mas.
                if (Math.abs(Math.round(pendiente * 100) - Math.round(Number(total || 0) * 100)) > 1) {
                    throw new Error(`El total cambio mientras estabas en la pantalla: mostraba ${Number(total || 0).toFixed(2)} y ahora hay ${pendiente.toFixed(2)}. Actualiza la pantalla y vuelve a cerrar el dia.`);
                }

                //La cabecera entra en 0 y se completa despues del barrido: asi el total se deriva
                //de los turnos que realmente quedaron enganchados y no puede descuadrar contra su
                //detalle ni aunque entre un turno entre la validacion y el barrido.
                const sqlRequest = new sql.Request(transaction);
                sqlRequest.input('isla', sql.NVarChar, isla);

                const result = await sqlRequest.query(`INSERT INTO Cierredias (
                    total, fecha, isla, estado
                ) VALUES ( 
                    0, GETDATE(), @isla, 1
                ); SELECT SCOPE_IDENTITY() AS id;`);

                const cierrediaId = result.recordset[0]?.id;

                //Actualizar cierre turnos
                const sqlRequestComprobantes = new sql.Request(transaction);
                sqlRequestComprobantes.input('CierrediaId', sql.Int, cierrediaId);
                await sqlRequestComprobantes.query(`Update Cierreturnos set CierrediaId = @CierrediaId where CierrediaId is null`);

                const sqlRequestTotal = new sql.Request(transaction);
                sqlRequestTotal.input('CierrediaId', sql.Int, cierrediaId);
                await sqlRequestTotal.query(`Update Cierredias set total = (select ISNULL(sum(total), 0) from Cierreturnos where CierrediaId = @CierrediaId) where id = @CierrediaId`);

                await transaction.commit();
                return {
                    message: "Cierre de dia realizado correctamente",
                    status: true,                    
                }            
            }catch(error){
                console.error("Error executing transaction: saveCierreDiaTransaction");
                console.error(error);
                //Sin el rollback la transaccion queda abierta reteniendo bloqueos sobre Cierreturnos
                await transaction.rollback();
                return {
                    message: `Error al cerrar dia | ${error instanceof Error ? error.message : JSON.stringify(error)}`,
                    status: false,                    
                }
            }
        }catch(error){
            console.error("Pool connection error:", error);
            return {
                message: `Error al cerrar dia | ${error instanceof Error ? error.message : JSON.stringify(error)}`,
                status: false,                    
            }
        }
    }    

    export async function saveProductoTransaction({ id, medida, nombre, descripcion, precio, img, tipo, codigosBarras }: IProduct): Promise<IProductoStoreResponse> {
    let message = `Ocurrió un error al registrar producto`;
    config.database = process.env.DB_DATABASE_AUXILIAR || "";
    let result: sql.IResult<any>;
    let productoId: number | null = null;
    let query = '';
    
    const pool: ConnectionPool = await sql.connect(config);
    const transaction: Transaction = new sql.Transaction(pool);        
    
    try {
        await transaction.begin();
        const sqlRequest = new sql.Request(transaction);
        sqlRequest.input('medida', sql.NVarChar, medida);
        sqlRequest.input('nombre', sql.NVarChar, nombre);
        sqlRequest.input('descripcion', sql.NVarChar, descripcion);
        sqlRequest.input('precio', sql.Float, precio);
        // Si el img viene undefined o null, asegúrate de enviar null a la DB
        sqlRequest.input('img', sql.NVarChar, img || null); 
        sqlRequest.input('tipo', sql.NVarChar, tipo);

        if (id && id !== 0) { // Validamos que exista un ID real de actualización
            sqlRequest.input('id', sql.Int, id); // Cambiado a sql.Int (los IDs suelen ser enteros, no Float)
            productoId = id;
            query = `UPDATE Productos set nombre = @nombre, descripcion = @descripcion, medida = @medida, precio = @precio, img = @img, tipo = @tipo where id = @id`;
            await sqlRequest.query(query);
        } else {
            // SOLUCIÓN: Agregamos OUTPUT INSERTED.id para poder leer el ID generado
            query = `INSERT into Productos (nombre, descripcion, medida, precio, img, tipo) 
                     OUTPUT INSERTED.id 
                     values (@nombre, @descripcion, @medida, @precio, @img, @tipo)`;
            
            result = await sqlRequest.query(query);
            // Ahora sí el recordset tendrá la propiedad id disponible
            productoId = result.recordset[0]?.id;
        }

        if (!productoId) {
            throw new Error("No se pudo obtener o asignar el ID del producto.");
        }
 
        for (const codigo of codigosBarras || []) {
            const sqlRequestCodigo = new sql.Request(transaction);
            sqlRequestCodigo.input('codigo_barras', sql.NVarChar, codigo.codigo_barras);
            sqlRequestCodigo.input('estado', sql.Int, codigo.estado);
            sqlRequestCodigo.input('ProductoId', sql.Int, productoId);
            
            let queryCodigo = '';
            if (codigo.id) {
                sqlRequestCodigo.input('id', sql.Int, codigo.id);
                queryCodigo = `UPDATE CodigosBarras set codigo_barras = @codigo_barras, estado = @estado, ProductoId = @ProductoId where id = @id`;
            } else {
                queryCodigo = `INSERT INTO CodigosBarras (codigo_barras, estado, ProductoId) VALUES (@codigo_barras, @estado, @ProductoId)`;
            }
            
            await sqlRequestCodigo.query(queryCodigo);
        }

        message = `Producto almacenado correctamente`;
        await transaction.commit();
        
        return {
            message,
            status: true,
            producto: null
        };            
    } catch (error: any) { // Cambiamos a 'any' temporalmente para acceder a las propiedades de mssql
        console.log("Error executing transaction: saveProductoTransaction");
        console.error(error);
        
        // Intentamos hacer rollback de forma segura
        if (transaction) {
            try { await transaction.rollback(); } catch(e) { console.error("Error en rollback", e); }
        }

        // 1. CAPTURA DEL ERROR ESPECÍFICO DE DUPLICADO
        // El número 2601 corresponde a "Infracción de la restricción UNIQUE INDEX"
        // El número 2627 corresponde a "Infracción de la restricción PRIMARY KEY / UNIQUE"
        if (error.number === 2601 || error.number === 2627) {
            // Intentamos extraer el valor duplicado del mensaje original usando una expresión regular
            const match = error.message.match(/\(([^)]+)\)/);
            const valorDuplicado = match ? match[1] : '';
            
            message = `El código de barras ${valorDuplicado ? `'${valorDuplicado}' ` : ''}ya está registrado en otro producto.`;
        } else {
            message = `${message} | ${error.message || JSON.stringify(error)}`;
        }
        
        return {
            message,
            status: false,
            producto: null
        };   
    }
}