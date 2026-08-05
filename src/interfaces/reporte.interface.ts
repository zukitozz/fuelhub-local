export interface IReporteCierrePorDia {
    codigo: string;
    producto: string;
    cantidad: number;
    total: number;
}

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

// Comprobantes distintos por tipo de movimiento. Un comprobante puede llevar varios
// productos, asi que el total de una seccion no es la suma de las filas.
export interface IReporteCierreDiarioConteo {
    tipo: TipoMovimientoCierreDiario;
    es_combustible: number;
    ventas: number;
}

export interface IReporteCierreDiario {
    detalle: IReporteCierreDiarioDetalle[];
    conteos: IReporteCierreDiarioConteo[];
}

export interface IReporteDeclaracionMensual {
    tipo_comprobante: string;
    tipo_documento: string;
    numero_documento: string;
    numeracion_comprobante: string;
    tipo_documento_afectado: string;
    numeracion_documento_afectado: string;
    fecha_emision: string;
    hora: string;
    total_gravadas: string;
    total_igv: string;
    total_venta: string;
    dec_combustible: string;
    volumen: string;
    pistola: string;
    tiempo_abastecimiento: string;
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
}