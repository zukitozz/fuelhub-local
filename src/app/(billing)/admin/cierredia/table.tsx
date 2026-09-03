'use client';
import { useState } from 'react'; // 1. Importamos useState para controlar el flujo
import useSWR from 'swr';

import { useRouter } from "next/navigation";
import { obtieneCierreDia, obtieneTurnosAbiertos, saveCierreDia } from '@/actions'
import { ICierreTurno, ICierreTurnoDetalle, IDepositos, IGastos } from '@/interfaces';
import { currencyFormat, notify, notifyConfirm, toLocaleStorage } from '@/utils';
import { useSession } from "next-auth/react";
import { ResumenTable } from '@/components';

interface TableProps {
  page: number;
  perPage: number;
  keyword?: string;
}

const fetcher = (page: number, perPage: number, keyword?: string) => obtieneCierreDia();

export const CierreSection = ({ page, perPage, keyword }: TableProps) => {
    const router = useRouter();
    const { data: session } = useSession();
    const [isProcessing, setIsProcessing] = useState(false); // 2. Estado de bloqueo global para el botón
    
    const { data, error, isLoading, isValidating, mutate } = useSWR(
        `${process.env.NEXT_PUBLIC_URL}/api`, 
        (url: string) => fetcher(page, perPage, keyword)
    );

    if(!data || isLoading || isValidating || error || !Array.isArray(data)){
        return (
            <div className="flex justify-center p-10">
                <div className="animate-spin rounded-full h-8 w-8 border-gray-900 border-b-2"></div>
            </div>
        );
    }

    // --- CÁLCULOS CONSOLIDADOS DEL DÍA ---
    const { totalGeneral, totalDepositosDia, totalGastosDia } = data.reduce((acc, current) => {
        const sumDepositos = current.depositos?.reduce((sum, d) => sum + (Number(d.monto) || 0), 0) || 0;
        const sumGastos = current.gastos?.reduce((sum, g) => sum + (Number(g.monto) || 0), 0) || 0;
        
        return {
            totalGeneral: acc.totalGeneral + (current.total || 0),
            totalDepositosDia: acc.totalDepositosDia + sumDepositos,
            totalGastosDia: acc.totalGastosDia + sumGastos
        };
    }, { totalGeneral: 0, totalDepositosDia: 0, totalGastosDia: 0 });

    const totalNetoDia = totalGeneral - totalDepositosDia - totalGastosDia;

    // 3. Modificamos el controlador para bloquear el hilo de ejecución inmediatamente
    const handlerProcessCierre = async () => {
        if (isProcessing) return; // Salvaguarda extra a nivel de función
        setIsProcessing(true); // Se bloquea desde el inicio para cubrir también la verificación previa

        // Verificación previa: turnos abiertos con comprobantes que quedarían fuera del cierre
        try{
            const abiertos = await obtieneTurnosAbiertos();
            if (abiertos.length > 0) {
                const continuar = await notifyConfirm({
                    message: 'Hay turnos abiertos que NO se incluirán en este cierre de día. ¿Deseas continuar de todos modos?',
                    detail: abiertos.map(t => `${t.nombre} (${t.turno}, ${t.isla}) — ${t.pendientes} comprobantes sin cerrar`),
                    confirmText: 'Continuar de todos modos',
                    cancelText: 'Cancelar',
                });
                if (!continuar) {
                    setIsProcessing(false);
                    return;
                }
            }
        }catch{
            // La verificación es informativa: si falla no debe impedir el cierre del día
            notify({message: 'No se pudo verificar turnos abiertos, se continúa con el cierre', type: 'error'})
        }

        try{
            const { message, status } = await saveCierreDia(session, totalGeneral);
            if(status){          
                notify({message})
                router.push('/')
            }else{
                notify({message, type: 'error'})
                //Al fallar se queda en la pantalla y revalida: si el cierre se rechazo porque
                //entro un turno nuevo, el administrador necesita verlo reflejado para reintentar.
                await mutate();
            }
        }finally{
            setIsProcessing(false);
        }        
    }  

    return (
        <>
            {/* BARRA DE ACCIÓN: Banner superior de consolidación masiva */}
            <div className="bg-slate-800 text-white rounded-xl p-6 mb-6 shadow-md flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h1 className="text-xl font-bold tracking-tight">Consolidación del Día</h1>
                    <p className="text-slate-400 text-xs mt-0.5">
                        Se procesarán <span className="text-emerald-400 font-bold">{data.length} turnos</span> listos para el cierre final.
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 border-t border-slate-700 text-xs text-slate-300">
                        <div>Venta Bruta: <span className="font-semibold text-white">{currencyFormat(totalGeneral)}</span></div>
                        <div>(-) Depósitos: <span className="font-semibold text-amber-400">{currencyFormat(totalDepositosDia)}</span></div>
                        <div>(-) Gastos: <span className="font-semibold text-rose-400">{currencyFormat(totalGastosDia)}</span></div>
                    </div>
                </div>
                
                <div className="flex items-center gap-6 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 border-slate-700 pt-4 lg:pt-0">
                    <div className="text-right">
                        <span className="text-slate-400 text-[10px] block font-bold uppercase tracking-wider">TOTAL NETO A ENTREGAR</span>
                        <span className="text-2xl font-black text-emerald-400">{currencyFormat(totalNetoDia)}</span>
                    </div>
                    
                    {/* 4. Botón Dinámico con Spinner integrado y deshabilitación por hardware */}
                    <button 
                        className={`font-bold px-6 py-3 rounded-lg text-sm shadow-lg transition-all whitespace-nowrap flex items-center gap-2 ${
                            isProcessing 
                            ? 'bg-slate-600 text-slate-400 cursor-not-allowed shadow-none' 
                            : 'bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white'
                        }`}
                        onClick={handlerProcessCierre}
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Procesando Cierre...
                            </>
                        ) : (
                            '🚀 Imprimir y Cerrar Día'
                        )}
                    </button>
                </div>
            </div> 

            {/* GRILLA DE TURNOS INDIVIDUALES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {
                    data.map((cierre : ICierreTurno) => {
                        const totalCalibracion = cierre.detalle
                            ?.filter(p => p.medida === "GLL" && p.calibracion_cantidad > 0)
                            .reduce((acc, item) => acc + (item.calibracion_soles || 0), 0) || 0;

                        const totalDespacho = cierre.detalle
                            ?.filter(p => p.medida === "GLL" && p.despacho_cantidad > 0)
                            .reduce((acc, item) => acc + (item.despacho_soles || 0), 0) || 0;

                        const totalProductos = cierre.detalle
                            ?.filter(p => p.medida === "GLL" && p.total_cantidad > 0)
                            .reduce((acc, item) => acc + (item.total_soles || 0), 0) || 0;

                        const totalDepositosTurno = cierre.depositos
                            ?.reduce((acc, item) => acc + (Number(item.monto) || 0), 0) || 0;

                        const totalGastosTurno = cierre.gastos
                            ?.reduce((acc, item) => acc + (Number(item.monto) || 0), 0) || 0;

                        return (
                            <div key={ cierre.id } className="bg-white rounded-xl shadow-md border border-gray-100 p-5 flex flex-col justify-between">
                                <div className="space-y-4">
                                    {/* Cabecera Estructurada */}
                                    <div className="bg-slate-50 border border-gray-200/60 rounded-lg p-3 grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                                        <div className="text-gray-500">
                                            <span className="font-bold text-gray-400 text-[9px] block tracking-wider uppercase">FECHA</span>
                                            <span className="font-medium text-gray-800">{ cierre.fecha ? toLocaleStorage(cierre.fecha) : '' }</span>
                                        </div>
                                        <div className="text-gray-500">
                                            <span className="font-bold text-gray-400 text-[9px] block tracking-wider uppercase">TURNO</span>
                                            <span className="font-bold text-slate-700 bg-slate-200/60 px-1.5 py-0.5 rounded text-[11px]">{ cierre.turno }</span>
                                        </div>
                                        <div className="text-gray-500 col-span-1">
                                            <span className="font-bold text-gray-400 text-[9px] block tracking-wider uppercase">OPERADOR</span>
                                            <span className="font-medium text-gray-800 truncate block max-w-[140px]">{ cierre.usuario?.nombre || 'N/A' }</span>
                                        </div>
                                        <div className="text-gray-500">
                                            <span className="font-bold text-gray-400 text-[9px] block tracking-wider uppercase">ISLA</span>
                                            <span className="font-bold text-gray-800">{ cierre.isla }</span>
                                        </div>
                                    </div>

                                    {/* TABLAs existentes */}
                                    {cierre.detalle && cierre.detalle.filter((producto) => producto.medida == "GLL" && producto.calibracion_cantidad > 0).length > 0 && (
                                        <ResumenTable title="CALIBRACIÓN (SERAFIN)" headers={['PRODUCTO', 'GAL', 'IMPORTE']} footerLabel="SUB TOTAL" footerValue={totalCalibracion}>
                                            {cierre.detalle.filter((producto) => producto.medida == "GLL" && producto.calibracion_cantidad > 0).map((item: ICierreTurnoDetalle) => (
                                                <tr key={item.producto}><td className="text-left">{item.producto}</td><td className="text-right">{item.calibracion_cantidad.toFixed(3)}</td><td className="text-right">{currencyFormat(item.calibracion_soles)}</td></tr>
                                            ))}
                                        </ResumenTable>
                                    )}

                                    {cierre.detalle && cierre.detalle.filter((producto) => producto.medida == "GLL" && producto.despacho_cantidad > 0).length > 0 && (
                                        <ResumenTable title="NOTAS DE DESPACHO" headers={['PRODUCTO', 'GAL', 'IMPORTE']} footerLabel="SUB TOTAL" footerValue={totalDespacho}>
                                            {cierre.detalle.filter((producto) => producto.medida == "GLL" && producto.despacho_cantidad > 0).map((item: ICierreTurnoDetalle) => (
                                                <tr key={item.producto}><td className="text-left">{item.producto}</td><td className="text-right">{item.despacho_cantidad.toFixed(3)}</td><td className="text-right">{currencyFormat(item.despacho_soles)}</td></tr>
                                            ))}
                                        </ResumenTable>
                                    )}

                                    {cierre.detalle && cierre.detalle.filter((producto) => producto.medida == "GLL" && producto.total_cantidad > 0).length > 0 && (
                                        <ResumenTable title="VENTA PRODUCTOS / GALONES" headers={['PRODUCTO', 'GAL', 'IMPORTE']} footerLabel="SUB TOTAL" footerValue={totalProductos}>
                                            {cierre.detalle.filter((producto) => producto.medida == "GLL" && producto.total_cantidad > 0).map((item: ICierreTurnoDetalle) => (
                                                <tr key={item.producto}><td className="text-left">{item.producto}</td><td className="text-right">{item.total_cantidad.toFixed(3)}</td><td className="text-right">{currencyFormat(item.total_soles)}</td></tr>
                                            ))}
                                        </ResumenTable>
                                    )}

                                    {cierre.depositos && cierre.depositos.length > 0 && (
                                        <ResumenTable title="DEPÓSITOS REALIZADOS" headers={['CONCEPTO', 'TURNO', 'MONTO']} footerLabel="TOTAL DEP." footerValue={totalDepositosTurno}>
                                            {cierre.depositos.map((dep: IDepositos) => (
                                                <tr key={dep.id}><td className="text-left truncate max-w-[120px]">{dep.concepto}</td><td className="text-center">{dep.turno}</td><td className="text-right text-amber-600 font-medium">{currencyFormat(Number(dep.monto))}</td></tr>
                                            ))}
                                        </ResumenTable>
                                    )}

                                    {cierre.gastos && cierre.gastos.length > 0 && (
                                        <ResumenTable title="GASTOS OPERATIVOS" headers={['CONCEPTO', 'AUTORIZADO', 'MONTO']} footerLabel="TOTAL GASTOS" footerValue={totalGastosTurno}>
                                            {cierre.gastos.map((gas: IGastos) => (
                                                <tr key={gas.id}><td className="text-left truncate max-w-[120px]">{gas.concepto}</td><td className="text-center text-[10px] font-semibold text-slate-500">{gas.autorizado || 'N/A'}</td><td className="text-right text-rose-600 font-medium">{currencyFormat(Number(gas.monto))}</td></tr>
                                            ))}
                                        </ResumenTable>
                                    )}
                                </div>

                                {/* Importe final */}
                                <div className="mt-6 pt-3 border-t border-dashed border-gray-200 flex justify-between items-center text-sm">
                                    <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Total Turno Neto:</span>
                                    <span className="font-extrabold text-slate-800 bg-slate-100 px-2 py-1 rounded">
                                        {currencyFormat((cierre.total || 0) - totalDepositosTurno - totalGastosTurno)}
                                    </span>
                                </div>
                            </div>  
                        );
                    })
                }
            </div>
        </>
    )
}

export default CierreSection;