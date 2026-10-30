// Por encima de este monto no se boletea sola: SUNAT exige identificar al cliente en boletas
// de 700 soles o más, así que la venta queda pendiente para boletearla a mano con sus datos.
export const MONTO_MAXIMO_AUTOBOLETEO = Number(process.env.NEXT_PUBLIC_MONTO_MAXIMO_AUTOBOLETEO) || 700;

// Una venta no se autoboletea si supera el monto máximo o es negativa (el controlador a veces
// genera totales negativos por error): se revisa antes de boletear.
export const requiereRevision = (valorTotal: number): boolean =>
    valorTotal > MONTO_MAXIMO_AUTOBOLETEO || valorTotal < 0;

// SUNAT/el facturador rechazan las boletas de más de 700 soles sin DNI del cliente. Se valida
// al emitir para que no se genere un comprobante rechazado que luego nadie ve como pendiente.
export const MENSAJE_BOLETA_SIN_DNI = `Las boletas mayores a S/ ${MONTO_MAXIMO_AUTOBOLETEO} requieren el DNI del cliente (8 dígitos)`;
export const boletaRequiereDni = (tipoComprobante: string, total: number, numeroDocumento: string): boolean =>
    tipoComprobante === '03' && total > MONTO_MAXIMO_AUTOBOLETEO && !/^\d{8}$/.test(numeroDocumento || '');
