"use client";

import { useState, useMemo, useEffect } from "react";
import useSWR from 'swr';
import * as XLSX from 'xlsx';
import Link from 'next/link';
import { IoDownloadOutline, IoCalendarOutline } from "react-icons/io5";
import { currencyFormat, toLocaleOnlyDate, toLocaleShow } from "@/utils";
import { obtieneReporteComprobantes } from "@/actions/reportes/get-reporte";
import { IReporteComprobantes } from "@/interfaces/reporte.interface";

// Interface para tipar los datos que vendrán de la API
const fetcher = (boletas: boolean, factura: boolean, notasCredito: boolean, notasDespacho: boolean, calibracion: boolean, fechaInicio: string, fechaFin: string, usuario: string, ruc: string): Promise<IReporteComprobantes[]> =>
    obtieneReporteComprobantes({ boletas, factura, notasCredito, notasDespacho, calibracion, fechaInicio, fechaFin, usuario, ruc });

export const ReporteComprobantes = () => {
    // 1. Estados de los Filtros de tu imagen de referencia
    const [fechaInicio, setFechaInicio] = useState<string>(toLocaleOnlyDate(new Date()));
    const [fechaFin, setFechaFin] = useState<string>(toLocaleOnlyDate(new Date()));
    const [usuario, setUsuario] = useState<string>("");
    const [ruc, setRuc] = useState<string>("");

    // 2. Estados de los Checkboxes con el estilo Toggle del Reporte Diario
    const [comprobantes, setComprobantes] = useState({
        boletas: true,
        facturas: true,
        notasCredito: false,
        notasDespacho: false,
        calibracion: false,
    });

    const { data, isValidating, isLoading, mutate } = useSWR<IReporteComprobantes[]>(
        `${process.env.NEXT_PUBLIC_URL}/api-cierres`, 
        () => fetcher(
            comprobantes.boletas,
            comprobantes.facturas,
            comprobantes.notasCredito,
            comprobantes.notasDespacho,
            comprobantes.calibracion,
            fechaInicio,
            fechaFin,
            usuario,
            ruc
        )
    );

    const handleToggle = (key: keyof typeof comprobantes) => {
        setComprobantes(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Cálculos de totales optimizados
    const totalGeneral = useMemo(() => {
        if (!Array.isArray(data)) return 0;
        return data.reduce((acc, curr) => acc + curr.total, 0);
    }, [data]);

    const exportToExcel = () => {
        if (!data || data.length === 0) return;
        //La url solo sirve para el boton PDF de la pantalla: en el Excel es una columna
        //larga que no aporta nada
        const filas = data.map(({ url, ...resto }) => resto);
        const worksheet = XLSX.utils.json_to_sheet(filas);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Comprobantes");
        XLSX.writeFile(workbook, `Reporte_Comprobantes_${fechaInicio}.xlsx`);
    };

    useEffect(() => {
        mutate();
    }, [fechaInicio, fechaFin, usuario, ruc, comprobantes]);
    
    return (
        <div className="col-span-2 bg-white rounded-lg shadow-md p-6 flex flex-col gap-6">
            
            {/* ENCABEZADO Y BOTÓN EXCEL */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Reporte de comprobantes</h2>
                    <p className="text-sm text-gray-500">Seleccione algún criterio para obtener el reporte, considerar que solo se mostrarán los primeros 100 registros.</p>
                </div>
                <button 
                    onClick={exportToExcel}
                    disabled={!data || data.length === 0}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-all text-sm font-semibold shadow-sm"
                >
                    <IoDownloadOutline size={20} />
                    Excel
                </button>
            </div>

            {/* SECCIÓN DEL FORMULARIO (Layout idéntico a tu imagen) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                
                {/* Columna Izquierda y Central: Inputs del Formulario (Ocupa 2 columnas) */}
                <div className="md:col-span-2 flex flex-col gap-5">
                    
                    {/* Fila de Fechas Juntas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 border border-gray-300 rounded-lg overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-gray-300 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                        {/* Fecha Inicio */}
                        <div className="flex items-center justify-between px-3 py-2 bg-white">
                            <div className="flex flex-col w-full">
                                <span className="text-[10px] text-gray-400 font-bold uppercase">Fecha inicio</span>
                                <input
                                    type="date"
                                    className="bg-transparent text-sm outline-none text-gray-700 w-full cursor-pointer mt-0.5"
                                    value={fechaInicio}
                                    onChange={(e) => setFechaInicio(e.target.value)}
                                />
                            </div>
                            <IoCalendarOutline className="text-gray-400 ml-2" size={18} />
                        </div>
                        {/* Fecha Fin */}
                        <div className="flex items-center justify-between px-3 py-2 bg-white">
                            <div className="flex flex-col w-full">
                                <span className="text-[10px] text-gray-400 font-bold uppercase">Fecha fin</span>
                                <input
                                    type="date"
                                    className="bg-transparent text-sm outline-none text-gray-700 w-full cursor-pointer mt-0.5"
                                    value={fechaFin}
                                    onChange={(e) => setFechaFin(e.target.value)}
                                />
                            </div>
                            <IoCalendarOutline className="text-gray-400 ml-2" size={18} />
                        </div>
                    </div>

                    {/* Input de Usuario (Borde Flotante Material Design) */}
                    {/* <div className="relative border border-gray-300 rounded-lg px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                        <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-gray-400 font-bold uppercase tracking-wide">Usuario</span>
                        <select
                            className="w-full bg-transparent text-sm outline-none text-gray-700 cursor-pointer pt-1 h-[28px]"
                            value={usuario}
                            onChange={(e) => setUsuario(e.target.value)}
                        >
                            <option value="">Todos los usuarios</option>
                            <option value="admin">Administrador</option>
                            <option value="cajero1">Cajero Turno Mañana</option>
                        </select>
                    </div> */}

                    {/* Input de RUC (Borde Flotante Material Design) */}
                    <div className="relative border border-gray-300 rounded-lg px-3 py-2.5 bg-white focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                        <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-gray-400 font-bold uppercase tracking-wide">Ruc</span>
                        <input
                            type="text"
                            maxLength={11}
                            placeholder="Ingrese RUC del cliente..."
                            className="w-full bg-transparent text-sm outline-none text-gray-700 placeholder-gray-300"
                            value={ruc}
                            onChange={(e) => setRuc(e.target.value)}
                        />
                    </div>
                </div>

                {/* Columna Derecha: Checkboxes con estilo TOGGLE SWITCH */}
                <div className="flex flex-col gap-3.5 pl-2 md:pt-1">
                    {[
                        { key: "boletas", label: "Boletas" },
                        { key: "facturas", label: "Facturas" },
                        { key: "notasCredito", label: "Notas credito" },
                        { key: "notasDespacho", label: "Notas despacho" },
                        { key: "calibracion", label: "Calibracion" },
                    ].map((item) => (
                        <label key={item.key} className="relative inline-flex items-center cursor-pointer group select-none">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={comprobantes[item.key as keyof typeof comprobantes]}
                                onChange={() => handleToggle(item.key as keyof typeof comprobantes)}
                            />
                            {/* El switch redondeado e idéntico al reporte diario */}
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                            <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">
                                {item.label}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {/* TABLA INFERIOR REACTIVA */}
            <div className="relative border rounded-xl overflow-hidden mt-2">
                {/* Spinner de carga superpuesto */}
                {(isLoading || isValidating) && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex justify-center items-center z-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-blue-600 border-b-2"></div>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Comprobante</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Cliente</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Usuario</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {data && data.length > 0 ? (
                                data.map((item) => (
                                    <tr key={item.id} className="hover:bg-blue-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{toLocaleShow(item.fecha)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.comprobante}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">{item.receptor}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.usuario}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {item.url && item.url != 'null' && (
                                                <Link href={item.url||"#"} target="_blank" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">PDF</Link>
                                            )}                                            
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">{currencyFormat(item.total)}</td>

                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-400">
                                        No se encontraron registros con los criterios seleccionados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {/* Fila de Totales */}
                        {data && data.length > 0 && (
                            <tfoot className="bg-gray-100 font-bold border-t-2 border-gray-300">
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-sm text-gray-900 uppercase">Total General</td>
                                    <td className="px-6 py-4 text-sm text-right text-blue-700">{currencyFormat(totalGeneral)}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
};