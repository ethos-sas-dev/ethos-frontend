import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuración del Cliente Supabase Admin
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Error: Variables de entorno no configuradas para Supabase");
}

const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null;

type EliminarFacturasRequest = {
  facturaIds: number[];
};

export async function POST(request: Request) {
  if (!supabaseAdmin) {
    console.error("API /api/facturacion/eliminar-facturas: Error de configuración del servidor");
    return NextResponse.json({ 
      success: false, 
      message: 'Error de configuración del servidor' 
    }, { status: 500 });
  }

  try {
    const data: EliminarFacturasRequest = await request.json();
    const { facturaIds } = data;
    
    console.log("API /api/facturacion/eliminar-facturas: Request recibido:", { facturaIds });
    
    // Validar que los IDs de factura existen
    if (!facturaIds || !Array.isArray(facturaIds) || facturaIds.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Debe proporcionar un array de IDs de facturas para eliminar' 
      }, { status: 400 });
    }

    // Verificar que las facturas existen y están en estado borrador
    const { data: facturasVerificacion, error: errorVerificacion } = await supabaseAdmin
      .from('facturas')
      .select('id, estado, periodo, propiedad_id')
      .in('id', facturaIds);
      
    if (errorVerificacion) {
      console.error("Error al verificar facturas:", errorVerificacion);
      return NextResponse.json({ 
        success: false, 
        message: `Error al verificar facturas: ${errorVerificacion.message}` 
      }, { status: 500 });
    }

    if (!facturasVerificacion || facturasVerificacion.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'No se encontraron facturas con los IDs proporcionados' 
      }, { status: 404 });
    }

    // Verificar que todas las facturas están en estado borrador
    const facturasNoBorrador = facturasVerificacion.filter(f => f.estado !== 'Borrador');
    if (facturasNoBorrador.length > 0) {
      const idsNoBorrador = facturasNoBorrador.map(f => f.id).join(', ');
      return NextResponse.json({ 
        success: false, 
        message: `Las siguientes facturas no están en estado borrador y no pueden ser eliminadas: ${idsNoBorrador}` 
      }, { status: 400 });
    }

    console.log(`Eliminando ${facturasVerificacion.length} facturas borrador`);

    // Eliminar las facturas
    const { error: errorEliminacion } = await supabaseAdmin
      .from('facturas')
      .delete()
      .in('id', facturaIds);

    if (errorEliminacion) {
      console.error("Error al eliminar facturas:", errorEliminacion);
      return NextResponse.json({ 
        success: false, 
        message: `Error al eliminar facturas: ${errorEliminacion.message}` 
      }, { status: 500 });
    }

    console.log(`Facturas eliminadas exitosamente: ${facturaIds.join(', ')}`);

    return NextResponse.json({
      success: true,
      message: `Se eliminaron ${facturasVerificacion.length} facturas borrador correctamente`,
      eliminadas: facturasVerificacion.length,
      facturas_eliminadas: facturasVerificacion.map(f => ({
        id: f.id,
        periodo: f.periodo,
        propiedad_id: f.propiedad_id
      }))
    });

  } catch (error: any) {
    console.error("Error general en eliminar-facturas:", error);
    return NextResponse.json({ 
      success: false, 
      message: `Error general: ${error.message}` 
    }, { status: 500 });
  }
} 