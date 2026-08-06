"use client";

import { ChangeEvent, useState, useMemo } from "react";
import useSWR from 'swr';
import * as XLSX from 'xlsx';
import { IoDownloadOutline, IoCalendarOutline } from "react-icons/io5";

import { obtieneReporteCierreDiarioDetallado } from '@/actions';
import { currencyFormat, toLocaleOnlyDate } from "@/utils";
import { IReporteCierreDiarioDetalle } from '@/interfaces';

const fetcher = (fecha: string) => obtieneReporteCierreDiarioDetallado(fecha);

// Todas las secciones usan las mismas columnas: PRODUCTO, VENTAS (comprobantes),
// CANTIDAD (galones en combustible, unidades en el resto) y SOLES.
interface ISeccion {
    titulo: string;
    filas: IReporteCierreDiarioDetalle[];
    ventas: number;
    cantidad: number;
    soles: number;
    // Nota de despacho y Serafin no son cobro, asi que no entran al total general
    sumaAlTotal: boolean;
}

// `ventas` llega aparte porque es un conteo de comprobantes distintos: un comprobante con
// varios productos aparece en varias filas y sumarlas lo contaria mas de una vez.
const construyeSeccion = (
    titulo: string,
    filas: IReporteCierreDiarioDetalle[],
    ventas: number,
    sumaAlTotal = true
): ISeccion => ({
    titulo,
    filas,
    ventas,
    sumaAlTotal,
    ...filas.reduce((acc, curr) => ({
        cantidad: acc.cantidad + curr.volumen,
        soles: acc.soles + curr.soles,
    }), { cantidad: 0, soles: 0 })
});

export const ReporteDiario = () => {
    const [date, setDate] = useState<string>(toLocaleOnlyDate(new Date()));

    // La clave lleva la fecha, asi que SWR revalida solo al cambiarla
    const { data, isValidating, isLoading } = useSWR(
        `${process.env.NEXT_PUBLIC_URL}/api-diario-${date}`,
        () => fetcher(date)
    );

    // Secciones del cierre: combustibles por tipo de movimiento + otros productos
    const secciones = useMemo(() => {
        const filas = data?.detalle ?? [];
        const conteos = data?.conteos ?? [];
        const combustibles = filas.filter(f => f.medida === 'GLL');
        const otros = filas.filter(f => f.medida !== 'GLL');

        // Comprobantes de combustible del tipo indicado
        const ventasCombustible = (tipo: IReporteCierreDiarioDetalle['tipo']) =>
            conteos.find(c => c.tipo === tipo && c.es_combustible === 1)?.ventas ?? 0;
        // Un comprobante pertenece a un solo tipo, asi que sumar entre tipos no duplica
        const ventasOtros = conteos
            .filter(c => c.es_combustible === 0)
            .reduce((acc, c) => acc + c.ventas, 0);

        const resultado: ISeccion[] = [
            construyeSeccion('Ventas', combustibles.filter(f => f.tipo === 'VENTA'), ventasCombustible('VENTA')),
            construyeSeccion('Nota de despacho', combustibles.filter(f => f.tipo === 'DESPACHO'), ventasCombustible('DESPACHO'), false),
            construyeSeccion('Serafin', combustibles.filter(f => f.tipo === 'SERAFIN'), ventasCombustible('SERAFIN'), false),
            construyeSeccion('Otros productos', otros, ventasOtros),
        ];

        return resultado.filter(seccion => seccion.filas.length > 0);
    }, [data]);

    // Solo suma los soles de lo efectivamente cobrado: nota de despacho y serafin quedan
    // fuera. El volumen mezclaria galones con unidades y las ventas contarian dos veces un
    // comprobante que llevo combustible y otros productos, asi que esas columnas van vacias.
    const totalGeneral = useMemo(
        () => secciones.reduce((acc, seccion) => acc + (seccion.sumaAlTotal ? seccion.soles : 0), 0),
        [secciones]
    );

    const handleDateChange = (e: ChangeEvent<HTMLInputElement>) => setDate(e.target.value);

    const exportToExcel = () => {
        if (secciones.length === 0) return;
        const rows: (string | number)[][] = [];
        secciones.forEach((seccion, index) => {
            if (index > 0) rows.push([]);
            rows.push([seccion.titulo.toUpperCase()]);
            rows.push(['PRODUCTO', 'VENTAS', 'CANTIDAD', 'SOLES']);
            seccion.filas.forEach(fila => {
                rows.push([
                    fila.producto,
                    fila.ventas,
                    Number(fila.volumen.toFixed(3)),
                    Number(fila.soles.toFixed(2))
                ]);
            });
            rows.push([
                'TOTAL',
                seccion.ventas,
                Number(seccion.cantidad.toFixed(3)),
                Number(seccion.soles.toFixed(2))
            ]);
        });
        rows.push([]);
        rows.push(['TOTAL GENERAL', '', '', Number(totalGeneral.toFixed(2))]);

        const worksheet = XLSX.utils.aoa_to_sheet(rows);
        worksheet['!cols'] = [{ wch: 28 }, { wch: 10 }, { wch: 12 }, { wch: 14 }];
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Cierre Diario");
        XLSX.writeFile(workbook, `Cierre_Diario_${date}.xlsx`);
    };

    if (isLoading || isValidating) {
        return (
            <div className="flex justify-center items-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-gray-900 border-b-2"></div>
            </div>
        );
    }

    return (
        <div className="col-span-2 bg-white rounded-lg shadow-md p-4">
            {/* Encabezado y Controles */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
                <div>
                    <h2 className="text-lg font-bold text-gray-800">Reporte de Cierre Diario</h2>
                    <p className="text-xs text-gray-500">Resumen de ventas y galonaje</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center border rounded-lg px-3 py-1 bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                        <IoCalendarOutline className="text-gray-400 mr-2" size={18} />
                        <input
                            type="date"
                            className="bg-transparent text-sm outline-none text-gray-700"
                            value={date}
                            onChange={handleDateChange}
                        />
                    </div>

                    <button
                        onClick={exportToExcel}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-all text-sm font-semibold shadow-sm"
                    >
                        <IoDownloadOutline size={20} />
                        Excel
                    </button>
                </div>
            </div>

            {/* Tablas por sección */}
            {secciones.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8 border rounded-xl">
                    No hay movimientos registrados para la fecha seleccionada.
                </p>
            ) : (
                <div className="overflow-x-auto border rounded-xl">
                    <table className="min-w-full text-sm">
                        {secciones.map((seccion, index) => (
                            <tbody key={seccion.titulo} className="divide-y divide-gray-100">
                                {/* Separacion entre secciones para distinguirlas de un vistazo */}
                                {index > 0 && (
                                    <tr aria-hidden="true">
                                        <td colSpan={4} className="h-4 bg-white"></td>
                                    </tr>
                                )}
                                {/* Cada seccion repite el encabezado; CANTIDAD son galones en
                                    combustible y unidades en otros productos. */}
                                <tr className="bg-gray-100/70">
                                    <th scope="rowgroup" className="px-4 py-1.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                        {seccion.titulo}
                                    </th>
                                    <th scope="col" className="px-4 py-1.5 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Ventas</th>
                                    <th scope="col" className="px-4 py-1.5 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Cantidad</th>
                                    <th scope="col" className="px-4 py-1.5 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Soles</th>
                                </tr>
                                {seccion.filas.map(fila => (
                                    <tr key={`${fila.tipo}-${fila.codigo}-${fila.producto}`} className="hover:bg-blue-50/50 transition-colors">
                                        <td className="px-4 py-1.5 whitespace-nowrap font-medium text-gray-900">{fila.producto}</td>
                                        <td className="px-4 py-1.5 whitespace-nowrap text-right text-gray-600">{fila.ventas}</td>
                                        <td className="px-4 py-1.5 whitespace-nowrap text-right text-gray-600">{fila.volumen.toFixed(3)}</td>
                                        <td className="px-4 py-1.5 whitespace-nowrap text-right font-semibold text-gray-900">{currencyFormat(fila.soles)}</td>
                                    </tr>
                                ))}
                                {/* Fila de Totales */}
                                <tr className="bg-gray-50 font-bold border-t border-gray-300">
                                    <td className="px-4 py-1.5 text-gray-900 uppercase">Total</td>
                                    <td className="px-4 py-1.5 text-right text-gray-900">{seccion.ventas}</td>
                                    <td className="px-4 py-1.5 text-right text-gray-900">{seccion.cantidad.toFixed(3)}</td>
                                    <td className="px-4 py-1.5 text-right text-blue-700">{currencyFormat(seccion.soles)}</td>
                                </tr>
                            </tbody>
                        ))}
                        <tfoot>
                            <tr aria-hidden="true">
                                <td colSpan={4} className="h-4 bg-white"></td>
                            </tr>
                            <tr className="bg-blue-50 border-t-2 border-blue-300">
                                <td className="px-4 py-2 font-bold text-gray-900 uppercase tracking-wider">Total general</td>
                                <td className="px-4 py-2"></td>
                                <td className="px-4 py-2"></td>
                                <td className="px-4 py-2 text-right font-bold text-blue-700">{currencyFormat(totalGeneral)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
}
