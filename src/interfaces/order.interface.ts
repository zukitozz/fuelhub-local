import { IReceptor } from "./receptor.interface";

export interface IOrder {
    id?: number;
    Receptor?: IReceptor;
    numeracion: string;
    tipo_comprobante: string;
    tipo_facturacion: string;
    numeracion_comprobante: string;
    fecha_emision: string;    
    moneda: string;
    tipo_operacion: string;
    tipo_nota: string;
    tipo_documento_afectado: string;
    numeracion_documento_afectado: string;
    fecha_documento_afectado: string;
    motivo_documento_afectado: string;
    gravadas: number;
    total_igv: number;
    total_venta: number;
    monto_letras: string;
    cadena_para_codigo_qr: string;
    codigo_hash: string;
    pdf: string;
    url: string;
    errors: string;
    id_abastecimiento: number;
    pistola: number;
    codigo_combustible: string;
    dec_combustible: string;
    volumen: number;
    fecha_abastecimiento: string;    
    tiempo_abastecimiento: number;
    volumen_tanque: number;
    comentario: string;    
    tarjeta: number;
    efectivo: number;
    placa: string;
    billete: number;
    producto_precio: number;
    usuarioId: number;
    ruc: string;
    yape: number;
    prefijo?: string;
    items: IOrderItem[];
}

export interface IOrderItem {
    cantidad: number;
    precio: number;
    valor: number;
    igv: number;
    valor_unitario: number;
    precio_unitario: number;
    descripcion: string;
    codigo_producto: string;
    medida: string;
    id_abastecimiento?: number;
    pistola?: number;
    tiempo_abastecimiento?: number;
    fecha_abastecimiento?: string;
    total_inicio?: number;
    total_final?: number;
    // Placa de la línea (facturas de notas de despacho: una línea por nota)
    placa?: string;
    img?: string;
    nombre_producto?: string;
    descuento_aplicado?: boolean;
    precios_sin_descuento?: {
        precio_unitario: number;
        valor_unitario: number;
        precio: number;
        valor: number;
        igv: number;
    };
}