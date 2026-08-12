import { Title } from "@/components";
import HistoricosTable from "./table";
import { auth } from "@/auth.config";

export default async function Products() {
    const session = await auth();
    return (
        <div className="flex justify-center items-center mb-7 px-10 sm:px-0">
            {/* max-w en vez de ancho fijo: en ventanas menores a 1500px la pagina
                encoge en vez de desbordarse y sacar scroll horizontal */}
            <div className="flex flex-col w-full max-w-[1500px]">
                <Title 
                    title={`Histórico de comprobantes`} 
                    subtitle= {`${session?.user?.isla} - ${session?.user?.jornada} - ${session?.user?.nombre}`}
                />  
                <div className='bg-white rounded-lg mx-4 p-4'>
                    <HistoricosTable 
                        page={ 1 }
                        perPage={ 20 }
                    />
                </div>
                <div id="modal-root"></div>
            </div>
        </div>
    );
}