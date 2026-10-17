'use server';
import { EstadosAbastecimiento, IAbastecimiento } from '@/interfaces';
import { executeQuery } from '@/utils/db';

export async function getAbastecimientos(pistolas: number[], estado?: EstadosAbastecimiento): Promise<IAbastecimiento[]> {
    try {
        // 1. Crear un array para almacenar las condiciones del filtro dinámico
        const condiciones: string[] = [];

        // Filtro por estado (mantenemos tu lógica de valorTotal > 0 cuando hay estado)
        condiciones.push(`a.fechaHora >= DATEADD(day, -2, GETDATE()) AND (a.valorTotal > 0 OR (a.valorTotal = 0 AND a.totInicio <> a.totFinal))`); // Solo los abastecimientos de los últimos 2 días

        if (estado !== undefined) {
            condiciones.push(`a.estado = ${estado}`);
        }

        // 2. Filtro por pistolas: SOLO se agrega si el array contiene elementos
        if (pistolas && pistolas.length > 0) {
            // Validamos que sean números para evitar sorpresas antes de unirlos
            const listaPistolas = pistolas.join(", ");
            condiciones.push(`a.pistola IN (${listaPistolas})`);
        }

        // 3. Armar la cláusula WHERE dinámicamente si hay condiciones en el array
        const clausulaWhere = condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";

        // 4. Construir la query final de forma mucho más legible
        const query = `
            SELECT TOP 50 
                a.idAbastecimiento, a.registro, a.pistola, a.codigoCombustible, a.numeroTanque, 
                CASE 
                    WHEN a.valorTotal = 0 AND a.totInicio <> a.totFinal THEN ROUND((a.totFinal - a.totInicio) * a.precioUnitario, 2)
                    ELSE a.valorTotal 
                END AS valorTotal,
                CASE 
                    WHEN a.volTotal = 0 AND a.totInicio <> a.totFinal THEN ROUND((a.totFinal - a.totInicio), 3)
                    ELSE a.volTotal 
                END AS volTotal,
                a.precioUnitario,
                a.tiempo, a.fechaHora, a.totInicio, a.totFinal, a.IDoperador, a.IDcliente, a.volTanque, a.estado,
                DATEDIFF(minute, a.fechaHora, GETDATE()) AS minutosTranscurridos,
                p.nombre, p.color, p.medida 
            FROM 
                DEMOSQL.dbo.Abastecimientos a 
            INNER JOIN 
                Productos p ON a.codigoCombustible = p.codigo
            ${clausulaWhere} 
            ORDER BY 
                a.idAbastecimiento DESC
        `;

        const abastecimientos = await executeQuery<IAbastecimiento[]>(
            process.env.DB_DATABASE_AUXILIAR || "", 
            query
        );

        return abastecimientos;
    } catch (error) {
        console.error("Error fetching getAbastecimientos:");
        console.error(JSON.stringify(error));
        throw error;
    }
}