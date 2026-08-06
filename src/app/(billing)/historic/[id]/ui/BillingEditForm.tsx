"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { saveBilling, saveCheckNc } from "@/actions";
import { Constants, notify, toLocaleStorage } from "@/utils";
import { IBillingForm, IComprobanteAdmin } from "@/interfaces";
import { NumeroDocumento, Placa, RazonSocial, Direccion, TipoPago } from "@/app/(billing)/invoice/[id]/ui/form-values";

interface Props {
        billing: IComprobanteAdmin;
}

export const BillingEditForm = ({ billing }: Props) => {
    const router = useRouter();
    const { data: session } = useSession();
    const [isProcessing, setIsProcessing] = useState(false);
    // Una vez emitida la NC no se puede volver a emitir desde este formulario
    const [emitido, setEmitido] = useState(false);
    // El estado no bloquea un doble clic rapido: el segundo evento puede leer el valor
    // anterior antes de que React vuelva a renderizar. El ref si es sincrono.
    const enProceso = useRef(false);
    // Datos del comprobante original, congelados antes de que emitir mute `billing`
    const documentoAfectado = useRef({
        numeracion: billing.numeracion_comprobante || "",
        tipo: billing.tipo_comprobante,
        fecha: billing.fecha_emision || "",
    });

    const { total, items } = billing;

    const form: IBillingForm = {
        tipoComprobante: billing.tipo_comprobante,
        tipoDocumento: billing.Receptor?.tipo_documento || "",
        numeroDocumento: billing.Receptor?.numero_documento || "",
        razonSocial: billing.Receptor?.razon_social || "",
        direccion: billing.Receptor?.direccion || "",
        placa: billing.Receptor?.placa || "",
        efectivo: billing.efectivo,
        tarjeta: billing.tarjeta,
        yape: billing.yape
    }

    const [formValues, setFormValues] = useState<IBillingForm>(form);

    useEffect(() => {
        setFormValues(prevValues => ({ ...prevValues, efectivo: total }));
    }, [total])
    

    const { tipoDocumento, numeroDocumento, razonSocial, efectivo, tarjeta, yape } = formValues;
    // Mientras procesa, y despues de emitir hasta que la navegacion complete
    const botonBloqueado = isProcessing || emitido;

    const getTitle = () => {
        if (tipoDocumento === Constants.TIPO_DOCUMENTO.RUC) return 'NOTA CREDITO FACTURA ELECTRÓNICA';
        if (tipoDocumento === Constants.TIPO_DOCUMENTO.DNI) return 'NOTA CREDITO BOLETA ELECTRÓNICA';
        return 'Datos de venta';
    };

    const validateForm = () => {
        const sumaPagos = Number(efectivo) + Number(tarjeta) + Number(yape);
        if (items.length === 0) {
            notify({ message: 'No hay productos en la orden', type: 'error' });
            return false;
        }

        if (Math.abs(sumaPagos - total) > 0.01) {
            notify({ message: 'La suma de los pagos no coincide con el total', type: 'error' });
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
        
        if(!razonSocial || razonSocial.trim() === "0"){
            notify({ message: 'Ingrese la razón social', type: 'error' });
            return false;
        }    
        return true;
    };    

    const UsuarioId = +(session?.user.id || 0);
    const IslaId = +(session?.user.islaId || 0);

    const handlerProcessBilling = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (enProceso.current || emitido) return;
        if (!validateForm()) return;
        enProceso.current = true;
        setIsProcessing(true);
        try {
            const creado = await procesarComprobante();
            // Solo se navega en exito: ante un error hay que quedarse para poder leerlo.
            // El Toaster vive en el layout raiz, asi que la notificacion sobrevive al push.
            if (creado) {
                setEmitido(true);
                router.push('/historic');
            }
        } finally {
            enProceso.current = false;
            setIsProcessing(false);
        }
    }

    const procesarComprobante = async (): Promise<boolean> => {
        // Se toman del documento original capturado al montar, no de `billing`: emitir lo
        // muta (deja numeracion_comprobante vacia y fecha_emision con la de hoy), asi que
        // un reintento construiria la NC con datos ya pisados y sin documento afectado.
        billing.tipo_comprobante = Constants.TIPO_COMPROBANTE.NOTA_CREDITO;
        billing.numeracion_documento_afectado = documentoAfectado.current.numeracion;
        billing.fecha_documento_afectado = toLocaleStorage(documentoAfectado.current.fecha);
        billing.tipo_documento_afectado = documentoAfectado.current.tipo;

        billing.fecha_emision = toLocaleStorage(new Date());
        billing.fecha_hora = toLocaleStorage(new Date());
        billing.fecha_abastecimiento = '';
        billing.numeracion_comprobante = "";
        billing.UsuarioId = UsuarioId;
        billing.id_abastecimiento = null;
        billing.IslaId = IslaId;
        billing.impresion = 0;
        billing.enviado = 0;
        const { status, message, bill } = await saveBilling(billing);

        if(status && bill){
            await saveCheckNc(billing.numeracion_documento_afectado, bill.numeracion_comprobante);
            notify({message, type:'success'})
            return true;
        }
        notify({message, type:'error'})
        return false;
    }
    
    return (
        <>
        <div className="flex justify-between items-center">
            <h2 className="text-2xl mb-2 font-bold text-slate-800">{getTitle()}</h2>
        </div>
        <div className="flex flex-col mt-5">
            <form onSubmit={handlerProcessBilling} autoComplete="off" className="flex flex-col">
                <div className="grid grid-cols-2 gap-3">
                    <NumeroDocumento formValues={formValues} setFormValues={setFormValues} />
                    <Placa formValues={formValues} setFormValues={setFormValues} />
                    <RazonSocial formValues={formValues} setFormValues={setFormValues} />
                    <Direccion formValues={formValues} setFormValues={setFormValues} />
                    <TipoPago total={total} formValues={formValues} setFormValues={setFormValues} />
                    <div className="col-span-2">
                        <button className={`${botonBloqueado ? "btn-disabled" : "btn-primary"} px-5 py-2 mt-3 w-full`}
                        disabled={botonBloqueado}
                        type="submit">
                            {isProcessing ? 'Procesando...' : emitido ? 'Comprobante emitido' : 'Emitir comprobante'}
                        </button>
                    </div>
                </div>
            </form>
        </div>            
        </>
    )
}