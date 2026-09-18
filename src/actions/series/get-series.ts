'use server';
import { ISerieTable } from '@/interfaces';
import { executeQuery } from '@/utils/db';
import { Constants } from '@/utils/constants';

export async function getSeries(): Promise<ISerieTable[]> {
    try {
        const query = `
            SELECT s.id, s.codigo_proposito, s.tipo_comprobante, s.serie, s.estado, s.descripcion, s.fecha_retroactiva,
                u.numeracion_actual, u.fecha_ultimo_comprobante
            FROM Series s
            OUTER APPLY (
                SELECT TOP 1 c.numeracion_comprobante AS numeracion_actual, c.fecha_emision AS fecha_ultimo_comprobante
                FROM Comprobantes c
                WHERE c.tipo_comprobante = s.tipo_comprobante
                    AND CHARINDEX('-', c.numeracion_comprobante) > 3
                    AND RIGHT(LEFT(c.numeracion_comprobante, CHARINDEX('-', c.numeracion_comprobante) - 1), 3) = s.serie
                ORDER BY c.id DESC
            ) u
            ORDER BY s.codigo_proposito, s.tipo_comprobante, s.serie;
        `;
        return await executeQuery<ISerieTable[]>(process.env.DB_DATABASE_AUXILIAR || "", query);
    } catch (error) {
        console.error("Error fetching getSeries:");
        console.error(JSON.stringify(error));
        throw error;
    }
}

export async function getSerie(id: number): Promise<ISerieTable | undefined> {
    try {
        const query = `
            SELECT s.id, s.codigo_proposito, s.tipo_comprobante, s.serie, s.estado, s.descripcion, s.fecha_retroactiva,
                u.numeracion_actual, u.fecha_ultimo_comprobante
            FROM Series s
            OUTER APPLY (
                SELECT TOP 1 c.numeracion_comprobante AS numeracion_actual, c.fecha_emision AS fecha_ultimo_comprobante
                FROM Comprobantes c
                WHERE c.tipo_comprobante = s.tipo_comprobante
                    AND CHARINDEX('-', c.numeracion_comprobante) > 3
                    AND RIGHT(LEFT(c.numeracion_comprobante, CHARINDEX('-', c.numeracion_comprobante) - 1), 3) = s.serie
                ORDER BY c.id DESC
            ) u
            WHERE s.id = ${id};
        `;
        const series = await executeQuery<ISerieTable[]>(process.env.DB_DATABASE_AUXILIAR || "", query);
        return series[0];
    } catch (error) {
        console.error("Error fetching getSerie:");
        console.error(JSON.stringify(error));
        throw error;
    }
}

// Usado por los formularios de emision para decidir si mostrar el selector de fecha
// retroactiva: resuelve el codigo_proposito por el rol real del usuario (no por lo que
// declare el cliente), igual que saveBillingTransaction, y revisa la serie activa.
export async function getSerieActivaRetroactiva(tipo_comprobante: string, usuarioId: number): Promise<boolean> {
    try {
        const dbName = process.env.DB_DATABASE_AUXILIAR || "";
        const usuario = await executeQuery<{ rol: string }[]>(dbName, `SELECT rol FROM Usuarios WHERE id = ${usuarioId}`);
        const codigoProposito = usuario[0]?.rol === Constants.ROL.ADMIN_ROLE
            ? Constants.CODIGO_PROPOSITO.ADMIN
            : Constants.CODIGO_PROPOSITO.INTERNA;

        const serie = await executeQuery<{ fecha_retroactiva: boolean }[]>(
            dbName,
            `SELECT fecha_retroactiva FROM Series WHERE codigo_proposito = '${codigoProposito}' AND tipo_comprobante = '${tipo_comprobante}' AND estado = 1`
        );
        return !!serie[0]?.fecha_retroactiva;
    } catch (error) {
        console.error("Error fetching getSerieActivaRetroactiva:");
        console.error(JSON.stringify(error));
        return false;
    }
}
