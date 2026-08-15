import { IReceptor } from "./receptor.interface";

export interface IComprobanteAdmin {
    id?: number;
    tipo_comprobante: string;
    numeracion: string;
    numeracion_comprobante: string;
    fecha_emision: string;
    tipo_moneda: string;
    tipo_operacion: string;
    tipo_nota: string|null;
    tipo_documento_afectado: string|null;
    fecha_documento_afectado: string|null;
    numeracion_documento_afectado: string|null;
    motivo_documento_afectado: string|null;
    gravadas: number;
    igv: number;
    total: number;
    monto_letras: string|null;
    cadena_para_codigo_qr?: string;
    codigo_hash?: string;
    pdf?: string;
    url?: string;
    errors?: string;
    id_abastecimiento: number| null;
    pistola?: number;
    inicio_medidor?: number;
    fin_medidor?: number;
    codigo_combustible: string;
    dec_combustible: string;
    volumen: number;
    fecha_abastecimiento: string | null; 
    tiempo_abastecimiento: number | null;
    volumen_tanque: number;
    comentario: string;    
    tarjeta: number;
    efectivo: number;
    yape: number;    
    placa: string|null;
    billete?: number;
    producto_precio: number| null;
    ruc: string;
    enviado: number;
    estado_nota_despacho: string|null;
    comprobante_nota_despacho: string|null;
    fecha_facturado_nota_despacho: string|null;
    Receptor: IReceptor;
    ReceptorId?: number;
    UsuarioId: number;    
    fecha_hora: string;
    xml_envio?: string;
    impresion?: number;
    IslaId: number;
    notas?: number[];
    items: IComprobanteAdminItem[];
}
export interface IComprobanteAdminItem {
    cantidad: string;
    precio_unitario: string;
    valor_unitario: string;
    igv: string;
    descripcion: string;
    codigo_producto: string;
    medida: string;
    valor_venta: number;
    precio_venta: number;
    valor: number;
    precio: number;
    igv_venta: number;
    codigo: number
    cantidad_venta: number;
}
export interface ICartProduct {
    cantidad_string: string;
    precio_unitario_string: string;
    valor_unitario_string: string;
    igv_string: string;
    descripcion: string;
    codigo_producto: string;
    medida: string;
    valor_venta: number;
    precio_venta: number;
    valor: number;
    precio: number;
    igv_venta: number;
    codigo: number
    cantidad_venta: number;
    
    
}

export interface IComprobanteHistorico extends IComprobanteAdmin {
    turno: string;
    isla: string;
    usuario: string;
    // Indicador (0/1) de si el comprobante tiene el PDF guardado localmente, no el binario en si.
    pdf_bytes?: number;
}

export interface IComprobantePDF {
    NumeracionComprobante: string;
    Isla: string;
    Pistola: string;
    Placa: string;

    InicioMedidor: string;
    FinMedidor: string;

    Efectivo: number;
    Tarjeta: number;
    Yape: number;

    EmisorRazonSocial: string;
    EmisorRuc: string;
    EmisorDireccion: string;
    TipoComprobante: string;
    ReceptorRazonSocial: string;
    ReceptorRuc: string;
    ReceptorDireccion: string;

    CodigoHash: string;

    FechaEmision: string;
    FechaVencimiento: string;
    NumeroOrdenCompra: string;
    NumeroGuiaRemision: string;
    CondicionPago: string;
    MontoLetras: string;
    TotalGravadas: number;
    TotalIgv: number;
    TotalVenta: number;
    Items: IComprobantePDFItem[];
}

export interface IComprobantePDFItem {
    codigo: string;
    cantidad: string;
    medida: string;
    descripcion: string;
    total_unitario: number;
    precio_unitario: number;
}

