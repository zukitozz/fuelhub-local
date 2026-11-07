import { IBillingForm } from '@/interfaces';
import React from 'react'
import { esClientesVarios } from '@/utils/clientes-varios';
interface Props {
    formValues: IBillingForm;
    setFormValues: (values: IBillingForm) => void;
}
export const Direccion = ({ formValues, setFormValues }: Props) => {
    // La dirección se puede corregir aunque el cliente ya esté cargado (por RUC o sugerencia): al emitir actualiza
    // la del cliente. Solo con documento 0 (clientes varios) no se puede asignar.
    const bloqueadaPorClientesVarios = esClientesVarios(formValues.numeroDocumento);
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (bloqueadaPorClientesVarios) return;
        setFormValues({ ...formValues, direccion: event.target.value });
    };    
    const handleKeyDown = async (event: { key: string; preventDefault: () => void; }) => {
        if (event.key === 'Enter') {
            event.preventDefault();
        }
    };    
    return (
        <div className="col-span-2">
            <label htmlFor="direccion">Dirección</label>
            <input
                className="px-5 py-2 border bg-gray-200 rounded w-full"
                type="text"
                name="direccion" 
                value={ formValues.direccion }
                onChange={ handleChange }
                onKeyDown={ handleKeyDown }
                disabled={bloqueadaPorClientesVarios}
            />
        </div>
    )
}
