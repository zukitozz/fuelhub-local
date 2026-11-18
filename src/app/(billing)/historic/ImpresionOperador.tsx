'use client';
import { useEffect, useRef, useState } from 'react';
import { Session } from 'next-auth';
import { IoChevronDown, IoDocumentTextOutline, IoPrintOutline, IoReceiptOutline } from 'react-icons/io5';
import { reprintBilling } from '@/actions/billing/save-billing';
import { notify } from '@/utils';

interface Props {
    id: number;
    session: Session | null;
}

// Combo "Impresión" del operador/grifero: PDF (se abre en otra pestaña) o ticket (reimpresión en la impresora)
export const ImpresionOperador = ({ id, session }: Props) => {
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

    const imprimirTicket = async () => {
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
                <IoPrintOutline size={14} /> Impresión <IoChevronDown size={14} />
            </button>
            {abierto && (
                <div role="menu" className="absolute right-0 top-full mt-1 z-30 min-w-[150px] bg-white border rounded-md shadow-lg py-1">
                    {/* <a> y no <Link>: el PDF se genera al abrirlo y no debe precargarse */}
                    <a role="menuitem" href={`/api/comprobante/${id}`} target="_blank" rel="noopener noreferrer"
                        onClick={() => setAbierto(false)} className={itemClase}>
                        <IoDocumentTextOutline size={16} className={iconoClase} /> PDF
                    </a>
                    <button type="button" role="menuitem" onClick={imprimirTicket} className={itemClase}>
                        <IoReceiptOutline size={16} className={iconoClase} /> Ticket
                    </button>
                </div>
            )}
        </div>
    );
};

export default ImpresionOperador;
