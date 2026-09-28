'use client';
import { ChangeEvent, useMemo, useState } from 'react';
import useSWR from 'swr';
import { IoCalendarOutline } from "react-icons/io5";

import { obtieneCierresPorFecha } from '@/actions/cierreturno';
import { obtieneTurnosAbiertos } from '@/actions';
import { ICierreTurno, IDepositos, IGastos } from '@/interfaces';
import { currencyFormat, toLocaleOnlyDate, toLocaleStorage } from '@/utils';
import { ResumenTable } from '@/components';
import { EditarCierreModal } from '../../cierreturno/EditarCierreModal';

const fetcher = (fecha: string) => obtieneCierresPorFecha(fecha);

const ayer = () => toLocaleOnlyDate(new Date(Date.now() - 24 * 60 * 60 * 1000));

export const CierreTurnoFechaSection = () => {
    const [fecha, setFecha] = useState<string>(ayer());
    const [cierreEditando, setCierreEditando] = useState<ICierreTurno | null>(null);

    const { data, error, isLoading, isValidating, mutate } = useSWR(
        [`${process.env.NEXT_PUBLIC_URL}/api-cierres-por-fecha`, fecha],
        () => fetcher(fecha)
    );

    const { data: abiertos } = useSWR(
        `${process.env.NEXT_PUBLIC_URL}/api-turnos-abiertos`,
        () => obtieneTurnosAbiertos()
    );

    const grupos = useMemo(() => {
        if (!Array.isArray(data)) return [];
        const map = new Map<string, ICierreTurno[]>();
        data.forEach(cierre => {
            const key = cierre.turno || 'SIN TURNO';
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(cierre);
        });
        return Array.from(map.entries());
    }, [data]);

    const handleFechaChange = (e: ChangeEvent<HTMLInputElement>) => setFecha(e.target.value);

    return (
        <div>
            <div className="flex items-center justify-between mb-6 gap-4">
                <p className="text-sm text-gray-500">Cierres de turno consolidados en el cierre de día de la fecha seleccionada.</p>
                <div className="flex items-center border rounded-lg px-3 py-1 bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                    <IoCalendarOutline className="text-gray-400 mr-2" size={18} />
                    <input
                        type="date"
                        className="bg-transparent text-sm outline-none text-gray-700"
                        value={fecha}
                        onChange={handleFechaChange}
                    />
                </div>
            </div>

            {abiertos && abiertos.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                    <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                        <span>⚠️</span> Hay turnos abiertos con comprobantes que aún no tienen cierre
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-amber-700 list-disc list-inside">
                        {abiertos.map(t => (
                            <li key={t.UsuarioId}>{t.nombre} ({t.turno}, {t.isla}) — {t.pendientes} comprobantes sin cerrar</li>
                        ))}
                    </ul>
                </div>
            )}

            {(isLoading || isValidating) && (
                <div className="flex justify-center p-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-gray-900 border-b-2"></div>
                </div>
            )}

            {error && (
                <div className="p-7 text-red-500 font-bold">Error al cargar los cierres de esa fecha</div>
            )}

            {!isLoading && !isValidating && !error && Array.isArray(data) && data.length === 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-7 text-gray-400 text-sm italic">
                    No hay cierres de turno consolidados para esa fecha.
                </div>
            )}

            {grupos.map(([turno, cierres]) => (
                <div key={turno} className="mb-8">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 border-b pb-2">{turno}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {cierres.map((cierre) => {
                            const totalDepositosTurno = cierre.depositos
                                ?.reduce((acc, item) => acc + (Number(item.monto) || 0), 0) || 0;
                            const totalGastosTurno = cierre.gastos
                                ?.reduce((acc, item) => acc + (Number(item.monto) || 0), 0) || 0;

                            const camposContado = [
                                cierre.billetes_contado, cierre.monedas_contado, cierre.tarjeta_contado,
                                cierre.transferencia_contado, cierre.yape_contado, cierre.falsos_contado,
                            ];
                            const hasConteo = camposContado.some(v => v !== null && v !== undefined);
                            const totalContado = (cierre.billetes_contado || 0) + (cierre.monedas_contado || 0)
                                - (cierre.falsos_contado || 0) + (cierre.tarjeta_contado || 0)
                                + (cierre.transferencia_contado || 0) + (cierre.yape_contado || 0);
                            const totalSistema = (cierre.efectivo || 0) + (cierre.tarjeta || 0) + (cierre.yape || 0);
                            const diferencia = totalContado - totalSistema;
                            const tieneDiferencia = hasConteo && Math.abs(diferencia) > 0.01;

                            return (
                                <div
                                    key={cierre.id}
                                    className={`rounded-xl shadow-md border p-5 flex flex-col justify-between ${
                                        tieneDiferencia ? 'border-rose-400 bg-rose-50' : 'bg-white border-gray-100'
                                    }`}
                                >
                                    <div className="space-y-4">
                                        <div className="bg-slate-50 border border-gray-200/60 rounded-lg p-3 grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                                            <div className="text-gray-500">
                                                <span className="font-bold text-gray-400 text-[9px] block tracking-wider uppercase">FECHA</span>
                                                <span className="font-medium text-gray-800">{ cierre.fecha ? toLocaleStorage(cierre.fecha) : '' }</span>
                                            </div>
                                            <div className="text-gray-500">
                                                <span className="font-bold text-gray-400 text-[9px] block tracking-wider uppercase">ISLA</span>
                                                <span className="font-bold text-gray-800">{ cierre.isla }</span>
                                            </div>
                                            <div className="text-gray-500 col-span-2">
                                                <span className="font-bold text-gray-400 text-[9px] block tracking-wider uppercase">OPERADOR</span>
                                                <span className="font-medium text-gray-800 truncate block max-w-[240px]">{ cierre.usuario?.nombre || 'N/A' }</span>
                                            </div>
                                        </div>

                                        {cierre.depositos && cierre.depositos.length > 0 && (
                                            <ResumenTable title="DEPÓSITOS" headers={['CONCEPTO', 'MONTO']} footerLabel="TOTAL" footerValue={totalDepositosTurno}>
                                                {cierre.depositos.map((dep: IDepositos) => (
                                                    <tr key={dep.id}><td className="text-left truncate max-w-[160px]">{dep.concepto}</td><td className="text-right text-amber-600 font-medium">{currencyFormat(Number(dep.monto))}</td></tr>
                                                ))}
                                            </ResumenTable>
                                        )}

                                        {cierre.gastos && cierre.gastos.length > 0 && (
                                            <ResumenTable title="GASTOS" headers={['CONCEPTO', 'MONTO']} footerLabel="TOTAL" footerValue={totalGastosTurno}>
                                                {cierre.gastos.map((gas: IGastos) => (
                                                    <tr key={gas.id}><td className="text-left truncate max-w-[160px]">{gas.concepto}</td><td className="text-right text-rose-600 font-medium">{currencyFormat(Number(gas.monto))}</td></tr>
                                                ))}
                                            </ResumenTable>
                                        )}

                                        <div className="text-xs bg-white/60 rounded-lg border border-gray-200 p-3">
                                            <div className="flex justify-between text-gray-500">
                                                <span>Sistema (efectivo + tarjeta + yape):</span>
                                                <span className="font-semibold text-gray-800">{currencyFormat(totalSistema)}</span>
                                            </div>
                                            {hasConteo ? (
                                                <>
                                                    <div className="flex justify-between text-gray-500 mt-1">
                                                        <span>Conteo físico registrado:</span>
                                                        <span className="font-semibold text-gray-800">{currencyFormat(totalContado)}</span>
                                                    </div>
                                                    <div className={`flex justify-between mt-1 font-bold ${tieneDiferencia ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                        <span>Diferencia:</span>
                                                        <span>{currencyFormat(diferencia)}</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-gray-400 italic mt-1">Sin conteo físico registrado</div>
                                            )}
                                            {cierre.observaciones && (
                                                <div className="text-gray-500 mt-2 border-t border-gray-200 pt-2 italic">
                                                    &quot;{cierre.observaciones}&quot;
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-3 border-t border-dashed border-gray-200 flex justify-between items-center text-sm">
                                        <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Total Turno:</span>
                                        <span className="font-extrabold text-slate-800 bg-slate-100 px-2 py-1 rounded">
                                            {currencyFormat(cierre.total || 0)}
                                        </span>
                                    </div>

                                    <button
                                        className="mt-3 px-4 py-2 w-full text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors font-semibold"
                                        onClick={() => setCierreEditando(cierre)}
                                    >
                                        Editar
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            {cierreEditando && (
                <EditarCierreModal
                    cierre={cierreEditando}
                    onClose={() => setCierreEditando(null)}
                    onSaved={() => mutate()}
                />
            )}
        </div>
    );
};

export default CierreTurnoFechaSection;
