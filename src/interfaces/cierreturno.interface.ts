import { IUser } from ".";

export interface ICierreTurnoDetalle {
    codigo: string;
    producto: string;
    medida: string;
    total_cantidad: number;
    total_soles: number;
    calibracion_cantidad: number;
    calibracion_soles: number;   
    despacho_cantidad: number;
    despacho_soles: number;
}

export interface ICierreTurnoSoles {
    efectivo: number;
    tarjeta: number;
    yape: number;
}

export interface IGastos {
    id: number;
    concepto: string;
    monto: number;    
    usuario_gasto: string;
    autorizado: string;
    turno: string;
    fecha: string;
    UsuarioId: number;
}

export interface IDepositos {
    id: number;
    concepto: string;
    monto: number;  
    usuario: string;  
    turno: string;
    fecha: string;
    UsuarioId: number;
      
}

export interface ICierreTurno {
    id: number;
    total: number;
    fecha: string;
    turno: string;
    isla: string;
    efectivo: number;
    tarjeta: number;
    yape: number;
    UsuarioId: number;
    CierrediaId?: number|null;
    observaciones?: string|null;
    billetes_contado?: number|null;
    monedas_contado?: number|null;
    tarjeta_contado?: number|null;
    transferencia_contado?: number|null;
    yape_contado?: number|null;
    falsos_contado?: number|null;
    actualizado_por?: number|null;
    fecha_actualizacion?: string|null;
    detalle?: ICierreTurnoDetalle[];
    usuario?: IUser;
    depositos?: IDepositos[];
    gastos?: IGastos[];
}

export interface ICierreTurnoResponse {
    message: string;
    status: boolean;
}

export interface IEditarCierreTurno {
    id: number;
    observaciones: string;
    billetes_contado: number|null;
    monedas_contado: number|null;
    tarjeta_contado: number|null;
    transferencia_contado: number|null;
    yape_contado: number|null;
    falsos_contado: number|null;
    gastos: IGastos[];
    depositos: IDepositos[];
}

export interface IUsuarioTurnoAbierto {
    UsuarioId: number;
    nombre: string;
    turno: string;
    isla: string;
    pendientes: number;
    desde: string;
}