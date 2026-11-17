'use server';
import { executeQuery } from '@/utils/db';
import { calculaSaldoCredito, ISaldoCredito, sqlSaldoCredito } from '@/utils/credito';
import sql from 'mssql';

// Saldo de credito del cliente con ese documento (para el aviso al elegir cliente en una nota de despacho).
// Devuelve null si el cliente no existe todavia.
export async function obtieneSaldoCreditoPorDocumento(numeroDocumento: string): Promise<ISaldoCredito | null> {
    const db = process.env.DB_DATABASE_AUXILIAR || '';
    const documento = String(numeroDocumento ?? '').trim();
    if (!documento) return null;
    try {
        const [receptor] = await executeQuery<{ id: number }[]>(db, `SELECT TOP 1 id FROM Receptores WHERE numero_documento = @documento AND estado = 1`,
            [{ name: 'documento', type: sql.NVarChar, value: documento }]);
        if (!receptor) return null;
        const [fila] = await executeQuery<{ limite: number | null; consumido: number }[]>(db, sqlSaldoCredito(false),
            [{ name: 'receptorId', type: sql.Int, value: receptor.id }]);
        return calculaSaldoCredito(fila?.limite, fila?.consumido);
    } catch (error) {
        console.error('Error obtieneSaldoCreditoPorDocumento:', error);
        return null;
    }
}
