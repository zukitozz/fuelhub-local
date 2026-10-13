"use client";
import { Title } from "@/components";
import Link from "next/link";
import { useState } from 'react';
import { useRouter } from "next/navigation";
import { IoArrowBack, IoAddCircleOutline, IoTrashOutline } from "react-icons/io5";
import { ICompraCompleta, ICompraLineaForm, IProductoParaCompra } from "@/interfaces";
import { saveCompra } from "@/actions";
import { useSession } from "next-auth/react";
import { notify, toLocaleOnlyDate, currencyFormat } from "@/utils";

interface Props {
  compra?: ICompraCompleta;
  productos: IProductoParaCompra[];
}

const emptyLinea = (): ICompraLineaForm => ({ ProductoId: 0, cantidad: 1, costo_unitario: 0 });

export const ComprasForm = ({ compra, productos }: Props) => {
    const { data: session } = useSession();
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [fecha, setFecha] = useState(toLocaleOnlyDate(new Date()));
    const [numeroComprobante, setNumeroComprobante] = useState('');
    const [proveedor, setProveedor] = useState('');
    const [lineas, setLineas] = useState<ICompraLineaForm[]>([emptyLinea()]);

    let buttonLabel = 'Registrar compra';
    if (loading) buttonLabel = 'Procesando...';

    const handleAddLinea = () => {
        setLineas([...lineas, emptyLinea()]);
    };

    const handleRemoveLinea = (index: number) => {
        if (lineas.length === 1) return;
        setLineas(lineas.filter((_, i) => i !== index));
    };

    const handleLineaChange = (index: number, field: keyof ICompraLineaForm, value: number) => {
        setLineas(lineas.map((linea, i) => i === index ? { ...linea, [field]: value } : linea));
    };

    const total = lineas.reduce((acc, linea) => acc + (linea.cantidad * linea.costo_unitario), 0);

    const handlerProcessCompra = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!proveedor.trim()) {
            return notify({ message: "Ingrese el proveedor", type: "error" });
        }
        if (lineas.some(l => !l.ProductoId)) {
            return notify({ message: "Seleccione el producto en todas las líneas", type: "error" });
        }
        if (lineas.some(l => l.cantidad <= 0)) {
            return notify({ message: "La cantidad debe ser mayor a 0 en todas las líneas", type: "error" });
        }
        if (lineas.some(l => l.costo_unitario < 0)) {
            return notify({ message: "El costo unitario no puede ser negativo", type: "error" });
        }

        setLoading(true);

        const UsuarioId: number = session?.user?.id ? +session.user.id : 0;

        const { success, message } = await saveCompra({
            id: 0,
            fecha,
            numero_comprobante: numeroComprobante,
            proveedor,
            UsuarioId,
            lineas
        });

        if (success) {
            notify({ message });
            router.replace('/admin/compras');
        } else {
            notify({ message: message || "Error al registrar la compra", type: "error" });
        }
        setLoading(false);
    }

    if (compra) {
        return (
          <div className="flex justify-center items-center mb-72 px-10 sm:px-0">
            <div className="flex flex-col w-[1000px]">
                <Title title="Detalle de compra" />
                <Link
                  href="/admin/compras/"
                  className="flex items-center mt-5 p-2 hover:bg-gray-100 rounded transition-all"
                >
                  <IoArrowBack size={30} />
                  <span className="ml-3 text-xl">Regresar</span>
                </Link>
                <br/>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                    <div><span className="font-semibold">Fecha:</span> {compra.fecha}</div>
                    <div><span className="font-semibold">Comprobante:</span> {compra.numero_comprobante}</div>
                    <div><span className="font-semibold">Proveedor:</span> {compra.proveedor}</div>
                    <div><span className="font-semibold">Registrado por:</span> {compra.usuario}</div>
                </div>
                <table className="min-w-full">
                    <thead className="bg-gray-200 border-b">
                        <tr>
                            <th className="text-sm font-medium text-gray-900 px-6 py-4 text-left">Producto</th>
                            <th className="text-sm font-medium text-gray-900 px-6 py-4 text-left">Cantidad</th>
                            <th className="text-sm font-medium text-gray-900 px-6 py-4 text-left">Costo unitario</th>
                            <th className="text-sm font-medium text-gray-900 px-6 py-4 text-left">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {compra.detalle.map(item => (
                            <tr key={item.id} className="bg-white border-b">
                                <td className="text-sm text-gray-900 font-light px-6 py-4">{item.nombre_producto}</td>
                                <td className="text-sm text-gray-900 font-light px-6 py-4">{item.cantidad} {item.medida}</td>
                                <td className="text-sm text-gray-900 font-light px-6 py-4">{currencyFormat(item.costo_unitario)}</td>
                                <td className="text-sm text-gray-900 font-light px-6 py-4">{currencyFormat(item.subtotal)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={3} className="text-right font-semibold px-6 py-4">Total</td>
                            <td className="font-semibold px-6 py-4">{currencyFormat(compra.total)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
          </div>
        );
    }

    return (
      <div className="flex justify-center items-center mb-72 px-10 sm:px-0">
        <div className="flex flex-col w-[1000px]">
            <Title title="Registro de compra" />
            <Link
              href="/admin/compras/"
              className="flex items-center mt-5 p-2 hover:bg-gray-100 rounded transition-all"
            >
              <IoArrowBack size={30} />
              <span className="ml-3 text-xl">Regresar</span>
            </Link>
            <br/>
            <form onSubmit={handlerProcessCompra} autoComplete="off" className="flex flex-col">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                    <div className='flex flex-col'>
                        <label className="mb-1 font-semibold" htmlFor="fecha">Fecha</label>
                        <input
                            className="px-5 py-2 border bg-white rounded shadow-sm focus:outline-blue-500"
                            type="date"
                            name="fecha"
                            value={fecha}
                            onChange={(e) => setFecha(e.target.value)}
                        />
                    </div>
                    <div className='flex flex-col'>
                        <label className="mb-1 font-semibold" htmlFor="numero_comprobante">Número de comprobante</label>
                        <input
                            className="px-5 py-2 border bg-white rounded shadow-sm focus:outline-blue-500"
                            type="text"
                            name="numero_comprobante"
                            placeholder="Ej. F001-123"
                            value={numeroComprobante}
                            onChange={(e) => setNumeroComprobante(e.target.value)}
                        />
                    </div>
                    <div className='flex flex-col'>
                        <label className="mb-1 font-semibold" htmlFor="proveedor">Proveedor</label>
                        <input
                            className="px-5 py-2 border bg-white rounded shadow-sm focus:outline-blue-500"
                            type="text"
                            name="proveedor"
                            placeholder="Ej. Distribuidora XYZ"
                            value={proveedor}
                            onChange={(e) => setProveedor(e.target.value)}
                        />
                    </div>
                </div>

                <table className="min-w-full mb-3">
                    <thead className="bg-gray-200 border-b">
                        <tr>
                            <th className="text-sm font-medium text-gray-900 px-4 py-3 text-left">Producto</th>
                            <th className="text-sm font-medium text-gray-900 px-4 py-3 text-left">Cantidad</th>
                            <th className="text-sm font-medium text-gray-900 px-4 py-3 text-left">Costo unitario</th>
                            <th className="text-sm font-medium text-gray-900 px-4 py-3 text-left">Subtotal</th>
                            <th className="text-sm font-medium text-gray-900 px-4 py-3 text-left"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {lineas.map((linea, index) => (
                            <tr key={index} className="bg-white border-b">
                                <td className="px-4 py-2">
                                    <select
                                        className="px-3 py-2 border bg-gray-200 rounded w-full"
                                        value={linea.ProductoId}
                                        onChange={(e) => handleLineaChange(index, 'ProductoId', +e.target.value)}
                                    >
                                        <option value={0}>Seleccione</option>
                                        {productos.map(p => (<option key={p.id} value={p.id}>{p.nombre}</option>))}
                                    </select>
                                </td>
                                <td className="px-4 py-2">
                                    <input
                                        className="px-3 py-2 border bg-white rounded w-full"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={linea.cantidad}
                                        onChange={(e) => handleLineaChange(index, 'cantidad', +e.target.value)}
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <input
                                        className="px-3 py-2 border bg-white rounded w-full"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={linea.costo_unitario}
                                        onChange={(e) => handleLineaChange(index, 'costo_unitario', +e.target.value)}
                                    />
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900">
                                    {currencyFormat(linea.cantidad * linea.costo_unitario)}
                                </td>
                                <td className="px-4 py-2">
                                    <button type="button" onClick={() => handleRemoveLinea(index)} className="text-red-600 hover:text-red-800">
                                        <IoTrashOutline size={20} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={3} className="text-right font-semibold px-4 py-3">Total</td>
                            <td className="font-semibold px-4 py-3">{currencyFormat(total)}</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>

                <button type="button" onClick={handleAddLinea} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 mb-5 w-fit">
                    <IoAddCircleOutline size={20} /> Agregar producto
                </button>

                <button
                    type="submit"
                    disabled={loading}
                    className={`${loading ? 'bg-gray-400' : 'btn-primary'} px-5 py-3 mt-4 w-full text-white font-bold rounded transition-colors`}
                >
                    {buttonLabel}
                </button>
            </form>
        </div>
      </div>
    )
}
