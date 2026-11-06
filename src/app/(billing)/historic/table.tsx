'use client';
import useSWR from 'swr';
import { getHistoricos } from '@/actions'
import { obtenerSolicitudesPendientes } from '@/actions/correcciones'
import { IComprobanteHistorico } from '@/interfaces';
import Link from 'next/link';
import { useSession } from "next-auth/react";

import { ChangeEvent, SetStateAction, useEffect, useState } from 'react';
import { Constants, toLocaleOnlyDate, toLocaleShow } from '@/utils';
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
    // Las notas de crédito las emiten solo los administradores; los griferos no ven el botón
    const isAdmin = session?.user?.rol === Constants.ROL.ADMIN_ROLE;
    const islaSesion = Number(session?.user?.islaId) || 0;
    // Mismas reglas que valida el servidor: factura o boleta aceptada, de su isla, sin cierre ni corrección previa
    const puedeCorregir = (item: IComprobanteHistorico) =>
        ['01', '03'].includes(item.tipo_codigo ?? '') && !!item.enviado && !item.errors && !item.numeracion_documento_afectado
        && !item.CierreturnoId && !item.correccion_estado && islaSesion > 0 && Number(item.IslaId) === islaSesion;
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

    // Correcciones pendientes de aprobar: solo las ve el administrador, de cualquier fecha, y se refrescan solas
    const { data: pendientes } = useSWR(
        isAdmin ? 'correcciones-pendientes' : null,
        () => obtenerSolicitudesPendientes(),
        { refreshInterval: 15000 }
    );

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
                            {/* Una NC en espera no es un error: se envia sola cuando SUNAT acepta la boleta */}
                            {!!item.esperando && (
                                <span title={item.errors} className="bg-amber-500 text-white font-bold py-1.5 px-2 rounded cursor-help">ESPERANDO</span>
                            )}
                            {item.errors && !item.esperando && (
                                <Link href={"#"} className="bg-red-500 hover:bg-red-700 text-white font-bold py-1.5 px-2 rounded">ERROR</Link>
                            )}
                            {!!item.nc_en_espera && (
                                <span title={`La nota de crédito ${item.nc_en_espera} está en espera de que SUNAT acepte esta boleta; se enviará sola. No generes otra.`}
                                    className="bg-amber-100 text-amber-800 font-bold py-1.5 px-2 rounded cursor-help">NC en espera</span>
                            )}
                            {/* Con una corrección pendiente o aprobada, la nota de crédito la genera esa corrección */}
                            {isAdmin && !!item.enviado && !item.errors && !item.nc_en_espera && !item.numeracion_documento_afectado
                                && item.correccion_estado !== 'PENDIENTE' && item.correccion_estado !== 'APROBADA' && (
                                <Link href={`/historic/${item.id}`} className="bg-green-500 hover:bg-green-700 text-white font-bold py-1.5 px-2 rounded ml-1">N.Credito</Link>
                            )}
                            {/* El grifero corrige comprobantes de su isla con el turno abierto; el administrador los aprueba */}
                            {!isAdmin && puedeCorregir(item) && (
                                <Link href={`/historic/corregir/${item.id}`} className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-1.5 px-2 rounded ml-1">Corregir</Link>
                            )}
                            {item.correccion_estado && (() => {
                                const etiquetas = {
                                    PENDIENTE: { texto: isAdmin ? 'Corrección pendiente' : 'Corrección enviada', clase: 'bg-amber-100 text-amber-800' },
                                    APROBADA: { texto: 'Corregido', clase: 'bg-green-100 text-green-800' },
                                    RECHAZADA: { texto: 'Corrección rechazada', clase: 'bg-gray-200 text-gray-700' },
                                }[item.correccion_estado];
                                const clase = `${etiquetas.clase} font-bold py-1.5 px-2 rounded ml-1`;
                                return isAdmin
                                    ? <Link href={`/historic/solicitud/${item.correccion_id}`} className={`${clase} underline`}>{etiquetas.texto}</Link>
                                    : <span className={clase}>{etiquetas.texto}</span>;
                            })()}
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
        {isAdmin && !!pendientes?.length && (
            <div className="mb-6 border border-amber-300 bg-amber-50 rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-amber-100 text-amber-900 font-bold text-sm">
                    Correcciones pendientes de aprobar ({pendientes.length})
                </div>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-gray-600 text-xs">
                            <th className="px-4 py-2">Comprobante</th>
                            <th className="px-3 py-2">Total</th>
                            <th className="px-3 py-2">Cliente propuesto</th>
                            <th className="px-3 py-2">Observaciones</th>
                            <th className="px-3 py-2">Solicitó</th>
                            <th className="px-3 py-2">Fecha</th>
                            <th className="px-3 py-2"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {pendientes.map(p => (
                            <tr key={p.id} className="border-t border-amber-200">
                                <td className="px-4 py-2 font-medium">{p.numeracion_comprobante}</td>
                                <td className="px-3 py-2">{p.total}</td>
                                <td className="px-3 py-2 max-w-[220px] truncate" title={`${p.numero_documento} ${p.razon_social}`}>{p.numero_documento} · {p.razon_social}</td>
                                <td className="px-3 py-2 max-w-[260px] truncate" title={p.observaciones}>{p.observaciones}</td>
                                <td className="px-3 py-2">{p.usuario ?? '-'}{p.isla ? ` · ${p.isla}` : ''}</td>
                                <td className="px-3 py-2 whitespace-nowrap">{toLocaleShow(p.fecha_solicitud)}</td>
                                <td className="px-3 py-2 text-right">
                                    <Link href={`/historic/solicitud/${p.id}`} className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-1.5 px-3 rounded">Revisar</Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
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