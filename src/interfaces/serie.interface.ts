export interface ISerie {
    id: number;
    codigo_proposito: string;
    tipo_comprobante: string;
    serie: string;
    estado: number;
    descripcion: string;
    fecha_retroactiva: boolean;
}

export interface ISerieTable extends ISerie {
    numeracion_actual: string | null;
    fecha_ultimo_comprobante: string | null;
}
