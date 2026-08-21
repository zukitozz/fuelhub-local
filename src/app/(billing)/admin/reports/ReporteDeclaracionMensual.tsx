"use client";
import useSWR from 'swr';
import { obtieneReporteDeclaracionMensual } from '@/actions'
import { toLocaleOnlyDate } from "@/utils";
import { ChangeEvent, useState, useMemo } from "react";
import { IReporteDeclaracionMensual } from '@/interfaces';
import * as XLSX from 'xlsx';
import { IoDownloadOutline, IoChevronBackOutline, IoChevronForwardOutline } from "react-icons/io5";

const fetcher = (fecha: string) => obtieneReporteDeclaracionMensual(fecha);

//Fecha en el formato del reporte (dd/mm/aaaa). Las columnas fecha_emision y
//fecha_documento_afectado son de tipo 'date' en SQL Server, asi que el driver las
//devuelve como Date; en otros casos pueden llegar como texto, por eso se cubren ambos.
//Se leen los componentes en UTC a proposito: un 'date' llega como medianoche UTC y en
//Peru (UTC-5) los getters locales devolverian el dia anterior.
const aFechaCorta = (valor: string | Date | null | undefined) => {
    if (!valor) return '';
    if (valor instanceof Date) {
        if (Number.isNaN(valor.getTime())) return '';
        const dia = String(valor.getUTCDate()).padStart(2, '0');
        const mes = String(valor.getUTCMonth() + 1).padStart(2, '0');
        return `${dia}/${mes}/${valor.getUTCFullYear()}`;
    }
    const [anio, mes, dia] = String(valor).substring(0, 10).split('-');
    return (anio && mes && dia) ? `${dia}/${mes}/${anio}` : '';
};

//"F001-000106" viene en una sola columna; el reporte los pide separados
const partirNumeracion = (numeracion: string): [string, string] => {
    if (!numeracion) return ['', ''];
    const partes = numeracion.split('-');
    return [partes[0] || '', partes[1] || ''];
};

//En la practica cada comprobante se cobra con un solo medio de pago, pero la pantalla
//de venta permite cargar varios: en ese caso se listan todos (ej. "EFECTIVO+TARJETA")
//para que no quede ninguno oculto en el reporte.
const formaDePago = (efectivo: number, tarjeta: number, yape: number) => {
    const medios: string[] = [];
    if (Number(efectivo) > 0) medios.push('EFECTIVO');
    if (Number(tarjeta) > 0) medios.push('TARJETA');
    if (Number(yape) > 0) medios.push('YAPE');
    return medios.join('+');
};

interface IFilaReporte {
    fechaEmision: string;
    hora: string;
    serie: string;
    numero: string;
    numeroDocumento: string;
    razonSocial: string;
    producto: string;
    volumen: number;
    baseImponible: number;
    igv: number;
    importeTotal: number;
    refFecha: string;
    refSerie: string;
    refNumero: string;
    totalVenta: number;
    moneda: string;
    formaPago: string;
    ruc: string;
}

//Misma transformacion para la tabla en pantalla y para el Excel, asi no se desfasan
const construirFila = (item: IReporteDeclaracionMensual): IFilaReporte => {
    const [serie, numero] = partirNumeracion(item.numeracion_comprobante);
    const [refSerie, refNumero] = partirNumeracion(item.numeracion_documento_afectado);
    const baseImponible = Number(item.valor_venta) || 0;
    const igv = Number(item.igv_venta) || 0;
    const importeTotal = Math.round((baseImponible + igv) * 100) / 100;
    return {
        fechaEmision: aFechaCorta(item.fecha_emision),
        hora: item.hora || '',
        serie,
        numero,
        numeroDocumento: item.numero_documento || '',
        razonSocial: item.razon_social || '',
        producto: item.descripcion || '',
        volumen: Number(item.volumen) || 0,
        baseImponible,
        igv,
        importeTotal,
        refFecha: aFechaCorta(item.fecha_documento_afectado),
        refSerie,
        refNumero,
        totalVenta: Number(item.total_venta) || 0,
        moneda: item.tipo_moneda || '',
        formaPago: formaDePago(item.pago_efectivo, item.pago_tarjeta, item.pago_yape),
        ruc: item.ruc || '',
    };
};

export const ReporteDeclaracionMensual = () => {
    const [date, setDate] = useState<string>(toLocaleOnlyDate(new Date()));

    // --- ESTADOS DE PAGINACIÓN ---
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10; // Puedes cambiar esto a 20 o 50

    const { data, error, isValidating, isLoading, mutate } = useSWR(
        `${process.env.NEXT_PUBLIC_URL}/api-${date}`,
        () => fetcher(date)
    );

    //Para el Excel: una fila por item, como pide el formato del reporte
    const filas = useMemo(
        () => Array.isArray(data) ? data.map(construirFila) : [],
        [data]
    );

    //Para la tabla en pantalla: una fila por comprobante. Se agrupa por id (no por
    //numeracion, que puede repetirse entre comprobantes distintos) para que un
    //comprobante con varios productos no aparezca duplicado ni infle el conteo.
    const comprobantes = useMemo(() => {
        if (!Array.isArray(data)) return [];
        const vistos = new Set<number>();
        return data.filter(item => {
            if (vistos.has(item.id)) return false;
            vistos.add(item.id);
            return true;
        });
    }, [data]);

    // --- LÓGICA DE PAGINACIÓN ---
    const { paginatedData, totalPages } = useMemo(() => {
        const total = Math.ceil(comprobantes.length / itemsPerPage);
        const start = (currentPage - 1) * itemsPerPage;
        return {
            paginatedData: comprobantes.slice(start, start + itemsPerPage),
            totalPages: total
        };
    }, [comprobantes, currentPage]);

    const handleDateChange = (e: ChangeEvent<HTMLInputElement>) => {
        setDate(e.target.value);
        setCurrentPage(1); // Reiniciar a la página 1 si cambia la fecha
    };

    const exportToExcel = () => {
        if (filas.length === 0) return;

        //Una sola fila de encabezado con el nombre del campo, como el reporte anterior
        const columnas = [
            'fecha_emision', 'hora',
            'serie', 'numero',
            'numero_documento',
            'razon_social',
            'descripcion', 'volumen',
            'total_gravadas',
            'total_igv',
            'importe_total',
            'fecha_documento_afectado', 'serie_afectado', 'numero_afectado',
            'total_venta', 'tipo_moneda', 'forma_pago', 'ruc',
        ];

        const rows: (string | number)[][] = [columnas];
        filas.forEach(fila => {
            rows.push([
                fila.fechaEmision, fila.hora, fila.serie, fila.numero,
                fila.numeroDocumento, fila.razonSocial,
                fila.producto, fila.volumen,
                fila.baseImponible, fila.igv, fila.importeTotal,
                fila.refFecha, fila.refSerie, fila.refNumero,
                fila.totalVenta, fila.moneda, fila.formaPago, fila.ruc,
            ]);
        });

        const worksheet = XLSX.utils.aoa_to_sheet(rows);

        worksheet['!cols'] = [
            { wch: 14 }, { wch: 10 },                 // Fecha, Hora
            { wch: 10 }, { wch: 12 },                 // Serie, Número
            { wch: 16 }, { wch: 34 },                 // Nro Documento, Razón Social
            { wch: 20 }, { wch: 10 },                 // Producto, Volumen
            { wch: 14 }, { wch: 12 }, { wch: 14 },    // Base, IGV, Importe Total
            { wch: 12 }, { wch: 10 }, { wch: 12 },    // Referencia: Fecha, Serie, Número
            { wch: 12 }, { wch: 10 }, { wch: 14 },    // Total Venta, Moneda, Forma de pago
            { wch: 14 },                              // RUC (del emisor)
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte Completo");
        XLSX.writeFile(workbook, `Reporte_Mensual_${date}.xlsx`);
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h2 className="text-lg font-semibold text-gray-800">Reporte declaración mensual</h2>

                <div className="flex items-center gap-3">
                    <button
                        onClick={exportToExcel}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded transition-all text-sm shadow-sm"
                    >
                        <IoDownloadOutline size={18} />
                        Excel
                    </button>
                    <input
                        className="border border-gray-300 rounded px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        type="month"
                        value={date}
                        onChange={handleDateChange}
                    />
                </div>
            </div>

            <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Numeración</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Hora</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 text-sm">
                        {paginatedData.map((item: IReporteDeclaracionMensual, index) => (
                            <tr key={`${item.id}-${index}`} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{item.numeracion_comprobante}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{toLocaleOnlyDate(item.fecha_emision)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{item.hora}</td>
                                <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">{item.total_venta}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* --- CONTROLES DE PAGINACIÓN --- */}
            <div className="flex items-center justify-between mt-4 px-2">
                <span className="text-sm text-gray-700">
                    Mostrando <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-semibold">{Math.min(currentPage * itemsPerPage, comprobantes.length)}</span> de <span className="font-semibold">{comprobantes.length}</span> registros
                </span>

                <div className="inline-flex gap-2">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-2 border rounded bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                        <IoChevronBackOutline size={20} />
                    </button>

                    <div className="flex items-center px-4 border rounded bg-gray-50 text-sm font-medium">
                        Página {currentPage} de {totalPages}
                    </div>

                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="p-2 border rounded bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                        <IoChevronForwardOutline size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}
