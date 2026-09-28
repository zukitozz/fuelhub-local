"use server";
import { IComprobanteAdmin, IComprobanteAdminItem, IComprobantePDF, IComprobantePDFItem, IReceptor } from "@/interfaces";
import { Constants } from "@/utils/constants";
import { executeQuery } from '@/utils/db';

export async function obtieneNotasDespacho(): Promise<IComprobanteAdmin[]> {
    const comprobantes = await executeQuery<IComprobanteAdmin[]>(
        process.env.DB_DATABASE_AUXILIAR||"", 
        `
            select *   
            from Comprobantes 
            where tipo_comprobante = ${Constants.TIPO_COMPROBANTE.NOTA_DESPACHO} and estado_nota_despacho is null;
        `
    );
    await Promise.all(
        comprobantes.map(async comprobante => {
            const items = await executeQuery<IComprobanteAdminItem[]>(
                process.env.DB_DATABASE_AUXILIAR||"", 
                `
                    select * 
                    from Items 
                    where ComprobanteId = ${comprobante.id};
                `
            );
            comprobante.items = items;
            const receptor = await executeQuery<IReceptor[]>(
                process.env.DB_DATABASE_AUXILIAR||"", 
                `
                    select * 
                    from Receptores 
                    where id = ${comprobante.ReceptorId};
                `
            );
            comprobante.Receptor = receptor[0];
            return comprobante;
        })
    )
 
    return comprobantes;
}

export async function obtieneComprobantePDF(id: number): Promise<IComprobantePDF> {
    const query = `
        SELECT 
            CASE c.tipo_comprobante WHEN '01' THEN 'FACTURA ELECTRÓNICA' WHEN '03' THEN 'BOLETA ELECTRÓNICA' WHEN '07' THEN 'NOTA DE CREDITO' WHEN '08' THEN 'NOTA DE DEBITO' WHEN '50' THEN 'NOTA DE DESPACHO' WHEN '51' THEN 'CALIBRACION' ELSE 'INTERNO' END as TipoComprobante, 
            c.id, r.razon_social as ReceptorRazonSocial, r.numero_documento as ReceptorRuc, r.direccion as ReceptorDireccion,
            c.fecha_emision as FechaEmision, '' as FechaVencimiento, '' as NumeroOrdenCompra, '' as NumeroGuiaRemision, 
            'CONTADO' as CondicionPago, c.monto_letras as MontoLetras, c.total as TotalVenta, c.gravadas as TotalGravadas, c.igv as TotalIgv,
            c.pistola as Pistola, i.nombre as Isla, c.placa as Placa, inicio_medidor as InicioMedidor, fin_medidor as FinMedidor,
            c.pago_efectivo as Efectivo, c.pago_tarjeta as Tarjeta, c.pago_yape as Yape, c.codigo_hash as CodigoHash, 
            c.numeracion_comprobante as NumeracionComprobante,
            c.tipo_comprobante as TipoComprobanteCodigo,
            c.numeracion_documento_afectado as NumeracionDocumentoAfectado, c.fecha_documento_afectado as FechaDocumentoAfectado 
        FROM Comprobantes c 
        INNER JOIN Receptores r on c.ReceptorId = r.id 
        left join Islas i on c.IslaId = i.id 
        WHERE c.id = ${id};
    `;
    const query_detalle = `
        SELECT 
            codigo_producto as codigo, cantidad_venta as cantidad, medida, 
            descripcion, precio as precio_unitario, precio_venta as total_unitario 
        from Items 
        where ComprobanteId = ${id};
    `;    
    const db = process.env.DB_DATABASE_AUXILIAR || "";
    try {
        const comprobante = await executeQuery<IComprobantePDF[]>(db, query);
        const detalle = await executeQuery<IComprobantePDFItem[]>(db, query_detalle);
        comprobante[0].Items = detalle;
        return comprobante[0];
    } catch (error) {
        console.error("Error fetching obtieneComprobantePdf:");
        console.error(JSON.stringify(error));
        throw error;
    }

}