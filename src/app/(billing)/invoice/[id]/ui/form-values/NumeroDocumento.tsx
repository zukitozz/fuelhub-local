"use client"
import React, { useEffect } from 'react'
import { getReceptorByDocumento } from '@/actions';
import { useOrderAbastecimientoStore } from "@/store";
import { IBillingForm } from '@/interfaces/billing.interface';
import { Constants, consultaRucMiFact, notify } from '@/utils';
import { IoPricetag } from 'react-icons/io5';
import { esClientesVarios, RAZON_SOCIAL_CLIENTES_VARIOS } from '@/utils/clientes-varios';

interface Props {
    formValues: IBillingForm;
    setFormValues: (values: IBillingForm) => void;
    // En la pantalla de corrección los campos no se bloquean al cargar un cliente (ese bloqueo es de la venta)
    sinBloqueo?: boolean;
}

export const NumeroDocumento = ({ formValues, setFormValues, sinBloqueo = false }: Props) => {
    
    const applyDiscountIfExists = useOrderAbastecimientoStore((state) => state.applyDiscountIfExists);
    const lockBilling = useOrderAbastecimientoStore((state) => state.lockBilling);
    const isBillingBlocked = useOrderAbastecimientoStore((state) => state.isBillingBlocked);

    // Badge e input verde derivados del store: única fuente de verdad, se apaga solo al revertir descuentos
    const hasDiscount = useOrderAbastecimientoStore((state) => state.items.some(item => item.descuento_aplicado));

    const handleChangeNumeroDocumento = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormValues({ ...formValues, numeroDocumento: event.target.value });
    };
    const handleKeyNumeroDocumento = async (event: { key: string; preventDefault: () => void; }) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            if(formValues.tipoDocumento){
                const receptor = await getReceptorByDocumento(formValues.numeroDocumento);
                if(receptor){
                    notify({message: "Cargando datos del cliente", type:'success'})
                    setFormValues({ ...formValues, razonSocial: receptor.razon_social, direccion: receptor.direccion, placa: receptor.placa });
                }else{
                    const {hasErrorMiFact, razon_social, direccion} = await consultaRucMiFact(formValues.numeroDocumento);
                    if(!hasErrorMiFact && razon_social && direccion){
                        notify({message: "Cargando datos de SUNAT", type:'success'})
                        setFormValues({ ...formValues, razonSocial: razon_social, direccion: direccion });
                    }else{
                        notify({message: "Ruc no encontrado se realiza el registro", type:'success'})
                        setFormValues({ ...formValues, razonSocial: '', direccion: '', placa: '' });
                    } 
                }
                // El serafín (calibración) no jala descuentos ni bloquea el campo: se permite cambiar de cliente
                const esSerafin = formValues.tipoComprobante === Constants.TIPO_COMPROBANTE.CALIBRACION;
                if (!esSerafin) {
                    const { status } = await applyDiscountIfExists(formValues.numeroDocumento);
                    if(status){
                        notify({message: "Descuento aplicado", type:'success'});
                    }
                    lockBilling();
                }

            }else{
                notify({message: "Número de documento no válido", type:'error'})
                setFormValues({ ...formValues, razonSocial: '', direccion: '', placa: '' });
            }

        }
    };
    useEffect(() => {
        const { numeroDocumento, tipoComprobante: tipoActual } = formValues;
        // La selección manual de Nota de despacho / Serafín (calibración) no se pisa al tipear el documento.
        // Con el campo vacío tampoco se pisa: los botones Boleta/Factura limpian el documento y su selección debe mantenerse.
        const esSeleccionManual = tipoActual === Constants.TIPO_COMPROBANTE.NOTA_DESPACHO || tipoActual === Constants.TIPO_COMPROBANTE.CALIBRACION;
        const tipoComprobante = (esSeleccionManual || numeroDocumento.length === 0) ? tipoActual : (numeroDocumento.length === 11 ? Constants.TIPO_COMPROBANTE.FACTURA : (  (numeroDocumento.length === 8 || numeroDocumento === "0") ? Constants.TIPO_COMPROBANTE.BOLETA : ''));
        const tipoDocumento = numeroDocumento.length === 11 ? Constants.TIPO_DOCUMENTO.RUC : (  (numeroDocumento.length === 8 || numeroDocumento === "0") ? Constants.TIPO_DOCUMENTO.DNI : '');
        // Clientes varios (documento 0): nombre fijo, sin placa ni dirección. Al salir de ese documento
        // se limpia el nombre fijo para que no quede arrastrado a otro cliente.
        if (esClientesVarios(numeroDocumento)) {
            setFormValues({ ...formValues, tipoComprobante, tipoDocumento, razonSocial: RAZON_SOCIAL_CLIENTES_VARIOS, direccion: '', placa: '' });
        } else if (formValues.razonSocial === RAZON_SOCIAL_CLIENTES_VARIOS) {
            setFormValues({ ...formValues, tipoComprobante, tipoDocumento, razonSocial: '' });
        } else {
            setFormValues({ ...formValues, tipoComprobante, tipoDocumento });
        }
    }, [formValues.numeroDocumento])
    
    const labelDocumento = formValues.tipoDocumento === Constants.TIPO_DOCUMENTO.RUC ? 'RUC' : formValues.tipoDocumento === Constants.TIPO_DOCUMENTO.DNI ? 'DNI' : 'Número documento';
    // Aviso dentro del recuadro (placeholder) según el tipo de comprobante elegido
    const hintDocumento = (formValues.tipoComprobante === Constants.TIPO_COMPROBANTE.BOLETA || formValues.tipoComprobante === Constants.TIPO_COMPROBANTE.CALIBRACION)
        ? 'Ingrese 8 dígitos'
        : (formValues.tipoComprobante === Constants.TIPO_COMPROBANTE.FACTURA || formValues.tipoComprobante === Constants.TIPO_COMPROBANTE.NOTA_DESPACHO)
            ? 'Ingrese 11 dígitos'
            : '';

    return (
        <div className='col-span-1'>
            <label htmlFor="numeroDocumento">{labelDocumento}</label>
            <input
                className={`px-5 py-2 border rounded w-full transition-all outline-none ${
                    hasDiscount 
                    ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-200 shadow-inner' 
                    : 'border-gray-300 bg-gray-200 focus:bg-white'
                }`}
                type="text"
                name="numeroDocumento"
                maxLength={ 11 }
                placeholder={ hintDocumento }
                value={ formValues.numeroDocumento }
                onChange={ handleChangeNumeroDocumento }
                onKeyDown={ handleKeyNumeroDocumento }
                autoComplete="off"
                disabled={isBillingBlocked && !sinBloqueo}
            />
            {esClientesVarios(formValues.numeroDocumento) && (
                <p className="text-[11px] text-gray-500 mt-1">Clientes varios: no lleva placa, nombre ni dirección.</p>
            )}
            {hasDiscount && (
                <div className="flex items-center animate-bounce">
                    <span className="flex h-2 w-2 mr-1">
                        <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-teal-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                    </span>
                    <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 flex items-center shadow-sm">
                        <IoPricetag className="mr-1" /> DESCUENTO APLICADO
                    </span>
                </div>
            )}            
        </div>
    )
}
