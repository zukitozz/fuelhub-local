'use client';
import { IProduct } from "@/interfaces"
import { useOrderAbastecimientoStore } from "@/store";
import Link from 'next/link';
import { ProductImage } from "../product/product-image/ProductImage";

interface Props {
    producto: IProduct
}

export const MarketItem = ({ producto }: Props) => {
  const addProductToOrder = useOrderAbastecimientoStore((state) => state.addProductToOrder);
  return (
    <Link href={ `#` } onClick={() => addProductToOrder(producto)}>
    <div className="flex h-full rounded-lg shadow-md bg-white p-4 z-0">
          {/* <div className="left-0 w-32 text-center py-2 mb-4 font-bold rounded-md text-white" style={{ backgroundColor: abastecimiento.color }}>
              {abastecimiento.nombre}
          </div>     */}      
          <div className="flex-1">
              <h3 className="text-xl font-semibold mb-2">{producto.nombre}</h3>
                {/* <h3 className="text-xl font-semibold mb-2">TOTAL: S/ {abastecimiento.valorTotal}</h3> */}
                <p className="text-sm text-gray-700 mb-1">
                Precio: S/ {producto.precio}
                </p>
                <p className="text-sm text-gray-700 mb-1">
                Medida: {producto.medida}
                </p>
                {!producto.es_pistola && (
                <p className="text-sm text-gray-700 mb-1">
                Stock: {producto.stock} {producto.medida}
                </p>
                )}
                {/* <p className="text-sm text-gray-700 mb-4">
                Cantidad: {abastecimiento.volTotal} {abastecimiento.medida}
                </p>     */}
            </div>
            <ProductImage
                src={ producto.img }
                width={100}
                height={100}
                // style={{
                //   width: "100px",
                //   height: "100px",
                //   flex: 1,
                // }}
                alt={producto.nombre}
                className="mr-5 rounded"
            />              
    </div>
    </Link>
  )
}
