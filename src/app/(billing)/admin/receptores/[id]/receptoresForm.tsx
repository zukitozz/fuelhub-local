"use client";
import { Title } from "@/components";
import { deleteReceptor, saveReceptor } from '@/actions';
import { notify, notifyConfirm } from '@/utils';
import { useState } from 'react';
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
    const handleChangeCorreo = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormValues({ ...formValues, correo: event.target.value });
    };      
    const [isProcessing, setIsProcessing] = useState(false);
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