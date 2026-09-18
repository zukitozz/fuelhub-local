"use client";
import { Title } from "@/components";
import { useState } from "react";
import { IoChevronBackOutline, IoChevronForwardOutline, IoTodayOutline, IoPeopleOutline, IoCubeOutline, IoDocumentTextOutline, IoCalendarOutline } from "react-icons/io5";
import { ReporteDiario } from "./ReporteDiario";
import { ReporteDeclaracionMensual } from "./ReporteDeclaracionMensual";
import { ReporteCierreTurnos } from "./ReporteCierreTurnos";
import { ReporteCierreTurnosProductos } from "./ReporteCierreTurnosProductos";
import { ReporteComprobantes } from "./ReporteComprobantes";

type TipoReporte = 'diario' | 'declaracion_mensual' | 'cierre_turnos' | 'cierre_turnos_productos' | 'comprobantes';

const REPORTES: { tipo: TipoReporte; label: string; icon: React.ElementType }[] = [
    { tipo: 'diario', label: 'Cierres diarios', icon: IoTodayOutline },
    { tipo: 'cierre_turnos', label: 'Cierre turnos usuarios', icon: IoPeopleOutline },
    { tipo: 'cierre_turnos_productos', label: 'Cierre turnos productos', icon: IoCubeOutline },
    { tipo: 'comprobantes', label: 'Comprobantes', icon: IoDocumentTextOutline },
    { tipo: 'declaracion_mensual', label: 'Declaración mensual', icon: IoCalendarOutline },
];

export default function Reports() {
    const [tipoReporte, setTipoReporte] = useState<TipoReporte>('diario');
    // Colapsado deja mas ancho real para la tabla del reporte, que es lo que importa ver
    const [menuAbierto, setMenuAbierto] = useState(true);

    const renderSwitch = (tipo: TipoReporte) => {
        switch (tipo) {
            case 'diario':
                return <ReporteDiario />;
            case 'declaracion_mensual':
                return <ReporteDeclaracionMensual />;
            case 'cierre_turnos':
                return <ReporteCierreTurnos />;
            case 'cierre_turnos_productos':
                return <ReporteCierreTurnosProductos />;
            case 'comprobantes':
                return <ReporteComprobantes />;
            default:
                return null;
        }
    };

    const getButtonClass = (tipo: TipoReporte) => {
        const baseClass = "flex items-center gap-2 text-left font-bold mt-2 w-full p-2 rounded transition-colors";
        const activeClass = "bg-blue-100 text-blue-900 border-l-4 border-blue-600";
        const inactiveClass = "text-blue-800 hover:bg-gray-100 border-l-4 border-transparent";
        return `${baseClass} ${tipoReporte === tipo ? activeClass : inactiveClass}`;
    };

    return (
        <div className="flex justify-center items-center mb-7 px-10 sm:px-0">
            {/* max-w en vez de ancho fijo: en ventanas angostas la pagina encoge en vez
                de desbordarse, y el reporte tiene mas espacio real para su tabla */}
            <div className="flex flex-col w-full max-w-[1500px]">
                <Title title={`Reportes`} />
                <div className={`grid gap-4 transition-all duration-200 ${menuAbierto ? 'grid-cols-1 md:grid-cols-[220px_1fr]' : 'grid-cols-1 md:grid-cols-[52px_1fr]'}`}>
                    <div className="bg-white rounded-lg shadow-md p-3 h-fit">
                        <div className="flex items-center justify-between mb-1">
                            {menuAbierto && <p className="text-gray-600 font-semibold text-sm">Seleccione un reporte</p>}
                            <button
                                type="button"
                                onClick={() => setMenuAbierto(!menuAbierto)}
                                className={`p-1.5 rounded hover:bg-gray-100 text-gray-500 ${menuAbierto ? '' : 'mx-auto'}`}
                                title={menuAbierto ? 'Ocultar menú' : 'Mostrar menú'}
                            >
                                {menuAbierto ? <IoChevronBackOutline size={18} /> : <IoChevronForwardOutline size={18} />}
                            </button>
                        </div>

                        {REPORTES.map(({ tipo, label, icon: Icon }) => (
                            <button
                                key={tipo}
                                className={getButtonClass(tipo)}
                                onClick={() => setTipoReporte(tipo)}
                                title={menuAbierto ? undefined : label}
                            >
                                <Icon size={18} className="shrink-0" />
                                {menuAbierto && <span className="truncate">{label}</span>}
                            </button>
                        ))}
                    </div>

                    {/* Contenedor del reporte */}
                    <div>
                        {renderSwitch(tipoReporte)}
                    </div>
                </div>
            </div>
        </div>
    );
}
