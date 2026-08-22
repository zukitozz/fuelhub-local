'use client';
import useSWR from 'swr';
import { getHistoricos } from '@/actions'
import { IComprobanteHistorico } from '@/interfaces';
import Link from 'next/link';
import { useSession } from "next-auth/react";

import { ChangeEvent, SetStateAction, useEffect, useState } from 'react';
import { toLocaleOnlyDate, toLocaleShow } from '@/utils';
import PrintButton from '@/components/ui/print/Printbutton';

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
                    <td colSpan={11} className="text-center py-6 text-gray-500 text-sm">
                        No se encontraron registros.
                    </td>
                </tr>
            ) : (
                data?.historicos?.map((item : IComprobanteHistorico) => (
                    <tr key={`${item.id}-${item.numeracion_comprobante}`} className="bg-white border-b transition duration-300 ease-in-out hover:bg-gray-100">
                        <td className="px-3 py-4 truncate text-sm font-medium text-gray-900">{toLocaleShow(item.fecha_hora)}</td>
                        <td className="text-sm text-gray-900 font-light px-3 py-4 truncate" title={item.Receptor.razon_social}>{item.Receptor.razon_social}</td>
                        {/* Un comprobante puede llevar varios productos, separados por coma */}
                        <td className="text-sm text-gray-900 font-light px-3 py-4 truncate"
                            title={item.items?.map(i => i.descripcion).join(', ')}>
                            {item.items?.map(i => i.descripcion).join(', ')}
                        </td>
                        <td className="text-sm text-gray-900 font-light px-3 py-4 truncate">{item.numeracion_comprobante}</td>
                        <td className="text-sm text-gray-900 font-light px-3 ">{item.total}</td>
                        <td className="text-sm text-gray-900 font-light px-3 ">{item.isla}</td>
                        <td className="text-sm text-gray-900 font-light px-3 ">{item.turno}</td>
                        <td className="text-sm text-gray-900 font-light px-3 ">{item.usuario}</td>
                        <td className="text-sm text-gray-900 font-light px-3 ">
                            <Link href={`/api/comprobante/${item.id}`} target="_blank" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1.5 px-2 rounded">PDF</Link>
                        </td>
                        <td className="text-sm text-gray-900 font-light px-3 ">
                            {item.errors && (
                                <Link href={"#"} className="bg-red-500 hover:bg-red-700 text-white font-bold py-1.5 px-2 rounded">ERROR</Link>
                            )}
                            {(!!item.pdf_bytes || !!item.url) && !item.numeracion_documento_afectado && (
                                <Link href={`/historic/${item.id}`} className="bg-green-500 hover:bg-green-700 text-white font-bold py-1.5 px-2 rounded ml-1">N.Credito</Link>
                            )}
                        </td>
                        <td className="text-sm text-gray-900 font-light px-3 ">
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

        {/* Sin overflow-x-auto: la tabla usa porcentajes y siempre entra, y el redondeo
            a pixeles enteros de las columnas bastaba para disparar la barra de scroll */}
        <div className="mb-10 w-full min-h-[200px] relative">
            {/* Sin min-w: table-fixed reparte el ancho disponible y la tabla entra sin scroll */}
            <table className="w-full table-fixed">
                {/* Porcentajes que suman 100: con table-fixed la tabla nunca puede
                    exceder el ancho disponible, asi que no aparece scroll horizontal */}
                <colgroup>
                    <col className="w-[15%]" />  {/* Fecha: alcanza para 'AAAA-MM-DD HH:MM:SS' completo */}
                    <col className="w-[15%]" />  {/* Cliente */}
                    <col className="w-[12%]" />  {/* Producto */}
                    <col className="w-[10%]" />  {/* Comprobante */}
                    <col className="w-[5%]" />   {/* Total */}
                    <col className="w-[6%]" />   {/* Isla */}
                    <col className="w-[6%]" />   {/* Turno */}
                    <col className="w-[10%]" />  {/* Usuario */}
                    <col className="w-[6%]" />   {/* PDF */}
                    <col className="w-[9%]" />   {/* SUNAT */}
                    <col className="w-[6%]" />   {/* Acciones: no bajar de 6%, si no el titulo no entra y el fondo gris se ve cortado */}
                </colgroup>
                <thead className="bg-gray-200 border-b">
                    <tr>
                        <th scope="col" className="text-sm font-medium text-gray-900 px-3 py-4 text-left">Fecha</th>
                        <th scope="col" className="text-sm font-medium text-gray-900 px-3 py-4 text-left">Cliente</th>
                        <th scope="col" className="text-sm font-medium text-gray-900 px-3 py-4 text-left">Producto</th>
                        <th scope="col" className="text-sm font-medium text-gray-900 px-3 py-4 text-left">Comprobante</th>
                        <th scope="col" className="text-sm font-medium text-gray-900 px-3 py-4 text-left">Total</th>
                        <th scope="col" className="text-sm font-medium text-gray-900 px-3 py-4 text-left">Isla</th>
                        <th scope="col" className="text-sm font-medium text-gray-900 px-3 py-4 text-left">Turno</th>
                        <th scope="col" className="text-sm font-medium text-gray-900 px-3 py-4 text-left">Usuario</th>
                        <th scope="col" className="text-sm font-medium text-gray-900 px-3 py-4 text-left">PDF</th>
                        <th scope="col" className="text-sm font-medium text-gray-900 px-3 py-4 text-left">SUNAT</th> 
                        <th scope="col" className="text-sm font-medium text-gray-900 px-3 py-4 text-left">Acciones</th>                                                                                                            
                    </tr>
                </thead>
                <tbody>
                    {uninitialized ? (
                        /* Spinner embebido dentro de las filas para no romper el layout */
                        <tr>
                            <td colSpan={11} className="text-center py-10">
                                <div className="animate-spin rounded-full h-8 w-8 inline-block border-gray-900 border-b-2"></div>
                            </td>
                        </tr>
                    ) : renderTable(data?.historicos)
                    }
                </tbody>
                {data?.historicos && (
                    <tfoot className="bg-gray-50">
                        <tr>
                            <td colSpan={11} className="px-3 py-3">
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