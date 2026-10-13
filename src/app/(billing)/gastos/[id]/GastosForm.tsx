
"use client";
import { Title } from "@/components";
import Link from "next/link";
import { useState } from 'react';
import { useRouter } from "next/navigation";
import { IoArrowBack } from "react-icons/io5";
import { IGastos } from "@/interfaces"
import { saveGasto } from "@/actions";
import { useSession } from "next-auth/react";
import { notify, toLocaleStorage } from "@/utils";

interface Props {
  gasto: IGastos
}

export const GastosForm = ({ gasto }: Props) => {
    const { data: session } = useSession();
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [formValues, setFormValues] = useState<IGastos>(gasto);
    const [montoValue, setMontoValue] = useState<number | string>(gasto.monto );

    const isNew = gasto.id==0;

    let buttonLabel = 'Guardar cambios';
    if (loading) {
      buttonLabel = 'Procesando...';
    } else if (isNew) {
      buttonLabel = 'Registrar gasto';
    }    

    const handleMontoChange   = (event: React.ChangeEvent<HTMLInputElement>) => {
        const val = event.target.value;
        if (val === '') {
            setMontoValue('');
            return;
        }
        const value = Number(event.target.value);
        if ( Number.isNaN(value) || value < 0.1 ) return;
        setMontoValue(value);
        setFormValues({
            ...formValues,
            monto: Number(value)
        });        
    };

    const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
        event.target.select();
    };

    const onInputChange = ({ target }: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = target;
        setFormValues({
        ...formValues,
        [name]: value
        });
    };    

    const handlerProcessGasto = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (formValues.concepto.trim().length < 3) {
            return notify({ message: "El concepto es muy corto", type: "error" });
        }

        if (formValues.monto <= 0) {
            return notify({ message: "El monto debe ser mayor a 0", type: "error" });
        }  

        setLoading(true);
        
        const UsuarioId: number = session?.user?.id ? +session.user.id : 0;

        const gasto: IGastos = {
            ...formValues,
            fecha: toLocaleStorage(new Date()),
            usuario_gasto: session?.user?.usuario || "",
            turno: session?.user?.jornada || "",
            autorizado: formValues.autorizado,
            UsuarioId
        }
        
        const { status, message } = await saveGasto(gasto);

        if(status){
            notify({ message: isNew ? "Gasto registrado" : "Gasto actualizado" });
            router.replace('/gastos');
        } else {
            notify({ message: message || "Error al guardar", type: "error" });
        }
        setLoading(false);
    }

    return(
      <div className="flex justify-center items-center mb-72 px-10 sm:px-0">
        <div className="flex flex-col w-[1000px]">
            <Title title={ isNew? 'Registro de gasto':'Modificación de gasto' } />
            <Link
              href="/gastos/"
              className="flex items-center mt-5 p-2 hover:bg-gray-100 rounded transition-all"
            >
              <IoArrowBack size={30} />
              <span className="ml-3 text-xl">Regresar</span>
            </Link>
            <br/>
            <form onSubmit={handlerProcessGasto} autoComplete="off" className="flex flex-col">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className='flex flex-col'>
                        <label className="mb-1 font-semibold"htmlFor="concepto">Concepto</label>
                        <input
                            className="px-5 py-2 border bg-white rounded shadow-sm focus:outline-blue-500"
                            type="text"
                            name="concepto"
                            placeholder="Ej. Gasto de mediodía"
                            value={formValues.concepto}
                            onChange={ onInputChange }
                        />
                    </div> 
                    <div className='flex flex-col'>
                        <label htmlFor="monto" className="mb-1 font-semibold">Monto</label>
                        <input
                            className="px-5 py-2 border bg-white rounded shadow-sm focus:outline-blue-500"
                            type="number"
                            step="0.01"
                            name="monto" 
                            value={montoValue}
                            onFocus={handleFocus}
                            onChange={handleMontoChange}
                        />
                    </div>
                     <div className='flex flex-col'>
                        <label htmlFor="autorizado" className="mb-1 font-semibold">Autorizado</label>
                        <input
                            className="px-5 py-2 border bg-white rounded shadow-sm focus:outline-blue-500"
                            type="text"
                            name="autorizado"  
                            placeholder="Ej. Administrador Pedro"
                            value={formValues.autorizado}
                            onChange={ onInputChange }
                        />
                    </div>
                    <div className="col-span-2">
                        <button 
                            type="submit"
                            disabled={loading}
                            className={`${loading ? 'bg-gray-400' : 'btn-primary'} px-5 py-3 mt-4 w-full text-white font-bold rounded transition-colors`}
                        >
                            {buttonLabel}
                        </button>                  
                    </div>                    
                </div>
            </form>
        </div>
      </div>        
    )
}