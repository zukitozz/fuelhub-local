// SUNAT valida las facturas una por una y las rechaza (error 3270) si el precio unitario no coincide con el
// importe de la línea dividido entre la cantidad. El surtidor informa el volumen con 3 decimales, y en ventas
// pequeñas ese redondeo desvía el precio unitario implícito: S/ 0.77 a S/ 24.20 son 0.031818 gal, pero el
// surtidor informa 0.032 y el precio implícito pasa a ser 24.0625.
// Para las facturas se usa la cantidad exacta (importe / precio unitario) con 6 decimales.
// Las boletas no lo necesitan: viajan en el resumen diario, que tolera ese descuadre.
export const cantidadParaFactura = (importe: number, precioUnitario: number, cantidad: number): number => {
    if (!(importe > 0) || !(precioUnitario > 0)) return cantidad;
    return Math.round((importe / precioUnitario) * 1e6) / 1e6;
};
