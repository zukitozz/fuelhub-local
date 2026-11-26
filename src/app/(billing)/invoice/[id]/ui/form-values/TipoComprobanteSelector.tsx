'use client'
import { IBillingForm } from '@/interfaces/billing.interface';
import { useOrderAbastecimientoStore } from '@/store';
import { Constants } from '@/utils';

interface Props {
    formValues: IBillingForm;
    setFormValues: (values: IBillingForm) => void;
    disabled?: boolean;
    // Si se indica, solo se ofrecen estos tipos (el administrador solo puede emitir notas de despacho)
    soloTipos?: string[];
}

const opciones = [
    { label: 'Boleta', tipo: Constants.TIPO_COMPROBANTE.BOLETA },
    { label: 'Factura', tipo: Constants.TIPO_COMPROBANTE.FACTURA },
    { label: 'Nota despacho', tipo: Constants.TIPO_COMPROBANTE.NOTA_DESPACHO },
    { label: 'Serafín', tipo: Constants.TIPO_COMPROBANTE.CALIBRACION },
];

export const TipoComprobanteSelector = ({ formValues, setFormValues, disabled = false, soloTipos }: Props) => {
    const removeDiscounts = useOrderAbastecimientoStore((state) => state.removeDiscounts);
    const unlockBilling = useOrderAbastecimientoStore((state) => state.unlockBilling);

    const handlerSelect = (tipo: string) => {
        if (tipo === formValues.tipoComprobante) return;

        // Cambiar de tipo de comprobante reinicia el cliente: se borra el documento,
        // se revierten los descuentos aplicados y se desbloquean los campos para el nuevo cliente
        removeDiscounts();
        unlockBilling();
        setFormValues({
            ...formValues,
            tipoComprobante: tipo,
            tipoDocumento: '',
            numeroDocumento: '',
            razonSocial: '',
            direccion: '',
            placa: ''
        });
    };

    return (
        <div className="flex flex-wrap gap-2">
            {opciones.filter(({ tipo }) => !soloTipos || soloTipos.includes(tipo)).map(({ label, tipo }) => {
                const activo = formValues.tipoComprobante === tipo;
                return (
                    <button
                        key={tipo}
                        type="button"
                        disabled={disabled}
                        onClick={() => handlerSelect(tipo)}
                        className={`px-4 py-2 rounded-md border-2 text-sm font-bold transition-colors ${
                            activo
                                ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                                : 'border-blue-600 bg-white text-blue-700 hover:bg-blue-50'
                        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {label}
                    </button>
                );
            })}
        </div>
    );
};
