export type TipoMovimientoCierreDiario = 'VENTA' | 'DESPACHO' | 'SERAFIN';

export interface IReporteCierreDiarioDetalle {
    codigo: string;
    producto: string;
    medida: string;
    tipo: TipoMovimientoCierreDiario;
    ventas: number;
    volumen: number;
    soles: number;
}

// Comprobantes distintos por tipo de movimiento, separando combustible de otros
// productos. Un comprobante puede llevar varios productos, asi que el total de una
// seccion no es la suma de las filas.
export interface IReporteCierreDiarioConteo {
    tipo: TipoMovimientoCierreDiario;
    es_combustible: number;
    ventas: number;
}

export interface IReporteCierreDiario {
    detalle: IReporteCierreDiarioDetalle[];
    conteos: IReporteCierreDiarioConteo[];
}

//Una fila por item del comprobante: los importes salen del item (valor_venta / igv_venta),
//que suman exactamente los totales del comprobante, para que la columna no duplique montos.
export interface IReporteDeclaracionMensual {
    //id y total_venta son del comprobante: sirven para agrupar las filas (que vienen
    //abiertas por item) al mostrarlas en la tabla de pantalla.
    id: number;
    hora: string;
    total_venta: number;
    volumen: number;
    //fecha_emision y fecha_documento_afectado son columnas 'date' en SQL Server:
    //el driver las entrega como Date, no como texto.
    fecha_emision: string | Date;
    tipo_comprobante: string;
    numeracion_comprobante: string;
    tipo_documento: string;
    numero_documento: string;
    razon_social: string;
    descripcion: string;
    cantidad_venta: number;
    valor_venta: number;
    igv_venta: number;
    fecha_documento_afectado: string | Date;
    tipo_documento_afectado: string;
    numeracion_documento_afectado: string;
    precio: number;
    tipo_moneda: string;
    pago_efectivo: number;
    pago_tarjeta: number;
    pago_yape: number;
    //RUC del emisor: es el mismo en todas las filas
    ruc: string;
}

export interface IReporteCierreTurno {
    turno: string;
    fecha: string;
    nombre: string;
    efectivo: number;
    yape: number;
    tarjeta: number;
    total: number;
}

export interface IReporteCierreTurnoProductos {
    turno: string;
    producto: string;
    total_cantidad: number;
    total_soles: number;
    despacho_cantidad: number;
    despacho_soles: number;
    calibracion_cantidad: number;
    calibracion_soles: number;
}

export interface IReporteComprobantes {
    id: number;
    fecha: string;
    comprobante: string;
    receptor: string;
    usuario: string;
    url: string;
    total: number;
    // Productos del comprobante, separados por coma cuando lleva mas de uno
    productos: string;
}