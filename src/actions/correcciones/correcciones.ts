"use server";

import sql from 'mssql';
import moment from 'moment';
import { auth } from '@/auth.config';
import { Constants } from '@/utils/constants';
import { toLocaleStorage } from '@/utils/formats';
import { cantidadParaFactura } from '@/utils/cantidad-factura';
import { executeQuery, saveBillingTransaction } from '@/utils/db';
import { getHistoricoById } from '@/actions/historicos/get-historicos';
import { saveCheckNc } from '@/actions/billing/save-billing';
import { IComprobanteAdmin, ICorreccionInput, IRespuestaCorreccion, ISolicitudCorreccion } from '@/interfaces';

const db = () => process.env.DB_DATABASE_AUXILIAR || "";
const esAdmin = (rol?: string) => rol === Constants.ROL.ADMIN_ROLE;

interface IElegibilidad {
    ok: boolean;
    message: string;
    total: number;
    numeracion: string;
}

// Reglas para que un grifero pueda corregir un comprobante: es de su isla, todavía no tiene
// cierre de turno, es una factura o boleta ya aceptada, no tiene nota de crédito ni una solicitud previa.
async function validarElegibilidad(comprobanteId: number, islaSesion: number): Promise<IElegibilidad> {
    const no = (message: string): IElegibilidad => ({ ok: false, message, total: 0, numeracion: '' });
    if (!Number.isInteger(comprobanteId) || comprobanteId <= 0) return no('Comprobante no válido');
    if (!islaSesion) return no('Tu usuario no tiene una isla asignada');

    const filas = await executeQuery<any[]>(db(),
        `SELECT c.tipo_comprobante, c.numeracion_comprobante, c.enviado, c.errors, c.CierreturnoId, c.IslaId,
                c.numeracion_documento_afectado, c.total,
                (SELECT COUNT(*) FROM SolicitudesCorreccion s WHERE s.ComprobanteId = c.id) AS solicitudes
         FROM Comprobantes c WHERE c.id = @id`,
        [{ name: 'id', value: comprobanteId, type: sql.Int }]);
    const c = filas?.[0];
    if (!c) return no('El comprobante no existe');
    if (!['01', '03'].includes(c.tipo_comprobante)) return no('Solo se pueden corregir facturas y boletas');
    if (!c.enviado || (c.errors && c.errors !== 'null')) return no('El comprobante aún no fue aceptado');
    if (c.numeracion_documento_afectado) return no('El comprobante ya tiene una nota de crédito');
    if (c.CierreturnoId) return no('El turno de este comprobante ya fue cerrado');
    if (Number(c.IslaId) !== islaSesion) return no('Solo puedes corregir comprobantes de tu isla');
    if (c.solicitudes > 0) return no('Este comprobante ya tiene una corrección solicitada');
    return { ok: true, message: '', total: Number(c.total), numeracion: c.numeracion_comprobante };
}

export async function verificarCorreccion(comprobanteId: number): Promise<IRespuestaCorreccion> {
    const session = await auth();
    if (!session?.user) return { status: false, message: 'Sesión no válida' };
    const r = await validarElegibilidad(comprobanteId, Number(session.user.islaId) || 0);
    return { status: r.ok, message: r.message };
}

export async function crearSolicitudCorreccion(input: ICorreccionInput): Promise<IRespuestaCorreccion> {
    const session = await auth();
    if (!session?.user) return { status: false, message: 'Sesión no válida' };
    const islaId = Number(session.user.islaId) || 0;

    const elegible = await validarElegibilidad(input.ComprobanteId, islaId);
    if (!elegible.ok) return { status: false, message: elegible.message };

    const numero = (input.numero_documento || '').trim();
    if (!/^\d{8}$|^\d{11}$/.test(numero)) return { status: false, message: 'Ingresa un DNI (8 dígitos) o un RUC (11 dígitos)' };
    const razon = (input.razon_social || '').trim();
    if (!razon || razon === '0') return { status: false, message: 'Ingresa la razón social' };
    const observaciones = (input.observaciones || '').trim();
    if (observaciones.length < 5) return { status: false, message: 'Escribe la razón del cambio en las observaciones' };

    const efectivo = Number(input.efectivo) || 0, tarjeta = Number(input.tarjeta) || 0, yape = Number(input.yape) || 0;
    if (Math.abs(efectivo + tarjeta + yape - elegible.total) > 0.01) {
        return { status: false, message: 'La suma de los pagos no coincide con el total del comprobante' };
    }
    const tipoDocumento = numero.length === 11 ? Constants.TIPO_DOCUMENTO.RUC_SUNAT : Constants.TIPO_DOCUMENTO.DNI_SUNAT;

    try {
        await executeQuery(db(),
            `INSERT INTO SolicitudesCorreccion
                (ComprobanteId, numeracion_comprobante, tipo_documento, numero_documento, razon_social, direccion, placa, celular,
                 pago_efectivo, pago_tarjeta, pago_yape, observaciones, UsuarioId, IslaId)
             VALUES (@ComprobanteId, @numeracion, @tipo, @numero, @razon, @direccion, @placa, @celular,
                 @efectivo, @tarjeta, @yape, @observaciones, @UsuarioId, @IslaId)`,
            [
                { name: 'ComprobanteId', value: input.ComprobanteId, type: sql.Int },
                { name: 'numeracion', value: elegible.numeracion, type: sql.NVarChar },
                { name: 'tipo', value: tipoDocumento, type: sql.NVarChar },
                { name: 'numero', value: numero, type: sql.NVarChar },
                { name: 'razon', value: razon.slice(0, 250), type: sql.NVarChar },
                { name: 'direccion', value: (input.direccion || '').trim().slice(0, 250) || null, type: sql.NVarChar },
                { name: 'placa', value: (input.placa || '').trim().toUpperCase().slice(0, 10) || null, type: sql.NVarChar },
                { name: 'celular', value: (input.celular || '').trim().slice(0, 20) || null, type: sql.NVarChar },
                { name: 'efectivo', value: Math.round(efectivo * 100) / 100, type: sql.Float },
                { name: 'tarjeta', value: Math.round(tarjeta * 100) / 100, type: sql.Float },
                { name: 'yape', value: Math.round(yape * 100) / 100, type: sql.Float },
                { name: 'observaciones', value: observaciones.slice(0, 500), type: sql.NVarChar },
                { name: 'UsuarioId', value: Number(session.user.id), type: sql.Int },
                { name: 'IslaId', value: islaId, type: sql.Int },
            ]);
        return { status: true, message: `Corrección de ${elegible.numeracion} enviada al administrador` };
    } catch (error) {
        console.error('Error crearSolicitudCorreccion:', error);
        const detalle = error instanceof Error ? error.message : JSON.stringify(error);
        return { status: false, message: `No se pudo registrar la corrección | ${detalle}` };
    }
}

export async function obtenerSolicitud(id: number): Promise<ISolicitudCorreccion | null> {
    const session = await auth();
    if (!esAdmin(session?.user?.rol)) return null;
    const filas = await executeQuery<ISolicitudCorreccion[]>(db(),
        `SELECT s.*, u.nombre AS usuario FROM SolicitudesCorreccion s LEFT JOIN Usuarios u ON u.id = s.UsuarioId WHERE s.id = @id`,
        [{ name: 'id', value: id, type: sql.Int }]);
    return filas?.[0] ?? null;
}

export async function rechazarSolicitud(id: number, motivo: string): Promise<IRespuestaCorreccion> {
    const session = await auth();
    if (!esAdmin(session?.user?.rol)) return { status: false, message: 'Solo un administrador puede resolver correcciones' };
    const texto = (motivo || '').trim();
    if (texto.length < 3) return { status: false, message: 'Escribe el motivo del rechazo' };
    try {
        const filas = await executeQuery<any[]>(db(),
            `UPDATE SolicitudesCorreccion
             SET estado = 'RECHAZADA', AdministradorId = @admin, fecha_resolucion = GETDATE(), motivo_rechazo = @motivo
             OUTPUT inserted.id
             WHERE id = @id AND estado = 'PENDIENTE' AND nc_numeracion IS NULL`,
            [
                { name: 'id', value: id, type: sql.Int },
                { name: 'admin', value: Number(session?.user?.id), type: sql.Int },
                { name: 'motivo', value: texto.slice(0, 300), type: sql.NVarChar },
            ]);
        if (!filas?.length) return { status: false, message: 'La solicitud ya fue resuelta o ya generó comprobantes' };
        return { status: true, message: 'Solicitud rechazada' };
    } catch (error) {
        console.error('Error rechazarSolicitud:', error);
        return { status: false, message: 'No se pudo rechazar la solicitud' };
    }
}

// Aprueba la corrección: emite la nota de crédito por anulación sobre el original y un comprobante
// nuevo con los datos del grifero, ambos a nombre del administrador. El original no se modifica
// (solo se marca con su nota de crédito, como hace el flujo normal de N.Crédito).
// Cada paso se registra en la solicitud apenas termina, así que si algo falla a la mitad se puede
// volver a aprobar y continúa donde quedó, sin repetir la nota de crédito.
export async function aprobarSolicitud(id: number): Promise<IRespuestaCorreccion> {
    const session = await auth();
    if (!esAdmin(session?.user?.rol)) return { status: false, message: 'Solo un administrador puede aprobar correcciones' };
    const adminId = Number(session?.user?.id);
    const adminIsla = Number(session?.user?.islaId) || 0;

    const filas = await executeQuery<ISolicitudCorreccion[]>(db(),
        `SELECT * FROM SolicitudesCorreccion WHERE id = @id`, [{ name: 'id', value: id, type: sql.Int }]);
    const sol = filas?.[0];
    if (!sol) return { status: false, message: 'La solicitud no existe' };
    if (sol.estado !== 'PENDIENTE') return { status: false, message: `La solicitud ya fue ${sol.estado.toLowerCase()}` };

    try {
        const original = await getHistoricoById(sol.ComprobanteId);
        if (!original) return { status: false, message: 'No se encontró el comprobante original' };
        const ahora = toLocaleStorage(new Date());
        // fecha_emision es de tipo date (medianoche UTC): se lee en UTC para no correrla un día
        const fechaOriginal = new Date(original.fecha_emision as unknown as string).toISOString().slice(0, 10);

        // 1) Nota de crédito por anulación (misma forma que la que emite BillingEditForm)
        let ncNumeracion = sol.nc_numeracion;
        if (!ncNumeracion) {
            const nc = { ...original } as IComprobanteAdmin;
            nc.tipo_comprobante = Constants.TIPO_COMPROBANTE.NOTA_CREDITO;
            nc.numeracion_documento_afectado = original.numeracion_comprobante;
            nc.fecha_documento_afectado = fechaOriginal;
            nc.tipo_documento_afectado = original.tipo_comprobante;
            nc.tipo_nota = Constants.MOTIVO_NOTA_CREDITO.ANULACION.codigo;
            nc.motivo_documento_afectado = Constants.MOTIVO_NOTA_CREDITO.ANULACION.descripcion;
            nc.fecha_emision = ahora;
            nc.fecha_hora = ahora;
            nc.fecha_abastecimiento = '';
            nc.numeracion_comprobante = '';
            nc.UsuarioId = adminId;
            nc.id_abastecimiento = null;
            nc.IslaId = adminIsla;
            nc.impresion = 0;
            nc.enviado = 0;
            const bill = await saveBillingTransaction(nc, { omitirStock: true });
            ncNumeracion = bill.numeracion_comprobante;
            await saveCheckNc(original.numeracion_comprobante, ncNumeracion);
            await executeQuery(db(), `UPDATE SolicitudesCorreccion SET nc_numeracion = @n WHERE id = @id`,
                [{ name: 'n', value: ncNumeracion, type: sql.NVarChar }, { name: 'id', value: id, type: sql.Int }]);
        }

        // 2) Comprobante nuevo con los datos corregidos (factura si es RUC, boleta si es DNI)
        let nuevoNumeracion = sol.nuevo_numeracion;
        if (!nuevoNumeracion) {
            const esRuc = sol.numero_documento.length === 11;
            const nuevo = { ...original } as IComprobanteAdmin;
            nuevo.tipo_comprobante = esRuc ? Constants.TIPO_COMPROBANTE.FACTURA : Constants.TIPO_COMPROBANTE.BOLETA;
            nuevo.Receptor = {
                id: 0,
                tipo_documento: sol.tipo_documento,
                numero_documento: sol.numero_documento,
                razon_social: sol.razon_social,
                direccion: sol.direccion ?? '',
                placa: sol.placa ?? '',
            } as IComprobanteAdmin['Receptor'];
            nuevo.placa = sol.placa;
            nuevo.items = (original.items || []).map(item => {
                const base = { ...item, placa: sol.placa ?? '' };
                if (!esRuc) return base;
                // Factura: cantidad exacta para que SUNAT no rechace el precio unitario (ver cantidad-factura.ts)
                const cantidad = cantidadParaFactura(Number(item.precio_venta), Number(item.precio_unitario), Number(item.cantidad_venta));
                return { ...base, cantidad: String(cantidad), cantidad_venta: cantidad };
            });
            nuevo.efectivo = Number(sol.pago_efectivo);
            nuevo.tarjeta = Number(sol.pago_tarjeta);
            nuevo.yape = Number(sol.pago_yape);
            nuevo.tipo_nota = null;
            nuevo.tipo_documento_afectado = null;
            nuevo.fecha_documento_afectado = null;
            nuevo.numeracion_documento_afectado = null;
            nuevo.motivo_documento_afectado = null;
            nuevo.fecha_emision = ahora;
            nuevo.fecha_hora = ahora;
            // Conserva la hora real del despacho (mismo criterio que el modelo Comprobante)
            nuevo.fecha_abastecimiento = original.fecha_abastecimiento
                ? moment.utc(original.fecha_abastecimiento as unknown as string).format("YYYY-MM-DD HH:mm:ss")
                : ahora;
            nuevo.numeracion_comprobante = '';
            nuevo.UsuarioId = adminId;
            nuevo.id_abastecimiento = null; // el abastecimiento sigue ligado al comprobante original
            nuevo.IslaId = adminIsla;
            nuevo.notas = [];
            nuevo.impresion = 0;
            nuevo.enviado = 0;
            const bill = await saveBillingTransaction(nuevo, { omitirStock: true });
            nuevoNumeracion = bill.numeracion_comprobante;
            await executeQuery(db(), `UPDATE SolicitudesCorreccion SET nuevo_numeracion = @n WHERE id = @id`,
                [{ name: 'n', value: nuevoNumeracion, type: sql.NVarChar }, { name: 'id', value: id, type: sql.Int }]);
        }

        await executeQuery(db(),
            `UPDATE SolicitudesCorreccion SET estado = 'APROBADA', AdministradorId = @admin, fecha_resolucion = GETDATE() WHERE id = @id`,
            [{ name: 'admin', value: adminId, type: sql.Int }, { name: 'id', value: id, type: sql.Int }]);
        return { status: true, message: `Corrección aprobada: ${ncNumeracion} anula ${original.numeracion_comprobante} y se emitió ${nuevoNumeracion}` };
    } catch (error) {
        console.error('Error aprobarSolicitud:', error);
        const detalle = error instanceof Error ? error.message : JSON.stringify(error);
        return { status: false, message: `No se pudo completar la aprobación (puedes volver a intentarla) | ${detalle}` };
    }
}
