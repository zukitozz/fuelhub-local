// Se ejecuta una vez al arrancar el servidor de Next. El generador de PDF solo corre si PDF_WORKER=on en el .env.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.PDF_WORKER === 'on') {
    const { iniciarPdfBuzon } = await import('./utils/pdf-buzon');
    iniciarPdfBuzon();
  }
}
