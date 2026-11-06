import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth.config";
import { Title } from "@/components";
import { Constants } from "@/utils/constants";
import { getHistoricoById } from "@/actions/historicos/get-historicos";
import { verificarCorreccion } from "@/actions/correcciones";
import { IBillingForm } from "@/interfaces";
import { CorreccionForm } from "./ui/CorreccionForm";

interface Props {
    params: { id: string };
}

const aNumero = (valor: unknown) => Number(valor) || 0;

// Pantalla del grifero para proponer la corrección de un comprobante de su isla
export default async function CorregirComprobantePage({ params }: Readonly<Props>) {
    const session = await auth();
    if (!session?.user) redirect('/auth/login');
    // El administrador no corrige: emite la nota de crédito directamente desde el histórico
    if (session.user.rol === Constants.ROL.ADMIN_ROLE) redirect('/historic');

    const id = Number(params.id);
    const verificacion = await verificarCorreccion(id);

    if (!verificacion.status) {
        return (
            <div className="flex justify-center items-center mb-7 px-10 sm:px-0">
                <div className="flex flex-col w-[1000px]">
                    <Title title="Corregir comprobante" />
                    <div className="bg-red-100 border border-red-400 text-red-700 rounded p-5 text-xl">
                        {verificacion.message}
                        <Link href="/historic" className="block mt-4 underline">Volver al histórico</Link>
                    </div>
                </div>
            </div>
        );
    }

    const data = await getHistoricoById(id);
    // pago_* son las columnas reales de Comprobantes (no vienen tipadas en la interfaz)
    const fila = data as unknown as Record<string, unknown>;
    const tipoReceptor = data.Receptor?.tipo_documento;
    const inicial: IBillingForm = {
        tipoComprobante: data.tipo_comprobante,
        // En BD el DNI es '1' (SUNAT); el formulario lo maneja como '0'
        tipoDocumento: (tipoReceptor === Constants.TIPO_DOCUMENTO.DNI_SUNAT ? Constants.TIPO_DOCUMENTO.DNI : tipoReceptor) || "",
        numeroDocumento: data.Receptor?.numero_documento === '0' ? '' : (data.Receptor?.numero_documento || ''),
        razonSocial: data.Receptor?.numero_documento === '0' ? '' : (data.Receptor?.razon_social || ''),
        direccion: data.Receptor?.direccion || "",
        placa: data.placa || data.Receptor?.placa || "",
        efectivo: aNumero(fila.pago_efectivo),
        tarjeta: aNumero(fila.pago_tarjeta),
        yape: aNumero(fila.pago_yape),
        fechaEmision: "",
    };

    return (
        <div className="flex justify-center items-center mb-72 px-10 sm:px-0">
            <div className="flex flex-col w-[1000px]">
                <Title title="Corregir comprobante" />
                {/* Marco de color para que el grifero note que está en una opción distinta a la venta normal */}
                <div className="border-4 border-amber-500 rounded-xl shadow-xl overflow-hidden bg-white">
                    <div className="bg-amber-500 text-white font-bold text-center py-2 px-4 tracking-wide">
                        MODO CORRECCIÓN · Esta opción no emite el comprobante: envía una solicitud al administrador
                    </div>
                    <div className="p-7">
                        <CorreccionForm
                            comprobanteId={id}
                            numeracion={data.numeracion_comprobante}
                            total={aNumero(data.total)}
                            inicial={inicial}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
