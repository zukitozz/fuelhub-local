'use server';
import { IReceptorPlaca } from '@/interfaces';
import sql from 'mssql';
import { executeQuery } from '@/utils/db';

export async function getPlacas (placa: string): Promise<IReceptorPlaca[]> {
    try {
     const receptor = await executeQuery<IReceptorPlaca[]>(
        process.env.DB_DATABASE_AUXILIAR||"", 
        `
            SELECT TOP 10 r.id, r.numero_documento, r.razon_social, r.direccion, p.placa
            FROM Placas p 
            INNER JOIN Receptores r ON p.ReceptorId = r.id
            WHERE r.estado = 1 AND r.numero_documento <> '0' AND p.placa like @placa
        `,
        [{ name: 'placa', value: `%${placa}%`, type: sql.NVarChar }]
    );
     return receptor as IReceptorPlaca[];
 
    } catch (error) {
        console.error("Error fetching getReceptor:");
        console.error(JSON.stringify(error));
        throw error;
    }
}
