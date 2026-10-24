import { IAbastecimiento } from "@/interfaces"
import { useOrderAbastecimientoStore } from "@/store";
import Link from 'next/link';
import { requiereRevision } from "@/utils/autoboleteo";

interface Props {
    abastecimiento: IAbastecimiento
}

export const AbastecimientoGridItem = ({ abastecimiento }: Props) => {
  const addOrderItem = useOrderAbastecimientoStore((state) => state.addAbastecimientoToOrder);
  // Monto alto o negativo: no se autobotea, hay que revisarlo y boletearlo a mano
  const enRevision = requiereRevision(abastecimiento.valorTotal);
  return (
    <div className={`flex flex-col h-full rounded-lg shadow-md bg-white p-4 z-0 ${enRevision ? 'border-2 border-red-500' : ''}`}>
        <Link href={ `/invoice/${ abastecimiento.idAbastecimiento }` } onClick={() => addOrderItem(abastecimiento)}>
          <div className="left-0 w-32 text-center py-2 mb-4 font-bold rounded-md text-white" style={{ backgroundColor: abastecimiento.color }}>
              {abastecimiento.nombre}
          </div>    
        
          <div className="flex-1">
              {enRevision && (
                  <p className="text-xs font-bold text-red-600 mb-1">REVISAR: monto fuera de rango, no se boletea solo</p>
              )}
              <h3 className="text-xl font-semibold mb-2">TOTAL: S/ {abastecimiento.valorTotal}</h3>
              <p className="text-sm text-gray-700 mb-1">
              Precio: S/ {abastecimiento.precioUnitario}
              </p>
              <p className="text-sm text-gray-700 mb-1">
              Cantidad: {abastecimiento.volTotal} {abastecimiento.medida}
              </p>
              <p className="text-sm text-gray-700 mb-2">
              Pistola: {abastecimiento.pistola}
              </p>                 
          </div>
        </Link>
    </div>
  )
}
