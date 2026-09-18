import { Constants } from './constants';

// El usuario no debe ver el codigo_proposito crudo: se muestra un alias legible.
// Los propositos que no tienen alias (MARKET, AUTOMATISMOS, NOTASDESPACHO) no se
// gestionan todavia desde el mantenimiento, se listan con su codigo tal cual.
export const CODIGO_PROPOSITO_ALIAS: Record<string, string> = {
    [Constants.CODIGO_PROPOSITO.INTERNA]: 'Venta en dispensadores',
    [Constants.CODIGO_PROPOSITO.ADMIN]: 'Venta de administrador',
};

export const getCodigoPropositoAlias = (codigo: string): string => {
    return CODIGO_PROPOSITO_ALIAS[codigo] || codigo;
};

export const TIPO_COMPROBANTE_LABEL: Record<string, string> = {
    [Constants.TIPO_COMPROBANTE.FACTURA]: 'Factura',
    [Constants.TIPO_COMPROBANTE.BOLETA]: 'Boleta',
    [Constants.TIPO_COMPROBANTE.NOTA_CREDITO]: 'Nota de crédito',
    [Constants.TIPO_COMPROBANTE.NOTA_DESPACHO]: 'Nota de despacho',
    [Constants.TIPO_COMPROBANTE.CALIBRACION]: 'Calibración',
    [Constants.TIPO_COMPROBANTE.NOTA_INTERNA]: 'Comprobante interno',
};

export const getTipoComprobanteLabel = (tipo: string): string => {
    return TIPO_COMPROBANTE_LABEL[tipo] || tipo;
};
