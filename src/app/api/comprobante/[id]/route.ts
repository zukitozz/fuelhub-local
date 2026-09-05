import { obtieneComprobantePDF } from '@/actions';
import { currencyFormat, toLocaleOnlyDate, toLocaleShow, Constants } from '@/utils';
import { getComprobantePdfBytes, saveComprobantePdfBytes } from '@/utils/db';
import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import QRCode from 'qrcode';
// Configuración para obligar a Next.js a ejecutar esto siempre en el servidor de forma dinámica
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const comprobanteId = Number.parseInt(id);

    // Proveedor alterno: si ya se generó el PDF antes, se sirve el mismo guardado
    // en vez de regenerarlo (evita que un comprobante legal cambie de contenido con el tiempo).
      const storedPdf = await getComprobantePdfBytes(comprobanteId);
      if (storedPdf) {
        return new NextResponse(Buffer.from(storedPdf), {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="comprobante-${comprobanteId}.pdf"`,
          },
        });
      }

    const comprobante = await obtieneComprobantePDF(comprobanteId);

    const qrText = `${process.env.NEXT_PUBLIC_RUC || ''}|${comprobante.TipoComprobante}|${comprobante.NumeracionComprobante}|${comprobante.TotalIgv}|${comprobante.TotalVenta}|${toLocaleOnlyDate(comprobante.FechaEmision)}|${comprobante.ReceptorRuc || '00000000'}`;

    // 3. Generar el código QR en formato DataURL (Base64)
    const qrDataUrl = await QRCode.toDataURL(qrText, {
      margin: 1,
      width: 100,
      errorCorrectionLevel: 'M'
    });    

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Comprobante ${comprobante.NumeracionComprobante}</title>
      <style>
        @page {
          size: A4;
          margin: 15mm 12mm;
        }
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          margin: 0;
          padding: 0;
          color: #2d3748;
          font-size: 10pt;
          line-height: 1.4;
        }
        .header-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 25px;
        }
        .header-table td {
          padding: 0;
          vertical-align: top;
        }
        .company-info h1 {
          font-size: 16pt;
          color: #1a365d;
          margin: 0 0 5px 0;
          text-transform: uppercase;
          font-weight: bold;
        }
        .company-info p {
          margin: 2px 0;
          color: #4a5568;
          font-size: 9pt;
        }
        .ruc-box {
          border: 2px solid #1a365d;
          border-radius: 6px;
          text-align: center;
          padding: 12px;
          background-color: #f7fafc;
          width: 260px;
          float: right;
        }
        .ruc-box h2 {
          font-size: 12pt;
          color: #1a365d;
          margin: 0 0 6px 0;
          letter-spacing: 1px;
        }
        .ruc-box .document-type {
          font-size: 10pt;
          font-weight: bold;
          background-color: #1a365d;
          color: white;
          padding: 5px;
          margin: 5px 0;
          text-transform: uppercase;
        }
        .ruc-box .number {
          font-size: 11pt;
          font-weight: bold;
          margin-top: 6px;
          color: #2d3748;
        }
        .info-section {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
        }
        .info-section td {
          padding: 6px 10px;
          font-size: 9pt;
          vertical-align: top;
        }
        .info-label {
          font-weight: bold;
          color: #4a5568;
          width: 18%;
        }
        .info-value {
          color: #2d3748;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
          margin-bottom: 20px;
        }
        .items-table th {
          background-color: #1a365d;
          color: white;
          font-weight: bold;
          text-align: left;
          padding: 8px 10px;
          font-size: 9pt;
        }
        .items-table td {
          padding: 8px 10px;
          font-size: 9pt;
          border-bottom: 1px solid #e2e8f0;
        }
        .text-center { text-align: center !important; }
        .text-right { text-align: right !important; }
        
        .totals-container {
          width: 100%;
          margin-top: 15px;
        }
        .totals-table {
          width: 40%;
          float: right;
          border-collapse: collapse;
        }
        .totals-table td {
          padding: 6px 10px;
          font-size: 9pt;
          border-bottom: 1px solid #e2e8f0;
        }
        .monto-letras {
          font-size: 9pt;
          font-style: italic;
          margin-top: 5px;
          padding: 8px 12px;
          background-color: #f7fafc;
          border-left: 3px solid #1a365d;
          width: 55%;
          float: left;
        }
        .footer-container {
          margin-top: 40px;
          width: 100%;
          border-top: 1px dashed #cbd5e0;
          padding-top: 15px;
        }
        .footer-table {
          width: 100%;
          border-collapse: collapse;
        }
        .footer-table td {
          vertical-align: top;
          font-size: 8pt;
          color: #718096;
        }
        .qr-placeholder {
          width: 100px;
          height: 100px;
          border: 1px solid #cbd5e0;
          text-align: center;
          font-size: 7pt;
          color: #a0aec0;
          padding-top: 35px;
          background-color: #fafafa;
          box-sizing: border-box;
        }
        .hash-box {
          font-family: monospace;
          font-size: 8pt;
          background-color: #f7fafc;
          padding: 5px;
          border: 1px solid #e2e8f0;
          word-break: break-all;
          margin-top: 5px;
        }
        .badge {
          background-color: #edf2f7;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 8pt;
          font-weight: bold;
        }
      </style>
    </head>
    <body>

      <table class="header-table">
        <tr>
          <td style="width: 60%;">
            <div class="company-info">
              <h1>${process.env.NEXT_PUBLIC_RS}</h1>
              <p><strong>Dirección:</strong> ${process.env.NEXT_PUBLIC_EMISOR_DIR}</p>
              <p style="margin-top: 8px;">
                <span class="badge">Isla ID: ${comprobante.Isla}</span> &nbsp; 
                <span class="badge">Pistola: N° ${comprobante.Pistola}</span>
              </p>
            </div>
          </td>
          <td style="width: 40%;">
            <div class="ruc-box">
              <h2>RUC: ${process.env.NEXT_PUBLIC_RUC}</h2>
              <div class="document-type">${comprobante.TipoComprobante}</div>
              <div class="number">${comprobante.NumeracionComprobante}</div>
            </div>
          </td>
        </tr>
      </table>

      <table class="info-section">
        <tr>
          <td class="info-label">Señor(es):</td>
          <td class="info-value" colspan="3">${comprobante.ReceptorRazonSocial}</td>
        </tr>
        <tr>
          <td class="info-label">Dirección:</td>
          <td class="info-value" colspan="3">${comprobante.ReceptorDireccion || '---'}</td>
        </tr>
        <tr>
          <td class="info-label">RUC / DNI:</td>
          <td class="info-value">${comprobante.ReceptorRuc}</td>
          <td class="info-label">Fecha Emisión:</td>
          <td class="info-value">${toLocaleOnlyDate(comprobante.FechaEmision)}</td>
        </tr>
        <tr>
          <td class="info-label">Moneda:</td>
          <td class="info-value">SOLES</td>
          <td class="info-label">Placa Vehículo:</td>
          <td class="info-value"><strong style="font-size: 10pt; color: #1a365d;">${comprobante.Placa || '---'}</strong></td>
        </tr>
        ${ comprobante.InicioMedidor && comprobante.FinMedidor ? `
            <tr>
              <td class="info-label">Medidores:</td>
              <td class="info-value" colspan="3">Inicial: ${comprobante.InicioMedidor} &nbsp;|&nbsp; Final: ${comprobante.FinMedidor}</td>
            </tr>
          ` : '' }
        <tr>
          <td class="info-label">Método Pago:</td>
          <td class="info-value" colspan="3">
            Efectivo: ${currencyFormat(comprobante.Efectivo)} | 
            Tarjeta: ${currencyFormat(comprobante.Tarjeta)} | 
            Yape: ${currencyFormat(comprobante.Yape)}
          </td>
        </tr>
      </table>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 12%;" class="text-center">Código</th>
            <th style="width: 12%;" class="text-center">Cantidad</th>
            <th style="width: 10%;" class="text-center">Unidad</th>
            <th style="width: 42%;">Descripción</th>
            <th style="width: 12%;" class="text-right">P. Unitario</th>
            <th style="width: 12%;" class="text-right">Importe</th>
          </tr>
        </thead>
        <tbody>
          ${comprobante.Items.map(item => `
            <tr>
              <td class="text-center">${item.codigo}</td>
              <td class="text-center">${item.cantidad}</td>
              <td class="text-center">${item.medida || 'GLL'}</td>
              <td>${item.descripcion}</td>
              <td class="text-right">${currencyFormat(item.precio_unitario)}</td>
              <td class="text-right">${currencyFormat(item.total_unitario)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals-container">
        <div class="monto-letras">
          <strong>Son:</strong> ${comprobante.MontoLetras}
        </div>
        
        <table class="totals-table">
          <tr>
            <td>Op. Gravada:</td>
            <td class="text-right">${currencyFormat(comprobante.TotalGravadas)}</td>
          </tr>
          <tr>
            <td>I.G.V. (18%):</td>
            <td class="text-right">${currencyFormat(comprobante.TotalIgv)}</td>
          </tr>
          <tr style="font-weight: bold; background-color: #f7fafc; color: #1a365d;">
            <td>Importe Total:</td>
            <td class="text-right">${currencyFormat(comprobante.TotalVenta)}</td>
          </tr>
        </table>
        <div style="clear: both;"></div>
      </div>

      <div class="footer-container">
        <table class="footer-table">
          <tr>
            <td style="width: 110px;">
              <img src="${qrDataUrl}" class="qr-img" alt="Código QR Factura Electrónica" />
            </td>
            <td>
              <p style="margin: 0 0 5px 0; font-weight: bold;">Código Hash Digital:</p>
              <div class="hash-box">${comprobante.CodigoHash || '---'}</div>
              
              <p style="margin: 12px 0 0 0; font-style: italic;">
                Representación impresa de la Factura Electrónica, generada en conformidad con las normas de SUNAT desde el sistema de control de la estación de servicio.
              </p>
            </td>
          </tr>
        </table>
      </div>

    </body>
    </html>
    `;

    // ==========================================
    // 3. INICIALIZAR PUPPETEER ESTÁNDAR
    // ==========================================
    const browser = await puppeteer.launch({
      headless: true, 
      args: ['--no-sandbox', '--disable-setuid-sandbox'], // Parámetros obligatorios para Linux / Servidores virtuales
    });

    const page = await browser.newPage();
    
    // Asignar el contenido HTML
    // 'networkidle0' can be incompatible with some typings; use 'load' which is supported
    await page.setContent(htmlContent, { waitUntil: 'load' });

    // Generar el Buffer del archivo PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true, // Importante para que se impriman los colores de fondo de las tablas y badges
    });

    await browser.close();
    console.log("aca estoy rony culon")
    try {
      await saveComprobantePdfBytes(comprobanteId, Buffer.from(pdfBuffer));
    } catch (saveError) {
      // No se debe romper la descarga del PDF si falla el guardado del histórico
      console.error("Error guardando pdf_bytes del comprobante:", saveError);
    }

    // ==========================================
    // 4. RETORNAR EL ARCHIVO PDF AL NAVEGADOR
    // ==========================================
    // Ensure body is a Node Buffer to satisfy NextResponse BodyInit typing
    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        // 'inline' abre el PDF en el navegador. Cambia a 'attachment' si deseas descarga directa instantánea.
        'Content-Disposition': `inline; filename="comprobante-${comprobante.NumeracionComprobante}.pdf"`,
      },
    });

  } catch (error) {
    console.error("Error en la API de PDF:", error);
    return NextResponse.json(
      { error: "Error interno del servidor al procesar el PDF" }, 
      { status: 500 }
    );
  }
}