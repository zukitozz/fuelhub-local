'use server';
import { IDescuento, IDescuentoTable } from '@/interfaces';
import { executeQuery } from '@/utils/db';

interface TableResponseDescuentoProps {
  descuentos: IDescuentoTable[];
  pageNumbers: number[];
}

export async function getDescuentos(page: number, perPage: number, keyword?: string): Promise<TableResponseDescuentoProps> {
    const start = (page * perPage) - (perPage - 1);
    const end = (page * perPage);

    let innerFilter = "";
    if (keyword && keyword.trim() !== "") {
        const cleanKeyword = keyword.trim().replace(/'/g, "''"); // Evita roturas básicas por comillas singulares
        innerFilter = ` WHERE (d.numero_documento LIKE '%${cleanKeyword}%' OR r.razon_social LIKE '%${cleanKeyword}%')`;
    }   

    const query = `select * from (
                SELECT d.id,d.codigo_producto,d.numero_documento as documento,d.monto_descuento,d.tipo,d.fecha,d.estado,r.razon_social as cliente, p.nombre as descripcion_producto, 
                ROW_NUMBER() OVER (ORDER BY d.id) AS RowNum 
                FROM Descuentos d INNER JOIN Receptores r on d.numero_documento = r.numero_documento 
                INNER JOIN Productos p on d.codigo_producto = p.codigo 
                ${innerFilter}
            ) as Result 
            WHERE RowNum BETWEEN ${start} AND ${end};`
    try {

        const dbName = process.env.DB_DATABASE_AUXILIAR || "";

        const products = await executeQuery<IDescuentoTable[]>(dbName,query);
        

        const total = await executeQuery<[]>(
                dbName, 
                `SELECT d.id 
                FROM Descuentos d 
                INNER JOIN Receptores r on d.numero_documento = r.numero_documento 
                INNER JOIN Productos p on d.codigo_producto = p.codigo
                ${innerFilter}
            `);        
        const pageNumbers = [];
        for (let i = 1; i <= Math.ceil(total.length / perPage); i++) {
            pageNumbers.push(i);
        }

        return {
            descuentos : products as IDescuentoTable[],
            pageNumbers
        }
    } catch (error) {
        console.error("Error fetching getDescuentos:");
        console.error(JSON.stringify(error));
        throw error;
    }
}

export async function getDescuento(id: number): Promise<IDescuentoTable> {
    try {
     const descuentos = await executeQuery<IDescuentoTable[]>(
        process.env.DB_DATABASE_AUXILIAR||"", 
        `SELECT d.id,d.codigo_producto,d.numero_documento,d.monto_descuento,d.tipo,d.fecha,d.estado,r.razon_social as cliente, p.nombre as descripcion_producto FROM Descuentos d INNER JOIN Receptores r on d.numero_documento = r.numero_documento INNER JOIN Productos p on d.codigo_producto = p.codigo WHERE d.id = ${id}`
    );
     return descuentos[0] as IDescuentoTable;
    } catch (error) {
        console.error("Error fetching getDescuento:");
        console.error(JSON.stringify(error));
        throw error;
    }
}

export async function getDescuentosByNumeroDocumento(numeroDocumento: string): Promise<IDescuento[]> {
    try {
        const descuentos = await executeQuery<IDescuento[]>(
            process.env.DB_DATABASE_AUXILIAR||"",
            `SELECT id,codigo_producto,numero_documento,monto_descuento,tipo,fecha,estado FROM Descuentos WHERE numero_documento = '${numeroDocumento}' AND estado = 1`
        );
        return descuentos as IDescuento[];
    } catch (error) {
        console.error("Error fetching getDescuentosByNumeroDocumento:");
        console.error(JSON.stringify(error));
        throw error;
    }
}