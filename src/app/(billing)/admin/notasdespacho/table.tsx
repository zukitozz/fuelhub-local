"use client"

import { IComprobanteAdmin } from "@/interfaces";
import { currencyFormat, toIsoString } from "@/utils/formats";

interface TableProps {
  comprobantes: IComprobanteAdmin[];
  selectedNotas: number[];
  handleSelectNota: ( value: number ) => void;
  rucFilter: string;
  setRucFilter: ( value: string ) => void;
  fechaInicio: string;
  setFechaInicio: ( value: string ) => void;
  fechaFin: string;
  setFechaFin: ( value: string ) => void;
}

export const NotasDespachoTable = ({ comprobantes, handleSelectNota, selectedNotas, rucFilter, setRucFilter,
    fechaInicio, setFechaInicio, fechaFin, setFechaFin }: TableProps) => {

    return (
     <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          {/* Filtros en una sola fila: el RUC ocupa el espacio sobrante y las fechas
              conservan su ancho, alineados por la base */}
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <label htmlFor="rucFilter" className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Cliente</label>
              <input
                id="rucFilter"
                type="text"
                placeholder="Buscar por RUC..."
                className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={rucFilter}
                onChange={(e) => setRucFilter(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="fechaInicio" className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Desde</label>
              <input
                id="fechaInicio"
                type="date"
                className="p-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={fechaInicio}
                max={fechaFin || undefined}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="fechaFin" className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Hasta</label>
              <input
                id="fechaFin"
                type="date"
                className="p-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={fechaFin}
                min={fechaInicio || undefined}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="p-4">Selección</th>
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Comprobante</th>
                  <th className="p-4">RUC / Razón Social</th>
                  <th className="p-4">Producto</th>
                  <th className="p-4">Placa</th>
                  <th className="p-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {comprobantes.map((comprobante) => (
                    comprobante.id && (
                        <tr key={comprobante.id} className="border-b hover:bg-slate-50">
                            <td className="p-4 text-center">
                            <input 
                                type="checkbox" 
                                checked={selectedNotas.includes(comprobante.id)}
                                onChange={() => handleSelectNota(comprobante.id||0)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            </td>
                            <td className="p-4 font-semibold">{toIsoString(comprobante.fecha_hora)}</td>
                            <td className="p-4 font-medium text-gray-900">{comprobante.numeracion_comprobante}</td>
                            <td className="p-4">
                            <div className="font-bold text-xs text-gray-700">{comprobante.Receptor.numero_documento}</div>
                            <div className="text-xs text-gray-400 truncate max-w-[180px]">{comprobante.Receptor.razon_social}</div>
                            </td>
                            {/* Una nota suele traer un solo item, pero puede llevar varios */}
                            <td className="p-4 text-xs text-gray-700">
                              {comprobante.items?.map(item => item.descripcion).join(', ')}
                            </td>
                            <td className="p-4 font-medium text-gray-900">{comprobante.placa}</td>
                            <td className="p-4 text-right font-semibold">{currencyFormat(comprobante.total)}</td>
                        </tr>                        
                    )
                ))}
              </tbody>
            </table>
          </div>
        </div>        
    );
}