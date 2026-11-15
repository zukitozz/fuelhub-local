import { generarPdfComprobante } from '@/utils/comprobante-pdf';
import { getComprobantePdfBytes, saveComprobantePdfBytes } from '@/utils/db';
import { NextRequest, NextResponse } from 'next/server';
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
      if (storedPdf?.pdf_bytes) {
        return new NextResponse(Buffer.from(storedPdf.pdf_bytes), {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${process.env.NEXT_PUBLIC_RUC}-${storedPdf.numeracion_comprobante}.pdf"`,
          },
        });
      }

    const pdf = await generarPdfComprobante(comprobanteId);
    try {
      // Solo facturas y notas de credito se guardan en pdf_bytes; las boletas se regeneran cada vez
      if (storedPdf?.tipo_comprobante === '01' || storedPdf?.tipo_comprobante === '07') await saveComprobantePdfBytes(comprobanteId, pdf);
    } catch (saveError) {
      // No se debe romper la descarga del PDF si falla el guardado del histórico
      console.error("Error guardando pdf_bytes del comprobante:", saveError);
    }

    // ==========================================
    // 4. RETORNAR EL ARCHIVO PDF AL NAVEGADOR
    // ==========================================
    // Ensure body is a Node Buffer to satisfy NextResponse BodyInit typing
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        // 'inline' abre el PDF en el navegador. Cambia a 'attachment' si deseas descarga directa instantánea.
        'Content-Disposition': `inline; filename="${process.env.NEXT_PUBLIC_RUC}-${storedPdf?.numeracion_comprobante ?? comprobanteId}.pdf"`,
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