'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Session } from 'next-auth';
import { IoChevronDown, IoPrintOutline } from 'react-icons/io5';
import { reprintBilling } from '@/actions/billing/save-billing';
import { notify } from '@/utils';

interface Props {
    id: number;
    session: Session | null;
    // Solo se ofrece lo que corresponde a ese comprobante (mismas reglas de siempre)
    puedeNotaCredito: boolean;
    puedeModificar: boolean;
}

// Un solo boton "Acciones" para el administrador: reimprimir, nota de credito y modificar
export const AccionesAdmin = ({ id, session, puedeNotaCredito, puedeModificar }: Props) => {
    const [abierto, setAbierto] = useState(false);
    const contenedor = useRef<HTMLDivElement>(null);

    // Se cierra al hacer clic fuera o con Escape
    useEffect(() => {
        if (!abierto) return;
        const fuera = (e: MouseEvent) => {
            if (contenedor.current && !contenedor.current.contains(e.target as Node)) setAbierto(false);
        };
        const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
        document.addEventListener('mousedown', fuera);
        document.addEventListener('keydown', escape);
        return () => {
            document.removeEventListener('mousedown', fuera);
            document.removeEventListener('keydown', escape);
        };
    }, [abierto]);

    const reimprimir = async () => {
        setAbierto(false);
        const { status, message } = await reprintBilling(session, id);
        notify({ message, type: status ? 'success' : 'error' });
    };

    const itemClase = 'flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-gray-800 hover:bg-gray-100 whitespace-nowrap';

    return (
        <div ref={contenedor} className="relative inline-block">
            <button
                type="button"
                onClick={() => setAbierto(a => !a)}
                aria-haspopup="menu"
                aria-expanded={abierto}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-1.5 px-2 rounded"
            >
                Acciones <IoChevronDown size={14} />
            </button>
            {abierto && (
                <div role="menu" className="absolute right-0 top-full mt-1 z-30 min-w-[190px] bg-white border rounded-md shadow-lg py-1">
                    <button type="button" role="menuitem" onClick={reimprimir} className={itemClase}>
                        <IoPrintOutline size={16} /> Reimprimir
                    </button>
                    {puedeNotaCredito && (
                        <Link role="menuitem" href={`/historic/${id}`} className={itemClase}>Nota de crédito</Link>
                    )}
                    {puedeModificar && (
                        <Link role="menuitem" href={`/historic/corregir/${id}`} className={itemClase}>Modificar</Link>
                    )}
                </div>
            )}
        </div>
    );
};

export default AccionesAdmin;
