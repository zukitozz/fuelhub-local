'use server';
import { ISerieTable } from '@/interfaces';
import { executeQuery } from '@/utils/db';
import { Constants } from '@/utils/constants';

// Busca el ultimo comprobante de cada serie. La serie viaja dentro de numeracion_comprobante
// como "<prefijo><digitos>-<numeracion>", pero el prefijo puede ser de 1 letra (F, B, N, C, I)
// o de 2 (FC, BC para notas de credito), y spCorrelativoObtener trunca la serie a los ultimos
// 2 digitos solo para NC/ND (tipo 07/08). Por eso no se puede comparar con un largo fijo de 3:
// se compara la porcion numerica real (entre la primera cifra y el guion) contra los ultimos
// N caracteres de Series.serie, con N igual al largo de esa porcion numerica.
const OUTER_APPLY_ULTIMO_COMPROBANTE = `
    OUTER APPLY (
        SELECT TOP 1 c.numeracion_comprobante AS numeracion_actual, c.fecha_emision AS fecha_ultimo_comprobante
        FROM Comprobantes c
        WHERE c.tipo_comprobante = s.tipo_comprobante
            AND PATINDEX('%[0-9]%', c.numeracion_comprobante) BETWEEN 2 AND CHARINDEX('-', c.numeracion_comprobante) - 1
            AND SUBSTRING(
                    c.numeracion_comprobante,
                    PATINDEX('%[0-9]%', c.numeracion_comprobante),
                    CHARINDEX('-', c.numeracion_comprobante) - PATINDEX('%[0-9]%', c.numeracion_comprobante)
                ) = RIGHT(s.serie, CHARINDEX('-', c.numeracion_comprobante) - PATINDEX('%[0-9]%', c.numeracion_comprobante))
        ORDER BY c.id DESC
    ) u
`;

export async function getSeries(): Promise<ISerieTable[]> {
    try {
        const query = `
            SELECT s.id, s.codigo_proposito, s.tipo_comprobante, s.serie, s.estado, s.descripcion, s.fecha_retroactiva,
                u.numeracion_actual, u.fecha_ultimo_comprobante
            FROM Series s
            ${OUTER_APPLY_ULTIMO_COMPROBANTE}
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
            ${OUTER_APPLY_ULTIMO_COMPROBANTE}
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
