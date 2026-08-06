'use server';
import { IComprobanteAdmin } from '@/interfaces';
import { executeQuery, saveBillingTransaction } from '@/utils/db';
import { Session } from "next-auth";

interface IComprobanteStoreResponse {
    bill: IComprobanteAdmin|null;
    message: string;
    status: boolean;
}

export async function saveBilling(comprobante: IComprobanteAdmin): Promise<IComprobanteStoreResponse> {
    let message = `Ocurrió un error al crear el comprobante`
    try {
        const bill = await saveBillingTransaction(comprobante);
        message = `Comprobante ${bill.numeracion_comprobante} creado coorrectamente`
        return {
            message,
            status: true,
            bill
        }         
    } catch (error) {
        console.error("Error saving comprobante:");
        console.error(error);
        // JSON.stringify de un Error devuelve {}, se perderia el motivo del rechazo
        const detalle = error instanceof Error ? error.message : JSON.stringify(error);
        return {
            message: `${message} | ${detalle}`,
            status: false,
            bill: null
        }
    }
}
interface IGenericResponse {
    message: string;
    status: boolean;
}

export async function reprintBilling(session: Session|null, id: number): Promise<IGenericResponse> {
    let message = `Ocurrió un error al solicitar reimpresión del comprobante`
    const islaId = session?.user?.islaId || 0;
    try {
        const query = `UPDATE Comprobantes set impresion = 0, IslaId = ${islaId} where id = ${id}`;
        await executeQuery(
            process.env.DB_DATABASE_AUXILIAR||"", query
            
        );
        message = `Reimpresión del comprobante solicitada, espere unos segundos`;
        return {
            message,
            status: true
        }
    } catch (error) {
        return {
            message: `${message} | ${JSON.stringify(error)}`,
            status: false
        }   
    }
}

export async function saveCheckNc(documento_principal: string, documento_afectado: string): Promise<IGenericResponse> {
    let message = `Ocurrió un error al marcar el comprobante como verificado para NC`
    try {
        const query = `UPDATE Comprobantes set numeracion_documento_afectado = '${documento_afectado}' where numeracion_comprobante = '${documento_principal}'`;
        await executeQuery(
            process.env.DB_DATABASE_AUXILIAR||"", query
        );
        message = `Comprobante marcado como verificado para NC`;
        return {
            message,
            status: true
        }
    } catch (error) {
        return {
            message: `${message} | ${JSON.stringify(error)}`,
            status: false
        }   
    }
}
