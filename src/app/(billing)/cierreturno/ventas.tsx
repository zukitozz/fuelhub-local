'use client';
import { useMemo, useState } from 'react';
import useSWR from 'swr';

import { useSession } from "next-auth/react";
import { currencyFormat, toLocaleShow, notify } from "@/utils";
import { obtieneCierreTurno, saveCierreTurno } from '@/actions/cierreturno';
import { logout } from "@/actions";
import { ResumenTable } from '@/components';


export const CierreVentas = () => {
    const { data: session } = useSession();
    const [isProcessing, setIsProcessing] = useState(false);

    const usuarioId = session?.user?.id || "0";
    
    // Sin refresco la pantalla puede quedar horas mostrando totales viejos si el
    // despachador la deja abierta y sigue vendiendo
    const { data, isLoading, error } = useSWR(`${process.env.NEXT_PUBLIC_URL}/api/cierre/${usuarioId}`,
        () => obtieneCierreTurno(usuarioId),
        { refreshInterval: 2000 }
    );

    // Cálculos memorizados
    const stats = useMemo(() => {
        if (!data) return null;

        const gllProducts = data.productos.filter(p => p.medida === "GLL");
        const otherProducts = data.productos.filter(p => p.medida !== "GLL");

        const galones = gllProducts.reduce((acc, b) => ({
            solesSerafin: acc.solesSerafin + b.calibracion_soles + b.despacho_soles,
            cantSerafin: acc.cantSerafin + b.calibracion_cantidad + b.despacho_cantidad,
            solesVenta: acc.solesVenta + b.total_soles,
            cantVenta: acc.cantVenta + b.total_cantidad,
        }), { solesSerafin: 0, cantSerafin: 0, solesVenta: 0, cantVenta: 0 });

        const productosOtros = otherProducts.reduce((acc, b) => ({
            soles: acc.soles + b.total_soles,
            cant: acc.cant + b.total_cantidad
        }), { soles: 0, cant: 0 });

        const totalDepositos = data.depositos?.reduce((a, b) => a + b.monto, 0) || 0;
        const totalGastos = data.gastos?.reduce((a, b) => a + b.monto, 0) || 0;
        
        const { yape, efectivo, tarjeta } = data.soles;
        const totTipoPago = efectivo + yape + tarjeta;
        const balanceFinal = totTipoPago - (totalDepositos + totalGastos);

        return { galones, productosOtros, totalDepositos, totalGastos, totTipoPago, balanceFinal };
    }, [data]);

    const handlerProcessCierre = async () => {
        if (!data || !stats || stats.balanceFinal === 0) return;
        setIsProcessing(true);
        try{
            const { message, status } = await saveCierreTurno(session, stats.totTipoPago, data.soles, data.productos)
            if(status){
                notify({message})
                //signOut redirige al login y se lleva la notificacion por delante: se le da
                //tiempo al despachador de leer la confirmacion antes de salir
                await new Promise(resolve => setTimeout(resolve, 2500));
                //Solo se cierra sesion si el turno realmente se cerro: ante un rechazo el
                //despachador debe poder leer el error, refrescar y volver a intentarlo
                await logout();
            }else{
                notify({message, type: 'error'})
            }
        } catch (err: any) {
            const msg = err?.message || 'Error crítico al cerrar turno';
            notify({ message: msg, type: 'error' });
        } finally {
            setIsProcessing(false);
        }
    };

    if (error) return <div className="p-7 text-red-500 font-bold">Error al cargar las ventas</div>;
    if (isLoading) return <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>;
    if (!data || !stats || stats.balanceFinal === 0) {
        return (
            <div className="bg-white rounded-xl shadow-xl p-7 col-span-3 border-l-4 border-l-gray-300">
                <h2 className="text-lg font-bold text-gray-700">Ventas del día:</h2>
                <p className="text-gray-500 text-sm mt-1">No hay ventas pendientes de cierre</p>
            </div>
        );
    }

    return (
        /* MODIFICADO: Añadido border-l-4 border-l-emerald-500 para denotar estado ACTIVO / DE OPERACIÓN */
        <div className="bg-white rounded-xl shadow-xl p-7 col-span-3 border-l-4 border-l-emerald-500">
            <h2 className="text-xl font-bold mb-4 border-b pb-2 flex items-center gap-2 text-gray-800">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>Resumen de Cierre
            </h2>

            {/* Cabecera optimizada: Compacta pero diferenciada con tonos oscuros y limpios */}
            <div className="flex flex-col gap-1.5 mb-4 pb-3 border-b border-gray-200">
                <div className="flex gap-4">
                    <span className="text-gray-500">
                        <strong className="text-gray-400 font-medium uppercase tracking-wider text-[10px] mr-1">TURNO ACTIVO:</strong> 
                        <span className="text-emerald-700 font-extrabold bg-emerald-50 px-1.5 py-0.5 rounded text-xs">{session?.user?.jornada}</span>
                    </span>
                    <span className="text-gray-300">|</span>
                    <span className="text-gray-500">
                        <strong className="text-gray-400 font-medium uppercase tracking-wider text-[10px] mr-1">ISLA:</strong> 
                        <span className="text-gray-800 font-bold">{session?.user?.isla}</span>
                    </span>
                </div>

                <div className="text-gray-500 flex items-center gap-1">
                    <span className="text-gray-400 font-medium uppercase tracking-wider text-[10px]">APERTURA:</span>
                    <span className="font-semibold text-gray-700 text-xs">{toLocaleShow(session?.user?.fecha_registro || new Date())}</span>
                </div>
            </div>            
            
            {/* 1. Tabla Serafin */}
            {stats.galones.solesSerafin > 0 && (
                <ResumenTable 
                    title="NOTAS DE DESPACHO / SERAFIN" 
                    headers={['PRODUCTO', 'GAL', 'IMPORTE']}
                    footerLabel="SUB TOTAL"
                    footerValue={stats.galones.solesSerafin}
                >
                    {data.productos.filter(p => p.medida === "GLL").map(item => (
                        <tr key={item.producto}>
                            <td className='text-left'>{item.producto} (Serafin/Desp)</td>
                            <td className='text-right'>{(item.despacho_cantidad + item.calibracion_cantidad).toFixed(3)}</td>
                            <td className='text-right'>{currencyFormat(item.despacho_soles + item.calibracion_soles)}</td>
                        </tr>
                    ))}
                </ResumenTable>
            )}

            {/* 2. Venta Galones */}
            <ResumenTable 
                title="VENTA GALONES" 
                headers={['PRODUCTO', 'GALONES', 'IMPORTE']}
                footerLabel="SUB TOTAL"
                footerValue={stats.galones.solesVenta}
            >
                {data.productos.filter(p => p.medida === "GLL").map(item => (
                    <tr key={item.producto}>
                        <td className='text-left'>{item.producto}</td>
                        <td className='text-right'>{item.total_cantidad.toFixed(3)}</td>
                        <td className='text-right'>{currencyFormat(item.total_soles)}</td>
                    </tr>
                ))}
            </ResumenTable>

            <ResumenTable 
                title="VENTA DE PRODUCTOS" 
                headers={['PRODUCTO', 'CANTIDAD', 'IMPORTE']}
                footerLabel="SUB TOTAL"
                footerValue={stats.productosOtros.soles}
            >
                {data.productos.filter(p => p.medida != "GLL").map(item => (
                    <tr key={item.producto}>
                        <td className='text-left'>{item.producto}</td>
                        <td className='text-right'>{item.total_cantidad.toFixed(2)}</td>
                        <td className='text-right'>{currencyFormat(item.total_soles)}</td>
                    </tr>
                ))}
            </ResumenTable>            

            {/* 3. Pagos */}
            <ResumenTable 
                title="TIPO DE PAGO" 
                headers={['MEDIO', 'MONTO']}
                footerLabel="TOTAL PAGOS"
                footerValue={stats.totTipoPago}
            >
                <tr><td className="text-left">EFECTIVO</td><td className="text-right">{currencyFormat(data.soles.efectivo)}</td></tr>
                <tr><td className="text-left">TARJETA</td><td className="text-right">{currencyFormat(data.soles.tarjeta)}</td></tr>
                <tr><td className="text-left">YAPE</td><td className="text-right">{currencyFormat(data.soles.yape)}</td></tr>
            </ResumenTable>

            {stats.totalDepositos > 0 && (
                <ResumenTable title="DEPOSITOS" headers={['FECHA HORA', 'MONTO']} footerLabel="TOTAL" footerValue={stats.totalDepositos}>
                    {data.depositos.map(d => (
                        <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                            <td>{toLocaleShow(d.fecha)}</td>
                            <td className="text-right">{currencyFormat(d.monto)}</td></tr>
                    ))}
                </ResumenTable>
            )}            
            {stats.totalGastos > 0 && (
                <ResumenTable title="GASTOS" headers={['CONCEPTO', 'MONTO']} footerLabel="TOTAL" footerValue={stats.totalGastos}>
                    {data.gastos.map(g => (
                        <tr key={g.id} className="hover:bg-gray-50 transition-colors">
                            <td>{g.concepto}</td>
                            <td className="text-right">{currencyFormat(g.monto)}</td>
                        </tr>
                    ))}
                </ResumenTable>
            )}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg flex justify-between items-center font-bold text-xl">
                <span>EFECTIVO A ENTREGAR:</span>
                <span className="text-blue-700">{currencyFormat(stats.balanceFinal)}</span>
            </div>

{/* --- LEYENDA DEL CÁLCULO --- */}
            <div className="mt-4 pt-3 border-t border-blue-200 text-[11px] text-gray-600 font-normal normal-case tracking-normal space-y-1">
                <p className="font-semibold text-blue-900 mb-1 uppercase tracking-wider text-[10px]">
                    ¿Cómo se calcula este monto?
                </p>
                <p className="flex justify-between">
                    <span>(+) Total de Pagos Recibidos (Efectivo + Tarjeta + Yape):</span>
                    <span className="font-medium">{currencyFormat(stats.totTipoPago)}</span>
                </p>
                {stats.totalDepositos > 0 && (
                    <p className="flex justify-between text-red-600">
                        <span>(–) Depósitos realizados:</span>
                        <span className="font-medium">– {currencyFormat(stats.totalDepositos)}</span>
                    </p>
                )}
                {stats.totalGastos > 0 && (
                    <p className="flex justify-between text-red-600">
                        <span>(–) Gastos del turno:</span>
                        <span className="font-medium">– {currencyFormat(stats.totalGastos)}</span>
                    </p>
                )}
                {stats.galones.solesSerafin > 0 && (
                    <p className="flex justify-between text-red-600">
                        <span>(–) Notas de Despacho / Serafín:</span>
                        <span className="font-medium">– {currencyFormat(stats.galones.solesSerafin)}</span>
                    </p>
                )}
                <div className="border-t border-dashed border-blue-200 my-1"></div>
                <p className="text-gray-500 italic">
                    * Nota: El "Efectivo a Entregar" descuenta los gastos, depósitos, notas de despacho y calibraciones del total vendido.
                </p>
            </div>
            {/* --------------------------- */}            

            <button 
                className="btn-primary px-5 py-3 mt-4 w-full text-lg shadow-lg active:scale-95 transition-transform"
                onClick={handlerProcessCierre} disabled={isProcessing}
            >
                Imprimir y Cerrar Turno
            </button> 
        </div>
    );
};

export default CierreVentas;