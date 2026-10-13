"use client";

import { ChangeEvent, useEffect, useState, useMemo } from "react";
import useSWR from 'swr';
import * as XLSX from 'xlsx';
import { IoDownloadOutline, IoCalendarOutline } from "react-icons/io5";

import { obtieneReporteCierrePorDia } from '@/actions';
import { currencyFormat, toLocaleOnlyDate, toLocaleShow } from "@/utils";
import { IReporteCierreTurno } from '@/interfaces';

const fetcher = (fecha: string) => 
    obtieneReporteCierrePorDia(fecha);

export const ReporteCierreTurnos = () => {
    const [date, setDate] = useState<string>(toLocaleOnlyDate(new Date()));

    const { data, isValidating, isLoading, mutate } = useSWR(
        `${process.env.NEXT_PUBLIC_URL}/api-cierre-turnos-usuarios`,
        () => fetcher(date)
    );
    // Cálculos de totales optimizados
    const totals = useMemo(() => {
        if (!Array.isArray(data)) return { sum_total: 0 };
        return data.reduce((acc, curr) => ({
            sum_total: acc.sum_total + curr.total
        }), { sum_total: 0 });
    }, [data]);    

    const handleDateChange = (e: ChangeEvent<HTMLInputElement>) => setDate(e.target.value);

    const exportToExcel = () => {
        if (!data || data.length === 0) return;
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Cierre Turno");
        XLSX.writeFile(workbook, `Cierre_Turno_${date}.xlsx`);
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
        <div className="col-span-2 bg-white rounded-lg shadow-md p-6">
            {/* Encabezado y Controles */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Reporte de Cierre Turnos/Usuarios</h2>
                    <p className="text-sm text-gray-500">Por usuario y tipo de pago</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    {/* Checkbox estilizado */}

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
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Usuario</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {data?.map((item: IReporteCierreTurno) => (
                            <tr key={item.nombre} className="hover:bg-blue-50/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.turno}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{toLocaleShow(item.fecha)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.nombre?.slice(0, 15)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{currencyFormat(item.total)}</td>
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
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}