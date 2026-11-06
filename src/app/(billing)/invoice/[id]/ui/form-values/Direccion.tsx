import { IBillingForm } from '@/interfaces';
import React from 'react'
import { useOrderAbastecimientoStore } from '@/store';
import { esClientesVarios } from '@/utils/clientes-varios';
interface Props {
    formValues: IBillingForm;
    setFormValues: (values: IBillingForm) => void;
    // En la pantalla de corrección los campos no se bloquean al cargar un cliente (ese bloqueo es de la venta)
    sinBloqueo?: boolean;
}
export const Direccion = ({ formValues, setFormValues, sinBloqueo = false }: Props) => {
    const isBillingBlocked = useOrderAbastecimientoStore((state) => state.isBillingBlocked);
    // Con documento 0 (clientes varios) la dirección no se puede asignar
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
                disabled={(isBillingBlocked && !sinBloqueo) || bloqueadaPorClientesVarios}
            />
        </div>
    )
}
