'use server';
import { ICodigoBarras, IProduct } from '@/interfaces';
import { executeQuery } from '@/utils/db';

interface TableResponseProductsProps {
  products: IProduct[];
  pageNumbers: number[];
}

export async function getProductos(page: number, perPage: number, keyword?: string): Promise<TableResponseProductsProps> {
    const start = (page * perPage) - (perPage - 1);
    const end = (page * perPage);
    let innerFilter = "";

    if (keyword && keyword.trim() !== "") {
        const cleanKeyword = keyword.trim().replace(/'/g, "''"); // Evita roturas básicas por comillas singulares
        innerFilter = ` AND (nombre LIKE '%${cleanKeyword}%' OR descripcion LIKE '%${cleanKeyword}%')`;
    }

    const query = `select * from (
                SELECT
                    id,nombre,descripcion,imagenes,stock,codigo,medida,precio,valor,estado,color,img, tipo,
                    CAST(CASE WHEN TRY_CAST(codigo AS INT) IN (SELECT DISTINCT TRY_CAST(codigo_producto AS INT) FROM Pistolas) THEN 1 ELSE 0 END AS BIT) AS es_pistola,
                    ROW_NUMBER() OVER (ORDER BY id) AS RowNum
                    FROM Productos WHERE estado = 1
                ${innerFilter}
                ) as Result WHERE RowNum BETWEEN ${start} AND ${end} ;`;

    try {

        const dbName = process.env.DB_DATABASE_AUXILIAR || "";
        const products = await executeQuery<IProduct[]>(dbName, query);

        const total = await executeQuery<{ total: number }[]>(
            dbName, 
            `SELECT COUNT(id) as total FROM Productos WHERE estado = 1 ${innerFilter}`
        );

        const totalRegistros = total[0]?.total || 0;
        const totalPages = Math.ceil(totalRegistros / perPage);

        const pageNumbers = [];
        for (let i = 1; i <= totalPages; i++) {
            pageNumbers.push(i);
        }

        return {
            products,
            pageNumbers
        }
    } catch (error) {
        console.error("Error fetching getProductos:");
        console.error(JSON.stringify(error));
        throw error;
    }
}

export async function getProducto(id: number): Promise<IProduct|undefined> {
    try {
     const productos = await executeQuery<IProduct[]>(
        process.env.DB_DATABASE_AUXILIAR||"",
        `
        SELECT
            id,nombre,descripcion,imagenes,stock,codigo,medida,precio,valor,estado,color,img, tipo
        FROM Productos
        WHERE
            id = ${id}`
    );

     if (!productos || productos.length === 0) {
        //id=0 (producto nuevo desde el boton "Nuevo") no existe en la tabla: la pagina ya
        //cae al formulario vacio (initialProductForm) cuando esto devuelve undefined, igual
        //que getGasto/getDeposito para sus propios formularios de alta.
        return undefined;
    }
    const producto = productos[0];
    const detalle = await executeQuery<ICodigoBarras[]>(
        process.env.DB_DATABASE_AUXILIAR||"",
        `
            select id,ProductoId,codigo_barras,estado from CodigosBarras where ProductoId = ${producto.id};
        `
    );
    producto.codigosBarras = detalle;
    return producto;

    } catch (error) {
        console.error("Error fetching getProducto:");
        console.error(JSON.stringify(error));
        throw error;
    }
}

export async function getProductoPorCodigo(codigo: string): Promise<IProduct> {
    try {
     const productos = await executeQuery<IProduct[]>(
        process.env.DB_DATABASE_AUXILIAR||"", 
        `SELECT id,nombre,descripcion,imagenes,stock,codigo,medida,precio,valor,estado,color,img, tipo FROM Productos WHERE codigo = '${codigo}'`
    );
     return productos[0] as IProduct;
    } catch (error) {
        console.error("Error fetching getProducto:");
        console.error(JSON.stringify(error));
        throw error;
    }
}

export async function getProductosLista(): Promise<IProduct[]> {
    try {
     const productos = await executeQuery<IProduct[]>(
        process.env.DB_DATABASE_AUXILIAR||"", 
        `SELECT id,nombre,descripcion,imagenes,stock,codigo,medida,precio,valor,estado,color,img, tipo FROM Productos WHERE estado = 1`
    );
     return productos as IProduct[];
    } catch (error) {
        console.error("Error fetching getProductosLista:");
        console.error(JSON.stringify(error));
        throw error;
    }
}

interface ICodigoBarrasResponse {
    producto: IProduct|null;
    message: string;
    status: boolean;
}

export async function getProductosPorCodigoBarra(codigo_barras: string): Promise<ICodigoBarrasResponse> {
    let message = `Codigo de barras no encontrado: ${codigo_barras}`;
    try {
        const productos = await executeQuery<IProduct[]>(
            process.env.DB_DATABASE_AUXILIAR||"", 
            `
            SELECT TOP 1 p.id,p.nombre,p.descripcion,p.imagenes,p.stock,p.codigo,p.medida,p.precio,p.valor,p.estado,p.color,p.img, p.tipo 
            FROM Productos p 
            INNER JOIN CodigosBarras cb ON p.id = cb.ProductoId and cb.estado = 1 
            WHERE cb.codigo_barras = '${codigo_barras}'
        `);
        if(!productos || productos.length === 0) {
            return {
                producto: null,
                message: `Producto no encontrado para el código de barras: ${codigo_barras}`,
                status: false
            }
        }
        return {
            producto: productos[0],
            message: `Producto encontrado para el código de barras: ${codigo_barras}`,
            status: true
        }
    } catch (error) {
        console.error("Error fetching getProductosPorCodigoBarra:");
        console.error(JSON.stringify(error));
        return {
            producto: null,
            message: `Error al buscar el producto para el código de barras: ${codigo_barras}`,
            status: false
        }
    }
}