"use client"
import React, { useEffect, useState } from 'react'
import { obtieneSaldoCreditoPorDocumento } from '@/actions';
import { IBillingForm } from '@/interfaces/billing.interface';
import { Constants, currencyFormat } from '@/utils';
import { ISaldoCredito } from '@/utils/credito';

interface Props {
    formValues: IBillingForm;
    setFormValues: (values: IBillingForm) => void;
    total: number;
}

// Factura o boleta a un cliente con credito: muestra su saldo y permite vender al credito (no suma a la cuenta del grifero).
// El servidor vuelve a validar el credito al emitir; este aviso solo lo adelanta. Las notas de despacho no usan credito.
export const AvisoCredito = ({ formValues, setFormValues, total }: Props) => {
    const [credito, setCredito] = useState<ISaldoCredito | null | undefined>(undefined);
    const esVenta = formValues.tipoComprobante === Constants.TIPO_COMPROBANTE.FACTURA || formValues.tipoComprobante === Constants.TIPO_COMPROBANTE.BOLETA;
    const documento = formValues.numeroDocumento;

    useEffect(() => {
        if (!esVenta || documento.length < 8) { setCredito(undefined); return; }
        let vigente = true;
        obtieneSaldoCreditoPorDocumento(documento).then((resultado) => { if (vigente) setCredito(resultado); });
        return () => { vigente = false; };
    }, [esVenta, documento]);

    const disponible = !!credito && credito.habilitado;
    const alcanza = disponible && total <= (credito?.saldo ?? 0) + 0.001;

    // Si el cliente cambia o deja de alcanzar el saldo, la marca de credito se quita
    useEffect(() => {
        if (formValues.esCredito && (!esVenta || !alcanza)) {
            setFormValues({ ...formValues, esCredito: false, efectivo: total, tarjeta: 0, yape: 0 });
        }
    }, [esVenta, alcanza]);

    if (!esVenta || !disponible || !credito) return null;

    const alternar = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) setFormValues({ ...formValues, esCredito: true, efectivo: 0, tarjeta: 0, yape: 0 });
        else setFormValues({ ...formValues, esCredito: false, efectivo: total, tarjeta: 0, yape: 0 });
    };

    return (
        <div className={`col-span-2 border rounded px-4 py-2 text-sm ${alcanza ? 'bg-blue-50 border-blue-300 text-blue-800' : 'bg-red-50 border-red-300 text-red-800'}`}>
            <p className="font-semibold">
                Saldo de crédito: {currencyFormat(credito.saldo)} (crédito {currencyFormat(credito.limite)}, consumido {currencyFormat(credito.consumido - credito.abonado)})
            </p>
            {alcanza ? (
                <label className="flex items-center gap-2 mt-1 cursor-pointer font-bold">
                    <input type="checkbox" checked={!!formValues.esCredito} onChange={alternar} />
                    Vender al crédito (no suma a tu cuenta)
                </label>
            ) : (
                <p className="mt-1">El saldo no alcanza para esta venta: no se puede vender al crédito.</p>
            )}
        </div>
    );
}
