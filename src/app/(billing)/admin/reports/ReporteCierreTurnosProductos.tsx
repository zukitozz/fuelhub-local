"use client";

import { ChangeEvent, useEffect, useState, useMemo } from "react";
import useSWR from 'swr';
import * as XLSX from 'xlsx';
import { IoDownloadOutline, IoCalendarOutline } from "react-icons/io5";

import { obtieneReporteCierreTurnosProductosPorDia } from '@/actions';
import { currencyFormat, toLocaleOnlyDate } from "@/utils";
import { IReporteCierreTurnoProductos } from '@/interfaces';

const fetcher = (fecha: string, includeProducts: boolean): Promise<IReporteCierreTurnoProductos[]> =>
    obtieneReporteCierreTurnosProductosPorDia(fecha, includeProducts);

export const ReporteCierreTurnosProductos = () => {
    const [date, setDate] = useState<string>(toLocaleOnlyDate(new Date()));
    const [isChecked, setIsChecked] = useState<boolean>(false);

    const { data, isValidating, isLoading, mutate } = useSWR<IReporteCierreTurnoProductos[]>(
        `${process.env.NEXT_PUBLIC_URL}/api-cierre-turnos-productos`,
        () => fetcher(date, isChecked)
    );
    
    // Cálculos de totales optimizados
    const totals = useMemo(() => {
        if (!Array.isArray(data)) return { sum_total: 0, sum_despacho: 0, sum_calibracion: 0 };
        return data.reduce((acc, curr) => ({
            sum_total: acc.sum_total + curr.total_soles,
            sum_despacho: acc.sum_despacho + curr.despacho_soles,
            sum_calibracion: acc.sum_calibracion + curr.calibracion_soles
        }), { sum_total: 0, sum_despacho: 0, sum_calibracion: 0 });
    }, [data]);

    const handleDateChange = (e: ChangeEvent<HTMLInputElement>) => setDate(e.target.value);
    const handleCheckChange = (e: ChangeEvent<HTMLInputElement>) => setIsChecked(e.target.checked);

    const exportToExcel = () => {
        if (!data || data.length === 0) return;
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Cierre Turno Productos");
        XLSX.writeFile(workbook, `Cierre_Turno_Productos_${date}.xlsx`);
    };

    useEffect(() => {
        mutate();
    }, [date, isChecked]);

    if (isLoading || isValidating) {
        return (
            <div className="flex justify-center items-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-gray-900 border-b-2"></div>
            </div>
        );
    }

    return (
        <div className="col-span-2 bg-white rounded-lg shadow-md p-6">
            {/* Encabezado y Controles */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Reporte de Cierre Turnos/Productos</h2>
                    <p className="text-sm text-gray-500">Por productos y tipo de pago</p>
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

            {/* Tabla */}
            <div className="overflow-x-auto border rounded-xl">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Turno</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Producto</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Cantidad Venta</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Total Venta</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Cantidad Despacho</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Total Despacho</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Cantidad Calibracion</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Total Calibracion</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {data?.map((item: IReporteCierreTurnoProductos) => (
                            <tr key={item.producto} className="hover:bg-blue-50/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.turno}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.producto}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.total_cantidad}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{currencyFormat(item.total_soles)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.despacho_cantidad}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{currencyFormat(item.despacho_soles)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.calibracion_cantidad}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{currencyFormat(item.calibracion_soles)}</td>
                            </tr>
                        ))}
                    </tbody>
                    {/* Fila de Totales */}
                    <tfoot className="bg-gray-100 font-bold border-t-2 border-gray-300">
                        <tr>
                            <td className="px-6 py-4 text-sm text-gray-900 uppercase">Total General</td>
                            <td className="px-6 py-4 text-sm text-gray-900"></td>
                            <td className="px-6 py-4 text-sm text-gray-900"></td>
                            <td className="px-6 py-4 text-sm text-blue-700">{currencyFormat(totals.sum_total)}</td>
                            <td className="px-6 py-4 text-sm text-gray-900"></td>
                            <td className="px-6 py-4 text-sm text-blue-700">{currencyFormat(totals.sum_despacho)}</td>
                            <td className="px-6 py-4 text-sm text-gray-900"></td>
                            <td className="px-6 py-4 text-sm text-blue-700">{currencyFormat(totals.sum_calibracion)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}