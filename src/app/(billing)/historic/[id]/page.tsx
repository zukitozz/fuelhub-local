import { Title } from "@/components";
import { getHistoricoById } from "@/actions/historicos/get-historicos";
import { BillingEditForm } from "./ui/BillingEditForm";
import { BillingEditSummary } from "./ui/BillingEditSummary";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth.config";
import { Constants } from "@/utils/constants";

interface Props {
  params: {
    id: number;
  };
}


export default async function InvoiceByIdPage({ params }: Readonly<Props>) {
    // La nota de crédito solo la emiten los administradores
    const session = await auth();
    if (session?.user?.rol !== Constants.ROL.ADMIN_ROLE) {
        redirect('/historic');
    }

    const { id } = params;
    const data = await getHistoricoById(id);

    if (!data) {
        notFound(); // Redirige automáticamente a una página 404 si no hay datos
    }

    return (
      <div className="flex justify-center items-center mb-72 px-10 sm:px-0">
        <div className="flex flex-col w-[1000px]">
            <Title title={`Detalle de la orden`} />
            <div className="grid grid-cols-5 sm:grid-cols-5 gap-10">
                <div className="bg-white rounded-xl shadow-xl p-7 col-span-3">
                    <BillingEditForm billing={data}  />
                </div>  
                <div className="bg-white rounded-xl shadow-xl p-7 col-span-2">
                    <BillingEditSummary billing={data} />
                </div>               
            </div>
        </div>
      </div>
    );
}