import { auth } from "@/auth.config";
import { AbastecimientoGrid, Title } from "@/components";
import { toIsoString } from "@/utils";
import { Constants } from "@/utils/constants";
import { redirect } from "next/navigation";

export default async function Home() {

  const session = await auth();
  // El administrador no emite ventas: solo modifica comprobantes ya emitidos (desde el historico)
  if (session?.user?.rol === Constants.ROL.ADMIN_ROLE) redirect('/historic');

  return (
    <>
        <Title 
          title= {`Abastecimientos`}
          subtitle= {`${session?.user?.isla} - ${session?.user?.jornada} - ${session?.user?.nombre} - Inicio: ${toIsoString(session?.user?.fecha_registro||'')}`}
          className="mb-1"
        />
        <AbastecimientoGrid pistolas={session?.user?.pistolas ?? []} />
    </>
  );
}
