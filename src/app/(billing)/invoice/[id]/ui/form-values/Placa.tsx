import { getPlacas } from '@/actions';
import { IBillingForm } from '@/interfaces/billing.interface';
import React, { useState } from 'react'
import { IReceptorPlaca } from '@/interfaces';
import { SuggestionPlacaInput } from './SuggestionPlacaInput';
import { Constants } from '@/utils/constants';
import { useOrderAbastecimientoStore } from '@/store';
import { notify } from '@/utils/notify';
interface Props {
    formValues: IBillingForm;
    setFormValues: (values: IBillingForm) => void;
    // En la pantalla de corrección los campos no se bloquean al cargar un cliente (ese bloqueo es de la venta)
    sinBloqueo?: boolean;
}

export const Placa = ({ formValues, setFormValues, sinBloqueo = false }: Props) => {

    const applyDiscountIfExists = useOrderAbastecimientoStore((state) => state.applyDiscountIfExists);
    const lockBilling = useOrderAbastecimientoStore((state) => state.lockBilling);
    const isBillingBlocked = useOrderAbastecimientoStore((state) => state.isBillingBlocked);
    const [disabled, setDisabled] = useState<boolean>(false);
    const [suggestions, setSuggestions] = useState<IReceptorPlaca[]>([]);

    const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setFormValues({ ...formValues, placa: value.toLocaleUpperCase() });
        if(isBillingBlocked && !sinBloqueo) return;
        if(value.length > 2){
            const allSuggestions = await getPlacas(value);
            const filtredSuggestions = allSuggestions.filter(suggestion => suggestion.placa.toLowerCase().includes(value.toLowerCase()));
            setSuggestions(filtredSuggestions);
        }else{
            setSuggestions([]);
        }

    };
    
    const handleSelectSuggestion = async (suggestion: IReceptorPlaca) => {
        // La selección manual de Nota de despacho / Serafín no se pisa al elegir una sugerencia
        const esSeleccionManual = formValues.tipoComprobante === Constants.TIPO_COMPROBANTE.NOTA_DESPACHO || formValues.tipoComprobante === Constants.TIPO_COMPROBANTE.CALIBRACION;
        const tipoComprobante = esSeleccionManual ? formValues.tipoComprobante : (suggestion.numero_documento.length === 11 ? Constants.TIPO_COMPROBANTE.FACTURA : Constants.TIPO_COMPROBANTE.BOLETA);
        const tipoDocumento = suggestion.numero_documento.length === 11 ? Constants.TIPO_DOCUMENTO.RUC : Constants.TIPO_DOCUMENTO.DNI;
        setFormValues({ ...formValues, placa: suggestion.placa, razonSocial: suggestion.razon_social, numeroDocumento: suggestion.numero_documento, direccion: suggestion.direccion, tipoComprobante, tipoDocumento });
        setSuggestions([]);
        // El serafín (calibración) no jala descuentos ni bloquea el campo: se permite cambiar de cliente
        if (formValues.tipoComprobante !== Constants.TIPO_COMPROBANTE.CALIBRACION) {
            const { status } = await applyDiscountIfExists(suggestion.numero_documento);
            if(status){
                notify({message: "Descuento aplicado", type:'success'});
            }
            lockBilling();
            setDisabled(true);
        }
    };

    const handleKeyDown = async (event: { key: string; preventDefault: () => void; }) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            if(formValues.placa.length === 0 ){
                setFormValues({ ...formValues, numeroDocumento: '', razonSocial: '', direccion: '', placa: ''});
            }
        }
    };    

    return (
        <div className="col-span-1">
            <label htmlFor="placa">Placa</label>
            <input
                className="px-5 py-2 border border-gray-300 bg-gray-200 focus:bg-white rounded w-full transition-all outline-none"
                type="text"
                name="placa"
                value={ formValues.placa }
                onChange={ handleChange }
                onKeyDown={ handleKeyDown }
                disabled={disabled && !sinBloqueo}
            />
            <SuggestionPlacaInput suggestions={suggestions} onSelect={handleSelectSuggestion}/>
        </div>
    )
}
