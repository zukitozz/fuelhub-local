'use client';
import useSWR from 'swr';
import { getHistoricos } from '@/actions'
import { IComprobanteHistorico } from '@/interfaces';
import Link from 'next/link';
import { useSession } from "next-auth/react";

import { ChangeEvent, SetStateAction, useEffect, useState } from 'react';
import { toLocaleOnlyDate, toLocaleShow, Constants } from '@/utils';
import PrintButton from '@/components/ui/print/Printbutton';

const isMifactProvider = Constants.PROVEEDOR_MIFACT;

interface TableProps {
  page: number;
  perPage: number;
}

const fetcher = (page: number, perPage: number, fecha: string, numeracion: string) => getHistoricos(page, perPage, fecha, numeracion);

const getVisiblePages = (current: number, totalPages: number) => {
    const range = 2;
    const pages: (number | string)[] = [];

    for (let i = 1; i <= totalPages; i++) {
        if (
            i === 1 || 
            i === totalPages || 
            (i >= current - range && i <= current + range)
        ) {
            pages.push(i);
        } else if (i === current - range - 1 || i === current + range + 1) {
            pages.push('...');
        }
    }
    return pages.filter((item, index) => pages.indexOf(item) === index);
};

export const HistoricosTable = ({ page, perPage }: TableProps) => {
    const { data: session } = useSession();
    const [date, setDate] = useState<string>(toLocaleOnlyDate(new Date(Date.now() - (5 * 60 * 60 * 1000))));   
    const [numeracion, setNumeracion] = useState<string>(''); 
    const [currentPage, setCurrentPage] = useState(1);

    const handleDateChange = (e: ChangeEvent<HTMLInputElement>) => {
        setCurrentPage(1);
        setDate(e.target.value);
    };    

    const handleNumeracionChange = (e: ChangeEvent<HTMLInputElement>) => {
        setCurrentPage(1); 
        setNumeracion(e.target.value);
    };    

    const { data, error, isValidating, isLoading, mutate } = useSWR(
        `${process.env.NEXT_PUBLIC_URL}/api?page=${currentPage}&date=${date}&num=${numeracion}`, 
        () => fetcher(currentPage, perPage, date, numeracion)
    );

    useEffect(() => {
        mutate()
    }, [currentPage, date, numeracion]);

    const paginate = (pageNumber: SetStateAction<number>) => { setCurrentPage(pageNumber) };

    // CONDICIÓN CORREGIDA: Solo si es la primera carga absoluta y no hay ningún dato previo
    const uninitialized = (!data && isLoading) || error;

    const totalPages = data?.pageNumbers?.length || 0;
    const visiblePages = getVisiblePages(currentPage, totalPages);    

    const renderTable = (historicos: IComprobanteHistorico[] | undefined) => {
        return (
            historicos?.length === 0 ? (
                <tr>
                    <td colSpan={10} className="text-center py-6 text-gray-500 text-sm">
                        No se encontraron registros.
                    </td>
                </tr>
            ) : (
                data?.historicos?.map((item : IComprobanteHistorico) => (
                    <tr key={`${item.id}-${item.numeracion_comprobante}`} className="bg-white border-b transition duration-300 ease-in-out hover:bg-gray-100">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{toLocaleShow(item.fecha_hora)}</td>
                        <td className="text-sm text-gray-900 font-light px-6 py-4 truncate" title={item.Receptor.razon_social}>{item.Receptor.razon_social}</td>
                        <td className="text-sm text-gray-900 font-light px-6 py-4 whitespace-nowrap">{item.numeracion_comprobante}</td>
                        <td className="text-sm text-gray-900 font-light px-6 ">{item.total}</td>
                        <td className="text-sm text-gray-900 font-light px-6 ">{item.isla}</td>
                        <td className="text-sm text-gray-900 font-light px-6 ">{item.turno}</td>
                        <td className="text-sm text-gray-900 font-light px-6 ">{item.usuario}</td>
                        <td className="text-sm text-gray-900 font-light px-6 ">
                            {isMifactProvider ? (
                                item.url && item.url != 'null' && (
                                    <Link href={item.url||"#"} target="_blank" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">PDF</Link>
                                )
                            ) : (
                                <Link href={`/api/comprobante/${item.id}`} target="_blank" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">PDF</Link>
                            )}
                        </td>
                        <td className="text-sm text-gray-900 font-light px-6 ">
                            {item.errors && (
                                <Link href={"#"} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">ERROR</Link>
                            )}
                            {(isMifactProvider ? (item.url && item.url != 'null') : !!item.pdf_bytes) && !item.numeracion_documento_afectado && (
                                <Link href={`/historic/${item.id}`} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded ml-1">N.Credito</Link>
                            )}
                        </td>                                        
                        <td className="text-sm text-gray-900 font-light px-6 ">
                            <PrintButton id={item.id || 0} session={session} />
                        </td>                    
                    </tr>
                ))
            )
      )
    }
    

    return (
        <>
        <div className="flex justify-between items-center mb-5 gap-4">
            <input
                type="date"
                id="start"
                name="trip-start"
                className="border px-3 py-2 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={date} 
                onChange={handleDateChange} 
            />

            <input
                type="text"
                id="numeracion"
                name="numeracion"
                placeholder="N° Comprobante o Ruc"
                className="border px-3 py-2 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[240px]"
                value={numeracion}
                onChange={handleNumeracionChange}
            />                
        </div>

        <div className="mb-10 w-full overflow-x-auto min-h-[200px] relative">
            <table className="w-full min-w-[1360px] table-fixed">
                <colgroup>
                    <col className="w-[200px]" />  {/* Fecha */}
                    <col />  {/* Cliente (sin ancho: absorbe el espacio restante) */}
                    <col className="w-[130px]" />  {/* Comprobante */}
                    <col className="w-[90px]" />   {/* Total */}
                    <col className="w-[90px]" />   {/* Isla */}
                    <col className="w-[90px]" />   {/* Turno */}
                    <col className="w-[100px]" />  {/* Usuario */}
                    <col className="w-[80px]" />   {/* PDF */}
                    <col className="w-[110px]" />  {/* SUNAT */}
                    <col className="w-[150px]" />  {/* Acciones */}
                </colgroup>
                <thead className="bg-gray-200 border-b">
                    <tr>
                        <th scope="col" className="text-sm font-medium text-gray-900 px-6 py-4 text-left">Fecha</th>
                        <th scope="col" className="text-sm font-medium text-gray-900 px-6 py-4 text-left">Cliente</th>
                        <th scope="col" className="text-sm font-medium text-gray-900 px-6 py-4 text-left">Comprobante</th>
                        <th scope="col" className="text-sm font-medium text-gray-900 px-6 py-4 text-left">Total</th>
                        <th scope="col" className="text-sm font-medium text-gray-900 px-6 py-4 text-left">Isla</th>
                        <th scope="col" className="text-sm font-medium text-gray-900 px-6 py-4 text-left">Turno</th>
                        <th scope="col" className="text-sm font-medium text-gray-900 px-6 py-4 text-left">Usuario</th>
                        <th scope="col" className="text-sm font-medium text-gray-900 px-6 py-4 text-left">PDF</th>
                        <th scope="col" className="text-sm font-medium text-gray-900 px-6 py-4 text-left">SUNAT</th> 
                        <th scope="col" className="text-sm font-medium text-gray-900 px-6 py-4 text-left">Acciones</th>                                                                                                            
                    </tr>
                </thead>
                <tbody>
                    {uninitialized ? (
                        /* Spinner embebido dentro de las filas para no romper el layout */
                        <tr>
                            <td colSpan={10} className="text-center py-10">
                                <div className="animate-spin rounded-full h-8 w-8 inline-block border-gray-900 border-b-2"></div>
                            </td>
                        </tr>
                    ) : renderTable(data?.historicos)
                    }
                </tbody>
                {data?.historicos && (
                    <tfoot className="bg-gray-50">
                        <tr>
                            <td colSpan={10} className="px-6 py-3">
                                <div className="flex items-center justify-center space-x-2">
                                    <button disabled={currentPage === 1} onClick={() => paginate(currentPage - 1)} className="px-3 py-1 rounded border disabled:opacity-30">&lt;</button>
                                    {visiblePages.map((page, index) => (
                                        typeof page === 'number' ? (
                                            <button key={page} onClick={() => paginate(page)} className={`px-3 py-1 rounded border transition-colors ${currentPage === page ? 'bg-blue-600 text-white font-bold' : 'bg-white text-gray-700 hover:bg-gray-100'}`}>{page}</button>
                                        ) : (
                                            <span key={`dots-${page}`} className="px-2 text-gray-500">...</span>
                                        )
                                    ))}
                                    <button disabled={currentPage === totalPages} onClick={() => paginate(currentPage + 1)} className="px-3 py-1 rounded border disabled:opacity-30">&gt;</button>
                                </div>
                            </td>
                        </tr>
                    </tfoot>
                )}
            </table>
            {/* Opcional: Una sutil barra de carga superior mientras SWR revalida en background */}
            {isValidating && !uninitialized && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500 animate-pulse" />
            )}
        </div>
        </>
    );
}

export default HistoricosTable;