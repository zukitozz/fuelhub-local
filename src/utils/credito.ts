// Credito de clientes para notas de despacho. El credito (credito_limite en Receptores, en soles) lo asigna el
// administrador. Saldo = credito - total de sus notas de despacho aun sin facturar (estado_nota_despacho IS NULL):
// al facturar las notas el credito se libera solo. Sin credito asignado (NULL o 0) no se pueden emitir notas.
// Los literales '50' e IS NULL coinciden con el indice filtrado IX_Comprobantes_despacho_pendiente.
export const sqlSaldoCredito = (bloquear: boolean) => `
    SELECT r.credito_limite AS limite,
           ISNULL((SELECT SUM(c.total) FROM Comprobantes c
                   WHERE c.ReceptorId = r.id AND c.tipo_comprobante = '50' AND c.estado_nota_despacho IS NULL), 0) AS consumido
    FROM Receptores r ${bloquear ? 'WITH (UPDLOCK, ROWLOCK)' : ''}
    WHERE r.id = @receptorId`;

export interface ISaldoCredito {
    habilitado: boolean;
    limite: number;
    consumido: number;
    saldo: number;
}

export const calculaSaldoCredito = (limite: number | null | undefined, consumido: number | null | undefined): ISaldoCredito => {
    const l = Number(limite ?? 0);
    const c = Number(consumido ?? 0);
    return { habilitado: l > 0, limite: l, consumido: c, saldo: Math.round((l - c) * 100) / 100 };
};
