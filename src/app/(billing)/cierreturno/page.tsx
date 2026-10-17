import Link from "next/link";
import { Title } from "@/components";
import { countVentasPendientes } from "@/actions/cierreturno";
import CierreVentas from './ventas';
import { Historico } from "./historico";

export default async function Cierreturno() {
    // Validación también aquí por si se accede directo por URL
    const pendientes = await countVentasPendientes();

    if (pendientes > 0) {
        return (
            <div className="flex justify-center items-center mb-7 px-10 sm:px-0">
                <div className="flex flex-col w-[1000px]">
                    <Title title={`Cierre de turno`} />
                    <div className="bg-red-100 border border-red-400 text-red-700 rounded p-5 text-xl">
                        Hay {pendientes} venta(s) pendientes de boletear en la isla. Boletee todas las ventas antes de cerrar el turno.
                        <Link href="/" className="block mt-4 underline">Volver a ventas</Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex justify-center items-center mb-7 px-10 sm:px-0">
            <div className="flex flex-col w-[1000px]">
                <Title title={`Cierre de turno`} />
                <div className="grid grid-cols-6 sm:grid-cols-6 gap-10">
                    <Historico/>
                    <CierreVentas/>
                </div>
            </div>
        </div>
    );
}
