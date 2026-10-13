'use client';
import useSWR from 'swr';
import { getCompras } from '@/actions'
import { ICompraTable } from '@/interfaces';
import Link from 'next/link';
import { ChangeEvent, SetStateAction, useState } from 'react';
import { currencyFormat } from '@/utils';


interface TableProps {
  page: number;
  perPage: number;
  keyword?: string;
}

const fetcher = (page: number, perPage: number, keyword?: string) => getCompras(page, perPage, keyword);

const getVisiblePages = (current: number, totalPages: number) => {
    const range = 2;
    const pages: (number | string)[] = [];

    for (let i = 1; i <= totalPages; i++) {
        if (
            i === 1 ||
            i === totalPages ||
            (i >= current - range && i <= current + range)
        ) {
            pages.push(i);
        } else if (i === current - range - 1 || i === current + range + 1) {
            pages.push('...');
        }
    }
    return pages.filter((item, index) => pages.indexOf(item) === index);
};

export const ComprasTable = ({ page, perPage, keyword }: TableProps) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [keywordState, setKeyword] = useState<string>('');

    const { data, error, isLoading } = useSWR(
        [`${process.env.NEXT_PUBLIC_URL}/api-compras`, currentPage, keywordState],
        () => fetcher(currentPage, 10, keywordState)
    );

    const paginate = (pageNumber: SetStateAction<number>) => { setCurrentPage(pageNumber) };

    const isInitialLoading = (!data && isLoading) || error;

    const totalPages = data?.pageNumbers?.length || 0;
    const visiblePages = getVisiblePages(currentPage, totalPages);

    const handleKeywordChange = (e: ChangeEvent<HTMLInputElement>) => {
        setCurrentPage(1);
        setKeyword(e.target.value);
    };

    const renderTable = (compras: ICompraTable[] | undefined) => {
        if (!compras || compras.length === 0) {
            return (
                <tr>
                    <td colSpan={10} className="text-center py-6 text-gray-500 text-sm">
                        No se encontraron registros.
                    </td>
                </tr>
            );
        }

        return (
            <>
            {compras.map((item: ICompraTable) => (
                <tr
                    key={item.id}
                    className="bg-white border-b transition duration-300 ease-in-out hover:bg-gray-100"
                >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.id}
                    </td>
                    <td className="text-sm text-gray-900 font-light px-6 py-4 whitespace-nowrap">
                        {item.fecha}
                    </td>
                    <td className="text-sm text-gray-900 font-light px-6 py-4 whitespace-nowrap">
                        {item.numero_comprobante}
                    </td>
                    <td className="text-sm text-gray-900 font-light px-6 py-4 whitespace-nowrap">
                        {item.proveedor}
                    </td>
                    <td className="text-sm  text-gray-900 font-light px-6 py-4 whitespace-nowrap text-right">
                        {currencyFormat(item.total)}
                    </td>
                    <td className="text-sm text-gray-900 font-light px-6 py-4 whitespace-nowrap">
                        {item.usuario}
                    </td>
                    <td className="text-sm text-gray-900 font-light px-6 ">
                        <Link className='btn-primary px-5 py-2 mt-3' href={ `/admin/compras/${ item.id }` }>
                            Ver
                        </Link>
                    </td>
                </tr>
            ))}
            </>
        );
    }

    return (
        <>
        <div className="flex justify-between items-center mb-5 gap-4">
            <Link className="btn-primary px-5 py-2 mt-3" href={ `/admin/compras/0` }>
                Nuevo
            </Link>
            <input
                type="text"
                id="proveedor"
                name="proveedor"
                placeholder="Proveedor o comprobante"
                className="border px-3 py-2 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[240px]"
                value={keywordState}
                onChange={handleKeywordChange}
            />
        </div>
        <div className="mb-10">
            <table className="min-w-full">
            <thead className="bg-gray-200 border-b">
                <tr>
                <th scope="col" className="text-sm font-medium text-gray-900 px-6 py-4 text-left">#ID</th>
                <th scope="col" className="text-sm font-medium text-gray-900 px-6 py-4 text-left">Fecha</th>
                <th scope="col" className="text-sm font-medium text-gray-900 px-6 py-4 text-left">Comprobante</th>
                <th scope="col" className="text-sm font-medium text-gray-900 px-6 py-4 text-left">Proveedor</th>
                <th scope="col" className="text-sm font-medium text-gray-900 px-6 py-4 text-left">Total</th>
                <th scope="col" className="text-sm font-medium text-gray-900 px-6 py-4 text-left">Registrado por</th>
                <th scope="col" className="text-sm font-medium text-gray-900 px-6 py-4 text-left">Ver</th>
                </tr>
            </thead>
            <tbody>
                {isInitialLoading ? (
                    <tr>
                        <td colSpan={10} className="text-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 inline-block border-gray-900 border-b-2"></div>
                        </td>
                    </tr>
                ) : (
                    renderTable(data?.compras)
                )}
            </tbody>
            {totalPages > 0 && (
                <tfoot className="bg-gray-50">
                        <tr>
                            <td colSpan={10} className="px-6 py-3">
                                <div className="flex items-center justify-center space-x-2">
                                    <button
                                        disabled={currentPage === 1}
                                        onClick={() => paginate(currentPage - 1)}
                                        className="px-3 py-1 rounded border disabled:opacity-30"
                                    >
                                        &lt;
                                    </button>

                                    {
                                        visiblePages.map((page, index) => (
                                            typeof page === 'number' ? (
                                                <button
                                                    key={index}
                                                    onClick={() => paginate(page)}
                                                    className={`px-3 py-1 rounded border transition-colors ${
                                                        currentPage === page
                                                        ? 'bg-blue-600 text-white font-bold'
                                                        : 'bg-white text-gray-700 hover:bg-gray-100'
                                                    }`}
                                                >
                                                    {page}
                                                </button>
                                            ) : (
                                                <span key={index} className="px-2 text-gray-500">...</span>
                                            )
                                        ))
                                    }

                                    <button
                                        disabled={currentPage === totalPages}
                                        onClick={() => paginate(currentPage + 1)}
                                        className="px-3 py-1 rounded border disabled:opacity-30"
                                    >
                                        &gt;
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tfoot>
                )}
            </table>
        </div>
        </>
    );
}

export default ComprasTable;
