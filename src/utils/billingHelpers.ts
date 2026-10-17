// @/utils/billingHelpers.ts (o donde prefieras estructurarlo)
import { Comprobante } from "@/model";
import { IAbastecimiento, IComprobanteAdminItem, IReceptor } from "@/interfaces";
import { Constants } from "@/utils";

export const buildComprobanteFromAbastecimiento = ({
  abastecimiento,
  usuarioId,
  islaId,
  numeroDocumento = "0",
  razonSocial = "PUBLICO EN GENERAL",
  tipoDocumento = Constants.TIPO_DOCUMENTO.DNI, // O el mapeo correspondiente para público general
  tipoComprobante = Constants.TIPO_COMPROBANTE.BOLETA
}: {
  abastecimiento: IAbastecimiento;
  usuarioId: number;
  islaId: number;
  numeroDocumento?: string;
  razonSocial?: string;
  tipoDocumento?: string;
  tipoComprobante?: string;
}) => {
  
  // 1. Calcular información de precios y montos base (Replica lo que hace tu Summary/Store)
  const total = abastecimiento.valorTotal;
  // Ajusta estas fórmulas según cómo calcula el IGV tu sistema (aquí asumiendo el factor peruano 1.18)
  const subTotal = Number((total / 1.18).toFixed(2));
  const totalIgv = Number((total - subTotal).toFixed(2));

  // 2. Estructurar el Receptor
  const receptor: IReceptor = {
    id: 0,
    tipo_documento: tipoDocumento,
    numero_documento: numeroDocumento,
    razon_social: razonSocial,
    direccion: "",
    placa: ""
  };

  // 3. Estructurar el Item del Comprobante (basado en el único abastecimiento)
  // Nota: Dado que IAbastecimiento puede usar propiedades distintas a IOrderItem, adaptamos los campos fijos
  const precioUnitario = abastecimiento.precioUnitario;
  const valorUnitario = Number((precioUnitario / 1.18).toFixed(4));
  const cantidad = abastecimiento.volTotal;
  const valorVenta = Number((valorUnitario * cantidad).toFixed(2));
  const igvItem = Number((total - valorVenta).toFixed(2));

  const item: IComprobanteAdminItem = {
    cantidad: cantidad.toString(),
    precio_unitario: precioUnitario.toString(),
    valor_unitario: valorUnitario.toString(),
    igv: igvItem.toString(),
    descripcion: abastecimiento.nombre, // O el campo de descripción correspondiente
    codigo_producto: abastecimiento.codigoCombustible.toString() || "",
    medida: abastecimiento.medida || "GLN",
    valor_venta: valorVenta,
    precio_venta: total,
    valor: valorUnitario,
    precio: precioUnitario,
    igv_venta: igvItem,
    codigo: 0,
    cantidad_venta: cantidad
  };

  //null si el despacho no trae hora: el modelo usa la hora local en ese caso
  const fecha_abastecimiento = abastecimiento.fechaHora ? new Date(abastecimiento.fechaHora) : null;
  const tiempo_abastecimiento = abastecimiento.tiempo || 0;
  const ruc = process.env.NEXT_PUBLIC_RUC || "";

  // 4. Retornar la nueva instancia del modelo Comprobante
  return new Comprobante(
    receptor,
    tipoComprobante,
    subTotal,
    totalIgv,
    total,
    0,      // tarjeta
    total,  // efectivo (por defecto todo a efectivo en autoboleteo)
    0,      // yape
    ruc,
    usuarioId,
    [item],
    "",     // placa
    fecha_abastecimiento,
    tiempo_abastecimiento,
    islaId,
    abastecimiento.idAbastecimiento,
    abastecimiento.pistola,
    abastecimiento.codigoCombustible.toString() || "0",
    cantidad,
    0,
    0,
    null,
    []      // arr_notas vacío para autoboleteo
  );
};