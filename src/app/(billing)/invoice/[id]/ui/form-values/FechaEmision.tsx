import { IBillingForm } from '@/interfaces';
import React from 'react'
import { toLocaleStorage } from '@/utils';

interface Props {
    formValues: IBillingForm;
    setFormValues: (values: IBillingForm) => void;
    permiteRetroactiva: boolean;
}

// Solo se renderiza cuando la serie activa (proposito + tipo de comprobante) permite
// fecha retroactiva; de lo contrario el comprobante siempre se emite con la fecha de hoy.
export const FechaEmision = ({ formValues, setFormValues, permiteRetroactiva }: Props) => {
    if (!permiteRetroactiva) return null;

    // "Hoy" se calcula al vuelo (no desde un valor congelado) para que el tope de fecha
    // maxima sea siempre el dia real, incluso si la pestaña lleva horas abierta.
    const hoy = toLocaleStorage(new Date()).slice(0, 10);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormValues({ ...formValues, fechaEmision: event.target.value });
    };

    return (
        <div className="col-span-1">
            <label htmlFor="fechaEmision">Fecha de emisión</label>
            <input
                className="px-5 py-2 border bg-gray-200 rounded w-full"
                type="date"
                name="fechaEmision"
                max={hoy}
                value={ formValues.fechaEmision || hoy }
                onChange={ handleChange }
            />
        </div>
    )
}
