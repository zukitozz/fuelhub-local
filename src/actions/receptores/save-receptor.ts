'use server';
import { IReceptor } from '@/interfaces';
import { executeQuery } from '@/utils/db';

// Los valores van dentro de comillas simples en el SQL: se duplican las comillas
// (ej. "D'ONOFRIO") y null/undefined se guardan vacios en vez del texto 'null'.
const texto = (valor?: string | null) => String(valor ?? '').trim().replace(/'/g, "''");

export async function saveReceptor({ id, numero_documento, tipo_documento, razon_social, direccion, correo, placa }: IReceptor): Promise<{ status: boolean, message: string }> {
    try {
        const query = id
            ? `UPDATE Receptores set numero_documento = '${texto(numero_documento)}', tipo_documento = '${texto(tipo_documento)}', razon_social = '${texto(razon_social)}', direccion = '${texto(direccion)}', correo = '${texto(correo)}', placa = '${texto(placa)}' where id = ${Number(id)}`
            : `INSERT into Receptores (numero_documento, tipo_documento, razon_social, direccion, correo, placa) values ('${texto(numero_documento)}', '${texto(tipo_documento)}', '${texto(razon_social)}', '${texto(direccion)}', '${texto(correo)}', '${texto(placa)}')`;
        await executeQuery(process.env.DB_DATABASE_AUXILIAR||"", query);
        return { status: true, message: id ? 'Cliente actualizado' : 'Cliente creado' };
    } catch (error) {
        console.error("Error saveReceptor:", error);
        return { status: false, message: 'No se pudo guardar el cliente' };
    }
}

// Solo se elimina un cliente sin movimientos: sus comprobantes, placas y descuentos lo
// referencian (sin FK en la BD), asi que borrarlo dejaria esos registros huerfanos.
export async function deleteReceptor(id: number): Promise<{ status: boolean, message: string }> {
    const db = process.env.DB_DATABASE_AUXILIAR||"";
    try {
        const [uso] = await executeQuery<{ comprobantes: number, placas: number, descuentos: number }[]>(db, `
            select
                (select count(*) from Comprobantes where ReceptorId = ${Number(id)}) as comprobantes,
                (select count(*) from Placas where ReceptorId = ${Number(id)})
                    + (select count(*) from ReceptoresPlacas where ReceptorId = ${Number(id)}) as placas,
                (select count(*) from Descuentos d inner join Receptores r on d.numero_documento = r.numero_documento where r.id = ${Number(id)}) as descuentos
        `);
        const motivos = [
            uso.comprobantes > 0 ? `${uso.comprobantes} comprobante(s)` : '',
            uso.placas > 0 ? `${uso.placas} placa(s)` : '',
            uso.descuentos > 0 ? `${uso.descuentos} descuento(s)` : '',
        ].filter(Boolean);
        if (motivos.length > 0) {
            return { status: false, message: `No se puede eliminar: el cliente tiene ${motivos.join(', ')}` };
        }
        await executeQuery(db, `DELETE from Receptores where id = ${Number(id)}`);
        return { status: true, message: 'Cliente eliminado' };
    } catch (error) {
        console.error("Error deleteReceptor:", error);
        return { status: false, message: 'No se pudo eliminar el cliente' };
    }
}
