// Por encima de este monto no se boletea sola: SUNAT exige identificar al cliente en boletas
// de 700 soles o más, así que la venta queda pendiente para boletearla a mano con sus datos.
export const MONTO_MAXIMO_AUTOBOLETEO = Number(process.env.NEXT_PUBLIC_MONTO_MAXIMO_AUTOBOLETEO) || 700;

// Una venta no se autoboletea si supera el monto máximo o es negativa (el controlador a veces
// genera totales negativos por error): se revisa antes de boletear.
export const requiereRevision = (valorTotal: number): boolean =>
    valorTotal > MONTO_MAXIMO_AUTOBOLETEO || valorTotal < 0;
