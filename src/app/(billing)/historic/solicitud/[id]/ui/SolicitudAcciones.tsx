"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { aprobarSolicitud, rechazarSolicitud } from "@/actions/correcciones";
import { notify } from "@/utils";

interface Props {
    solicitudId: number;
    // Si ya se emitió la nota de crédito, la solicitud no se puede rechazar: solo terminar la aprobación
    puedeRechazar: boolean;
}

export const SolicitudAcciones = ({ solicitudId, puedeRechazar }: Props) => {
    const router = useRouter();
    const [procesando, setProcesando] = useState(false);
    const [rechazando, setRechazando] = useState(false);
    const [motivo, setMotivo] = useState('');
    // Evita doble clic: el ref es sincrónico, el estado no
    const enProceso = useRef(false);

    const ejecutar = async (accion: () => Promise<{ status: boolean; message: string }>) => {
        if (enProceso.current) return;
        enProceso.current = true;
        setProcesando(true);
        try {
            const { status, message } = await accion();
            notify({ message, type: status ? 'success' : 'error' });
            if (status) router.push('/historic');
            else router.refresh();
        } finally {
            enProceso.current = false;
            setProcesando(false);
        }
    };

    return (
        <div className="flex flex-col gap-3 mt-6">
            {!rechazando && (
                <div className="flex gap-3">
                    <button
                        className={`${procesando ? 'btn-disabled' : 'btn-primary'} px-5 py-2 flex-1`}
                        disabled={procesando}
                        onClick={() => ejecutar(() => aprobarSolicitud(solicitudId))}>
                        {procesando ? 'Procesando...' : 'Aprobar y emitir'}
                    </button>
                    {puedeRechazar && (
                        <button
                            className="px-5 py-2 flex-1 rounded border border-red-400 text-red-700 hover:bg-red-50 disabled:opacity-50"
                            disabled={procesando}
                            onClick={() => setRechazando(true)}>
                            Rechazar
                        </button>
                    )}
                </div>
            )}
            {rechazando && (
                <div className="flex flex-col gap-2">
                    <label htmlFor="motivo">Motivo del rechazo</label>
                    <textarea
                        id="motivo"
                        className="px-5 py-2 border bg-gray-200 rounded w-full"
                        rows={3}
                        maxLength={300}
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                    />
                    <div className="flex gap-3">
                        <button
                            className="px-5 py-2 flex-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                            disabled={procesando}
                            onClick={() => ejecutar(() => rechazarSolicitud(solicitudId, motivo))}>
                            {procesando ? 'Procesando...' : 'Confirmar rechazo'}
                        </button>
                        <button
                            className="px-5 py-2 flex-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
                            disabled={procesando}
                            onClick={() => setRechazando(false)}>
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
