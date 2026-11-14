import { executeQuery, saveComprobantePdfBytes } from '@/utils/db';
import { generarPdfComprobante } from '@/utils/comprobante-pdf';

// pdf_bytes funciona como un buzon temporal: al emitir una factura (01) o nota de credito (07) se genera aqui su PDF,
// el facturador lo sube a S3 y vacia el campo (pdf_enviado = 1). Un generador de fondo cubre las que se quedaron sin
// PDF. Las boletas se generan solo a demanda (al abrir el PDF) y no cuentan en el tope.
// Todo esta apagado salvo que el .env tenga PDF_WORKER=on.
const TOPE_BUZON = Number(process.env.PDF_WORKER_TOPE) || 500;
const LOTE = Number(process.env.PDF_WORKER_LOTE) || 5;
const INTERVALO_MS = 30 * 1000;
const USO_MAXIMO_BASE_MB = 8704; // 85% del limite de 10 GB de SQL Express
const MAX_INTENTOS = 3;
const DIAS_SIN_ACEPTAR = 30; // un PDF sin enviar tras tanto tiempo no se va a subir: se vacia (se regenera al abrirlo)

const db = () => process.env.DB_DATABASE_AUXILIAR || '';
const activo = () => process.env.PDF_WORKER === 'on';
const esFacturaONc = (tipo: string | null | undefined) => tipo === '01' || tipo === '07';

// Estado compartido entre el arranque (instrumentation) y las acciones del servidor, que son bundles distintos
interface EstadoBuzon { cola: Promise<unknown>; fallidos: Map<number, number>; ejecutando: boolean; avisoBase: boolean; iniciado: boolean }
const g = globalThis as unknown as { __pdfBuzon?: EstadoBuzon };
const estado: EstadoBuzon = (g.__pdfBuzon ??= { cola: Promise.resolve(), fallidos: new Map(), ejecutando: false, avisoBase: false, iniciado: false });

// Un PDF a la vez: no se satura la PC de la estacion ni se compite por Chromium
function enCola<T>(tarea: () => Promise<T>): Promise<T> {
  const siguiente = estado.cola.then(tarea, tarea);
  estado.cola = siguiente.catch(() => undefined);
  return siguiente;
}

// Cuantos PDF de facturas/NC hay esperando a que el facturador los suba. Devuelve null si la base esta casi llena.
async function cupoDisponible(): Promise<number> {
  const base = await executeQuery<{ usado: number }[]>(db(), `SELECT FILEPROPERTY(name, 'SpaceUsed') * 8 / 1024 AS usado FROM sys.database_files WHERE type = 0`);
  if ((base[0]?.usado ?? 0) >= USO_MAXIMO_BASE_MB) {
    if (!estado.avisoBase) console.error(`PDF buzon: la base usa ${base[0]?.usado} MB (limite ${USO_MAXIMO_BASE_MB}); no se generan mas PDF`);
    estado.avisoBase = true;
    return 0;
  }
  estado.avisoBase = false;
  const buzon = await executeQuery<{ n: number }[]>(db(), `SELECT COUNT(*) AS n FROM Comprobantes WHERE pdf_enviado = 0 AND pdf_bytes IS NOT NULL AND tipo_comprobante IN ('01','07')`);
  return TOPE_BUZON - (buzon[0]?.n ?? 0);
}

// Limpieza de respaldo: lo ya subido no debe quedarse en la base, ni los PDF de comprobantes que nunca se aceptaron
async function limpiar() {
  await executeQuery(db(), `UPDATE TOP (200) Comprobantes SET pdf_bytes = NULL WHERE pdf_enviado = 1 AND pdf_bytes IS NOT NULL`);
  await executeQuery(db(), `UPDATE TOP (200) Comprobantes SET pdf_bytes = NULL WHERE pdf_enviado = 0 AND pdf_bytes IS NOT NULL AND enviado = 0 AND fecha_hora < DATEADD(day, -${DIAS_SIN_ACEPTAR}, GETDATE())`);
}

// Se llama justo despues de emitir una factura o nota de credito. Nunca lanza ni retrasa la venta.
export function generarPdfAlEmitir(comprobanteId: number, tipoComprobante: string | null | undefined): void {
  if (!activo() || !esFacturaONc(tipoComprobante)) return;
  void enCola(async () => {
    try {
      if ((await cupoDisponible()) <= 0) return; // buzon lleno: el generador de fondo lo hara cuando haya cupo
      const pdf = await generarPdfComprobante(comprobanteId);
      await saveComprobantePdfBytes(comprobanteId, pdf);
    } catch (error) {
      console.error(`PDF buzon: no se pudo generar el PDF del comprobante ${comprobanteId} al emitir:`, error);
    }
  });
}

// Facturas/NC aceptadas por SUNAT que se quedaron sin PDF (reinicio, buzon lleno, historico)
async function cicloFondo() {
  await limpiar();
  const cupo = await cupoDisponible();
  if (cupo <= 0) return;

  const cantidad = Math.min(LOTE, cupo);
  const candidatos = await executeQuery<{ id: number }[]>(db(), `SELECT TOP (${cantidad + estado.fallidos.size}) id FROM Comprobantes WHERE enviado = 1 AND pdf_enviado = 0 AND pdf_bytes IS NULL AND tipo_comprobante IN ('01','07') ORDER BY id DESC`);
  let hechos = 0;
  for (const { id } of candidatos) {
    if (hechos >= cantidad) break;
    if ((estado.fallidos.get(id) ?? 0) >= MAX_INTENTOS) continue;
    try {
      await enCola(async () => {
        const pdf = await generarPdfComprobante(id);
        await saveComprobantePdfBytes(id, pdf);
      });
      hechos++;
    } catch (error) {
      estado.fallidos.set(id, (estado.fallidos.get(id) ?? 0) + 1);
      console.error(`PDF buzon: no se pudo generar el PDF del comprobante ${id} (intento ${estado.fallidos.get(id)}):`, error);
    }
  }
}

export function iniciarPdfBuzon() {
  if (estado.iniciado) return;
  estado.iniciado = true;
  console.log(`PDF buzon: activo (tope ${TOPE_BUZON}; al emitir y respaldo de ${LOTE} cada ${INTERVALO_MS / 1000} s)`);
  setInterval(async () => {
    if (estado.ejecutando) return;
    estado.ejecutando = true;
    try {
      await cicloFondo();
    } catch (error) {
      console.error('PDF buzon: error en el ciclo:', error);
    } finally {
      estado.ejecutando = false;
    }
  }, INTERVALO_MS);
}
