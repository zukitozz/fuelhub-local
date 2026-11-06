import { getReceptorByRazonSocial } from '@/actions';
import { IBillingForm } from '@/interfaces/billing.interface';
import React, { useState } from 'react'
import { SuggestionInput } from './SuggestionInput';
import { IReceptor } from '@/interfaces';
import { Constants } from '@/utils/constants';
import { useOrderAbastecimientoStore } from '@/store';
import { notify } from '@/utils/notify';
import { esClientesVarios } from '@/utils/clientes-varios';
interface Props {
    formValues: IBillingForm;
    setFormValues: (values: IBillingForm) => void;
    // En la pantalla de corrección los campos no se bloquean al cargar un cliente (ese bloqueo es de la venta)
    sinBloqueo?: boolean;
}

export const RazonSocial = ({ formValues, setFormValues, sinBloqueo = false }: Props) => {

    const applyDiscountIfExists = useOrderAbastecimientoStore((state) => state.applyDiscountIfExists);
    const lockBilling = useOrderAbastecimientoStore((state) => state.lockBilling);
    const isBillingBlocked = useOrderAbastecimientoStore((state) => state.isBillingBlocked);

    const [suggestions, setSuggestions] = useState<IReceptor[]>([]);

    // Con documento 0 (clientes varios) el nombre es fijo y no se puede cambiar
    const bloqueadaPorClientesVarios = esClientesVarios(formValues.numeroDocumento);

    const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (bloqueadaPorClientesVarios) return;
        const value = event.target.value;
        setFormValues({ ...formValues, razonSocial: value });
        if(value.length > 2){
            const allSuggestions = await getReceptorByRazonSocial(value);
            const filtredSuggestions = allSuggestions.filter(receptor => receptor.razon_social.toLowerCase().includes(value.toLowerCase()));
            setSuggestions(filtredSuggestions);
        }else{
            setSuggestions([]);
        }
    };
    
    const handleSelectSuggestion = async (suggestion: IReceptor) => {
        // La selección manual de Nota de despacho / Serafín no se pisa al elegir una sugerencia
        const esSeleccionManual = formValues.tipoComprobante === Constants.TIPO_COMPROBANTE.NOTA_DESPACHO || formValues.tipoComprobante === Constants.TIPO_COMPROBANTE.CALIBRACION;
        const tipoComprobante = esSeleccionManual ? formValues.tipoComprobante : (suggestion.numero_documento.length === 11 ? Constants.TIPO_COMPROBANTE.FACTURA : Constants.TIPO_COMPROBANTE.BOLETA);
        const tipoDocumento = suggestion.numero_documento.length === 11 ? Constants.TIPO_DOCUMENTO.RUC : Constants.TIPO_DOCUMENTO.DNI;
        setFormValues({ ...formValues, razonSocial: suggestion.razon_social, numeroDocumento: suggestion.numero_documento, direccion: suggestion.direccion, tipoComprobante, tipoDocumento, placa: suggestion.placa });
        setSuggestions([]);
        // El serafín (calibración) no jala descuentos ni bloquea el campo: se permite cambiar de cliente
        if (formValues.tipoComprobante !== Constants.TIPO_COMPROBANTE.CALIBRACION) {
            const { status } = await applyDiscountIfExists(suggestion.numero_documento);
            if(status){
                notify({message: "Descuento aplicado", type:'success'});
            }
            lockBilling();
        }
    };

    const handleKeyDown = async (event: { key: string; preventDefault: () => void; }) => {
        if (event.key === 'Enter') {
            event.preventDefault();
        }
    }; 
   
    return (
        <div className="col-span-2">
            <label htmlFor="razonSocial">{`${formValues.tipoDocumento === Constants.TIPO_DOCUMENTO.RUC ? 'Razon social' : 'Nombre'}`}</label>
            <input
                className="px-5 py-2 border border-gray-300 bg-gray-200 focus:bg-white rounded w-full transition-all outline-none"
                type="text"
                name="razonSocial"
                value={ formValues.razonSocial }
                onChange={ handleChange }
                onKeyDown={ handleKeyDown }
                disabled={(isBillingBlocked && !sinBloqueo) || bloqueadaPorClientesVarios}
            />
            <SuggestionInput suggestions={suggestions} onSelect={handleSelectSuggestion}/>
        </div>
    )
}
