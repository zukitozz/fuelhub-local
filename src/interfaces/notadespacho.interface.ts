import { IComprobanteAdmin } from "./comprobante.interface";
import { IOrderItem } from "./order.interface";

export interface INotaDespacho {
    valor: number;
    precio: number;
    igv: number;
    descripcion: string;
    items: IComprobanteAdmin[];
    // Una línea por cada ítem de las notas seleccionadas, con la placa ya editada
    lineas: IOrderItem[];
}