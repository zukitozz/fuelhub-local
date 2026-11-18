"use server";
import { executeQuery } from '@/utils/db';
import { ICierreTurno, ICierreTurnoDetalle, IDepositos, IGastos, IUser, IUsuarioTurnoAbierto } from "@/interfaces";

export async function obtieneCierreDia(): Promise<ICierreTurno[]> {
    const cierres = await executeQuery<ICierreTurno[]>(
        process.env.DB_DATABASE_AUXILIAR||"", 
        `
            select id, total, fecha, turno, isla, efectivo, tarjeta, yape, UsuarioId  
            from Cierreturnos 
            where CierrediaId is null;
        `
    );
    await Promise.all(
        cierres.map(async cierre => {
            const detalle = await executeQuery<ICierreTurnoDetalle[]>(
                process.env.DB_DATABASE_AUXILIAR||"", 
                `
                    select codigo, producto, medida, total_cantidad, total_soles, calibracion_cantidad, calibracion_soles, despacho_cantidad, despacho_soles, ISNULL(credito_cantidad,0) as credito_cantidad, ISNULL(credito_soles,0) as credito_soles 
                    from Cierreturnosdetalle 
                    where CierreturnoId = ${cierre.id};
                `
            );
            cierre.detalle = detalle;
            const usuario = await executeQuery<IUser[]>(
                process.env.DB_DATABASE_AUXILIAR||"", 
                `
                    select id, nombre, usuario, correo from Usuarios where id = ${cierre.UsuarioId};
                `
            );
            cierre.usuario = usuario[0];
            const depositos = await executeQuery<IDepositos[]>(
                process.env.DB_DATABASE_AUXILIAR||"", 
                `
                    select id, concepto, monto, usuario, turno, fecha, UsuarioId 
                    from Depositos 
                    where CierreturnoId = ${cierre.id};
                `
            );
            cierre.depositos = depositos;
            const gastos = await executeQuery<IGastos[]>(
                process.env.DB_DATABASE_AUXILIAR||"", 
                `
                    select id, concepto, monto, usuario_gasto, autorizado, turno, fecha, UsuarioId 
                    from Gastos 
                    where CierreturnoId = ${cierre.id};
                `
            );
            cierre.gastos = gastos;
            return cierre;
    }))
    return cierres;
}

export async function obtieneTurnosAbiertos(): Promise<IUsuarioTurnoAbierto[]> {
    // Se agrupa por usuario ANTES de cruzar con Logins para que las sesiones
    // abiertas duplicadas no multipliquen el conteo de pendientes
    return await executeQuery<IUsuarioTurnoAbierto[]>(
        process.env.DB_DATABASE_AUXILIAR||"",
        `
            select u.id as UsuarioId, u.nombre,
                   isnull(l.jornada, 'SIN SESION') as turno,
                   isnull(l.isla, '-') as isla,
                   p.pendientes, p.desde
            from (
                select UsuarioId, count(*) as pendientes, min(fecha_hora) as desde
                from Comprobantes
                where CierreturnoId is null
                group by UsuarioId
            ) p
            inner join Usuarios u on u.id = p.UsuarioId and u.rol = 'USER_ROLE'
            outer apply (
                select top 1 jornada, isla
                from Logins
                where UsuarioId = u.id and fecha_fin is null
                order by fecha_inicio desc
            ) l;
        `
    );
}