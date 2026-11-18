'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Session } from 'next-auth';
import { IoChevronDown, IoCreateOutline, IoDocumentTextOutline, IoPrintOutline } from 'react-icons/io5';
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

    const itemClase = 'flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 whitespace-nowrap';
    const iconoClase = 'text-gray-500';

    return (
        <div ref={contenedor} className="relative inline-block">
            <button
                type="button"
                onClick={() => setAbierto(a => !a)}
                aria-haspopup="menu"
                aria-expanded={abierto}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
            >
                Acciones <IoChevronDown size={14} />
            </button>
            {abierto && (
                <div role="menu" className="absolute right-0 top-full mt-1 z-30 min-w-[190px] bg-white border rounded-md shadow-lg py-1">
                    <button type="button" role="menuitem" onClick={reimprimir} className={itemClase}>
                        <IoPrintOutline size={16} className={iconoClase} /> Reimprimir
                    </button>
                    {puedeNotaCredito && (
                        <Link role="menuitem" href={`/historic/${id}`} className={itemClase}><IoDocumentTextOutline size={16} className={iconoClase} /> Nota de crédito</Link>
                    )}
                    {puedeModificar && (
                        <Link role="menuitem" href={`/historic/corregir/${id}`} className={itemClase}><IoCreateOutline size={16} className={iconoClase} /> Modificar</Link>
                    )}
                </div>
            )}
        </div>
    );
};

export default AccionesAdmin;
