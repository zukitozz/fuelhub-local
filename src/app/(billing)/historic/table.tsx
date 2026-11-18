'use client';
import useSWR from 'swr';
import { getHistoricos } from '@/actions'
import { obtenerSolicitudesPendientes } from '@/actions/correcciones'
import { IComprobanteHistorico } from '@/interfaces';
import Link from 'next/link';
import { IoCreateOutline, IoDocumentTextOutline } from 'react-icons/io5';
import { useSession } from "next-auth/react";

import { ChangeEvent, SetStateAction, useEffect, useState } from 'react';
import { Constants, toLocaleOnlyDate, toLocaleShow } from '@/utils';
import AccionesAdmin from './AccionesAdmin';
import ImpresionOperador from './ImpresionOperador';

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
    // El administrador corrige directamente facturas/boletas aceptadas de los ultimos 7 dias (sin importar isla ni cierre de turno);
    // el servidor lo vuelve a validar
    // fecha_emision llega como Date (medianoche UTC) desde la accion del servidor: se pasa a AAAA-MM-DD en UTC, igual que hoy
    const hoyLima = new Date(Date.now() - (5 * 60 * 60 * 1000)).toISOString().slice(0, 10);
    const diasDesdeEmision = (item: IComprobanteHistorico) => {
        const emision = new Date(item.fecha_emision);
        return Number.isNaN(emision.getTime()) ? NaN : Math.round((Date.parse(hoyLima) - Date.parse(emision.toISOString().slice(0, 10))) / 86400000);
    };
    const puedeCorregirAdmin = (item: IComprobanteHistorico) =>
        ['01', '03'].includes(item.tipo_codigo ?? '') && !!item.enviado && !item.errors && !item.nc_en_espera && !item.numeracion_documento_afectado
        && item.correccion_estado !== 'PENDIENTE' && item.correccion_estado !== 'APROBADA' && diasDesdeEmision(item) <= 7 && diasDesdeEmision(item) >= 0;
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
                    <tr key={`${item.id}-${item.numeracion_comprobante}`} className="bg-white border-b border-gray-100 transition-colors hover:bg-blue-50/50">
                        <td className="px-3 py-3 truncate text-sm text-gray-700">{toLocaleShow(item.fecha_hora)}</td>
                        <td className="text-sm text-gray-700 px-3 py-3 truncate" title={item.Receptor.razon_social}>{item.Receptor.razon_social}</td>
                        {/* Un comprobante puede llevar varios productos, separados por coma */}
                        <td className="text-sm text-gray-700 px-3 py-3 truncate"
                            title={item.items?.map(i => i.descripcion).join(', ')}>
                            {item.items?.map(i => i.descripcion).join(', ')}
                        </td>
                        <td className="text-sm font-semibold text-gray-900 px-3 py-3 truncate">{item.numeracion_comprobante}</td>
                        <td className="text-sm font-semibold text-gray-900 px-3 py-3 tabular-nums">{item.total}</td>
                        <td className="text-sm text-gray-700 px-3 py-3">{item.isla}</td>
                        <td className="text-sm text-gray-700 px-3 py-3">{item.turno}</td>
                        <td className="text-sm text-gray-700 px-3 py-3">{item.usuario}</td>
                        <td className="text-sm text-gray-700 px-3 py-3">
                            {isAdmin ? (
                                <a href={`/api/comprobante/${item.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"><IoDocumentTextOutline size={14} />PDF</a>
                            ) : (
                                /* El grifero corrige comprobantes de su isla con el turno abierto; el administrador los aprueba. Mismo azul que el resto de botones */
                                puedeCorregir(item) && (
                                    <Link href={`/historic/corregir/${item.id}`} className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"><IoCreateOutline size={14} />Corregir</Link>
                                )
                            )}
                        </td>
                        <td className="text-sm text-gray-700 px-3 py-3">
                            {/* Una NC en espera no es un error: se envia sola cuando SUNAT acepta la boleta */}
                            {!!item.esperando && (
                                <span title={item.errors} className="bg-amber-100 text-amber-800 inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full cursor-help">ESPERANDO</span>
                            )}
                            {item.errors && !item.esperando && (
                                <Link href={"#"} className="bg-red-100 text-red-800 hover:bg-red-200 inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full">ERROR</Link>
                            )}
                            {/* Aceptado por SUNAT: enviado y sin error */}
                            {!!item.enviado && !item.errors && !item.esperando && (
                                <span className="bg-green-100 text-green-800 inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full">ACEPTADO</span>
                            )}
                            {!!item.nc_en_espera && (
                                <span title={`La nota de crédito ${item.nc_en_espera} está en espera de que SUNAT acepte esta boleta; se enviará sola. No generes otra.`}
                                    className="bg-amber-100 text-amber-800 inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full cursor-help">NC en espera</span>
                            )}
                            {item.correccion_estado && (() => {
                                const etiquetas = {
                                    PENDIENTE: { texto: isAdmin ? 'Corrección pendiente' : 'Corrección enviada', clase: 'bg-amber-100 text-amber-800' },
                                    APROBADA: { texto: 'Corregido', clase: 'bg-green-100 text-green-800' },
                                    RECHAZADA: { texto: 'Corrección rechazada', clase: 'bg-gray-100 text-gray-700' },
                                }[item.correccion_estado];
                                const clase = `${etiquetas.clase} inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ml-1`;
                                return isAdmin
                                    ? <Link href={`/historic/solicitud/${item.correccion_id}`} className={`${clase} underline`}>{etiquetas.texto}</Link>
                                    : <span className={clase}>{etiquetas.texto}</span>;
                            })()}
                        </td>
                        <td className="text-sm text-gray-700 px-3 py-3">
                            {isAdmin ? (
                                <AccionesAdmin
                                    id={item.id || 0}
                                    session={session}
                                    // Con una corrección pendiente o aprobada, la nota de crédito la genera esa corrección
                                    puedeNotaCredito={!!item.enviado && !item.errors && !item.nc_en_espera && !item.numeracion_documento_afectado
                                        && item.correccion_estado !== 'PENDIENTE' && item.correccion_estado !== 'APROBADA'}
                                    puedeModificar={puedeCorregirAdmin(item)}
                                />
                            ) : (
                                <ImpresionOperador id={item.id || 0} session={session} />
                            )}
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
            <table className="w-full table-fixed border border-gray-200 rounded-lg">
                {/* Porcentajes que suman 100: con table-fixed la tabla nunca puede
                    exceder el ancho disponible, asi que no aparece scroll horizontal */}
                <colgroup>
                    <col className="w-[13%]" />  {/* Fecha: alcanza para 'AAAA-MM-DD HH:MM:SS' completo */}
                    <col className="w-[15%]" />  {/* Cliente */}
                    <col className="w-[10%]" />  {/* Producto */}
                    <col className="w-[10%]" />  {/* Comprobante */}
                    <col className="w-[5%]" />   {/* Total */}
                    <col className="w-[6%]" />   {/* Isla */}
                    <col className="w-[6%]" />   {/* Turno */}
                    <col className="w-[10%]" />  {/* Usuario */}
                    <col className="w-[6%]" />   {/* PDF */}
                    <col className="w-[9%]" />   {/* SUNAT */}
                    <col className="w-[10%]" />  {/* Acciones (boton desplegable): no bajar de 10%, si no el titulo no entra y el fondo gris se ve cortado */}
                </colgroup>
                <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                        <th scope="col" className="text-xs font-semibold uppercase tracking-wide text-gray-500 px-3 py-3 text-left first:rounded-tl-lg last:rounded-tr-lg">Fecha</th>
                        <th scope="col" className="text-xs font-semibold uppercase tracking-wide text-gray-500 px-3 py-3 text-left first:rounded-tl-lg last:rounded-tr-lg">Cliente</th>
                        <th scope="col" className="text-xs font-semibold uppercase tracking-wide text-gray-500 px-3 py-3 text-left first:rounded-tl-lg last:rounded-tr-lg">Producto</th>
                        <th scope="col" className="text-xs font-semibold uppercase tracking-wide text-gray-500 px-3 py-3 text-left first:rounded-tl-lg last:rounded-tr-lg">Comprobante</th>
                        <th scope="col" className="text-xs font-semibold uppercase tracking-wide text-gray-500 px-3 py-3 text-left first:rounded-tl-lg last:rounded-tr-lg">Total</th>
                        <th scope="col" className="text-xs font-semibold uppercase tracking-wide text-gray-500 px-3 py-3 text-left first:rounded-tl-lg last:rounded-tr-lg">Isla</th>
                        <th scope="col" className="text-xs font-semibold uppercase tracking-wide text-gray-500 px-3 py-3 text-left first:rounded-tl-lg last:rounded-tr-lg">Turno</th>
                        <th scope="col" className="text-xs font-semibold uppercase tracking-wide text-gray-500 px-3 py-3 text-left first:rounded-tl-lg last:rounded-tr-lg">Usuario</th>
                        <th scope="col" className="text-xs font-semibold uppercase tracking-wide text-gray-500 px-3 py-3 text-left first:rounded-tl-lg last:rounded-tr-lg">{isAdmin ? 'PDF' : 'Corregir'}</th>
                        <th scope="col" className="text-xs font-semibold uppercase tracking-wide text-gray-500 px-3 py-3 text-left first:rounded-tl-lg last:rounded-tr-lg">SUNAT</th> 
                        <th scope="col" className="text-xs font-semibold uppercase tracking-wide text-gray-500 px-3 py-3 text-left first:rounded-tl-lg last:rounded-tr-lg">Acciones</th>                                                                                                            
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