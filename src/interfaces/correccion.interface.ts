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
    // Nombre del usuario que la solicitó (join con Usuarios)
    usuario?: string;
}

export interface IRespuestaCorreccion {
    status: boolean;
    message: string;
}
