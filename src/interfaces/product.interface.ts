export interface IProduct {
    id: number;
    nombre: string;
    descripcion: string;
    imagenes?: string[];
    stock: number;
    codigo: string;
    medida: string;
    precio: number;
    valor: number;
    color: string;
    estado: number;
    img: string;
    tipo: string;
    codigosBarras?: ICodigoBarras[]; // Agregamos la propiedad opcional codigosBarras
    es_pistola?: boolean; // true: combustible despachado por pistola, su stock es el tanque (no se gestiona por Compras)
}
export interface IFuelProduct {
    id: number;
    id_auxiliar: string;
    desc: string;
}

export interface ICodigoBarras {
  id?: number;
  codigo_barras: string;
  estado: number; // 1: Activo, 0: Inactivo
}
export interface IProductoStoreResponse {
    producto: IProduct|null;
    message: string;
    status: boolean;
}