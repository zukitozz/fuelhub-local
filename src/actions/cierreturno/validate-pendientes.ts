"use server";

import { auth } from "@/auth.config";
import { Constants } from "@/utils/constants";
import { executeQuery } from "@/utils/db";

export interface IPendientesCierre {
    // Abastecimientos de la isla que aún no se boletean
    pendientes: number;
    // Comprobantes de la isla, aún sin cierre, que el facturador rechazó. Ya no figuran como
    // pendientes (su abastecimiento quedó facturado) pero no existe boleta válida.
    rechazados: number;
}

// Ventas de la isla del usuario que impiden cerrar turno.
// Usa las mismas condiciones que la grilla de ventas para que ambas coincidan.
export async function countVentasPendientes(): Promise<IPendientesCierre> {
    const session = await auth();
    const pistolas = (session?.user?.pistolas ?? []).map(Number).filter(Number.isInteger);
    const islaId = Number(session?.user?.islaId) || 0;
    const db = process.env.DB_DATABASE_AUXILIAR || "";

    const [pendientes, rechazados] = await Promise.all([
        pistolas.length === 0 ? Promise.resolve(0) : executeQuery<{ total: number }[]>(db, `
            SELECT COUNT(*) AS total
            FROM DEMOSQL.dbo.Abastecimientos a
            WHERE a.fechaHora >= DATEADD(day, -2, GETDATE())
              AND (a.valorTotal > 0 OR (a.valorTotal = 0 AND a.totInicio <> a.totFinal))
              AND a.estado = ${Constants.ESTADOS_ABASTECIMIENTO.PENDIENTE}
              AND a.pistola IN (${pistolas.join(", ")})
        `).then(r => r?.[0]?.total ?? 0),
        islaId === 0 ? Promise.resolve(0) : executeQuery<{ total: number }[]>(db, `
            SELECT COUNT(*) AS total
            FROM Comprobantes c
            WHERE c.CierreturnoId IS NULL
              AND c.IslaId = ${islaId}
              AND c.tipo_comprobante IN ('01', '03')
              AND ISNULL(c.errors, '') NOT IN ('', 'null')
              AND c.errors NOT LIKE '%${Constants.NC_ESPERANDO_MARCA}%'
        `).then(r => r?.[0]?.total ?? 0),
    ]);

    return { pendientes, rechazados };
}
