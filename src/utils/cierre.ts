// Mensaje de bloqueo del cierre de turno, o null si no hay nada que impida cerrar.
export const mensajeBloqueoCierre = ({ pendientes, rechazados }: { pendientes: number; rechazados: number }): string | null => {
    const motivos: string[] = [];
    if (pendientes > 0) {
        motivos.push(`Hay ${pendientes} venta(s) pendientes de boletear en la isla. Boletee todas las ventas antes de cerrar el turno.`);
    }
    if (rechazados > 0) {
        motivos.push(`Hay ${rechazados} comprobante(s) rechazados por el facturador en la isla (revise el estado ERROR en Histórico). Avise al administrador antes de cerrar el turno.`);
    }
    return motivos.length > 0 ? motivos.join(' ') : null;
};
