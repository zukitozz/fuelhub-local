import { IAbastecimiento, IComprobanteAdmin, INotaDespacho, IOrderItem, IProduct } from "@/interfaces";
import { Constants } from "@/utils";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getDescuentosByNumeroDocumento, getProductoPorCodigo } from '@/actions';

interface State {
    items: IOrderItem[];
    notas:IComprobanteAdmin[];
    isBillingBlocked: boolean;
    lockBilling: () => void;
    unlockBilling: () => void;
    getTotalItems: () => number;
    addAbastecimientoToOrder: (item: IAbastecimiento ) => void;
    updateProductQuantity: (product: IOrderItem, quantity: number) => void;
    upgradeProductTotal: (product: IOrderItem, total: number) => void;
    addProductToOrder: (product: IProduct ) => void;
    getSummaryInformation: () => { subTotal: number; totalIgv: number; total: number };
    removeProduct: (product: IOrderItem) => void;
    applyDiscountIfExists: (numeroDocumento: string) => Promise<{ status: boolean; message: string }>;
    removeDiscounts: () => void;
    removeAllProducts: () => void;
    addNotaDespachoToOrder: (item: INotaDespacho) => void;
}

export const useOrderAbastecimientoStore = create<State>()( 
    persist(
        (set, get) => ({
            items: [],
            notas: [],
            isBillingBlocked: false,
            lockBilling: () => set({ isBillingBlocked: true }),
            unlockBilling: () => set({ isBillingBlocked: false }),
            getTotalItems: () => {
                const { items } = get();
                let new_cantidad = 0;
                items.forEach(element => {
                    new_cantidad += (element.medida === "GLL") ? 1 : element.cantidad;
                });
                return new_cantidad;
            },              
            getSummaryInformation: () => {
                const { items } = get();
                const total = Math.round(items.reduce((total, item) => total + item.precio, 0)*100)/100;
                const subTotal = Math.round((total/(1 + Number.parseFloat(process.env.NEXT_PUBLIC_TAX || "0.18")))*100)/100;
                const totalIgv = Math.round((total - subTotal)*100)/100;
                return { subTotal, totalIgv, total };
            },
            addAbastecimientoToOrder: async ({ idAbastecimiento, valorTotal, volTotal, codigoCombustible, precioUnitario ,pistola, tiempo, fechaHora, totInicio, totFinal }: IAbastecimiento) => {
                set({ items: [], notas: [] });
                const producto = await getProductoPorCodigo(codigoCombustible.toString());
                const taxRate = Number.parseFloat(process.env.NEXT_PUBLIC_TAX || "0.18");
                const recalculateCantidad = process.env.NEXT_PUBLIC_RECALCULATE_CANTIDAD === 'true';
                const orderItem: IOrderItem = {
                    cantidad: recalculateCantidad? Math.round((valorTotal/precioUnitario)*1000)/1000 : volTotal,
                    precio: valorTotal,
                    valor: Math.round((valorTotal/(1 + taxRate))*10000000000)/10000000000,
                    igv: Math.round((valorTotal - valorTotal/(1 + taxRate))*100)/100,
                    valor_unitario: Math.round((precioUnitario/(1 + taxRate))*10000000000)/10000000000,
                    precio_unitario: precioUnitario,
                    descripcion: producto?.descripcion || "Combustible",
                    codigo_producto: codigoCombustible.toString() || "",
                    medida: Constants.MEDIDA.GALON,
                    id_abastecimiento: idAbastecimiento ?? null,
                    pistola: pistola,
                    tiempo_abastecimiento: tiempo,
                    fecha_abastecimiento: fechaHora,
                    total_inicio: totInicio,
                    total_final: totFinal
                }
                set({ items: [orderItem] });

            },
            addProductToOrder: (product: IProduct) => {
                const { items } = get();
                const productInOrder = items.some(item => item.codigo_producto === product.codigo);
                const taxRate = Number.parseFloat(process.env.NEXT_PUBLIC_TAX || "0.18");
                // El valor se calcula desde el precio: Productos.valor puede estar desfasado
                const valor = Math.round((product.precio/(1 + taxRate))*10000000000)/10000000000;
                const productItem: IOrderItem = {
                    cantidad: 1,
                    precio: product.precio,
                    valor,
                    igv: Math.round((product.precio - valor)*100)/100,
                    valor_unitario: valor,
                    precio_unitario: product.precio,
                    descripcion: product.nombre,
                    codigo_producto: product.codigo,
                    medida: product.medida,
                    img: product.img
                }                
                if(!productInOrder){
                    set({ items: [...items, productItem] });
                    return;
                }
                const updatedItems = items.map(item => {
                    if(item.codigo_producto === productItem.codigo_producto){
                        const updatedCantidad = item.cantidad + productItem.cantidad;
                        const updatedValor = Math.round((item.valor + productItem.valor)*10000000000)/10000000000;
                        const updatedIgv = Math.round((item.igv + productItem.igv)*100)/100;
                        const updatedPrecio = Math.round((item.precio + productItem.precio)*100)/100;
                        return { ...item, cantidad: updatedCantidad, valor: updatedValor, igv: updatedIgv, precio: updatedPrecio };
                    }
                    return item;
                });
                set({ items: updatedItems });
            },
            addNotaDespachoToOrder: ({ valor, precio, igv, descripcion, items }: INotaDespacho) => {
                set({ items: [], notas: [] });
                const despachoItem: IOrderItem = {
                    cantidad: 1,
                    precio,
                    valor,
                    igv,
                    valor_unitario: valor,
                    precio_unitario: precio,
                    descripcion: descripcion ?? "Producto de nota de despacho",
                    codigo_producto: '',
                    medida: 'NIU',
                    img: ''
                }
                set({ items: [despachoItem], notas: items });
            },
            updateProductQuantity: (product: IOrderItem, quantity: number) => {
                const { items } = get();
                const updatedItems = items.map((item) => {
                    if (item.codigo_producto === product.codigo_producto) {
                        const precio = Math.round((item.precio_unitario * quantity)*100)/100;
                        const valor = Math.round((item.valor_unitario * quantity)*10000000000)/10000000000;
                        const igv = Math.round((precio - valor)*100)/100;
                        return { 
                            ...item, precio, valor, igv, cantidad: quantity
                        };
                    }
                    return item;
                });
                set({ items: updatedItems });
            },
            upgradeProductTotal: (product: IOrderItem, total: number) => {
                const { items } = get();
                const updatedItems = items.map((item) => {
                    if (item.codigo_producto === product.codigo_producto) {
                        const quantity = Math.round((total / item.precio_unitario)*1000)/1000;
                        const precio = Math.round((total)*100)/100;
                        const valor = Math.round((precio/(1 + Number.parseFloat(process.env.NEXT_PUBLIC_TAX || "0.18")))*10000000000)/10000000000;
                        const valor_unitario = Math.round((valor/quantity)*10000000000)/10000000000;
                        const igv = Math.round((precio - valor)*100)/100;
 
                        return { 
                            ...item, precio, valor, valor_unitario, igv, cantidad: quantity
                        };
                    }
                    
                    return item;
                });
                set({ items: updatedItems });
            },
            removeProduct: (product: IOrderItem) => {
                const { items } = get();
                const updatedItems = items.filter(
                (item) => item.codigo_producto !== product.codigo_producto
                );

                set({ items: updatedItems });
            },
            applyDiscountIfExists: async (numeroDocumento: string) => {
                let status = false;
                if(!numeroDocumento) return { status, message: "Número de documento no válido" };
                const descuentos = await getDescuentosByNumeroDocumento(numeroDocumento);
                const { items } = get();
                const updatedItems = items.map((item) => {
                    const descuento = descuentos.find(desc => desc.codigo_producto === item.codigo_producto);
                    if (descuento && !item.descuento_aplicado) {
                        status = true;
                        const taxRate = Number.parseFloat(process.env.NEXT_PUBLIC_TAX || "0.18");

                        // Snapshot de los precios originales para poder revertir el descuento
                        const precios_sin_descuento = {
                            precio_unitario: item.precio_unitario,
                            valor_unitario: item.valor_unitario,
                            precio: item.precio,
                            valor: item.valor,
                            igv: item.igv
                        };
                        
                        // 1. Identificar o calcular el descuento por galón (monto unitario)
                        // Si tu descuento de la API ya viene por galón, usa directamente: descuento.monto_descuento
                        // Si viene como un total global para el ítem, descomenta la línea de abajo:
                        // const dsctoPorGalon = descuento.monto_descuento / item.cantidad;
                        const dsctoPorGalon = descuento.monto_descuento; 

                        // 2. Modificar a nivel UNITARIO (Precio por galón con IGV incluido)
                        const nuevoPrecioUnitario = Math.round((item.precio_unitario - dsctoPorGalon) * 10000) / 10000;
                        
                        // 3. Desatar el Valor Unitario (Precio por galón sin IGV)
                        const nuevoValorUnitario = Math.round((nuevoPrecioUnitario / (1 + taxRate)) * 1000000) / 1000000;

                        // 4. Recalcular los TOTALES del ítem multiplicando por la cantidad de galones
                        const nuevoPrecioTotal = Math.round((nuevoPrecioUnitario * item.cantidad) * 100) / 100;
                        const nuevoValorTotal = Math.round((nuevoValorUnitario * item.cantidad) * 100) / 100;
                        const nuevoIgvTotal = Math.round((nuevoPrecioTotal - nuevoValorTotal) * 100) / 100;

                        return { 
                            ...item, 
                            precio_unitario: nuevoPrecioUnitario,
                            valor_unitario: nuevoValorUnitario,
                            precio: nuevoPrecioTotal,          // Total con IGV
                            valor: nuevoValorTotal,            // Total sin IGV
                            igv: nuevoIgvTotal,                // Impuesto total del item
                            descuento_aplicado: true,
                            precios_sin_descuento
                        };
                    }
                    return item;
                });
                set({ items: updatedItems });
                return { status, message: "Descuentos aplicados correctamente" };
            },
            removeDiscounts: () => {
                const { items } = get();
                const updatedItems = items.map((item) => {
                    if (item.descuento_aplicado && item.precios_sin_descuento) {
                        const { precio_unitario, valor_unitario, precio, valor, igv } = item.precios_sin_descuento;
                        return {
                            ...item,
                            precio_unitario, valor_unitario, precio, valor, igv,
                            descuento_aplicado: false,
                            precios_sin_descuento: undefined
                        };
                    }
                    return item;
                });
                set({ items: updatedItems });
            },
            removeAllProducts: () => {
                set({ items: [], notas: [] });
            },
        }),
        {
            name: 'order-abastecimiento-store',
        }
    )
)