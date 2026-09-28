import { Title } from "@/components";
import CierreTurnoFechaSection from "./table";

export default function CierreTurnoPorFecha() {
    return(
            <div className="flex justify-center items-center mb-7 px-10 sm:px-0">
                <div className="flex flex-col w-[1000px]">
                    <Title title={`Cierres de Turno`} />
                    <CierreTurnoFechaSection />
                </div>
            </div>
    )
}
