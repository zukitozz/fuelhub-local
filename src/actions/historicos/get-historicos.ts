'use server';
import { IComprobanteAdminItem, IComprobanteHistorico, IReceptor } from '@/interfaces';
import { executeQuery } from '@/utils/db';

interface TableResponseProductsProps {
  historicos: IComprobanteHistorico[];
  pageNumbers: number[];
}

export async function getHistoricos(page: number, perPage: number, fecha: string, numeracionComprobante?: string): Promise<TableResponseProductsProps> {
    const start = (page * perPage) - (perPage - 1);
    const end = (page * perPage);

    let filtroNumeracion = "";
    if (numeracionComprobante && numeracionComprobante.trim() !== "") {
        filtroNumeracion = ` AND c.numeracion_comprobante = '${numeracionComprobante.trim()}' or r.numero_documento = '${numeracionComprobante.trim()}'`;
    }

    try {
        const query = `select * from (SELECT 
                        c.id, CASE c.tipo_comprobante WHEN '01' THEN 'FACTURA ELECTRÓNICA' WHEN '03' THEN 'BOLETA ELECTRÓNICA' WHEN '07' THEN 'NOTA DE CREDITO' WHEN '08' THEN 'NOTA DE DEBITO' WHEN '50' THEN 'NOTA DE DESPACHO' WHEN '51' THEN 'CALIBRACION' ELSE 'INTERNO' END as tipo_comprobante,
                        c.numeracion_comprobante,c.fecha_emision,c.tipo_moneda,c.tipo_operacion,c.tipo_nota,c.tipo_documento_afectado,c.fecha_documento_afectado,c.numeracion_documento_afectado,c.motivo_documento_afectado,c.total_gravadas,c.total_igv,c.total_venta,c.monto_letras,c.cadena_para_codigo_qr,c.codigo_hash,c.url,c.errors,CASE WHEN c.pdf_bytes IS NOT NULL THEN 1 ELSE 0 END as pdf_bytes,c.id_abastecimiento,c.pistola,c.codigo_combustible,c.dec_combustible,c.volumen,c.fecha_abastecimiento,c.tiempo_abastecimiento,c.volumen_tanque,c.comentario,c.pago_tarjeta,c.pago_efectivo,c.pago_yape,c.placa,c.billete,c.producto_precio,c.ruc,c.enviado,c.estado_nota_despacho,c.comprobante_nota_despacho,c.fecha_facturado_nota_despacho,c.ReceptorId,c.UsuarioId,c.CierreturnoId,c.fecha_hora,c.gravadas,c.igv,c.total,c.inicio_medidor,c.fin_medidor,c.xml_envio,t.turno, t.isla, u.nombre as usuario,
                        ROW_NUMBER() OVER (ORDER BY c.fecha_hora DESC) AS RowNum 
                        FROM Comprobantes c
                        LEFT JOIN Cierreturnos t on c.CierreturnoId = t.id 
                        INNER JOIN Usuarios u on c.UsuarioId = u.id 
                        INNER JOIN Receptores r on c.ReceptorId = r.id 
                        WHERE CAST(c.fecha_emision AS DATE) = '${fecha}' ${filtroNumeracion}
                        ) as Result WHERE RowNum BETWEEN ${start} AND ${end} order by fecha_hora desc;`

        const historicos = await executeQuery<IComprobanteHistorico[]>(
            process.env.DB_DATABASE_AUXILIAR||"", 
            query
        );        

        const total = await executeQuery<[]>(
            process.env.DB_DATABASE_AUXILIAR||"", 
            `SELECT c.id FROM Comprobantes c LEFT JOIN Cierreturnos t on c.CierreturnoId = t.id INNER JOIN Usuarios u on c.UsuarioId = u.id WHERE CAST(c.fecha_emision AS DATE) = '${fecha}'`
        );
                
        const pageNumbers = [];
        for (let i = 1; i <= Math.ceil(total.length / perPage); i++) {
            pageNumbers.push(i);
        }

    await Promise.all(
        historicos.map(async historico => {
            const detalle = await executeQuery<IComprobanteAdminItem[]>(
                process.env.DB_DATABASE_AUXILIAR||"", 
                `
                    select id,cantidad,valor_unitario,precio_unitario,igv,descripcion,codigo_producto,placa,medida,total_unitario,dec_cantidad,dec_sub_total,dec_total,dec_igv,valor_venta,precio_venta,valor,precio,igv_venta,codigo,cantidad_venta 
                    from Items 
                    where ComprobanteId = ${historico.id};
                `
            );
            historico.items = detalle;
            const receptor = await executeQuery<IReceptor[]>(
                process.env.DB_DATABASE_AUXILIAR||"", 
                `
                    select id,numero_documento,tipo_documento,razon_social,direccion,correo,placa 
                    from Receptores
                    where id = ${historico.ReceptorId};
                `
            );            
            historico.Receptor = receptor[0];
            return historico;
    }))        

        return {
            historicos : historicos as IComprobanteHistorico[],
            pageNumbers
        }
    } catch (error) {
        console.error("Error fetching getHistoricos:");
        console.error(JSON.stringify(error));
        throw error;
    }
}

export async function getHistoricoById(id: number): Promise<IComprobanteHistorico> {
    try {
        const data = await executeQuery<IComprobanteHistorico[]>(
            process.env.DB_DATABASE_AUXILIAR||"", 
            `SELECT * FROM Comprobantes WHERE id = ${id}`
        );

        const historico: IComprobanteHistorico = data[0];

        const detalle = await executeQuery<IComprobanteAdminItem[]>(
            process.env.DB_DATABASE_AUXILIAR||"", 
            `
                select id,cantidad,valor_unitario,precio_unitario,igv,descripcion,codigo_producto,placa,medida,total_unitario,dec_cantidad,dec_sub_total,dec_total,dec_igv,valor_venta,precio_venta,valor,precio,igv_venta,codigo,cantidad_venta 
                from Items 
                where ComprobanteId = ${historico.id};
            `
        );
        historico.items = detalle;
        const receptor = await executeQuery<IReceptor[]>(
            process.env.DB_DATABASE_AUXILIAR||"", 
            `
                select id,numero_documento,tipo_documento,razon_social,direccion,correo,placa 
                from Receptores
                where id = ${historico.ReceptorId};
            `
        );
        historico.Receptor = receptor[0];

        return historico;
    } catch (error) {
        console.error("Error fetching getHistoricoById:");
        console.error(JSON.stringify(error));
        throw error;
    }
}