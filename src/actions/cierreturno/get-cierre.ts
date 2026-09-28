"use server";

import { ICierreTurno, ICierreTurnoDetalle, ICierreTurnoSoles, IDepositos, IGastos } from "@/interfaces";
import { executeQuery } from '@/utils/db';

interface Props {
    productos: ICierreTurnoDetalle[];
    soles: ICierreTurnoSoles;
    depositos: IDepositos[];
    gastos: IGastos[];
}

export async function obtieneCierreTurno(usuarioId: string): Promise<Props> {
    
    const queryProductos = `
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
        `;
    const productos = await executeQuery<ICierreTurnoDetalle[]>(
        process.env.DB_DATABASE_AUXILIAR||"", queryProductos

    );
    const soles = await executeQuery<ICierreTurnoSoles[]>(
        process.env.DB_DATABASE_AUXILIAR||"", 
        `
            select sum(pago_efectivo) as efectivo, sum(pago_tarjeta) as tarjeta, sum(pago_yape) as yape 
            from Comprobantes where CierreturnoId is null and tipo_comprobante in ('01','03','52') and UsuarioId = ${usuarioId}
        `
    );
    const depositos = await executeQuery<IDepositos[]>(
        process.env.DB_DATABASE_AUXILIAR||"", 
        `
            select id, concepto, fecha, monto from Depositos where CierreturnoId is null and UsuarioId = ${usuarioId}
        `
    );
    const gastos = await executeQuery<IGastos[]>(
        process.env.DB_DATABASE_AUXILIAR||"", 
        `
            select id, concepto, fecha, monto from Gastos where CierreturnoId is null and UsuarioId = ${usuarioId}
        `
    );
    return {
        productos,
        soles: soles[0] as ICierreTurnoSoles,
        depositos,
        gastos
    }

}

export async function obtieneHistoricoCierres(usuarioId: string): Promise<ICierreTurno[]> {

    const cierres = await executeQuery<ICierreTurno[]>(
        process.env.DB_DATABASE_AUXILIAR||"",
        `
            select top 2 id, total, fecha, turno, isla, efectivo, tarjeta, yape, UsuarioId,
            CierrediaId, observaciones, billetes_contado, monedas_contado, tarjeta_contado,
            transferencia_contado, yape_contado, falsos_contado, actualizado_por, fecha_actualizacion
            from Cierreturnos
            where UsuarioId = ${usuarioId} order by id desc;
        `
    );
    await Promise.all(
        cierres.map(async cierre => {
            const detalle = await executeQuery<ICierreTurnoDetalle[]>(
                process.env.DB_DATABASE_AUXILIAR||"",
                `
                    select codigo,producto,medida,total_cantidad,total_soles,calibracion_cantidad,calibracion_soles,despacho_cantidad,despacho_soles from Cierreturnosdetalle where CierreturnoId = ${cierre.id};
                `
            );
            cierre.detalle = detalle;
            const depositos = await executeQuery<IDepositos[]>(
                process.env.DB_DATABASE_AUXILIAR||"",
                `
                    select id, concepto, fecha, monto, usuario, turno, UsuarioId from Depositos where CierreturnoId = ${cierre.id};
                `
            );
            cierre.depositos = depositos;
            const gastos = await executeQuery<IGastos[]>(
                process.env.DB_DATABASE_AUXILIAR||"",
                `
                    select id, concepto, fecha, monto, usuario_gasto, autorizado, turno, UsuarioId from Gastos where CierreturnoId = ${cierre.id};
                `
            );
            cierre.gastos = gastos;
            return cierre;
        })
    )

    return cierres;
}