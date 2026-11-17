"use client"
import React, { useEffect, useState } from 'react'
import { obtieneSaldoCreditoPorDocumento } from '@/actions';
import { IBillingForm } from '@/interfaces/billing.interface';
import { Constants, currencyFormat } from '@/utils';
import { ISaldoCredito } from '@/utils/credito';

interface Props {
    formValues: IBillingForm;
    // Total de la nota que se va a emitir, para avisar si no alcanza el credito
    total: number;
}

// Solo en notas de despacho: muestra el saldo de credito del cliente elegido. Sin credito (o sin saldo) el servidor
// rechaza la emision; este aviso solo lo adelanta.
export const AvisoCredito = ({ formValues, total }: Props) => {
    const [credito, setCredito] = useState<ISaldoCredito | null | undefined>(undefined);
    const esDespacho = formValues.tipoComprobante === Constants.TIPO_COMPROBANTE.NOTA_DESPACHO;
    const documento = formValues.numeroDocumento;

    useEffect(() => {
        if (!esDespacho || documento.length < 8) { setCredito(undefined); return; }
        let vigente = true;
        obtieneSaldoCreditoPorDocumento(documento).then((resultado) => { if (vigente) setCredito(resultado); });
        return () => { vigente = false; };
    }, [esDespacho, documento]);

    if (!esDespacho || credito === undefined) return null;

    let clase = 'bg-blue-50 border-blue-300 text-blue-800';
    let texto = `Saldo de crédito: ${currencyFormat(credito?.saldo ?? 0)} (crédito ${currencyFormat(credito?.limite ?? 0)}, pendiente de facturar ${currencyFormat(credito?.consumido ?? 0)})`;
    if (!credito || !credito.habilitado) {
        clase = 'bg-red-50 border-red-300 text-red-800';
        texto = 'Este cliente no tiene crédito habilitado: no se pueden emitir notas de despacho.';
    } else if (credito.saldo <= 0 || total > credito.saldo + 0.001) {
        clase = 'bg-red-50 border-red-300 text-red-800';
        texto += credito.saldo <= 0 ? ' — sin saldo: no se pueden emitir más notas de despacho.' : ' — la nota supera el saldo disponible.';
    }

    return (
        <div className={`col-span-2 border rounded px-4 py-2 text-sm font-semibold ${clase}`}>
            {texto}
        </div>
    );
}
