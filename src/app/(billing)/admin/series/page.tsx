import { Title } from "@/components";
import { SeriesTable } from "./table";

export default function Series() {
    return (
        <div className="flex justify-center items-center mb-7 px-10 sm:px-0">
            {/* max-w en vez de ancho fijo: en ventanas angostas la pagina encoge en vez
                de desbordarse y sacar scroll horizontal, igual que en /historic */}
            <div className="flex flex-col w-full max-w-[1300px]">
                <Title title={`Mantenimiento de series`} />
                <div className='bg-white rounded-lg mx-4 p-4'>
                    <SeriesTable />
                </div>
                <div id="modal-root"></div>
            </div>
        </div>
    );
}
