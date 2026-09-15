'use server';
import { IReceptor } from '@/interfaces';
import { executeQuery } from '@/utils/db';

interface TableResponseReceptoresProps {
  receptores: IReceptor[];
  pageNumbers: number[];
}

export async function getReceptores(page: number, perPage: number, keyword?: string): Promise<TableResponseReceptoresProps> {
    // Es más común y limpio usar OFFSET y FETCH/LIMIT si tu BD lo soporta, 
    // pero manteniendo tu lógica de BETWEEN, el cálculo de rangos está bien.
    const start = (page * perPage) - (perPage - 1);
    const end = (page * perPage);

    // 1. Definir el filtro base para reutilizarlo en la paginación y en el conteo total
    // Solo clientes activos: los eliminados quedan con estado = 0
    let innerFilter = " WHERE estado = 1";
    if (keyword && keyword.trim() !== "") {
        const cleanKeyword = keyword.trim().replace(/'/g, "''"); // Evita roturas básicas por comillas singulares
        innerFilter += ` AND (numero_documento LIKE '%${cleanKeyword}%' OR razon_social LIKE '%${cleanKeyword}%')`;
    }

    // 2. Aplicamos el filtro DENTRO del subquery para que ROW_NUMBER actúe sobre los datos filtrados
    const query = `
        SELECT * FROM (
            SELECT id, numero_documento, tipo_documento, razon_social, direccion, correo, placa, 
                   ROW_NUMBER() OVER (ORDER BY id) AS RowNum 
            FROM Receptores 
            ${innerFilter}
        ) as Result 
        WHERE RowNum BETWEEN ${start} AND ${end};
    `;
    
    try {
        const dbName = process.env.DB_DATABASE_AUXILIAR || "";

        // Ejecutar consulta paginada
        const receptores = await executeQuery<IReceptor[]>(dbName, query);
        
        // 3. El COUNT también debe verse afectado por el filtro, de lo contrario las páginas no coincidirán
        const totalResult = await executeQuery<{ total: number }[]>(
            dbName, 
            `SELECT COUNT(id) as total FROM Receptores ${innerFilter}`
        );        
        
        const totalRegistros = totalResult[0]?.total || 0;
        const totalPages = Math.ceil(totalRegistros / perPage);
        
        const pageNumbers = [];
        for (let i = 1; i <= totalPages; i++) {
            pageNumbers.push(i);
        }

        return {
            receptores,
            pageNumbers
        };

    } catch (error) {
        console.error("Error fetching getReceptores:", error);
        throw error;
    }
}

export async function getReceptor(id: number): Promise<IReceptor> {
    try {
     const receptores = await executeQuery<IReceptor[]>(
        process.env.DB_DATABASE_AUXILIAR||"", 
        `SELECT id,numero_documento,tipo_documento,razon_social,direccion,correo,placa FROM Receptores WHERE id = ${id}`
    );
     return receptores[0] as IReceptor;
    } catch (error) {
        console.error("Error fetching getReceptor:");
        console.error(JSON.stringify(error));
        throw error;
    }
}

export async function getReceptorByDocumento(numero_documento: string): Promise<IReceptor> {
    try {
     const receptor = await executeQuery<IReceptor[]>(
        process.env.DB_DATABASE_AUXILIAR||"", 
        `SELECT id, tipo_documento,numero_documento,razon_social,direccion,correo,placa FROM Receptores WHERE numero_documento = '${numero_documento}'`
    );
     return receptor[0] as IReceptor;
    } catch (error) {
        console.error("Error fetching getReceptor:");
        console.error(JSON.stringify(error));
        throw error;
    }
}

export async function getReceptorByRazonSocial(razon_social: string): Promise<IReceptor[]> {
    try {
     const receptor = await executeQuery<IReceptor[]>(
        process.env.DB_DATABASE_AUXILIAR||"", 
        `SELECT TOP 10 id, tipo_documento,numero_documento,razon_social,direccion,correo,placa FROM Receptores WHERE estado = 1 AND razon_social like '%${razon_social}%'`
    );   
     return receptor as IReceptor[];
    } catch (error) {
        console.error("Error fetching getReceptor:");
        console.error(JSON.stringify(error));
        throw error;
    }
}