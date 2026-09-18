"use client";
import { Title } from "@/components";
import { saveSerie } from '@/actions';
import { useState } from 'react';
import { ISerieTable } from '@/interfaces';
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IoArrowBack } from "react-icons/io5";
import { notify } from "@/utils/notify";
import { CODIGO_PROPOSITO_ALIAS, TIPO_COMPROBANTE_LABEL, toLocaleOnlyDate } from '@/utils';

interface Props {
  serie: ISerieTable;
}

export const SerieForm = ({ serie }: Props) => {
    const router = useRouter();
    const [formValues, setFormValues] = useState<ISerieTable>(serie);
    const esNueva = serie.id === 0;

    const handleChangeCodigoProposito = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setFormValues({ ...formValues, codigo_proposito: event.target.value });
    };
    const handleChangeTipoComprobante = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setFormValues({ ...formValues, tipo_comprobante: event.target.value });
    };
    const handleChangeSerie = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormValues({ ...formValues, serie: event.target.value });
    };
    const handleChangeEstado = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setFormValues({ ...formValues, estado: +event.target.value });
    };
    const handleChangeDescripcion = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormValues({ ...formValues, descripcion: event.target.value });
    };
    const handleChangeFechaRetroactiva = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormValues({ ...formValues, fecha_retroactiva: event.target.checked });
    };

    const handlerProcessSerie = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!formValues.codigo_proposito || !formValues.tipo_comprobante) {
            notify({ message: 'Seleccione el propósito y el tipo de comprobante', type: 'error' });
            return;
        }
        if (!formValues.serie || formValues.serie.trim().length === 0) {
            notify({ message: 'Ingrese la serie', type: 'error' });
            return;
        }
        try {
            const { success, message } = await saveSerie(formValues);
            notify({ message, type: success ? 'success' : 'error' });
            if (success) router.push('/admin/series');
        } catch {
            notify({ message: 'Error al guardar la serie, intente nuevamente', type: 'error' });
        }
    }

    return (
      <div className="flex justify-center items-center mb-72 px-10 sm:px-0">
        <div className="flex flex-col w-[1000px]">
            <Title title={ esNueva ? 'Creación de serie' : 'Modificación de serie' } />
            <Link
              href="/admin/series/"
              className="flex items-center mt-5 p-2 hover:bg-gray-100 rounded transition-all"
            >
              <IoArrowBack size={30} />
              <span className="ml-3 text-xl">Regresar</span>
            </Link>
            <br/>
            <form onSubmit={handlerProcessSerie} autoComplete="off" className="flex flex-col">
                <div className="grid grid-cols-2 gap-3">
                    <div className='col-span-1'>
                        <label htmlFor="codigo_proposito">Propósito</label>
                        <select
                            name="codigo_proposito"
                            className="px-5 py-2 border bg-gray-200 rounded w-full"
                            onChange={ handleChangeCodigoProposito }
                            value={ formValues.codigo_proposito }
                            disabled={ !esNueva }
                        >
                            {
                                Object.entries(CODIGO_PROPOSITO_ALIAS).map(([codigo, alias]) => (
                                    <option key={codigo} value={codigo}>{alias}</option>
                                ))
                            }
                        </select>
                    </div>
                    <div className='col-span-1'>
                        <label htmlFor="tipo_comprobante">Tipo de comprobante</label>
                        <select
                            name="tipo_comprobante"
                            className="px-5 py-2 border bg-gray-200 rounded w-full"
                            onChange={ handleChangeTipoComprobante }
                            value={ formValues.tipo_comprobante }
                            disabled={ !esNueva }
                        >
                            <option value={''}>Seleccione</option>
                            {
                                Object.entries(TIPO_COMPROBANTE_LABEL).map(([tipo, label]) => (
                                    <option key={tipo} value={tipo}>{label}</option>
                                ))
                            }
                        </select>
                    </div>
                    <div className='col-span-1'>
                        <label htmlFor="serie">Serie</label>
                        <input
                            className="px-5 py-2 border bg-gray-200 rounded w-full"
                            type="text"
                            name="serie"
                            maxLength={3}
                            value={ formValues.serie }
                            disabled={ !esNueva }
                            onChange={ handleChangeSerie }
                        />
                    </div>
                    <div className='col-span-1'>
                        <label htmlFor="estado">Estado</label>
                        <select
                            name="estado"
                            className="px-5 py-2 border bg-gray-200 rounded w-full"
                            onChange={ handleChangeEstado }
                            value={ formValues.estado }
                        >
                            <option value={1}>Activo</option>
                            <option value={0}>Inactivo</option>
                        </select>
                        { formValues.estado === 1 && (
                            <p className="text-xs text-gray-500 mt-1">
                                Al guardar como Activo se desactivará automáticamente cualquier otra serie activa para este mismo propósito y tipo de comprobante.
                            </p>
                        )}
                    </div>
                    <div className='col-span-1 flex items-end pb-2'>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                name="fecha_retroactiva"
                                checked={ formValues.fecha_retroactiva }
                                onChange={ handleChangeFechaRetroactiva }
                                className="h-4 w-4"
                            />
                            <span>Permite fecha retroactiva</span>
                        </label>
                    </div>
                    <p className="col-span-2 text-xs text-gray-500 -mt-2">
                        Si está activo, los formularios de emisión de comprobantes que usen esta serie podrán elegir una fecha de emisión distinta a hoy (nunca posterior).
                    </p>
                    <div className="col-span-2">
                        <label htmlFor="descripcion">Descripción</label>
                        <input
                            className="px-5 py-2 border bg-gray-200 rounded w-full"
                            type="text"
                            name="descripcion"
                            value={ formValues.descripcion }
                            onChange={ handleChangeDescripcion }
                        />
                    </div>
                    { !esNueva && (
                        <>
                            <div className='col-span-1'>
                                <label htmlFor="numeracion_actual">Numeración actual</label>
                                <input
                                    className="px-5 py-2 border bg-gray-200 rounded w-full"
                                    type="text"
                                    name="numeracion_actual"
                                    value={ formValues.numeracion_actual || 'Sin comprobantes emitidos' }
                                    disabled
                                />
                            </div>
                            <div className='col-span-1'>
                                <label htmlFor="fecha_ultimo_comprobante">Fecha del último comprobante</label>
                                <input
                                    className="px-5 py-2 border bg-gray-200 rounded w-full"
                                    type="text"
                                    name="fecha_ultimo_comprobante"
                                    value={ formValues.fecha_ultimo_comprobante ? toLocaleOnlyDate(formValues.fecha_ultimo_comprobante) : '-' }
                                    disabled
                                />
                            </div>
                        </>
                    )}
                    <div className="col-span-2">
                        <button className={`btn-primary px-5 py-2 mt-3 w-full`} disabled={false} type="submit">
                            { esNueva ? 'Crear serie' : 'Editar serie' }
                        </button>
                    </div>
                </div>
            </form>
        </div>
      </div>
    );
}
