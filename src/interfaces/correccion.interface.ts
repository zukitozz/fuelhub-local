export type EstadoCorreccion = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';

// Datos que el grifero propone para corregir un comprobante
export interface ICorreccionInput {
    ComprobanteId: number;
    numero_documento: string;
    razon_social: string;
    direccion: string;
    placa: string;
    celular: string;
    efectivo: number;
    tarjeta: number;
    yape: number;
    observaciones: string;
    // Solo administrador: el comprobante nuevo es una nota de despacho (con la fecha de la factura original)
    notaDespacho?: boolean;
    // Texto que se imprime en el comprobante nuevo (solo lo usa el administrador al modificar). Opcional.
    comentario?: string;
}

export interface ISolicitudCorreccion {
    id: number;
    ComprobanteId: number;
    numeracion_comprobante: string;
    tipo_documento: string;
    numero_documento: string;
    razon_social: string;
    direccion: string | null;
    placa: string | null;
    celular: string | null;
    pago_efectivo: number;
    pago_tarjeta: number;
    pago_yape: number;
    observaciones: string;
    UsuarioId: number;
    IslaId: number;
    fecha_solicitud: string;
    estado: EstadoCorreccion;
    AdministradorId: number | null;
    fecha_resolucion: string | null;
    motivo_rechazo: string | null;
    nc_numeracion: string | null;
    nuevo_numeracion: string | null;
    // Comentario que se imprime en el comprobante nuevo (null = conserva el del original)
    comentario_comprobante?: string | null;
    // '50' cuando el administrador convierte el comprobante en nota de despacho; null = factura/boleta segun el documento
    tipo_comprobante_nuevo?: string | null;
    // Nombre del usuario que la solicitó (join con Usuarios)
    usuario?: string;
}

// Fila del bloque "Correcciones pendientes de aprobar" del histórico del administrador
export interface IResumenSolicitudPendiente {
    id: number;
    ComprobanteId: number;
    numeracion_comprobante: string;
    total: number;
    numero_documento: string;
    razon_social: string;
    observaciones: string;
    usuario: string | null;
    isla: string | null;
    fecha_solicitud: string;
}

export interface IRespuestaCorreccion {
    status: boolean;
    message: string;
    // Solo administrador (verificarCorreccion): el comprobante supera el tope de dias y solo puede pasar a nota de despacho
    soloNotaDespacho?: boolean;
    // Fecha de emision del comprobante original (AAAA-MM-DD)
    fechaEmision?: string;
}
