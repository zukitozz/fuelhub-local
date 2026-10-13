'use server';
import { ICompraCompleta, ICompraDetalleTable, ICompraTable, IProductoParaCompra } from '@/interfaces';
import { executeQuery } from '@/utils/db';

interface TableResponseComprasProps {
  compras: ICompraTable[];
  pageNumbers: number[];
}

export async function getCompras(page: number, perPage: number, keyword?: string): Promise<TableResponseComprasProps> {
    const start = (page * perPage) - (perPage - 1);
    const end = (page * perPage);

    let innerFilter = "";
    if (keyword && keyword.trim() !== "") {
        const cleanKeyword = keyword.trim().replace(/'/g, "''");
        innerFilter = ` WHERE (c.proveedor LIKE '%${cleanKeyword}%' OR c.numero_comprobante LIKE '%${cleanKeyword}%')`;
    }

    const query = `select * from (
                SELECT c.id, c.fecha, c.numero_comprobante, c.proveedor, c.total, c.UsuarioId, c.fecha_registro, u.nombre as usuario,
                ROW_NUMBER() OVER (ORDER BY c.id DESC) AS RowNum
                FROM Compras c INNER JOIN Usuarios u on c.UsuarioId = u.id
                ${innerFilter}
            ) as Result
            WHERE RowNum BETWEEN ${start} AND ${end};`
    try {
        const dbName = process.env.DB_DATABASE_AUXILIAR || "";

        const compras = await executeQuery<ICompraTable[]>(dbName, query);

        const total = await executeQuery<[]>(
            dbName,
            `SELECT c.id FROM Compras c INNER JOIN Usuarios u on c.UsuarioId = u.id ${innerFilter}`
        );
        const pageNumbers = [];
        for (let i = 1; i <= Math.ceil(total.length / perPage); i++) {
            pageNumbers.push(i);
        }

        return {
            compras: compras as ICompraTable[],
            pageNumbers
        }
    } catch (error) {
        console.error("Error fetching getCompras:");
        console.error(JSON.stringify(error));
        throw error;
    }
}

export async function getCompra(id: number): Promise<ICompraCompleta | undefined> {
    try {
        const dbName = process.env.DB_DATABASE_AUXILIAR || "";
        const compras = await executeQuery<ICompraTable[]>(
            dbName,
            `SELECT c.id, c.fecha, c.numero_comprobante, c.proveedor, c.total, c.UsuarioId, c.fecha_registro, u.nombre as usuario
             FROM Compras c INNER JOIN Usuarios u on c.UsuarioId = u.id WHERE c.id = ${id}`
        );
        const compra = compras[0];
        if (!compra) { return undefined; }

        const detalle = await executeQuery<ICompraDetalleTable[]>(
            dbName,
            `SELECT d.id, d.CompraId, d.ProductoId, d.cantidad, d.costo_unitario, d.subtotal, p.nombre as nombre_producto, p.medida
             FROM ComprasDetalle d INNER JOIN Productos p on d.ProductoId = p.id WHERE d.CompraId = ${id}`
        );

        return { ...compra, detalle };
    } catch (error) {
        console.error("Error fetching getCompra:");
        console.error(JSON.stringify(error));
        throw error;
    }
}

export async function getProductosParaCompra(): Promise<IProductoParaCompra[]> {
    try {
        const productos = await executeQuery<IProductoParaCompra[]>(
            process.env.DB_DATABASE_AUXILIAR || "",
            `SELECT id, nombre, codigo, medida, stock FROM Productos
             WHERE estado = 1 AND TRY_CAST(codigo AS INT) NOT IN (SELECT DISTINCT TRY_CAST(codigo_producto AS INT) FROM Pistolas)
             ORDER BY nombre`
        );
        return productos as IProductoParaCompra[];
    } catch (error) {
        console.error("Error fetching getProductosParaCompra:");
        console.error(JSON.stringify(error));
        throw error;
    }
}
