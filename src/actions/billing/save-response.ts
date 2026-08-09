"use server";
import { IComprobanteAdmin } from '@/interfaces';
import { executeQuery } from '@/utils/db';

export async function saveBillingResponse({ id, xml_envio, codigo_hash, cadena_para_codigo_qr, url, errors }: IComprobanteAdmin): Promise<void> {
    try {
        //Si la fila ya tiene url el comprobante fue aceptado por SUNAT, asi que una respuesta
        //posterior no debe pisarla: un reenvio devuelve "ya existe" y borraria el enlace bueno.
        const query = `UPDATE Comprobantes
            SET xml_envio = '${xml_envio}', codigo_hash = '${codigo_hash}', cadena_para_codigo_qr = '${cadena_para_codigo_qr}', url = '${url}', errors = '${errors}', enviado = '1'
            WHERE
            id = ${id} AND ISNULL(url, '') IN ('', 'null')
            `;
        await executeQuery<IComprobanteAdmin[]>(
            process.env.DB_DATABASE_AUXILIAR||"",
            query
        );
    } catch (error) {
        console.error("Error fetching saveBillingResponse");
        console.error(JSON.stringify(error));
        throw error;
    }    

}
