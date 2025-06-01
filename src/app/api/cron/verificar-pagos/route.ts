import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

/**
 * Esta API está diseñada para ser llamada por un servicio externo de cron jobs
 * como Vercel Cron o similares. Incluye verificación de clave API para autenticar
 * las solicitudes entrantes.
 */
export async function GET(request: Request) {
  try {
    // Obtener encabezados y verificar autorización
    const headersList = await headers();
    const authToken = headersList.get('x-api-key');
    
    // Verificar token de autorización
    const apiKey = process.env.CRON_API_KEY;
    if (!apiKey || authToken !== apiKey) {
      console.error('Intento de acceso no autorizado a cron job');
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    console.log('Iniciando cron job de verificación de pagos');
    
    // Llamar a la API interna de verificación de pagos
    const verificationResponse = await fetch(new URL('/api/facturacion/verificar-pagos', request.url), {
      method: 'GET',
      headers: {
        'x-api-key': apiKey
      }
    });
    
    if (!verificationResponse.ok) {
      const errorText = await verificationResponse.text();
      throw new Error(`Error al ejecutar verificación: ${errorText}`);
    }
    
    const result = await verificationResponse.json();
    
    console.log('Cron job de verificación de pagos completado:', result);
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result
    });
  } catch (error: any) {
    console.error('Error en cron job de verificación de pagos:', error);
    return NextResponse.json(
      { error: error.message || 'Error en la ejecución del cron job' },
      { status: 500 }
    );
  }
} 