"use client";
import { useEffect, useState } from "react";
import { currencyFormat } from "@/utils";
import { IOrderItem } from "@/interfaces";

interface Props {
    orderInBilling: IOrderItem[];
    subTotal: number;
    totalIgv: number;
    total: number;
}

export const BillingSummary = ({ orderInBilling, subTotal, totalIgv, total }: Props) => {
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        setLoaded(true);
    }, []);

    if(!loaded){
        return <p>Loading</p>;
    }

    return(
        <>
            <h2 className="text-2xl mb-2">RESUMEN</h2>
            <div className="w-full h-0.5 rounded bg-gray-200 my-4" />
            <div className="grid grid-cols-3">
                <span className="font-bold">Producto</span>
                <span className="text-right font-bold col-span-1">Cantidad</span>
                <span className="text-right font-bold col-span-1">Importe</span>
                {
                    orderInBilling.map( (item, index) => (
                        <div key={`${item.codigo_producto}-${index}`} className="col-span-3 grid grid-cols-3 py-1">
                            <span className="">{item.descripcion}{item.placa ? ` - ${item.placa}` : ''}</span>
                            <span className="text-right">{item.cantidad}</span>
                            <span className="text-right">{currencyFormat(item.valor)}</span>                            
                        </div>
                    ))
                }

            </div>
            <div className="w-full h-0.5 rounded bg-gray-200 my-3" />
            <div className="grid grid-cols-2">
                <span>Subtotal</span>
                <span className="text-right">
                    {currencyFormat(subTotal)}
                </span>
                <span>IGV (18%)</span>
                <span className="text-right">{currencyFormat(totalIgv)}</span>
            </div>
            <div className="w-full h-0.5 rounded bg-gray-200 my-3" />
            <div className="grid grid-cols-2">
                <span className="mt-5 text-2xl">Total:</span>
                <span className="mt-5 text-2xl text-right">
                    {currencyFormat(total)}
                </span>
            </div>
        </>
    );
}