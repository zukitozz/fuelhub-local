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
    // false = proveedor alterno: el PDF se genera y se guarda en Comprobantes.pdf_bytes en vez de usar el PDF hosteado por MiFact.
    PROVEEDOR_MIFACT: process.env.NEXT_PUBLIC_PROVEEDOR_MIFACT !== 'false'
}