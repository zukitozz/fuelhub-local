"use client"
import React, { useState } from 'react';
import { currencyFormat, toLocaleOnlyDate } from '@/utils';
import { obtieneNotasDespacho } from '@/actions/billing/get-billing';
import { NotasDespachoTable } from './table';
import useSWR from 'swr';
import { useOrderAbastecimientoStore } from '@/store';
import { INotaDespacho } from '@/interfaces/notadespacho.interface';
import { useRouter } from "next/navigation";

const fetcher = () => obtieneNotasDespacho();

export default function ConsolidacionDespachos () {
  const router = useRouter();
  const addNotaDespachoToOrder = useOrderAbastecimientoStore((state) => state.addNotaDespachoToOrder);
  const lockBilling = useOrderAbastecimientoStore((state) => state.lockBilling);

  const { data, error, isLoading } = useSWR(`${process.env.NEXT_PUBLIC_URL}/api`, (url: string) => fetcher());
  
  const [selectedNotas, setSelectedNotas] = useState<number[]>([]);
  const [rucFilter, setRucFilter] = useState('');
  //Vacias por defecto: sin fechas se listan todas las notas pendientes, como antes
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [showError, setShowError] = useState(false);  

  const handleSelectNota = (id: number) => {
      setSelectedNotas(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
      );
  };  
  

  if(!data || isLoading || error || !Array.isArray(data)){
      return (<div className="animate-spin rounded-full h-8 w-8 justify-center border-gray-900 border-b-2 align-middle"></div>);
  }

  //Se compara solo la parte de la fecha, en el mismo formato que devuelven los inputs
  const dentroDelRango = (fecha: string|Date) => {
    if (!fechaInicio && !fechaFin) return true;
    const dia = toLocaleOnlyDate(fecha);
    if (fechaInicio && dia < fechaInicio) return false;
    if (fechaFin && dia > fechaFin) return false;
    return true;
  };

  const notasFiltradas = data.filter(n =>
    n.Receptor.numero_documento.includes(rucFilter) && dentroDelRango(n.fecha_hora)
  );
  const notasSeleccionadasData = notasFiltradas?.filter(n => selectedNotas.includes(n.id||0)) || [];
  const total = notasSeleccionadasData?.reduce((acc, curr) => acc + curr.total, 0) || 0;
  const totalGravadas = notasSeleccionadasData?.reduce((acc, curr) => acc + curr.gravadas, 0) || 0;
  const igvConsolidado = Number((total - totalGravadas).toFixed(2)); // O el cálculo inverso según guardes en BD

  const handleSubmit = async () => {
    // VALIDACIÓN: Comprobar que exista al menos una nota seleccionada con datos de cliente válidos
    const clienteValido = notasSeleccionadasData[0];
    
    if (!clienteValido?.ruc || !clienteValido.Receptor?.razon_social) {
      alert("Por favor, asegúrese de haber seleccionado comprobantes con un cliente válido.");
      return;
    }

    // VALIDACIÓN: Campo descripción obligatorio
    if (!descripcion.trim()) {
      setShowError(true);
      return;
    }

    setShowError(false);

    const item: INotaDespacho = {
      valor: Number((totalGravadas).toFixed(2)),
      precio: Number(total.toFixed(2)),
      igv: igvConsolidado,
      descripcion: descripcion.trim(), // Insertamos la descripción ingresada
      items: notasSeleccionadasData
    }
    addNotaDespachoToOrder(item);
    lockBilling();
    router.push('/invoice/0');
    setDescripcion('');
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* HEADER CON INDICADORES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <span className="text-gray-400 text-xs font-bold uppercase">Notas Seleccionadas</span>
          <h3 className="text-2xl font-black text-slate-800">{selectedNotas.length} comprobantes</h3>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <span className="text-gray-400 text-xs font-bold uppercase">Monto Acumulado</span>
          <h3 className="text-2xl font-black text-emerald-500">{currencyFormat(total)}</h3>
        </div>
      </div>

      {/* CUERPO PRINCIPAL EN DOS COLUMNAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* TABLA DE SELECCIÓN (Ocupa 2 columnas) */}
        <NotasDespachoTable comprobantes={notasFiltradas} handleSelectNota={handleSelectNota} selectedNotas={selectedNotas}
          rucFilter={rucFilter} setRucFilter={setRucFilter}
          fechaInicio={fechaInicio} setFechaInicio={setFechaInicio}
          fechaFin={fechaFin} setFechaFin={setFechaFin} />

        {/* PANEL DE ACCIÓN DE FACTURACIÓN (Ocupa 1 columna) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 h-fit sticky top-6">
          <h2 className="text-md font-bold text-gray-800 mb-4 border-b pb-2">Generar Comprobante Global</h2>
          
          {selectedNotas.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">
              Selecciona una o más notas de despacho de la lista para consolidar la factura.
            </p>
          ) : (
            <div className="space-y-4 text-sm">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                <strong>Cliente Detectado:</strong>
                <p className="mt-1 font-semibold">{notasSeleccionadasData[0]?.Receptor.razon_social}</p>
                <p>RUC: {notasSeleccionadasData[0]?.ruc}</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="descripcion" className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                  Descripción del servicio / glosa <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="descripcion"
                  className={`w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:ring-2 bg-slate-50 transition-all ${
                    showError && !descripcion.trim() 
                      ? 'border-red-400 focus:ring-red-200 focus:bg-white' 
                      : 'border-gray-200 focus:ring-blue-100 focus:bg-white'
                  }`}
                  rows={3}
                  placeholder="Ej. Consolidado de combustible correspondiente a la semana..."
                  value={descripcion}
                  onChange={(e) => {
                    setDescripcion(e.target.value);
                    if(e.target.value.trim()) setShowError(false);
                  }}
                />
                {showError && !descripcion.trim() && (
                  <span className="text-[11px] text-red-500 font-medium">
                    ⚠️ La descripción es obligatoria para emitir el resumen.
                  </span>
                )}
              </div>              

              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal Gravado:</span>
                  <span>{currencyFormat(totalGravadas)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>IGV (18%):</span>
                  <span>{currencyFormat(igvConsolidado)}</span>
                </div>
                <div className="flex justify-between font-bold text-base text-gray-800 border-t pt-2">
                  <span>Total Factura:</span>
                  <span className="text-blue-600">{currencyFormat(total)}</span>
                </div>
              </div>

              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md transition-all text-sm mt-4" onClick={handleSubmit} >
                🧾 Emitir Factura Resumen ({selectedNotas.length})
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};