"use server";

import { auth } from "@/auth.config";
import { Constants } from "@/utils/constants";
import { executeQuery } from "@/utils/db";

// Cantidad de ventas (abastecimientos) de la isla del usuario que aún no se boletean.
// Usa las mismas condiciones que la grilla de ventas para que ambas coincidan.
export async function countVentasPendientes(): Promise<number> {
    const session = await auth();
    const pistolas = (session?.user?.pistolas ?? []).map(Number).filter(Number.isInteger);
    if (pistolas.length === 0) return 0;

    const query = `
        SELECT COUNT(*) AS total
        FROM DEMOSQL.dbo.Abastecimientos a
        WHERE a.fechaHora >= DATEADD(day, -2, GETDATE())
          AND (a.valorTotal > 0 OR (a.valorTotal = 0 AND a.totInicio <> a.totFinal))
          AND a.estado = ${Constants.ESTADOS_ABASTECIMIENTO.PENDIENTE}
          AND a.pistola IN (${pistolas.join(", ")})
    `;
    const result = await executeQuery<{ total: number }[]>(process.env.DB_DATABASE_AUXILIAR || "", query);
    return result?.[0]?.total ?? 0;
}
