import { IBillingForm, IDepositos, IDescuentoTable, IGastos, IProduct, IReceptor, ISerieTable, IUser } from "@/interfaces";
import { Constants } from "./constants";

export const initialBillingForm: IBillingForm = {
    numeroDocumento: '',
    razonSocial: '',
    placa: '',
    direccion: '',
    tipoComprobante: "",
    tipoDocumento: "",
    efectivo: 0,
    tarjeta: 0,
    yape: 0,
    fechaEmision: "",
}

export const initialProductForm: IProduct = {
    id: 0,
    nombre: "",
    descripcion: "",
    stock: 0,
    codigo: "",
    medida: "",
    precio: 0,
    valor: 0,
    color: "",
    estado: 0,
    img: "",
    tipo: "VENTA_ISLA"
}

export const initialGastoForm: IGastos = {
    id: 0,
    concepto: "",
    monto: 0,
    usuario_gasto: "",
    autorizado: "",
    turno: "",
    fecha: "",
    UsuarioId: 0
}
export const initialDepositoForm: IDepositos = {
    id: 0,
    concepto: "",
    monto: 0,
    usuario: "",
    turno: "",
    fecha: "",
    UsuarioId: 0
}

export const initialUserForm: IUser = {
    id: 0,
    nombre: "",
    usuario: "",
    correo: "",
    img: "",
    rol: "USER_ROLE",
    estado: 0,
    EmisorId: 0
}

export const initialReceptorForm: IReceptor = {
    id: 0,
    tipo_documento: "",
    numero_documento: "",
    razon_social: "",
    direccion: "",
    placa: ""
}

export const initialDescuentoForm: IDescuentoTable = {
    id: 0,
    codigo_producto: "",
    numero_documento: "",
    monto_descuento: 0,
    tipo: "",
    fecha: "",
    estado: 1,
    descripcion_producto: "",
    cliente: "",
}

export const initialSerieForm: ISerieTable = {
    id: 0,
    codigo_proposito: Constants.CODIGO_PROPOSITO.INTERNA,
    tipo_comprobante: "",
    serie: "",
    estado: 1,
    descripcion: "",
    fecha_retroactiva: false,
    numeracion_actual: null,
    fecha_ultimo_comprobante: null,
}


