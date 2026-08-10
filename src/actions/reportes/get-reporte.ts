"use server";
import { executeQuery } from '@/utils/db';
import { IReporteCierreDiario, IReporteCierreDiarioConteo, IReporteCierreDiarioDetalle, IReporteCierreTurno, IReporteCierreTurnoProductos, IReporteComprobantes, IReporteDeclaracionMensual } from "@/interfaces";

export async function obtieneReporteCierreDiarioDetallado(fecha: string): Promise<IReporteCierreDiario> {
    const date: Date = new Date(fecha);
    date.setDate(date.getDate() + Number.parseInt(process.env.NEXT_PUBLIC_CIERRE_DIA || "0"));
    const nextDayString: string = date.toISOString().split('T')[0];
    // Volumen y soles salen del snapshot del cierre (Cierreturnosdetalle), igual que el reporte anterior:
    // los comprobantes de dias ya cerrados pueden haber sido purgados. Solo el conteo de ventas,
    // que el snapshot no guarda, se trae de Comprobantes y queda en 0 si ya no existen.
    const query =     `
            with detalle as (
                select ctd.codigo, ctd.producto, ISNULL(ctd.medida,'') as medida, m.tipo, m.cantidad, m.soles
                from Cierreturnos t
                inner join Cierredias d on t.CierrediaId = d.id
                inner join Cierreturnosdetalle ctd on t.id = ctd.CierreturnoId
                cross apply (values
                    ('VENTA', ctd.total_cantidad, ctd.total_soles),
                    ('DESPACHO', ctd.despacho_cantidad, ctd.despacho_soles),
                    ('SERAFIN', ctd.calibracion_cantidad, ctd.calibracion_soles)
                ) m(tipo, cantidad, soles)
                where CAST(d.fecha AS DATE) = '${nextDayString}'
            ),
            conteo as (
                select i.codigo_producto as codigo, i.descripcion as producto,
                CASE when c.tipo_comprobante = '50' then 'DESPACHO' when c.tipo_comprobante = '51' then 'SERAFIN' else 'VENTA' END as tipo,
                COUNT(distinct c.id) as ventas
                from Comprobantes c
                inner join Items i on c.id = i.ComprobanteId
                inner join Cierreturnos t on c.CierreturnoId = t.id
                inner join Cierredias d on t.CierrediaId = d.id
                where CAST(d.fecha AS DATE) = '${nextDayString}' and c.tipo_comprobante in ('01','03','50','51','52')
                group by i.codigo_producto, i.descripcion,
                CASE when c.tipo_comprobante = '50' then 'DESPACHO' when c.tipo_comprobante = '51' then 'SERAFIN' else 'VENTA' END
            )
            select agrupado.codigo, agrupado.producto, agrupado.medida, agrupado.tipo,
            ISNULL(conteo.ventas, 0) as ventas, agrupado.volumen, agrupado.soles
            from (
                select codigo, producto, medida, tipo, SUM(cantidad) as volumen, SUM(soles) as soles
                from detalle group by codigo, producto, medida, tipo
            ) agrupado
            left join conteo on conteo.codigo = agrupado.codigo
                and conteo.producto = agrupado.producto
                and conteo.tipo = agrupado.tipo
            where agrupado.volumen <> 0 or agrupado.soles <> 0
            order by agrupado.tipo, agrupado.producto
        `;
    // El total de ventas de una seccion no es la suma de sus filas: un comprobante puede
    // llevar varios productos y se contaria una vez por cada uno.
    const queryConteo = `
            select
            CASE when c.tipo_comprobante = '50' then 'DESPACHO' when c.tipo_comprobante = '51' then 'SERAFIN' else 'VENTA' END as tipo,
            CASE when i.medida = 'GLL' then 1 else 0 END as es_combustible,
            COUNT(distinct c.id) as ventas
            from Comprobantes c
            inner join Items i on c.id = i.ComprobanteId
            inner join Cierreturnos t on c.CierreturnoId = t.id
            inner join Cierredias d on t.CierrediaId = d.id
            where CAST(d.fecha AS DATE) = '${nextDayString}' and c.tipo_comprobante in ('01','03','50','51','52')
            group by
            CASE when c.tipo_comprobante = '50' then 'DESPACHO' when c.tipo_comprobante = '51' then 'SERAFIN' else 'VENTA' END,
            CASE when i.medida = 'GLL' then 1 else 0 END
        `;

    const db = process.env.DB_DATABASE_AUXILIAR||"";
    const [detalle, conteos] = await Promise.all([
        executeQuery<IReporteCierreDiarioDetalle[]>(db, query),
        executeQuery<IReporteCierreDiarioConteo[]>(db, queryConteo),
    ]);
    return { detalle, conteos };
}

export async function obtieneReporteDeclaracionMensual(fecha: string): Promise<IReporteDeclaracionMensual[]> {
    const split_fecha = fecha.split("-");
    const cierres = await executeQuery<IReporteDeclaracionMensual[]>(
        process.env.DB_DATABASE_AUXILIAR||"", 
        `
            select c.tipo_comprobante, r.tipo_documento, r.numero_documento, c.numeracion_comprobante, c.tipo_documento_afectado, c.numeracion_documento_afectado, c.fecha_emision, LEFT(convert(varchar,c.fecha_hora,108), 8) as hora, CAST(c.total_gravadas as decimal(10,2)) as total_gravadas, CAST(c.total_igv as decimal(10,2)) as total_igv, CAST(c.total_venta as decimal(10,2)) as total_venta, c.dec_combustible, c.volumen, c.pistola, c.tiempo_abastecimiento, c.ruc 
            from Comprobantes c 
            inner join Receptores r on c.ReceptorId = r.id 
            where YEAR(fecha_emision) = '${split_fecha[0]}' and MONTH(fecha_emision) = '${split_fecha[1]}' and tipo_comprobante in ('01','03','07') and ISNULL(c.errors, '') = '' 
            order by c.id desc;
        `
    );    
    return cierres;
}

export async function obtieneReporteCierrePorDia(fecha: string): Promise<IReporteCierreTurno[]> { 
    const date: Date = new Date(fecha);
    date.setDate(date.getDate() + Number.parseInt(process.env.NEXT_PUBLIC_CIERRE_DIA || "0"));
    const nextDayString: string = date.toISOString().split('T')[0];
    const query =     `
        select t.turno, t.fecha, u.nombre,t.efectivo, t.tarjeta, t.yape, t.total
        from Cierreturnos t 
        inner join Cierredias di on di.id=t.CierrediaId 
        inner join Usuarios u on t.UsuarioId = u.id 
        where CAST(di.fecha AS DATE) = '${nextDayString}' order by t.fecha asc
        `;
    const cierres = await executeQuery<IReporteCierreTurno[]>(
        process.env.DB_DATABASE_AUXILIAR||"", query
    );    
    return cierres;
}

export async function obtieneReporteCierreTurnosProductosPorDia(fecha: string, includeProducts: boolean): Promise<IReporteCierreTurnoProductos[]> { 
    const date: Date = new Date(fecha);
    date.setDate(date.getDate() + Number.parseInt(process.env.NEXT_PUBLIC_CIERRE_DIA || "0"));
    const nextDayString: string = date.toISOString().split('T')[0];    
    const query =     `
        select t.turno, d.producto, sum(d.total_cantidad) as total_cantidad, sum(d.total_soles) as total_soles, sum(despacho_cantidad) as despacho_cantidad, sum(despacho_soles) as despacho_soles, sum(calibracion_cantidad) as calibracion_cantidad, sum(calibracion_soles) as calibracion_soles
        from Cierreturnos t 
        inner join Cierredias di on di.id=t.CierrediaId 
        inner join Cierreturnosdetalle d on t.id = d.CierreturnoId 
        where CAST(di.fecha AS DATE) = '${nextDayString}' ${includeProducts?"":"and d.medida = 'GLL' "}
        group by d.producto, t.turno 
        `;
    const cierres = await executeQuery<IReporteCierreTurnoProductos[]>(
        process.env.DB_DATABASE_AUXILIAR||"", query
    );    
    return cierres;
}
interface IParametrosReporteComprobantes {
    boletas: boolean;
    factura: boolean;
    notasCredito: boolean;
    notasDespacho: boolean;
    calibracion: boolean;
    fechaInicio: string;
    fechaFin: string;
    usuario: string;
    ruc: string;
}
export async function obtieneReporteComprobantes({ boletas, factura, notasCredito, notasDespacho, calibracion, fechaInicio, fechaFin, usuario, ruc }: IParametrosReporteComprobantes): Promise<IReporteComprobantes[]> { 
    let conditions = '';
    let where = 'where 1=1';
    if(fechaInicio) where += ` and c.fecha_emision >= '${fechaInicio}'`;
    if(fechaFin) where += ` and c.fecha_emision <= '${fechaFin}'`;
    if(usuario) where += ` and c.UsuarioId = '${usuario}'`;
    if(ruc) where += ` and r.numero_documento = '${ruc}'`;
    if(boletas || factura || notasCredito || notasDespacho || calibracion){
        if(boletas) conditions += `c.tipo_comprobante = '03' OR `;
        if(factura) conditions += `c.tipo_comprobante = '01' OR `;
        if(notasCredito) conditions += `c.tipo_comprobante = '07' OR `;
        if(notasDespacho) conditions += `c.tipo_comprobante = '50' OR `;
        if(calibracion) conditions += `c.tipo_comprobante = '51' OR `;
        where += ` and (${conditions.slice(0, -4)})`; // Eliminar el último " OR "
    } else {
        where += ` and 1=0`;
    }
    //dec_combustible solo se llena en ventas de combustible, por eso los productos se
    //arman desde Items. Se usa FOR XML PATH y no STRING_AGG porque el servidor es
    //SQL Server 2012 y esa funcion recien existe desde la 2017.
    const query = `
        select TOP 100 c.id as id, numeracion_comprobante as comprobante, c.fecha_hora as fecha, fecha_abastecimiento as fechahora, r.numero_documento, r.razon_social as receptor, c.placa, c.dec_combustible,
        ISNULL(STUFF((
            select ', ' + i.descripcion
            from Items i where i.ComprobanteId = c.id
            for xml path(''), type).value('.', 'nvarchar(max)'), 1, 2, ''), '') as productos,
        c.total  as total, u.nombre as usuario, c.url
        from Comprobantes c
        inner join Receptores r on c.ReceptorId = r.id
        inner join Usuarios u on c.UsuarioId = u.id
        ${where} order by c.id desc
        `;
    const comprobantes = await executeQuery<IReporteComprobantes[]>(
        process.env.DB_DATABASE_AUXILIAR||"", query
    );    
    return comprobantes;
}