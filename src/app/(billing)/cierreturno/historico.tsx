'use client';
import useSWR from 'swr';

import { obtieneHistoricoCierres, reprintCierre } from '@/actions/cierreturno'
import { useSession } from "next-auth/react";
import { ICierreTurno } from '@/interfaces/cierreturno.interface';
import { currencyFormat, toLocaleShow } from '@/utils/formats';
import { ResumenTable } from '../../../components/cierres/ResumeTable';
import { useState } from 'react';
import { notify } from '@/utils/notify';

const fetcher = (usuarioId: string) => obtieneHistoricoCierres(usuarioId);

export const Historico = () => {
    const { data: session } = useSession();
    const usuarioId = session?.user?.id || "";
    const [isProcessing, setIsProcessing] = useState(false);

    // Key condicionada a usuarioId: mientras la sesion no cargo (usuarioId vacio) la
    // consulta queda en pausa en vez de dispararse con un UsuarioId vacio (causaba un
    // error de sintaxis SQL). Al llegar la sesion la key cambia y SWR refetch solo.
    const { data, error, isLoading, isValidating } = useSWR(
        usuarioId ? [`${process.env.NEXT_PUBLIC_URL}/api`, usuarioId] : null,
        () => fetcher(usuarioId)
    );

    if(!data || isLoading || isValidating || error || !Array.isArray(data)){
        return (<div className="animate-spin rounded-full h-8 w-8 justify-center border-gray-900 border-b-2 align-middle"></div>);
    }

    const handlerReprintCierre = async (id: number) => {
        setIsProcessing(true);
        try{
            const { message, status } = await reprintCierre(id, session)
            if(status){          
                notify({message})
            }else{
                notify({message, type: 'error'})
            }
        }finally{
            setIsProcessing(false);
        }
    };    

    return (
        <div className="bg-white rounded-xl shadow-xl p-7 col-span-3">
            <h2 className="text-xl font-bold mb-4 border-b pb-2 flex items-center gap-2 text-gray-800">
                <span>🕒</span> Histórico (Últimos 2)
            </h2>
                {
                    data.map((cierre : ICierreTurno) => {
                        // 1. Calcular dinámicamente los totales para cada cierre del ciclo
                        const totalSerafin = cierre.detalle
                            ?.filter(p => p.medida === "GLL")
                            .reduce((acc, item) => acc + (item.despacho_soles + item.calibracion_soles), 0) || 0;

                        const totalVentaGalones = cierre.detalle
                            ?.filter(p => p.medida === "GLL")
                            .reduce((acc, item) => acc + item.total_soles, 0) || 0;

                        const totalPagos = (cierre.efectivo || 0) + (cierre.tarjeta || 0) + (cierre.yape || 0);

                        return (
                            <div key={ cierre.id } className="bg-gray-50/60 rounded-xl border border-l-4 border-gray-200 border-l-slate-400 p-3 col-span-3 mb-4 last:mb-0">
                                <div className="flex flex-col gap-1 mb-3 pb-2 border-b border-gray-200">
                                    <div className="flex gap-4">
                                        <span className="text-gray-500">
                                            <strong className="text-gray-400 font-medium uppercase tracking-wider text-[10px] mr-1">TURNO:</strong> 
                                            <span className="text-gray-800 font-bold">{cierre.turno}</span>
                                        </span>
                                        <span className="text-gray-300">|</span>
                                        <span className="text-gray-500">
                                            <strong className="text-gray-400 font-medium uppercase tracking-wider text-[10px] mr-1">ISLA:</strong> 
                                            <span className="text-gray-800 font-bold">{cierre.isla}</span>
                                        </span>
                                    </div>

                                    <div className="text-gray-500 flex items-center gap-1">
                                        <span className="text-gray-400 font-medium uppercase tracking-wider text-[10px]">FECHA:</span>
                                        <span className="font-medium text-gray-600 text-xs">{toLocaleShow(cierre.fecha)}</span>
                                    </div>
                                </div>
                                
                                {
                                    !cierre.detalle || cierre.detalle.length === 0 ? (
                                        <div className="p-4 text-gray-400 text-xs font-semibold italic">No hay detalles de ventas para este cierre</div>
                                    ) : null
                                }

                                {/* 2. Renderizado con footerValue dinámico */}
                                {
                                    cierre.detalle && cierre.detalle.filter(p => p.medida === "GLL" && (p.calibracion_cantidad > 0 || p.despacho_cantidad > 0)).length > 0 && (
                                        <ResumenTable 
                                            title="NOTAS DE DESPACHO / SERAFIN" 
                                            headers={['PRODUCTO', 'GAL', 'IMPORTE']}
                                            footerLabel="SUB TOTAL"
                                            footerValue={totalSerafin}
                                        >
                                            {cierre.detalle.filter(p => p.medida === "GLL").map(item => (
                                                <tr key={item.producto}>
                                                    <td className='text-left'>{item.producto} (Serafin/Desp)</td>
                                                    <td className='text-right'>{(item.despacho_cantidad + item.calibracion_cantidad).toFixed(3)}</td>
                                                    <td className='text-right'>{currencyFormat(item.despacho_soles + item.calibracion_soles)}</td>
                                                </tr>
                                            ))}
                                        </ResumenTable>
                                    )
                                }
                                {
                                    cierre.detalle && cierre.detalle.filter((p) => p.total_cantidad > 0).length > 0 && (
                                        <ResumenTable 
                                            title="VENTA PRODUCTOS/GALONES" 
                                            headers={['PRODUCTO', 'CANT/GAL', 'IMPORTE']}
                                            footerLabel="SUB TOTAL"
                                            footerValue={totalVentaGalones}
                                        >
                                            {cierre.detalle.filter(p => p.medida === "GLL").map(item => (
                                                <tr key={item.producto}>
                                                    <td className='text-left'>{item.producto}</td>
                                                    <td className='text-right'>{item.total_cantidad.toFixed(3)}</td>
                                                    <td className='text-right'>{currencyFormat(item.total_soles)}</td>
                                                </tr>
                                            ))}
                                        </ResumenTable>                                     
                                    )
                                }
                                {
                                    <ResumenTable 
                                        title="TIPO DE PAGO" 
                                        headers={['MEDIO', 'MONTO']}
                                        footerLabel="TOTAL PAGOS"
                                        footerValue={totalPagos}
                                    >
                                        <tr><td className="text-left">EFECTIVO</td><td className="text-right">{currencyFormat(cierre.efectivo)}</td></tr>
                                        <tr><td className="text-left">TARJETA</td><td className="text-right">{currencyFormat(cierre.tarjeta)}</td></tr>
                                        <tr><td className="text-left">YAPE</td><td className="text-right">{currencyFormat(cierre.yape)}</td></tr>
                                    </ResumenTable>                                 
                                }
                                <button
                                    className="btn-primary px-5 py-3 mt-4 w-full text-lg shadow-lg active:scale-95 transition-transform"
                                    onClick={() => handlerReprintCierre(cierre.id)} disabled={isProcessing}
                                >
                                    Reimprimir Cierre
                                </button>
                            </div>

                        );
                    })
                }
        </div>
    )
}