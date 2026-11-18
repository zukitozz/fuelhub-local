export interface IBillingForm {
    tipoComprobante: string;
    tipoDocumento: string;
    numeroDocumento: string;
    razonSocial: string;
    placa: string;
    direccion: string;
    efectivo: number|string;
    tarjeta: number|string;
    yape: number|string;
    fechaEmision: string;
    // Venta al credito (factura/boleta a un cliente con credito)
    esCredito?: boolean;
}