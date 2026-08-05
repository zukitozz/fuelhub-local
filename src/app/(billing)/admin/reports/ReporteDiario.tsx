"use client";

import { ChangeEvent, useEffect, useState, useMemo } from "react";
import useSWR from 'swr';
import * as XLSX from 'xlsx';
import { IoDownloadOutline, IoCalendarOutline } from "react-icons/io5";

import { obtieneReporteCierreDiarioDetallado } from '@/actions';
import { currencyFormat, toLocaleOnlyDate } from "@/utils";
import { IReporteCierreDiarioDetalle } from '@/interfaces';

const fetcher = (fecha: string) => obtieneReporteCierreDiarioDetallado(fecha);

interface ISeccion {
    titulo: string;
    filas: IReporteCierreDiarioDetalle[];
    ventas: number;
    volumen: number;
    soles: number;
    // Los no combustibles se miden por unidad, no por galonaje. En esas secciones las
    // columnas son CANTIDAD y PRECIO UNIT. (cantidad x precio = soles), mientras que en
    // combustible son VENTAS (despachos) y VOLUMEN en galones.
    porUnidad: boolean;
}

// `ventas` llega aparte porque es un conteo de comprobantes distintos: un comprobante con
// varios productos aparece en varias filas y sumarlas lo contaria mas de una vez.
const construyeSeccion = (
    titulo: string,
    filas: IReporteCierreDiarioDetalle[],
    ventas: number,
    porUnidad = false
): ISeccion => ({
    titulo,
    filas,
    ventas,
    porUnidad,
    ...filas.reduce((acc, curr) => ({
        volumen: acc.volumen + curr.volumen,
        soles: acc.soles + curr.soles,
    }), { volumen: 0, soles: 0 })
});

// Precio efectivamente cobrado en el dia. Coincide con el precio del maestro de
// productos salvo que se hayan aplicado descuentos.
const precioUnitario = (fila: IReporteCierreDiarioDetalle) =>
    fila.volumen ? fila.soles / fila.volumen : 0;

export const ReporteDiario = () => {
    const [date, setDate] = useState<string>(toLocaleOnlyDate(new Date()));
    const [isChecked, setIsChecked] = useState<boolean>(false);

    const { data, isValidating, isLoading, mutate } = useSWR(
        `${process.env.NEXT_PUBLIC_URL}/api-diario-${date}`,
        () => fetcher(date)
    );

    // Secciones del cierre: combustibles por tipo de movimiento + otros productos
    const secciones = useMemo(() => {
        const filas = data?.detalle ?? [];
        const conteos = data?.conteos ?? [];
        const combustibles = filas.filter(f => f.medida === 'GLL');
        const otros = filas.filter(f => f.medida !== 'GLL');

        // Comprobantes distintos del tipo indicado
        const ventasDe = (tipo: IReporteCierreDiarioDetalle['tipo']) =>
            conteos.find(c => c.tipo === tipo)?.ventas ?? 0;

        const resultado: ISeccion[] = [
            construyeSeccion('Ventas', combustibles.filter(f => f.tipo === 'VENTA'), ventasDe('VENTA')),
            construyeSeccion('Nota de despacho', combustibles.filter(f => f.tipo === 'DESPACHO'), ventasDe('DESPACHO')),
            construyeSeccion('Serafin', combustibles.filter(f => f.tipo === 'SERAFIN'), ventasDe('SERAFIN')),
        ];
        // Otros productos muestra cantidad de unidades, no comprobantes: no usa `ventas`
        if (isChecked) resultado.push(construyeSeccion('Otros productos', otros, 0, true));

        return resultado.filter(seccion => seccion.filas.length > 0);
    }, [data, isChecked]);

    // Solo se suman los soles: el volumen mezcla galones con unidades y las ventas
    // contarian dos veces un comprobante que llevo combustible y otros productos.
    const totalGeneral = useMemo(
        () => secciones.reduce((acc, seccion) => acc + seccion.soles, 0),
        [secciones]
    );

    const handleDateChange = (e: ChangeEvent<HTMLInputElement>) => setDate(e.target.value);
    const handleCheckChange = (e: ChangeEvent<HTMLInputElement>) => setIsChecked(e.target.checked);

    const exportToExcel = () => {
        if (secciones.length === 0) return;
        const rows: (string | number)[][] = [];
        secciones.forEach((seccion, index) => {
            if (index > 0) rows.push([]);
            rows.push([seccion.titulo.toUpperCase()]);
            rows.push([
                'PRODUCTO',
                seccion.porUnidad ? 'CANTIDAD' : 'VENTAS',
                seccion.porUnidad ? 'PRECIO UNIT.' : 'VOLUMEN',
                'SOLES'
            ]);
            seccion.filas.forEach(fila => {
                rows.push([
                    fila.producto,
                    seccion.porUnidad ? Number(fila.volumen.toFixed(2)) : fila.ventas,
                    seccion.porUnidad ? Number(precioUnitario(fila).toFixed(2)) : Number(fila.volumen.toFixed(2)),
                    Number(fila.soles.toFixed(2))
                ]);
            });
            rows.push([
                'TOTAL',
                seccion.porUnidad ? Number(seccion.volumen.toFixed(2)) : seccion.ventas,
                seccion.porUnidad ? '' : Number(seccion.volumen.toFixed(2)),
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

    useEffect(() => {
        mutate();
    }, [date]);

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
                    {/* Checkbox estilizado */}
                    <label className="relative inline-flex items-center cursor-pointer group">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={isChecked}
                            onChange={handleCheckChange}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">
                            Incluir productos
                        </span>
                    </label>

                    <button
                        onClick={exportToExcel}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-all text-sm font-semibold shadow-sm"
                    >
                        <IoDownloadOutline size={20} />
                        Excel
                    </button>

                    <div className="flex items-center border rounded-lg px-3 py-1 bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                        <IoCalendarOutline className="text-gray-400 mr-2" size={18} />
                        <input
                            type="date"
                            className="bg-transparent text-sm outline-none text-gray-700"
                            value={date}
                            onChange={handleDateChange}
                        />
                    </div>
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
                                {/* Cada seccion trae su propio encabezado: Otros productos mide en
                                    unidades y no en galones, asi que sus dos columnas del medio
                                    significan otra cosa que las de combustible. */}
                                <tr className="bg-gray-100/70">
                                    <th scope="rowgroup" className="px-4 py-1.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                        {seccion.titulo}
                                    </th>
                                    <th scope="col" className="px-4 py-1.5 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                        {seccion.porUnidad ? 'Cantidad' : 'Ventas'}
                                    </th>
                                    <th scope="col" className="px-4 py-1.5 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                        {seccion.porUnidad ? 'Precio Unit.' : 'Volumen'}
                                    </th>
                                    <th scope="col" className="px-4 py-1.5 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                        Soles
                                    </th>
                                </tr>
                                {seccion.filas.map(fila => (
                                    <tr key={`${fila.tipo}-${fila.codigo}-${fila.producto}`} className="hover:bg-blue-50/50 transition-colors">
                                        <td className="px-4 py-1.5 whitespace-nowrap font-medium text-gray-900">{fila.producto}</td>
                                        <td className="px-4 py-1.5 whitespace-nowrap text-right text-gray-600">
                                            {seccion.porUnidad ? Number(fila.volumen.toFixed(2)) : fila.ventas}
                                        </td>
                                        <td className="px-4 py-1.5 whitespace-nowrap text-right text-gray-600">
                                            {seccion.porUnidad ? currencyFormat(precioUnitario(fila)) : fila.volumen.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-1.5 whitespace-nowrap text-right font-semibold text-gray-900">{currencyFormat(fila.soles)}</td>
                                    </tr>
                                ))}
                                {/* Fila de Totales */}
                                <tr className="bg-gray-50 font-bold border-t border-gray-300">
                                    <td className="px-4 py-1.5 text-gray-900 uppercase">Total</td>
                                    <td className="px-4 py-1.5 text-right text-gray-900">
                                        {seccion.porUnidad ? Number(seccion.volumen.toFixed(2)) : seccion.ventas}
                                    </td>
                                    {/* Sumar precios unitarios no significa nada */}
                                    <td className="px-4 py-1.5 text-right text-gray-900">
                                        {seccion.porUnidad ? '—' : seccion.volumen.toFixed(2)}
                                    </td>
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
