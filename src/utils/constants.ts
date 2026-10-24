export const Constants = {
    USUARIO_DEFAULT: 'jcastillo',
    TIPO_COMPROBANTE: {
        FACTURA: '01',
        BOLETA: '03',
        NOTA_CREDITO: '07',
        NOTA_DEBITO: '08',
        GUIA_REMISION_TRANSPORTISTA: '31',
        GUIA_REMISION_REMITENTE: '09',
        NOTA_DESPACHO: '50',
        CALIBRACION: '51',
        NOTA_INTERNA: '52',
    },
    TIPO_DOCUMENTO: {
        RUC: '6',
        DNI: '0'
    },
    ETAPA_FACTURACION: {
        CREADO: 'CREATED',
        POR_ENVIAR: 'DISPATCH',
        ENVIADO: 'SENT',
    },
    MEDIDA: {
        GALON: 'GLL',
        UNIDAD: 'UND',
    },
    DATE_TIME_FORMAT: 'YYYY-MM-DD',
    STATE_SQL_TRANSACTION: {
        SUCCESS: '000'
    },
    ESTADOS_ABASTECIMIENTO: {
        ENVIADO: 1,
        PENDIENTE: 0
    },
    ROL: {
        ADMIN_ROLE: 'ADMIN_ROLE',
        USER_ROLE: 'USER_ROLE'
    },
    AMBITO_PRODUCTOS: {
        ISLA: 'VENTA_ISLA',
        ADMINISTRADOR: 'VENTA_TOTAL'
    },
    // El facturador escribe este texto en Comprobantes.errors de una nota de credito que espera
    // a que la boleta afectada sea aceptada por SUNAT. No es un error. Va precedido de un
    // timestamp "[AAAA-MM-DD HH:MM:SS] ", por eso se busca con LIKE '%...%' y no por prefijo.
    NC_ESPERANDO_MARCA: 'ESPERANDO (no es un error):',
    CODIGO_PROPOSITO: {
        INTERNA: 'FACTURAS_BOLETAS_NC_INTERNA',
        ADMIN: 'FACTURAS_BOLETAS_NC_ADMIN',
    },
}