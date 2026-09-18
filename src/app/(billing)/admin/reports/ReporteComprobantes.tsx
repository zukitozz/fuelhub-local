"use client";

import { useState, useMemo, useEffect } from "react";
import useSWR from 'swr';
import * as XLSX from 'xlsx';
import Link from 'next/link';
import { IoDownloadOutline } from "react-icons/io5";
import { currencyFormat, toLocaleOnlyDate, toLocaleShow } from "@/utils";
import { obtieneReporteComprobantes } from "@/actions/reportes/get-reporte";
import { IReporteComprobantes } from "@/interfaces/reporte.interface";

// Interface para tipar los datos que vendrán de la API
const fetcher = (boletas: boolean, factura: boolean, notasCredito: boolean, notasDespacho: boolean, calibracion: boolean, fechaInicio: string, fechaFin: string, usuario: string, ruc: string): Promise<IReporteComprobantes[]> =>
    obtieneReporteComprobantes({ boletas, factura, notasCredito, notasDespacho, calibracion, fechaInicio, fechaFin, usuario, ruc });

const TIPOS_COMPROBANTE = [
    { key: "boletas", label: "Boletas" },
    { key: "facturas", label: "Facturas" },
    { key: "notasCredito", label: "N. crédito" },
    { key: "notasDespacho", label: "N. despacho" },
    { key: "calibracion", label: "Calibración" },
] as const;

export const ReporteComprobantes = () => {
    // 1. Estados de los Filtros
    const [fechaInicio, setFechaInicio] = useState<string>(toLocaleOnlyDate(new Date()));
    const [fechaFin, setFechaFin] = useState<string>(toLocaleOnlyDate(new Date()));
    const [usuario, setUsuario] = useState<string>("");
    const [ruc, setRuc] = useState<string>("");

    // 2. Estados de los toggles de tipo de comprobante
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
        //fecha_hora se guarda como string de hora local con offset +00:00 (no es UTC real),
        //por eso se lee con toLocaleShow (misma funcion que usa la tabla en pantalla) y no
        //con un Date crudo: si se deja como Date, xlsx lo reinterpreta con la zona horaria
        //del navegador y la hora del Excel sale distinta a la que se ve en pantalla
        const filas = data.map(({ url, ...resto }) => ({ ...resto, fecha: toLocaleShow(resto.fecha) }));
        const worksheet = XLSX.utils.json_to_sheet(filas);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Comprobantes");
        XLSX.writeFile(workbook, `Reporte_Comprobantes_${fechaInicio}.xlsx`);
    };

    useEffect(() => {
        mutate();
    }, [fechaInicio, fechaFin, usuario, ruc, comprobantes]);

    return (
        <div className="col-span-2 bg-white rounded-lg shadow-md p-6 flex flex-col gap-4">

            {/* ENCABEZADO Y BOTÓN EXCEL */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Reporte de comprobantes</h2>
                    <p className="text-xs text-gray-400">Solo se muestran los primeros 100 registros.</p>
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

            {/* FILTROS: todo en una sola fila compacta que se envuelve en pantallas chicas */}
            <div className="flex flex-wrap items-end gap-3 pb-4 border-b border-gray-200">
                <div className="flex flex-col gap-1">
                    <label htmlFor="fechaInicio" className="text-[10px] text-gray-400 font-bold uppercase">Fecha inicio</label>
                    <input
                        id="fechaInicio"
                        type="date"
                        className="border px-3 py-2 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={fechaInicio}
                        onChange={(e) => setFechaInicio(e.target.value)}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label htmlFor="fechaFin" className="text-[10px] text-gray-400 font-bold uppercase">Fecha fin</label>
                    <input
                        id="fechaFin"
                        type="date"
                        className="border px-3 py-2 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={fechaFin}
                        onChange={(e) => setFechaFin(e.target.value)}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label htmlFor="ruc" className="text-[10px] text-gray-400 font-bold uppercase">Ruc</label>
                    <input
                        id="ruc"
                        type="text"
                        maxLength={11}
                        placeholder="RUC del cliente"
                        className="border px-3 py-2 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-36"
                        value={ruc}
                        onChange={(e) => setRuc(e.target.value)}
                    />
                </div>

                {/* Chips de tipo de comprobante: mismo lenguaje visual que TipoComprobanteSelector */}
                <div className="flex flex-wrap gap-2 sm:ml-auto">
                    {TIPOS_COMPROBANTE.map((item) => {
                        const activo = comprobantes[item.key];
                        return (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => handleToggle(item.key)}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                                    activo
                                        ? 'border-blue-600 bg-blue-600 text-white'
                                        : 'border-gray-300 bg-white text-gray-600 hover:border-blue-400'
                                }`}
                            >
                                {item.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* TABLA: table-fixed + colgroup para que siempre entre sin scroll horizontal */}
            <div className="relative border rounded-xl overflow-hidden">
                {/* Spinner de carga superpuesto */}
                {(isLoading || isValidating) && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex justify-center items-center z-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-blue-600 border-b-2"></div>
                    </div>
                )}

                <table className="w-full table-fixed">
                    <colgroup>
                        <col className="w-[13%]" />  {/* Fecha */}
                        <col className="w-[10%]" />  {/* Comprobante */}
                        <col className="w-[18%]" />  {/* Cliente */}
                        <col className="w-[7%]" />   {/* Isla */}
                        <col className="w-[7%]" />   {/* Cantidad */}
                        <col className="w-[8%]" />   {/* Precio */}
                        <col className="w-[11%]" />  {/* Usuario */}
                        <col className="w-[7%]" />   {/* PDF */}
                        <col className="w-[19%]" />  {/* Total */}
                    </colgroup>
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Comprobante</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Cliente</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Isla</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Cant.</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Precio</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Usuario</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">PDF</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {data && data.length > 0 ? (
                            data.map((item) => (
                                <tr key={item.id} className="hover:bg-blue-50/50 transition-colors">
                                    <td className="px-4 py-3 truncate text-sm text-gray-600">{toLocaleShow(item.fecha)}</td>
                                    <td className="px-4 py-3 truncate text-sm font-medium text-gray-900">{item.comprobante}</td>
                                    <td className="px-4 py-3 truncate text-sm text-gray-600" title={item.receptor}>{item.receptor}</td>
                                    <td className="px-4 py-3 truncate text-sm text-gray-600">{item.isla || '-'}</td>
                                    <td className="px-4 py-3 truncate text-sm text-right text-gray-600">{item.cantidad ? item.cantidad.toFixed(3) : '-'}</td>
                                    <td className="px-4 py-3 truncate text-sm text-right text-gray-600">{item.precio_producto != null ? currencyFormat(item.precio_producto) : '-'}</td>
                                    <td className="px-4 py-3 truncate text-sm text-gray-600">{item.usuario}</td>
                                    <td className="px-4 py-3 truncate text-sm text-gray-600">
                                        {/* /api/comprobante/[id] genera el PDF al vuelo (o sirve el cacheado): a
                                            diferencia de item.url, no depende de que el envio a SUNAT/MiFact haya
                                            terminado, asi que siempre esta disponible (igual que en /historic) */}
                                        <Link href={`/api/comprobante/${item.id}`} target="_blank" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-xs">PDF</Link>
                                    </td>
                                    <td className="px-4 py-3 truncate text-sm text-right font-semibold text-gray-900">{currencyFormat(item.total)}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={9} className="px-6 py-10 text-center text-sm text-gray-400">
                                    No se encontraron registros con los criterios seleccionados.
                                </td>
                            </tr>
                        )}
                    </tbody>
                    {/* Fila de Totales */}
                    {data && data.length > 0 && (
                        <tfoot className="bg-gray-100 font-bold border-t-2 border-gray-300">
                            <tr>
                                <td colSpan={8} className="px-4 py-3 text-sm text-gray-900 uppercase">Total General</td>
                                <td className="px-4 py-3 text-sm text-right text-blue-700">{currencyFormat(totalGeneral)}</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
};
