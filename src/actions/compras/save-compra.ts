'use server';
import { ICompraForm, IDbResponse } from '@/interfaces';
import { saveCompraTransaction } from '@/utils/db';

export async function saveCompra(compra: ICompraForm): Promise<IDbResponse> {
    try {
        if (!compra.proveedor || compra.proveedor.trim() === "") {
            return { success: false, message: 'Debe indicar el proveedor' };
        }
        if (!compra.lineas || compra.lineas.length === 0) {
            return { success: false, message: 'Debe agregar al menos un producto' };
        }
        for (const linea of compra.lineas) {
            if (!linea.ProductoId || linea.cantidad <= 0 || linea.costo_unitario < 0) {
                return { success: false, message: 'Las líneas de producto tienen datos inválidos' };
            }
        }

        return await saveCompraTransaction(compra);
    } catch (error) {
        console.error("Error fetching saveCompra:");
        console.error(JSON.stringify(error));
        throw error;
    }
}
