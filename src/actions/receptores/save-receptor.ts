'use server';
import { IReceptor } from '@/interfaces';
import { executeQuery } from '@/utils/db';

// Los valores van dentro de comillas simples en el SQL: se duplican las comillas
// (ej. "D'ONOFRIO") y null/undefined se guardan vacios en vez del texto 'null'.
const texto = (valor?: string | null) => String(valor ?? '').trim().replace(/'/g, "''");

export async function saveReceptor({ id, numero_documento, tipo_documento, razon_social, direccion, correo, placa }: IReceptor): Promise<{ status: boolean, message: string }> {
    const db = process.env.DB_DATABASE_AUXILIAR||"";
    const campos = `numero_documento = '${texto(numero_documento)}', tipo_documento = '${texto(tipo_documento)}', razon_social = '${texto(razon_social)}', direccion = '${texto(direccion)}', correo = '${texto(correo)}', placa = '${texto(placa)}'`;
    try {
        if (id) {
            await executeQuery(db, `UPDATE Receptores set ${campos} where id = ${Number(id)}`);
            return { status: true, message: 'Cliente actualizado' };
        }
        // Al crear, si el documento ya existe no se duplica: un cliente eliminado (inactivo)
        // se reactiva con los datos nuevos y uno activo se rechaza.
        const [existente] = await executeQuery<{ id: number, estado: boolean }[]>(
            db, `SELECT TOP 1 id, estado FROM Receptores WHERE numero_documento = '${texto(numero_documento)}'`
        );
        if (existente?.estado) {
            return { status: false, message: 'Ya existe un cliente con ese número de documento' };
        }
        if (existente) {
            await executeQuery(db, `UPDATE Receptores set ${campos}, estado = 1 where id = ${Number(existente.id)}`);
            return { status: true, message: 'Cliente reactivado' };
        }
        await executeQuery(db, `INSERT into Receptores (numero_documento, tipo_documento, razon_social, direccion, correo, placa) values ('${texto(numero_documento)}', '${texto(tipo_documento)}', '${texto(razon_social)}', '${texto(direccion)}', '${texto(correo)}', '${texto(placa)}')`);
        return { status: true, message: 'Cliente creado' };
    } catch (error) {
        console.error("Error saveReceptor:", error);
        return { status: false, message: 'No se pudo guardar el cliente' };
    }
}

// Eliminado logico: el cliente queda inactivo (estado = 0) y deja de listarse, pero sus
// comprobantes, placas y descuentos lo siguen referenciando sin problema.
export async function deleteReceptor(id: number): Promise<{ status: boolean, message: string }> {
    try {
        await executeQuery(process.env.DB_DATABASE_AUXILIAR||"", `UPDATE Receptores set estado = 0 where id = ${Number(id)}`);
        return { status: true, message: 'Cliente eliminado' };
    } catch (error) {
        console.error("Error deleteReceptor:", error);
        return { status: false, message: 'No se pudo eliminar el cliente' };
    }
}
