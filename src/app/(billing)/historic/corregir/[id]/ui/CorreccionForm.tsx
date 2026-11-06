"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { crearSolicitudCorreccion } from "@/actions/correcciones";
import { notify } from "@/utils";
import { useOrderAbastecimientoStore } from "@/store";
import { IBillingForm } from "@/interfaces";
import { NumeroDocumento, Placa, RazonSocial, Direccion, TipoPago } from "@/app/(billing)/invoice/[id]/ui/form-values";

interface Props {
    comprobanteId: number;
    numeracion: string;
    total: number;
    inicial: IBillingForm;
}

// El grifero propone los datos correctos (receptor, placa, tipo de pago) y la razón del cambio.
// No se emite nada: el administrador revisa y aprueba la corrección desde el histórico.
export const CorreccionForm = ({ comprobanteId, numeracion, total, inicial }: Props) => {
    const router = useRouter();
    const [formValues, setFormValues] = useState<IBillingForm>(inicial);
    const [celular, setCelular] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [enviado, setEnviado] = useState(false);
    // El estado no frena un doble clic rápido; el ref sí es sincrónico
    const enProceso = useRef(false);

    // Los campos reutilizados del formulario de venta guardan un bloqueo en el navegador (al cargar un cliente).
    // Aquí no debe aplicar: se libera al entrar y al salir para no dejarlo arrastrado a otra pantalla.
    const unlockBilling = useOrderAbastecimientoStore((state) => state.unlockBilling);
    useEffect(() => {
        unlockBilling();
        return () => unlockBilling();
    }, [unlockBilling]);

    const { numeroDocumento, razonSocial, direccion, placa, efectivo, tarjeta, yape } = formValues;
    const botonBloqueado = isProcessing || enviado;

    const validar = () => {
        if (!/^\d{8}$|^\d{11}$/.test(numeroDocumento)) {
            notify({ message: 'Ingresa un DNI (8 dígitos) o un RUC (11 dígitos)', type: 'error' });
            return false;
        }
        if (!razonSocial || razonSocial.trim() === '0') {
            notify({ message: 'Ingresa la razón social', type: 'error' });
            return false;
        }
        if (Math.abs(Number(efectivo) + Number(tarjeta) + Number(yape) - total) > 0.01) {
            notify({ message: 'La suma de los pagos no coincide con el total', type: 'error' });
            return false;
        }
        if (observaciones.trim().length < 5) {
            notify({ message: 'Escribe la razón del cambio en las observaciones', type: 'error' });
            return false;
        }
        return true;
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (enProceso.current || enviado || !validar()) return;
        enProceso.current = true;
        setIsProcessing(true);
        try {
            const { status, message } = await crearSolicitudCorreccion({
                ComprobanteId: comprobanteId,
                numero_documento: numeroDocumento,
                razon_social: razonSocial,
                direccion,
                placa,
                celular,
                efectivo: Number(efectivo) || 0,
                tarjeta: Number(tarjeta) || 0,
                yape: Number(yape) || 0,
                observaciones,
            });
            notify({ message, type: status ? 'success' : 'error' });
            if (status) {
                setEnviado(true);
                router.push('/historic');
            }
        } finally {
            enProceso.current = false;
            setIsProcessing(false);
        }
    };

    return (
        <>
            <h2 className="text-2xl mb-2 font-bold text-slate-800">Corregir comprobante {numeracion}</h2>
            <p className="text-sm text-gray-600 mb-4">
                Ingresa los datos correctos. El administrador revisará la corrección y, al aprobarla, emitirá el comprobante nuevo.
                El comprobante actual no se modifica.
            </p>
            <form onSubmit={handleSubmit} autoComplete="off" className="flex flex-col">
                <div className="grid grid-cols-2 gap-3">
                    <NumeroDocumento formValues={formValues} setFormValues={setFormValues} sinBloqueo />
                    <Placa formValues={formValues} setFormValues={setFormValues} sinBloqueo />
                    <RazonSocial formValues={formValues} setFormValues={setFormValues} sinBloqueo />
                    <Direccion formValues={formValues} setFormValues={setFormValues} sinBloqueo />
                    <div className="col-span-2">
                        <label htmlFor="celular">Celular</label>
                        <input
                            className="px-5 py-2 border bg-gray-200 rounded w-full"
                            type="text"
                            name="celular"
                            inputMode="tel"
                            maxLength={20}
                            value={celular}
                            onChange={(e) => setCelular(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                        />
                    </div>
                    <TipoPago total={total} formValues={formValues} setFormValues={setFormValues} />
                    <div className="col-span-2">
                        <label htmlFor="observaciones">Observaciones (razón del cambio)</label>
                        <textarea
                            className="px-5 py-2 border bg-gray-200 rounded w-full"
                            name="observaciones"
                            rows={3}
                            maxLength={500}
                            value={observaciones}
                            onChange={(e) => setObservaciones(e.target.value)}
                        />
                    </div>
                    <div className="col-span-2">
                        <button
                            className={`${botonBloqueado ? "btn-disabled" : "btn-primary"} px-5 py-2 mt-3 w-full`}
                            disabled={botonBloqueado}
                            type="submit">
                            {isProcessing ? 'Enviando...' : enviado ? 'Corrección enviada' : 'Enviar corrección'}
                        </button>
                    </div>
                </div>
            </form>
        </>
    );
};
