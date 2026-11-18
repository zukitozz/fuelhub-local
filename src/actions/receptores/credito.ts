'use server';
import { executeQuery } from '@/utils/db';
import { calculaSaldoCredito, ISaldoCredito, sqlSaldoCredito } from '@/utils/credito';
import sql from 'mssql';
import { auth } from '@/auth.config';
import { Constants } from '@/utils/constants';

// Saldo de credito del cliente con ese documento (para ofrecer la venta al credito y mostrar el saldo).
// Devuelve null si el cliente no existe todavia.
export async function obtieneSaldoCreditoPorDocumento(numeroDocumento: string): Promise<ISaldoCredito | null> {
    const db = process.env.DB_DATABASE_AUXILIAR || '';
    const documento = String(numeroDocumento ?? '').trim();
    if (!documento) return null;
    try {
        const [receptor] = await executeQuery<{ id: number }[]>(db, `SELECT TOP 1 id FROM Receptores WHERE numero_documento = @documento AND estado = 1`,
            [{ name: 'documento', type: sql.NVarChar, value: documento }]);
        if (!receptor) return null;
        const [fila] = await executeQuery<{ limite: number | null; consumido: number; abonado: number }[]>(db, sqlSaldoCredito(false),
            [{ name: 'receptorId', type: sql.Int, value: receptor.id }]);
        return calculaSaldoCredito(fila?.limite, fila?.consumido, fila?.abonado);
    } catch (error) {
        console.error('Error obtieneSaldoCreditoPorDocumento:', error);
        return null;
    }
}

export interface IAbonoCredito {
    id: number;
    monto: number;
    fecha: string;
    observacion: string | null;
}

// Ultimos abonos del cliente (pagos que liberaron credito)
export async function obtieneAbonosCredito(receptorId: number): Promise<IAbonoCredito[]> {
    try {
        return await executeQuery<IAbonoCredito[]>(process.env.DB_DATABASE_AUXILIAR || '',
            `SELECT TOP 10 id, monto, CONVERT(varchar(16), fecha, 120) AS fecha, observacion FROM CreditoAbonos WHERE ReceptorId = @receptorId ORDER BY id DESC`,
            [{ name: 'receptorId', type: sql.Int, value: receptorId }]);
    } catch (error) {
        console.error('Error obtieneAbonosCredito:', error);
        return [];
    }
}

// Solo un administrador registra abonos: cuando el cliente paga, se libera credito
export async function registrarAbonoCredito(receptorId: number, monto: number, observacion: string): Promise<{ status: boolean; message: string }> {
    const session = await auth();
    if (session?.user?.rol !== Constants.ROL.ADMIN_ROLE) return { status: false, message: 'Solo un administrador puede registrar abonos' };
    const valor = Math.round(Number(monto) * 100) / 100;
    if (!Number.isFinite(valor) || valor <= 0) return { status: false, message: 'El monto del abono debe ser mayor a cero' };
    try {
        await executeQuery(process.env.DB_DATABASE_AUXILIAR || '',
            `INSERT INTO CreditoAbonos (ReceptorId, monto, observacion, UsuarioId) VALUES (@receptorId, @monto, @observacion, @usuarioId)`,
            [{ name: 'receptorId', type: sql.Int, value: receptorId },
             { name: 'monto', type: sql.Float, value: valor },
             { name: 'observacion', type: sql.NVarChar, value: String(observacion ?? '').trim().slice(0, 200) || null },
             { name: 'usuarioId', type: sql.Int, value: Number(session?.user?.id) || null }]);
        return { status: true, message: 'Abono registrado' };
    } catch (error) {
        console.error('Error registrarAbonoCredito:', error);
        return { status: false, message: 'No se pudo registrar el abono' };
    }
}
