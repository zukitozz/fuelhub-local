export interface IAbastecimiento {
  idAbastecimiento: number;
  registro: number;
  pistola: number;
  codigoCombustible: number;
  numeroTanque: number;
  valorTotal: number;
  volTotal: number;
  precioUnitario: number;
  tiempo: number;
  fechaHora: string;
  minutosTranscurridos?: number;
  totInicio: number;
  totFinal: number;
  IDoperador: string;
  IDcliente: string;
  volTanque: number;
  estado: number;
  nombre: string;
  color: string;
  medida: string;
}

export enum EstadosAbastecimiento {
  PENDIENTE = 0,
  ENVIADO = 1
}