'use client';
import { useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ICierreTurno, IDepositos, IGastos } from '@/interfaces';
import { updateCierreTurno } from '@/actions/cierreturno';
import { currencyFormat, notify, toLocaleStorage } from '@/utils';

interface Props {
    cierre: ICierreTurno;
    onClose: () => void;
    onSaved: () => void;
}

type CampoConteo = 'billetes' | 'monedas' | 'tarjeta' | 'transferencia' | 'yape' | 'falsos';

export const EditarCierreModal = ({ cierre, onClose, onSaved }: Props) => {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [observaciones, setObservaciones] = useState(cierre.observaciones || '');
    const [conteo, setConteo] = useState<Record<CampoConteo, number | ''>>({
        billetes: cierre.billetes_contado ?? '',
        monedas: cierre.monedas_contado ?? '',
        tarjeta: cierre.tarjeta_contado ?? cierre.tarjeta ?? '',
        transferencia: cierre.transferencia_contado ?? '',
        yape: cierre.yape_contado ?? cierre.yape ?? '',
        falsos: cierre.falsos_contado ?? '',
    });
    const [gastos, setGastos] = useState<IGastos[]>(cierre.gastos || []);
    const [depositos, setDepositos] = useState<IDepositos[]>(cierre.depositos || []);
    //Contador de ids temporales (negativos) para las filas nuevas agregadas en este modal:
    //el backend distingue id>0 (UPDATE) de id<=0 (INSERT enganchado a este CierreturnoId).
    const tempIdRef = useRef(0);
    const nuevoTempId = () => --tempIdRef.current;

    const handleConteoChange = (campo: CampoConteo, valor: string) => {
        setConteo(prev => ({ ...prev, [campo]: valor === '' ? '' : Number(valor) }));
    };

    //Los billetes falsos detectados no son dinero real: se restan del efectivo contado
    //antes de compararlo contra lo que el sistema registro para el turno.
    const totalContado = (Number(conteo.billetes) || 0) + (Number(conteo.monedas) || 0)
        - (Number(conteo.falsos) || 0) + (Number(conteo.tarjeta) || 0)
        + (Number(conteo.transferencia) || 0) + (Number(conteo.yape) || 0);
    const totalSistema = (cierre.efectivo || 0) + (cierre.tarjeta || 0) + (cierre.yape || 0);
    const diferencia = totalContado - totalSistema;

    const handleGastoChange = (id: number, campo: 'concepto' | 'monto' | 'autorizado', valor: string) => {
        setGastos(prev => prev.map(g => g.id === id ? { ...g, [campo]: campo === 'monto' ? Number(valor) : valor } : g));
    };

    const handleDepositoChange = (id: number, campo: 'concepto' | 'monto', valor: string) => {
        setDepositos(prev => prev.map(d => d.id === id ? { ...d, [campo]: campo === 'monto' ? Number(valor) : valor } : d));
    };

    //Un gasto/deposito "olvidado" que nunca se registro: se agrega ya enganchado a este
    //cierre (usuario_gasto/usuario = el operador dueño del turno, igual que si el lo hubiera
    //registrado en su momento; autorizado queda libre para que el admin indique quien lo autorizo).
    const handleAddGasto = () => {
        setGastos(prev => [...prev, {
            id: nuevoTempId(),
            concepto: '',
            monto: 0,
            usuario_gasto: cierre.usuario?.usuario || '',
            autorizado: '',
            turno: cierre.turno,
            fecha: toLocaleStorage(new Date()),
            UsuarioId: cierre.UsuarioId,
        }]);
    };

    const handleAddDeposito = () => {
        setDepositos(prev => [...prev, {
            id: nuevoTempId(),
            concepto: '',
            monto: 0,
            usuario: cierre.usuario?.usuario || '',
            turno: cierre.turno,
            fecha: toLocaleStorage(new Date()),
            UsuarioId: cierre.UsuarioId,
        }]);
    };

    const handleRemoveGasto = (id: number) => setGastos(prev => prev.filter(g => g.id !== id));
    const handleRemoveDeposito = (id: number) => setDepositos(prev => prev.filter(d => d.id !== id));

    const handlerGuardar = async () => {
        setLoading(true);
        try {
            const { message, status } = await updateCierreTurno(session, {
                id: cierre.id,
                observaciones,
                billetes_contado: conteo.billetes === '' ? null : Number(conteo.billetes),
                monedas_contado: conteo.monedas === '' ? null : Number(conteo.monedas),
                tarjeta_contado: conteo.tarjeta === '' ? null : Number(conteo.tarjeta),
                transferencia_contado: conteo.transferencia === '' ? null : Number(conteo.transferencia),
                yape_contado: conteo.yape === '' ? null : Number(conteo.yape),
                falsos_contado: conteo.falsos === '' ? null : Number(conteo.falsos),
                gastos,
                depositos,
            });
            if (status) {
                notify({ message });
                onSaved();
                onClose();
            } else {
                notify({ message, type: 'error' });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <h2 className="text-lg font-bold mb-4 text-gray-800">
                    Editar cierre de turno — {cierre.turno} / {cierre.isla}
                </h2>

                <div className="flex flex-col mb-4">
                    <label className="mb-1 font-semibold text-sm" htmlFor="observaciones">Observaciones</label>
                    <textarea
                        id="observaciones"
                        className="px-3 py-2 border bg-white rounded shadow-sm focus:outline-blue-500 text-sm"
                        rows={3}
                        maxLength={500}
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        placeholder="Notas del cierre, incidencias, etc."
                    />
                </div>

                <div className="mb-4">
                    <span className="block mb-2 font-semibold text-sm">Conteo físico del turno</span>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col">
                            <label className="mb-1 text-xs text-gray-600" htmlFor="billetes">Billetes</label>
                            <input
                                id="billetes" type="number" step="0.01"
                                className="px-3 py-2 border bg-white rounded shadow-sm focus:outline-blue-500 text-sm"
                                value={conteo.billetes}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => handleConteoChange('billetes', e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="mb-1 text-xs text-gray-600" htmlFor="monedas">Monedas</label>
                            <input
                                id="monedas" type="number" step="0.01"
                                className="px-3 py-2 border bg-white rounded shadow-sm focus:outline-blue-500 text-sm"
                                value={conteo.monedas}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => handleConteoChange('monedas', e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="mb-1 text-xs text-gray-600" htmlFor="tarjetas">Tarjetas</label>
                            <input
                                id="tarjetas" type="number" step="0.01"
                                className="px-3 py-2 border bg-white rounded shadow-sm focus:outline-blue-500 text-sm"
                                value={conteo.tarjeta}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => handleConteoChange('tarjeta', e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="mb-1 text-xs text-gray-600" htmlFor="transferencias">Transferencias</label>
                            <input
                                id="transferencias" type="number" step="0.01"
                                className="px-3 py-2 border bg-white rounded shadow-sm focus:outline-blue-500 text-sm"
                                value={conteo.transferencia}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => handleConteoChange('transferencia', e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="mb-1 text-xs text-gray-600" htmlFor="yapes">Yape</label>
                            <input
                                id="yapes" type="number" step="0.01"
                                className="px-3 py-2 border bg-white rounded shadow-sm focus:outline-blue-500 text-sm"
                                value={conteo.yape}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => handleConteoChange('yape', e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="mb-1 text-xs text-gray-600" htmlFor="falsos">Billetes/monedas falsas</label>
                            <input
                                id="falsos" type="number" step="0.01"
                                className="px-3 py-2 border bg-white rounded shadow-sm focus:outline-blue-500 text-sm"
                                value={conteo.falsos}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => handleConteoChange('falsos', e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                        Sistema: {currencyFormat(totalSistema)} (efectivo {currencyFormat(cierre.efectivo || 0)} + tarjeta {currencyFormat(cierre.tarjeta || 0)} + yape {currencyFormat(cierre.yape || 0)})
                    </div>
                    <span className={`mt-1 block text-xs font-semibold ${diferencia === 0 ? 'text-gray-500' : diferencia > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        Diferencia: {currencyFormat(diferencia)} {diferencia > 0 ? '(sobrante)' : diferencia < 0 ? '(faltante)' : ''}
                    </span>
                </div>

                <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm">Gastos del turno</span>
                        <button
                            type="button"
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                            onClick={handleAddGasto}
                        >
                            + Agregar gasto
                        </button>
                    </div>
                    <div className="flex flex-col gap-2">
                        {gastos.map(g => (
                            <div key={g.id} className="flex gap-2 items-center">
                                <input
                                    className="flex-1 px-3 py-2 border bg-white rounded shadow-sm focus:outline-blue-500 text-sm"
                                    placeholder="Concepto"
                                    value={g.concepto}
                                    onChange={(e) => handleGastoChange(g.id, 'concepto', e.target.value)}
                                />
                                {g.id <= 0 && (
                                    <input
                                        className="w-32 px-3 py-2 border bg-white rounded shadow-sm focus:outline-blue-500 text-sm"
                                        placeholder="Autorizado por"
                                        value={g.autorizado}
                                        onChange={(e) => handleGastoChange(g.id, 'autorizado', e.target.value)}
                                    />
                                )}
                                <input
                                    type="number"
                                    step="0.01"
                                    className="w-28 px-3 py-2 border bg-white rounded shadow-sm focus:outline-blue-500 text-sm"
                                    value={g.monto}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => handleGastoChange(g.id, 'monto', e.target.value)}
                                />
                                {g.id <= 0 && (
                                    <button
                                        type="button"
                                        className="text-gray-400 hover:text-rose-600 text-sm px-1"
                                        onClick={() => handleRemoveGasto(g.id)}
                                        title="Quitar"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}
                        {gastos.length === 0 && (
                            <span className="text-xs text-gray-400 italic">Sin gastos registrados</span>
                        )}
                    </div>
                </div>

                <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm">Depósitos del turno</span>
                        <button
                            type="button"
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                            onClick={handleAddDeposito}
                        >
                            + Agregar depósito
                        </button>
                    </div>
                    <div className="flex flex-col gap-2">
                        {depositos.map(d => (
                            <div key={d.id} className="flex gap-2 items-center">
                                <input
                                    className="flex-1 px-3 py-2 border bg-white rounded shadow-sm focus:outline-blue-500 text-sm"
                                    placeholder="Concepto"
                                    value={d.concepto}
                                    onChange={(e) => handleDepositoChange(d.id, 'concepto', e.target.value)}
                                />
                                <input
                                    type="number"
                                    step="0.01"
                                    className="w-28 px-3 py-2 border bg-white rounded shadow-sm focus:outline-blue-500 text-sm"
                                    value={d.monto}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => handleDepositoChange(d.id, 'monto', e.target.value)}
                                />
                                {d.id <= 0 && (
                                    <button
                                        type="button"
                                        className="text-gray-400 hover:text-rose-600 text-sm px-1"
                                        onClick={() => handleRemoveDeposito(d.id)}
                                        title="Quitar"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}
                        {depositos.length === 0 && (
                            <span className="text-xs text-gray-400 italic">Sin depósitos registrados</span>
                        )}
                    </div>
                </div>

                <div className="flex gap-2 mt-6">
                    <button
                        className="flex-1 px-5 py-2 rounded border border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition-colors"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        className={`flex-1 px-5 py-2 rounded text-white font-semibold transition-colors ${loading ? 'bg-gray-400' : 'btn-primary'}`}
                        onClick={handlerGuardar}
                        disabled={loading}
                    >
                        {loading ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                </div>
            </div>
        </div>
    );
};
