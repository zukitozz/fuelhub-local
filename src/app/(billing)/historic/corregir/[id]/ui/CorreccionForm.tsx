"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { corregirComoAdmin, crearSolicitudCorreccion } from "@/actions/correcciones";
import { notify } from "@/utils";
import { useOrderAbastecimientoStore } from "@/store";
import { IBillingForm } from "@/interfaces";
import { NumeroDocumento, Placa, RazonSocial, Direccion, TipoPago } from "@/app/(billing)/invoice/[id]/ui/form-values";

interface Props {
    comprobanteId: number;
    numeracion: string;
    total: number;
    inicial: IBillingForm;
    // El administrador modifica directamente: se emite la nota de credito y el comprobante nuevo al confirmar
    modoAdmin?: boolean;
    // Fecha de emision del comprobante original (AAAA-MM-DD): la nota de despacho la conserva y no se puede cambiar
    fechaEmision?: string;
    // El comprobante supera el tope de dias: solo se puede convertir en nota de despacho
    soloNotaDespacho?: boolean;
}

// El grifero propone los datos correctos (receptor, placa, tipo de pago) y la razón del cambio.
// No se emite nada: el administrador revisa y aprueba la corrección desde el histórico.
export const CorreccionForm = ({ comprobanteId, numeracion, total, inicial, modoAdmin = false, fechaEmision = '', soloNotaDespacho = false }: Props) => {
    const router = useRouter();
    const [formValues, setFormValues] = useState<IBillingForm>(inicial);
    // Solo el administrador puede elegir nota de despacho como comprobante nuevo
    const [notaDespacho, setNotaDespacho] = useState(modoAdmin && soloNotaDespacho);
    const [celular, setCelular] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const [comentario, setComentario] = useState('');
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
        // El celular es obligatorio para poder rectificar (al menos 9 dígitos)
        if (celular.replace(/\D/g, '').length < 9) {
            notify({ message: 'Ingresa el celular de contacto (9 dígitos) para poder emitir la rectificación', type: 'error' });
            return false;
        }
        if (modoAdmin && notaDespacho && numeroDocumento.length !== 11) {
            notify({ message: 'La nota de despacho se emite solo con RUC (11 dígitos)', type: 'error' });
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
            const { status, message } = await (modoAdmin ? corregirComoAdmin : crearSolicitudCorreccion)({
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
                comentario: modoAdmin ? comentario : undefined,
                notaDespacho: modoAdmin ? notaDespacho : undefined,
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

    let descripcion = 'Ingresa los datos correctos. El administrador revisará la corrección y, al aprobarla, emitirá el comprobante nuevo. El comprobante actual no se modifica.';
    if (modoAdmin) {
        descripcion = notaDespacho
            ? `Al confirmar se emite una nota de crédito (con la fecha de hoy) que anula el comprobante actual y una nota de despacho con estos datos, con la misma fecha del comprobante original (${fechaEmision}).`
            : 'Ingresa los datos correctos. Al confirmar se emite una nota de crédito que anula el comprobante actual y un comprobante nuevo con estos datos (ambos con la fecha de hoy).';
    }

    return (
        <>
            <h2 className="text-2xl mb-2 font-bold text-slate-800">Corregir comprobante {numeracion}</h2>
            <p className="text-sm text-gray-600 mb-4">{descripcion}</p>
            <form onSubmit={handleSubmit} autoComplete="off" className="flex flex-col">
                <div className="grid grid-cols-2 gap-3">
                    {modoAdmin && (
                        <div className="col-span-2">
                            <span className="block mb-1">Comprobante nuevo</span>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { valor: false, etiqueta: 'Factura o boleta (según el documento)' },
                                    { valor: true, etiqueta: 'Nota de despacho' },
                                ].map(({ valor, etiqueta }) => {
                                    const bloqueada = soloNotaDespacho && !valor;
                                    const activa = notaDespacho === valor;
                                    return (
                                        <button
                                            key={etiqueta}
                                            type="button"
                                            disabled={bloqueada || botonBloqueado}
                                            onClick={() => setNotaDespacho(valor)}
                                            className={`px-4 py-2 rounded-md border-2 text-sm font-bold transition-colors ${
                                                activa
                                                    ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                                                    : 'border-blue-600 bg-white text-blue-700 hover:bg-blue-50'
                                            } ${bloqueada ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            {etiqueta}
                                        </button>
                                    );
                                })}
                            </div>
                            {soloNotaDespacho && (
                                <p className="text-xs text-gray-600 mt-1">
                                    Este comprobante tiene más de 15 días: solo se puede convertir en nota de despacho (hasta 2 meses de antigüedad).
                                </p>
                            )}
                            {notaDespacho && (
                                <div className="mt-2">
                                    <label htmlFor="fecha-nota-despacho">Fecha de emisión de la nota de despacho</label>
                                    <input
                                        id="fecha-nota-despacho"
                                        className="px-5 py-2 border bg-gray-100 rounded w-full text-gray-600"
                                        type="text"
                                        value={fechaEmision}
                                        readOnly
                                        disabled
                                    />
                                    <p className="text-xs text-gray-600 mt-1">Es la misma fecha de la factura original y no se puede cambiar.</p>
                                </div>
                            )}
                        </div>
                    )}
                    <NumeroDocumento formValues={formValues} setFormValues={setFormValues} sinBloqueo />
                    <Placa formValues={formValues} setFormValues={setFormValues} sinBloqueo />
                    <RazonSocial formValues={formValues} setFormValues={setFormValues} sinBloqueo />
                    <Direccion formValues={formValues} setFormValues={setFormValues} />
                    <div className="col-span-2">
                        <label htmlFor="celular">Celular (obligatorio)</label>
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
                    {modoAdmin && (
                        <div className="col-span-2">
                            <label htmlFor="comentario">Comentario en el comprobante (opcional, se imprime)</label>
                            <input
                                className="px-5 py-2 border bg-gray-200 rounded w-full"
                                type="text"
                                name="comentario"
                                maxLength={200}
                                placeholder="Ej: Consumo del día 10/11/2026"
                                value={comentario}
                                onChange={(e) => setComentario(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                            />
                        </div>
                    )}
                    <div className="col-span-2">
                        <button
                            className={`${botonBloqueado ? "btn-disabled" : "btn-primary"} px-5 py-2 mt-3 w-full`}
                            disabled={botonBloqueado}
                            type="submit">
                            {isProcessing ? (modoAdmin ? 'Emitiendo...' : 'Enviando...') : enviado ? (modoAdmin ? 'Comprobante corregido' : 'Corrección enviada') : (modoAdmin ? 'Corregir y emitir' : 'Enviar corrección')}
                        </button>
                    </div>
                </div>
            </form>
        </>
    );
};
