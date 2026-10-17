'use client';
import { useEffect, useRef, useState } from "react";
import useSWR from 'swr';
import { useSession } from "next-auth/react";
import { IAbastecimiento } from "@/interfaces";
import { AbastecimientoGridItem } from "./AbastecimientoGridItem";
import { getAbastecimientos, saveBilling, validatePrevBilling } from "@/actions";
import { buildComprobanteFromAbastecimiento, Constants, notify } from "@/utils";
import { useOrderAbastecimientoStore } from "@/store";

// NEXT_PUBLIC_ENABLE_AUTOBOLETEO: 0 = desactivado, 1 = por manguera (boletea el anterior
// al llegar la siguiente venta de la pistola), 2 = temporizado (a los N minutos)
const MODOS_AUTOBOLETEO = { DESACTIVADO: 0, POR_MANGUERA: 1, TEMPORIZADO: 2 } as const;
const MODO_AUTOBOLETEO = (() => {
    const valor = process.env.NEXT_PUBLIC_ENABLE_AUTOBOLETEO;
    if (valor === 'true') return MODOS_AUTOBOLETEO.POR_MANGUERA; // compatibilidad con el valor antiguo
    const modo = Number(valor);
    return modo === 1 || modo === 2 ? modo : MODOS_AUTOBOLETEO.DESACTIVADO;
})();
const MINUTOS_AUTOBOLETEO_TEMPORIZADO = 10;

interface Props {
    pistolas: number[];
}

export const AbastecimientoGrid = ({ pistolas }: Props) => {
    const { data: session } = useSession();
    const removeAllProducts = useOrderAbastecimientoStore((state) => state.removeAllProducts);
    const unLockBilling = useOrderAbastecimientoStore((state) => state.unlockBilling);
    const [filteredAbastecimientos, setFilteredAbastecimientos] = useState<IAbastecimiento[]>([]);
    const filtroPistolas = process.env.NEXT_PUBLIC_ENABLE_BILLING_IN_ALL === 'true' ? [] : pistolas;
    
    // Lock en memoria para evitar que el polling de SWR duplique transacciones en vuelo
    const idsProcesando = useRef<Set<number>>(new Set());

    useEffect(() => {
        removeAllProducts();
        unLockBilling();
    }, [removeAllProducts]);

    const { data, mutate } = useSWR<IAbastecimiento[]>(
        `${process.env.NEXT_PUBLIC_URL}/api/abastecimientos`,
        () => getAbastecimientos(filtroPistolas, Constants.ESTADOS_ABASTECIMIENTO.PENDIENTE), 
        {
            refreshInterval: 2000,
            refreshWhenHidden: true,
            refreshWhenOffline: true,
            revalidateOnFocus: true,
        }
    );

    useEffect(() => {
        if (!data || data.length === 0) {
            setFilteredAbastecimientos([]);
            return;
        }

        if (MODO_AUTOBOLETEO === MODOS_AUTOBOLETEO.DESACTIVADO) {
            setFilteredAbastecimientos(data);
            return; 
        }

        // Modo 2: se boletea con clientes varios cada abastecimiento pendiente que lleva
        // MINUTOS_AUTOBOLETEO_TEMPORIZADO o más desde que apareció (tiempo calculado en BD)
        if (MODO_AUTOBOLETEO === MODOS_AUTOBOLETEO.TEMPORIZADO) {
            setFilteredAbastecimientos(data);
            const vencidos = data.filter(a =>
                a.estado === 0 &&
                (a.minutosTranscurridos ?? 0) >= MINUTOS_AUTOBOLETEO_TEMPORIZADO &&
                !idsProcesando.current.has(a.idAbastecimiento)
            );
            procesarSecuencial(vencidos);
            return;
        }

        // 1. Obtener el abastecimiento más RECIENTE de cada pistola para la UI
        const mapaMangueras: { [pistolaId: number]: IAbastecimiento } = {};
        data.forEach(abastecimiento => {
            const pId = abastecimiento.pistola;
            if (!mapaMangueras[pId] || abastecimiento.idAbastecimiento > mapaMangueras[pId].idAbastecimiento) {
                mapaMangueras[pId] = abastecimiento;
            }
        });

        // NUEVO: Convertir a array y ORDENAR de menor a mayor por ID.
        // Esto garantiza que el ID más alto (más reciente) se ubique al final (a la derecha)
        const listaOrdenada = Object.values(mapaMangueras).sort((a, b) => a.idAbastecimiento - b.idAbastecimiento);
        
        setFilteredAbastecimientos(listaOrdenada);

        // 2. Lógica de AUTOBOLETEO condicionada por la Variable de Entorno

        // Modo 1: se boletea todo lo que no sea el último abastecimiento de cada pistola
        const pendientesDeBoleteo = data.filter(abastecimiento => {
            const ultimoAbastecimientoUI = mapaMangueras[abastecimiento.pistola];
            return (
                abastecimiento.estado === 0 && 
                abastecimiento.idAbastecimiento !== ultimoAbastecimientoUI?.idAbastecimiento &&
                !idsProcesando.current.has(abastecimiento.idAbastecimiento)
            );
        });

        procesarSecuencial(pendientesDeBoleteo);
    }, [data]);

    // Procesar uno por uno secuencialmente
    const procesarSecuencial = async (pendientesDeBoleteo: IAbastecimiento[]) => {
        for (const abastecimiento of pendientesDeBoleteo) {
            const idABoletear = abastecimiento.idAbastecimiento;

            // Doble check por si acaso mutó en el intermedio del bucle
            if (idsProcesando.current.has(idABoletear)) continue;

            // Bloquear INMEDIATAMENTE
            idsProcesando.current.add(idABoletear);

            try {
                await ejecutarAutoboleteo(abastecimiento);
            } catch (error) {
                console.error(`Fallo temporal en ID ${idABoletear}:`, error);
                // Si falló, lo removemos para que el siguiente ciclo de SWR lo vuelva a intentar
                idsProcesando.current.delete(idABoletear);
            }
            // Si fue exitoso el ID queda en "idsProcesando" para que el polling de SWR
            // no lo reintente mientras la base de datos se actualiza.
        }
    };

    const ejecutarAutoboleteo = async (abastecimientoViejo: IAbastecimiento) => {
        const usuarioId = +(session?.user.id || 0);
        const islaId = +(session?.user.islaId || 0);

        const validatePrev = await validatePrevBilling(abastecimientoViejo.idAbastecimiento);
        if (validatePrev.status) return;

        const comprobanteObj = buildComprobanteFromAbastecimiento({
            abastecimiento: abastecimientoViejo,
            usuarioId,
            islaId,
            numeroDocumento: "0",
            razonSocial: "PUBLICO EN GENERAL"
        });

        const { status, message } = await saveBilling(comprobanteObj.toPlainObject());

        if (status) {
            notify({ message: `Autoboleteo exitoso Manguera ${abastecimientoViejo.pistola}: ${message}`, type: 'success' });
            mutate(); 
        } else {
            throw new Error(`Error devuelto por el servidor: ${message}`);
        }
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-10 mb-10">
            {filteredAbastecimientos.map(abastecimiento => (
                <AbastecimientoGridItem
                    key={abastecimiento.idAbastecimiento}
                    abastecimiento={abastecimiento}
                />
            ))}
        </div>
    );
};