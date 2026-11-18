"use client";
import { Title } from "@/components";
import { deleteReceptor, saveReceptor, obtieneSaldoCreditoPorDocumento, obtieneAbonosCredito, registrarAbonoCredito } from '@/actions';
import type { IAbonoCredito } from '@/actions/receptores/credito';
import type { ISaldoCredito } from '@/utils/credito';
import { notify, notifyConfirm } from '@/utils';
import { useEffect, useState } from 'react';
import { IReceptor } from '@/interfaces';
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IoArrowBack } from "react-icons/io5";

interface Props {
  receptor: IReceptor
}

export const ReceptoresForm = ({ receptor }: Props) => {
    const router = useRouter();
    const [formValues, setFormValues] = useState<IReceptor>(receptor);
    const newProduct = receptor.id==0;
    const handleChangeTipoDocumento = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormValues({ ...formValues, tipo_documento: event.target.value });
    };
    const handleChangeNumeroDocumento = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormValues({ ...formValues, numero_documento: event.target.value });
    };    
    const handleChangeRazonSocial = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormValues({ ...formValues, razon_social: event.target.value });
    };
    const handleChangeDireccion = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormValues({ ...formValues, direccion: event.target.value });
    };
    const handleChangeCredito = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormValues({ ...formValues, credito_limite: event.target.value === '' ? null : Number(event.target.value) });
    };
    const handleChangeCorreo = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormValues({ ...formValues, correo: event.target.value });
    };      
    const [isProcessing, setIsProcessing] = useState(false);
    // Credito: saldo y abonos (pagos del cliente que liberan credito)
    const [saldo, setSaldo] = useState<ISaldoCredito | null>(null);
    const [abonos, setAbonos] = useState<IAbonoCredito[]>([]);
    const [montoAbono, setMontoAbono] = useState('');
    const [notaAbono, setNotaAbono] = useState('');
    const cargarCredito = async () => {
        if (receptor.id === 0) return;
        setSaldo(await obtieneSaldoCreditoPorDocumento(receptor.numero_documento));
        setAbonos(await obtieneAbonosCredito(receptor.id));
    };
    useEffect(() => { cargarCredito(); }, [receptor.id]);
    const handlerAbono = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            const { status, message } = await registrarAbonoCredito(receptor.id, Number(montoAbono), notaAbono);
            notify({ message, type: status ? 'success' : 'error' });
            if (status) { setMontoAbono(''); setNotaAbono(''); await cargarCredito(); }
        } finally {
            setIsProcessing(false);
        }
    };
    const handlerProcessBilling = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            const { status, message } = await saveReceptor(formValues);
            notify({ message, type: status ? 'success' : 'error' });
            // Al editar se queda en el formulario para ver lo guardado; al crear vuelve a la lista
            if (status && newProduct) router.push('/admin/receptores');
            if (status && !newProduct) router.refresh();
        } finally {
            setIsProcessing(false);
        }
    }
    const handlerDelete = async () => {
        if (isProcessing) return;
        const confirmar = await notifyConfirm({
            message: `¿Eliminar el cliente ${receptor.razon_social}?`,
            confirmText: 'Eliminar',
            cancelText: 'Cancelar',
        });
        if (!confirmar) return;
        setIsProcessing(true);
        try {
            const { status, message } = await deleteReceptor(receptor.id);
            notify({ message, type: status ? 'success' : 'error' });
            if (status) router.push('/admin/receptores');
        } finally {
            setIsProcessing(false);
        }
    }

    return (
      <div className="flex justify-center items-center mb-72 px-10 sm:px-0">
        <div className="flex flex-col w-[1000px]">
            <Title title={ newProduct? 'Creación de clientes':'Modificación de clientes' } />
            <Link
              href="/admin/receptores/"
              className="flex items-center mt-5 p-2 hover:bg-gray-100 rounded transition-all"
            >
              <IoArrowBack size={30} />
              <span className="ml-3 text-xl">Regresar</span>
            </Link>
            <br/>
            <form onSubmit={handlerProcessBilling} autoComplete="off" className="flex flex-col">
                <div className="grid grid-cols-2 gap-3">
                    <div className='col-span-1'>
                        <label htmlFor="tipo_documento">TipoDocumento</label>
                        <input
                            className="px-5 py-2 border bg-gray-200 rounded w-full"
                            type="text"
                            name="tipo_documento"
                            defaultValue={ receptor?.tipo_documento }
                            onChange={ handleChangeTipoDocumento }
                            disabled = { !newProduct } 
                        />
                    </div>
                    <div className='col-span-1'>
                        <label htmlFor="numero_documento">NumeroDocumento</label>
                        <input
                            className="px-5 py-2 border bg-gray-200 rounded w-full"
                            type="text"
                            name="numero_documento"
                            defaultValue={ receptor?.numero_documento }
                            onChange={ handleChangeNumeroDocumento }
                            disabled = { !newProduct } 
                        />
                    </div>                     
                    <div className='col-span-1'>
                        <label htmlFor="razon_social">RazonSocial</label>
                        <input
                            className="px-5 py-2 border bg-gray-200 rounded w-full"
                            type="text"
                            name="razon_social" 
                            defaultValue={ receptor?.razon_social }
                            onChange={ handleChangeRazonSocial }
                        />
                    </div>
                    <div className='col-span-1'>
                        <label htmlFor="correo">Correo</label>
                        <input
                            className="px-5 py-2 border bg-gray-200 rounded w-full"
                            type="text"
                            name="correo"
                            defaultValue={ receptor?.correo }
                            onChange={ handleChangeCorreo }
                        />
                    </div>
                    <div className='col-span-1'>
                        <label htmlFor="credito_limite">Crédito para notas de despacho (S/)</label>
                        <input
                            className="px-5 py-2 border bg-gray-200 rounded w-full"
                            type="number"
                            min="0"
                            step="0.01"
                            name="credito_limite"
                            placeholder="Vacío o 0 = sin crédito"
                            defaultValue={ receptor?.credito_limite ?? '' }
                            onChange={ handleChangeCredito }
                        />
                    </div>                     
                    <div className='col-span-2'>
                        <label htmlFor="direccion">Direccion</label>
                        <input
                            className="px-5 py-2 border bg-gray-200 rounded w-full"
                            type="text"
                            name="direccion"
                            defaultValue={ receptor?.direccion }
                            onChange={ handleChangeDireccion }
                        />
                    </div>                   
                    {!newProduct && saldo?.habilitado && (
                        <div className="col-span-2 border rounded p-3 bg-blue-50">
                            <p className="font-semibold">
                                Saldo de crédito: S/ {saldo.saldo.toFixed(2)} (crédito S/ {saldo.limite.toFixed(2)}, ventas al crédito S/ {saldo.consumido.toFixed(2)}, abonos S/ {saldo.abonado.toFixed(2)})
                            </p>
                            <div className="grid grid-cols-5 gap-2 mt-2">
                                <input className="col-span-1 px-3 py-2 border bg-white rounded" type="number" min="0" step="0.01" placeholder="Abono S/" value={montoAbono} onChange={(e) => setMontoAbono(e.target.value)} />
                                <input className="col-span-3 px-3 py-2 border bg-white rounded" type="text" maxLength={200} placeholder="Observación (opcional)" value={notaAbono} onChange={(e) => setNotaAbono(e.target.value)} />
                                <button type="button" className="col-span-1 btn-primary px-3 py-2 disabled:opacity-50" disabled={isProcessing || !montoAbono} onClick={handlerAbono}>Registrar abono</button>
                            </div>
                            {abonos.length > 0 && (
                                <ul className="mt-2 text-sm text-gray-700">
                                    {abonos.map(a => <li key={a.id}>{a.fecha} — S/ {Number(a.monto).toFixed(2)}{a.observacion ? ` — ${a.observacion}` : ''}</li>)}
                                </ul>
                            )}
                        </div>
                    )}
                    <div className="col-span-2 flex gap-3 mt-3">
                        <button className={`btn-primary px-5 py-2 flex-1 disabled:opacity-50`} disabled={isProcessing} type="submit">
                            { newProduct?'Crear cliente':'Editar cliente'}
                        </button>
                        {!newProduct && (
                            <button
                                className="bg-red-600 hover:bg-red-700 text-white rounded px-5 py-2 flex-1 disabled:opacity-50"
                                disabled={isProcessing}
                                type="button"
                                onClick={handlerDelete}
                            >
                                Eliminar cliente
                            </button>
                        )}
                    </div>
                </div>
            </form>
        </div>
      </div>
    );
}