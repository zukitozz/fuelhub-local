// Mensaje de bloqueo del cierre de turno, o null si no hay nada que impida cerrar.
export const mensajeBloqueoCierre = ({ pendientes }: { pendientes: number }): string | null =>
    pendientes > 0
        ? `Hay ${pendientes} venta(s) pendientes de boletear en la isla. Boletee todas las ventas antes de cerrar el turno.`
        : null;
