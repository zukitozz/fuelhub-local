export interface ICompra {
    id: number;
    fecha: string;
    numero_comprobante: string;
    proveedor: string;
    total: number;
    UsuarioId: number;
    fecha_registro: string;
}

export interface ICompraDetalle {
    id: number;
    CompraId: number;
    ProductoId: number;
    cantidad: number;
    costo_unitario: number;
    subtotal: number;
}

export interface ICompraDetalleTable extends ICompraDetalle {
    nombre_producto: string;
    medida: string;
}

export interface ICompraTable extends ICompra {
    usuario: string;
}

export interface ICompraCompleta extends ICompraTable {
    detalle: ICompraDetalleTable[];
}

export interface IProductoParaCompra {
    id: number;
    nombre: string;
    codigo: string;
    medida: string;
    stock: number;
}

export interface ICompraLineaForm {
    ProductoId: number;
    cantidad: number;
    costo_unitario: number;
}

export interface ICompraForm {
    id: number;
    fecha: string;
    numero_comprobante: string;
    proveedor: string;
    UsuarioId: number;
    lineas: ICompraLineaForm[];
}
