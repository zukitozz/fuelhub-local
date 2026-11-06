import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth.config";
import { Title } from "@/components";
import { Constants } from "@/utils/constants";
import { currencyFormat, toLocaleShow } from "@/utils/formats";
import { getHistoricoById } from "@/actions/historicos/get-historicos";
import { obtenerSolicitud } from "@/actions/correcciones";
import { SolicitudAcciones } from "./ui/SolicitudAcciones";

interface Props {
    params: { id: string };
}

const formaPago = (efectivo: number, tarjeta: number, yape: number) => {
    const medios: string[] = [];
    if (Number(efectivo) > 0) medios.push(`Efectivo ${currencyFormat(Number(efectivo))}`);
    if (Number(tarjeta) > 0) medios.push(`Tarjeta ${currencyFormat(Number(tarjeta))}`);
    if (Number(yape) > 0) medios.push(`Yape ${currencyFormat(Number(yape))}`);
    return medios.join(' + ') || '-';
};

const tipoDoc = (tipo: string | undefined, numero: string | undefined) =>
    numero?.length === 11 ? 'RUC' : (numero && numero !== '0' ? 'DNI' : 'Sin documento');

// El administrador compara el comprobante original con lo que propone el grifero y lo aprueba o rechaza
export default async function SolicitudCorreccionPage({ params }: Readonly<Props>) {
    const session = await auth();
    if (session?.user?.rol !== Constants.ROL.ADMIN_ROLE) redirect('/historic');

    const solicitud = await obtenerSolicitud(Number(params.id));
    if (!solicitud) notFound();
    const original = await getHistoricoById(solicitud.ComprobanteId);
    if (!original) notFound();

    const fila = original as unknown as Record<string, unknown>;
    const filas: { campo: string; antes: string; despues: string }[] = [
        { campo: 'Documento', antes: `${tipoDoc(original.Receptor?.tipo_documento, original.Receptor?.numero_documento)} ${original.Receptor?.numero_documento ?? ''}`.trim(), despues: `${tipoDoc(solicitud.tipo_documento, solicitud.numero_documento)} ${solicitud.numero_documento}` },
        { campo: 'Razón social', antes: original.Receptor?.razon_social ?? '-', despues: solicitud.razon_social },
        { campo: 'Dirección', antes: original.Receptor?.direccion || '-', despues: solicitud.direccion || '-' },
        { campo: 'Placa', antes: original.placa || original.Receptor?.placa || '-', despues: solicitud.placa || '-' },
        { campo: 'Tipo de pago', antes: formaPago(Number(fila.pago_efectivo), Number(fila.pago_tarjeta), Number(fila.pago_yape)), despues: formaPago(solicitud.pago_efectivo, solicitud.pago_tarjeta, solicitud.pago_yape) },
    ];
    const nuevoTipo = solicitud.numero_documento.length === 11 ? 'FACTURA' : 'BOLETA';
    const pendiente = solicitud.estado === 'PENDIENTE';

    return (
        <div className="flex justify-center items-center mb-72 px-10 sm:px-0">
            <div className="flex flex-col w-[1000px]">
                <Title title="Corrección de comprobante" />
                <div className="bg-white rounded-xl shadow-xl p-7">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">{original.numeracion_comprobante}</h2>
                            <p className="text-sm text-gray-600">
                                Total {currencyFormat(Number(original.total))} · solicitada por {solicitud.usuario ?? `usuario ${solicitud.UsuarioId}`} · {toLocaleShow(solicitud.fecha_solicitud)}
                            </p>
                        </div>
                        <span className={`font-bold py-1 px-3 rounded text-sm ${pendiente ? 'bg-amber-100 text-amber-800' : solicitud.estado === 'APROBADA' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                            {solicitud.estado}
                        </span>
                    </div>

                    <table className="w-full text-sm mb-4">
                        <thead>
                            <tr className="text-left text-gray-600 border-b">
                                <th className="py-2 w-1/5">Dato</th>
                                <th className="py-2 w-2/5">Comprobante actual</th>
                                <th className="py-2 w-2/5">Corrección propuesta</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filas.map(f => (
                                <tr key={f.campo} className="border-b">
                                    <td className="py-2 font-semibold">{f.campo}</td>
                                    <td className="py-2">{f.antes}</td>
                                    <td className={`py-2 ${f.antes !== f.despues ? 'font-bold text-blue-700' : ''}`}>{f.despues}</td>
                                </tr>
                            ))}
                            <tr className="border-b">
                                <td className="py-2 font-semibold">Celular</td>
                                <td className="py-2">-</td>
                                <td className="py-2">{solicitud.celular || '-'}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="bg-gray-100 rounded p-3 text-sm">
                        <span className="font-semibold">Observaciones del grifero: </span>{solicitud.observaciones}
                    </div>

                    {pendiente && (
                        <p className="text-sm text-gray-600 mt-4">
                            Al aprobar se emite una <b>nota de crédito por anulación</b> de {original.numeracion_comprobante} y una <b>{nuevoTipo}</b> nueva
                            con estos datos, ambas a tu nombre. El comprobante actual no se modifica.
                        </p>
                    )}
                    {pendiente && solicitud.nc_numeracion && (
                        <p className="text-sm bg-amber-50 border border-amber-300 rounded p-3 mt-3">
                            La aprobación quedó incompleta: la nota de crédito {solicitud.nc_numeracion} ya se emitió
                            {solicitud.nuevo_numeracion ? ` y el comprobante nuevo ${solicitud.nuevo_numeracion} también` : ', falta el comprobante nuevo'}.
                            Al aprobar de nuevo solo se emite lo que falta.
                        </p>
                    )}
                    {solicitud.estado === 'APROBADA' && (
                        <p className="text-sm text-green-800 mt-4">
                            Nota de crédito <b>{solicitud.nc_numeracion}</b> · comprobante nuevo <b>{solicitud.nuevo_numeracion}</b> · {solicitud.fecha_resolucion ? toLocaleShow(solicitud.fecha_resolucion) : ''}
                        </p>
                    )}
                    {solicitud.estado === 'RECHAZADA' && (
                        <p className="text-sm text-gray-700 mt-4">
                            <b>Motivo del rechazo:</b> {solicitud.motivo_rechazo}
                        </p>
                    )}

                    {pendiente && <SolicitudAcciones solicitudId={solicitud.id} puedeRechazar={!solicitud.nc_numeracion} />}
                    <Link href="/historic" className="block mt-5 underline text-sm">Volver al histórico</Link>
                </div>
            </div>
        </div>
    );
}
