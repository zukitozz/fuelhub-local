"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { saveBilling, validatePrevBilling } from "@/actions";
import { useOrderAbastecimientoStore } from "@/store";
import { Constants, initialBillingForm, notify, numbersToLetters } from "@/utils";
import { Direccion, NumeroDocumento, Placa, RazonSocial, TipoComprobanteSelector, TipoPago } from "./form-values";
import { Comprobante } from "@/model";
import { IBillingForm, IComprobanteAdminItem, IOrderItem, IReceptor } from "@/interfaces";

interface Props {
    total: number;
    subTotal: number;
    totalIgv: number;
    orders: IOrderItem[];
}

export const BillingForm = ({ orders, subTotal, totalIgv, total }: Props) => {
    const router = useRouter();
    const { data: session } = useSession();
    const [isProcessing, setIsProcessing] = useState(false);
    
    const removeAllProducts = useOrderAbastecimientoStore((state) => state.removeAllProducts);
    
    // 1. Consumimos las notas del Store de Zustand
    const notas = useOrderAbastecimientoStore((state) => state.notas);
    
    // Determinamos de forma limpia si el formulario debe estar deshabilitado/bloqueado
    const isDisabled = notas.length > 0;

    const [formValues, setFormValues] = useState<IBillingForm>({
        ...initialBillingForm, 
        efectivo: total 
    });

    // 2. EFECTO PROFESIONAL: Escucha cambios en 'total' y en 'notas' de forma unificada
    useEffect(() => {
        if (notas.length > 0) {
            // Tomamos la primera nota como referencia para extraer los datos del cliente
            const primeraNota = notas[0];
            
            setFormValues(prevValues => ({
                ...prevValues,
                tipoComprobante: Constants.TIPO_COMPROBANTE.FACTURA, // Por defecto Factura si viene de Nota de Despacho
                tipoDocumento: Constants.TIPO_DOCUMENTO.RUC,   // Por defecto RUC
                numeroDocumento: primeraNota.Receptor.numero_documento || '',
                razonSocial: primeraNota.Receptor.razon_social || '',
                direccion: primeraNota.Receptor.direccion || '',
                efectivo: total // Mantiene el total actualizado
            }));
        } else {
            // Si no hay notas, solo aseguramos que el efectivo refleje el total actual
            setFormValues(prevValues => ({ ...prevValues, efectivo: total }));
        }
    }, [total, notas]); // Se gatilla de forma precisa si el total cambia o si seleccionan otra nota
    

    const { tipoComprobante, tipoDocumento, numeroDocumento, razonSocial, placa, direccion, efectivo, tarjeta, yape } = formValues;

    const getTitle = () => {
        if (tipoComprobante === Constants.TIPO_COMPROBANTE.NOTA_DESPACHO) return 'NOTA DE DESPACHO';
        if (tipoComprobante === Constants.TIPO_COMPROBANTE.CALIBRACION) return 'SERAFÍN (CALIBRACIÓN)';
        if (tipoDocumento === Constants.TIPO_DOCUMENTO.RUC) return 'FACTURA ELECTRÓNICA';
        if (tipoDocumento === Constants.TIPO_DOCUMENTO.DNI) return 'BOLETA ELECTRÓNICA';
        return 'Datos de venta';
    };

    const validateForm = () => {
        const sumaPagos = Number(efectivo) + Number(tarjeta) + Number(yape);
        if (orders.length === 0) {
            notify({ message: 'No hay productos en la orden', type: 'error' });
            return false;
        }

        if (Math.abs(sumaPagos - total) > 0.01) {
            notify({ message: 'La suma de los pagos no coincide con el total', type: 'error' });
            return false;
        }

        if (tipoComprobante === Constants.TIPO_COMPROBANTE.NOTA_DESPACHO && (tipoDocumento !== Constants.TIPO_DOCUMENTO.RUC || numeroDocumento.length !== 11)) {
            notify({ message: 'La nota de despacho se emite solo con RUC (11 dígitos)', type: 'error' });
            return false;
        }

        if (tipoComprobante === Constants.TIPO_COMPROBANTE.CALIBRACION && tipoDocumento !== Constants.TIPO_DOCUMENTO.DNI) {
            notify({ message: 'El serafín se emite solo con DNI (8 dígitos)', type: 'error' });
            return false;
        }

        //La factura exige RUC: el atajo de mas abajo que saltea las validaciones cuando el
        //documento es "0" es para el consumidor final de las boletas, y sin esta regla dejaba
        //emitir facturas a nombre de clientes varios, que SUNAT no acepta.
        if (tipoComprobante === Constants.TIPO_COMPROBANTE.FACTURA && (tipoDocumento !== Constants.TIPO_DOCUMENTO.RUC || numeroDocumento.length !== 11)) {
            notify({ message: 'La factura se emite solo con RUC (11 dígitos)', type: 'error' });
            return false;
        }

        if(formValues.numeroDocumento != "0"){
            if(!tipoDocumento){
                notify({ message: 'Ingrese un número de documento de 8 u 11 dígitos', type: 'error' });
                return false;            
            }

            if (tipoDocumento === Constants.TIPO_DOCUMENTO.RUC && numeroDocumento.length !== 11) {
                notify({ message: 'El RUC debe tener 11 dígitos', type: 'error' });
                return false;
            }

            if (tipoDocumento === Constants.TIPO_DOCUMENTO.DNI && numeroDocumento.length !== 8) {
                notify({ message: 'El DNI debe tener 8 dígitos', type: 'error' });
                return false;
            }
        }    
        
        if(!formValues.razonSocial || formValues.razonSocial.trim() === "0"){
            notify({ message: 'Ingrese la razón social', type: 'error' });
            return false;
        }    

        return true;
    };    

    const UsuarioId = +(session?.user.id || 0);
    const IslaId = +(session?.user.islaId || 0);

    const handlerProcessBilling = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!validateForm() || isProcessing) return;
        setIsProcessing(true);
        try { 
            await procesarComprobante();
        } finally {
            setIsProcessing(false);
            router.push('/')
        }
    }

    const procesarComprobante = async () => {
        const receptor: IReceptor = {
            id: 0,
            tipo_documento: tipoDocumento,
            numero_documento: numeroDocumento,
            razon_social: razonSocial,
            direccion: direccion,
            placa: placa
        }
        const items:IComprobanteAdminItem[] = [];
        for (const order of orders) {
            const item:IComprobanteAdminItem = {
                cantidad: order.cantidad.toString(),
                precio_unitario: order.precio_unitario.toString(),
                valor_unitario: order.valor_unitario.toString(),
                igv: order.igv.toString(),
                descripcion: order.descripcion,
                codigo_producto: order.codigo_producto,
                medida: order.medida,
                valor_venta: order.valor,
                precio_venta: order.precio,
                valor: order.valor_unitario,
                precio: order.precio_unitario,
                igv_venta: order.igv,
                codigo: 0,
                cantidad_venta: order.cantidad
            };
            items.push(item);
        }
        const order_abastecimiento = orders.find(item => item.id_abastecimiento !== null);
        const fecha_abastecimiento = order_abastecimiento?.fecha_abastecimiento ? new Date(order_abastecimiento.fecha_abastecimiento) : new Date();
        const tiempo_abastecimiento = order_abastecimiento?.tiempo_abastecimiento || 0;
        const id_abastecimiento = order_abastecimiento?.id_abastecimiento || null;
        const cantidad = order_abastecimiento?.cantidad || 0;
        const codigo_producto = order_abastecimiento?.codigo_producto || "";
        const pistola = order_abastecimiento?.pistola || 0;
        const inicio_medidor = order_abastecimiento?.total_inicio || 0;
        const fin_medidor = order_abastecimiento?.total_final || 0;
        const ruc = process.env.NEXT_PUBLIC_RUC || ""
        const arr_notas: number[] = notas.map(nota => nota.id || 0);
        const monto_letras = numbersToLetters(total);

        const comprobante = new Comprobante(
            receptor, tipoComprobante, subTotal, totalIgv, total, tarjeta==''?0: +tarjeta, efectivo==''?0: +efectivo, yape==''?0: +yape, ruc, UsuarioId, items, placa, 
            fecha_abastecimiento, tiempo_abastecimiento, IslaId, id_abastecimiento, pistola, codigo_producto, cantidad, inicio_medidor, fin_medidor, monto_letras, arr_notas
        )

        const validatePrev = await validatePrevBilling(id_abastecimiento);
        if(validatePrev.status){
            notify({message: validatePrev.message, type:'error'})
            return;
        }
        
        const { status, message, bill } = await saveBilling(comprobante.toPlainObject());

        if(status && bill){
            notify({message, type:'success'})
        }else {
            notify({message, type:'error'})
        }
        removeAllProducts();
    }
    
    return (
        <>
        <div className="flex justify-between items-center">
            <h2 className="text-2xl mb-2 font-bold text-slate-800">{getTitle()}</h2>
        </div>
        <TipoComprobanteSelector formValues={formValues} setFormValues={setFormValues} disabled={isDisabled} />
        <div className="flex flex-col mt-5">

            <form onSubmit={handlerProcessBilling} autoComplete="off" className="flex flex-col">
                <div className="grid grid-cols-2 gap-3">
                    {/* Pasamos 'disabled' a los inputs para bloquear edición manual si corresponde */}
                    <NumeroDocumento formValues={formValues} setFormValues={setFormValues}/>
                    <Placa formValues={formValues} setFormValues={setFormValues}/>
                    <RazonSocial formValues={formValues} setFormValues={setFormValues}/>
                    <Direccion formValues={formValues} setFormValues={setFormValues}/>
                    <TipoPago total={total} formValues={formValues} setFormValues={setFormValues} />
                    
                    <div className="col-span-2">
                        <button 
                            className={`${isProcessing ? "btn-disabled" : "btn-primary"} px-5 py-2 mt-3 w-full`} 
                            disabled={isProcessing}
                            type="submit"
                        >
                            {isProcessing ? 'Procesando...' : 'Emitir comprobante'}
                        </button>
                    {/* 3. MENSAJE VISUAL INFO: Informa al operario que los datos provienen de una Nota */}
                    {isDisabled && (
                        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-xs font-medium">
                            ⚠️ Facturación global activa: Los datos del cliente se han cargado automáticamente desde las notas de despacho consolidadas.
                        </div>
                    )}

                    </div>

                </div>
            </form>
        </div>            
        </>
    )
}