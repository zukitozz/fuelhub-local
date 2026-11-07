// "Clientes varios" (documento 0) es un receptor compartido por todas las boletas sin identificar:
// si alguien le asigna placa, nombre o dirección, se contamina para todas las ventas siguientes.
// Por eso, con documento 0 el nombre y la dirección no se pueden editar (pantalla) ni se guardan (servidor).
// La placa sí se puede escribir, pero queda solo en el comprobante: no se asocia al receptor ni a la tabla
// Placas, para que al buscar una placa no aparezca el cliente 0.
export const DOCUMENTO_CLIENTES_VARIOS = '0';
export const RAZON_SOCIAL_CLIENTES_VARIOS = 'CLIENTES VARIOS';

export const esClientesVarios = (numeroDocumento: string | null | undefined): boolean =>
    (numeroDocumento ?? '').trim() === DOCUMENTO_CLIENTES_VARIOS;
