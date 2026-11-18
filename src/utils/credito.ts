// Credito de clientes para facturas y boletas "al credito". Las notas de despacho NO usan credito.
// credito_limite (Receptores, en soles) lo asigna el administrador. Saldo = credito - ventas al credito (las notas de
// credito las restan) + abonos que registra el administrador cuando el cliente paga. Sin credito (NULL o 0) no hay ventas al credito.
// Los literales coinciden con el indice filtrado IX_Comprobantes_credito (es_credito = 1).
export const sqlSaldoCredito = (bloquear: boolean) => `
    SELECT r.credito_limite AS limite,
           ISNULL((SELECT SUM(CASE WHEN c.tipo_comprobante = '07' THEN -c.total ELSE c.total END) FROM Comprobantes c
                   WHERE c.ReceptorId = r.id AND c.es_credito = 1), 0) AS consumido,
           ISNULL((SELECT SUM(a.monto) FROM CreditoAbonos a WHERE a.ReceptorId = r.id), 0) AS abonado
    FROM Receptores r ${bloquear ? 'WITH (UPDLOCK, ROWLOCK)' : ''}
    WHERE r.id = @receptorId`;

export interface ISaldoCredito {
    habilitado: boolean;
    limite: number;
    consumido: number;
    abonado: number;
    saldo: number;
}

export const calculaSaldoCredito = (limite: number | null | undefined, consumido: number | null | undefined, abonado: number | null | undefined = 0): ISaldoCredito => {
    const l = Number(limite ?? 0);
    const c = Number(consumido ?? 0);
    const a = Number(abonado ?? 0);
    return { habilitado: l > 0, limite: l, consumido: c, abonado: a, saldo: Math.round((l - c + a) * 100) / 100 };
};
