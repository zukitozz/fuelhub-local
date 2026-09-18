'use client';
import useSWR from 'swr';
import { getSeries } from '@/actions';
import { ISerieTable } from '@/interfaces';
import Link from 'next/link';
import { getCodigoPropositoAlias, getTipoComprobanteLabel, toLocaleOnlyDate } from '@/utils';

const fetcher = () => getSeries();

export const SeriesTable = () => {
    const { data, error, isLoading } = useSWR('series', fetcher);

    const isInitialLoading = (!data && isLoading) || error;

    const renderTable = (series: ISerieTable[] | undefined) => {
        if (!series || series.length === 0) {
            return (
                <tr>
                    <td colSpan={9} className="text-center py-6 text-gray-500 text-sm">
                        No se encontraron registros.
                    </td>
                </tr>
            );
        }

        return (
            <>
            {series.map((item: ISerieTable) => {
                const proposito = getCodigoPropositoAlias(item.codigo_proposito);
                const activa = item.estado === 1;
                const textoCelda = `text-sm font-light px-3 py-4 truncate ${activa ? 'text-gray-900' : 'text-gray-400'}`;
                return (
                    <tr
                        key={item.id}
                        className={`border-b transition duration-300 ease-in-out hover:bg-gray-100 ${activa ? 'bg-white' : 'bg-gray-50'}`}
                    >
                        <td className={textoCelda} title={proposito}>
                            {proposito}
                        </td>
                        <td className={textoCelda}>
                            {getTipoComprobanteLabel(item.tipo_comprobante)}
                        </td>
                        <td className={textoCelda}>
                            {item.serie}
                        </td>
                        <td className="px-3 py-4 truncate">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                activa ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-500'
                            }`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${activa ? 'bg-green-600' : 'bg-gray-400'}`} />
                                {activa ? 'Activo' : 'Inactivo'}
                            </span>
                        </td>
                        <td className="px-3 py-4 truncate">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                item.fecha_retroactiva ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-500'
                            }`}>
                                {item.fecha_retroactiva ? 'Sí' : 'No'}
                            </span>
                        </td>
                        <td className={textoCelda}>
                            {item.numeracion_actual || '-'}
                        </td>
                        <td className={textoCelda}>
                            {item.fecha_ultimo_comprobante ? toLocaleOnlyDate(item.fecha_ultimo_comprobante) : '-'}
                        </td>
                        <td className={textoCelda} title={item.descripcion}>
                            {item.descripcion}
                        </td>
                        <td className="text-sm text-gray-900 font-light px-3 py-4">
                            <Link className='btn-primary px-3 py-1.5' href={`/admin/series/${item.id}`}>
                                Modificar
                            </Link>
                        </td>
                    </tr>
                );
            })}
            </>
        );
    }

    return (
        <>
        <div className="flex justify-end items-center mb-5 gap-4">
            <Link className="btn-primary px-5 py-2 mt-3" href={`/admin/series/0`}>
                Nueva serie
            </Link>
        </div>
        {/* Sin overflow-x-auto: table-fixed + colgroup en porcentajes hace que la tabla
            siempre entre en el ancho disponible, igual que en /historic */}
        <div className="mb-10 w-full">
            <table className="w-full table-fixed">
                <colgroup>
                    <col className="w-[15%]" />  {/* Propósito */}
                    <col className="w-[13%]" />  {/* Tipo comprobante */}
                    <col className="w-[7%]" />   {/* Serie */}
                    <col className="w-[9%]" />   {/* Estado */}
                    <col className="w-[7%]" />   {/* F. Retroactiva */}
                    <col className="w-[14%]" />  {/* Numeración actual */}
                    <col className="w-[11%]" />  {/* Última emisión */}
                    <col className="w-[13%]" />  {/* Descripción */}
                    <col className="w-[11%]" />  {/* Modificar */}
                </colgroup>
                <thead className="bg-gray-200 border-b">
                    <tr>
                    <th scope="col" className="text-sm font-medium text-gray-900 px-3 py-4 text-left">Propósito</th>
                    <th scope="col" className="text-sm font-medium text-gray-900 px-3 py-4 text-left">Tipo comprobante</th>
                    <th scope="col" className="text-sm font-medium text-gray-900 px-3 py-4 text-left">Serie</th>
                    <th scope="col" className="text-sm font-medium text-gray-900 px-3 py-4 text-left">Estado</th>
                    <th scope="col" className="text-sm font-medium text-gray-900 px-3 py-4 text-left" title="Permite emitir con fecha retroactiva">F. Retroactiva</th>
                    <th scope="col" className="text-sm font-medium text-gray-900 px-3 py-4 text-left">Numeración actual</th>
                    <th scope="col" className="text-sm font-medium text-gray-900 px-3 py-4 text-left">Última emisión</th>
                    <th scope="col" className="text-sm font-medium text-gray-900 px-3 py-4 text-left">Descripción</th>
                    <th scope="col" className="text-sm font-medium text-gray-900 px-3 py-4 text-left">Modificar</th>
                    </tr>
                </thead>
                <tbody>
                    {isInitialLoading ? (
                        <tr>
                            <td colSpan={9} className="text-center py-10">
                                <div className="animate-spin rounded-full h-8 w-8 inline-block border-gray-900 border-b-2"></div>
                            </td>
                        </tr>
                    ) : (
                        renderTable(data)
                    )}
                </tbody>
            </table>
        </div>
        </>
    );
}

export default SeriesTable;
