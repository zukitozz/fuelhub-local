export interface IReceptor {
    id: number;
    tipo_documento: string;
    numero_documento: string;
    razon_social: string;
    direccion: string;
    placa: string;
    correo?: string;
    // Credito en soles para notas de despacho; null/0 = sin credito
    credito_limite?: number | null;
}

export interface IReceptorPlaca extends IReceptor {
    placa: string;
}
