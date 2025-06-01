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

type RegistrarComprobanteRequest = {
  facturaId: number;
  comprobanteUrl: string;
  comprobanteKey: string;
  comentarios?: string;
};

export async function POST(request: Request) {
  if (!supabaseAdmin) {
    console.error("API /api/facturacion/registrar-comprobante: Error de configuración del servidor (Supabase Admin Client no disponible)");
    return NextResponse.json({ 
      success: false, 
      message: 'Error de configuración del servidor' 
    }, { status: 500 });
  }

  try {
    // 1. Obtener datos del request
    console.log("API /api/facturacion/registrar-comprobante: Request recibido.");
    const rawBody = await request.text();
    console.log("API /api/facturacion/registrar-comprobante: Raw request body:", rawBody);

    let data: RegistrarComprobanteRequest;
    try {
      data = JSON.parse(rawBody);
    } catch (parseError: any) {
      console.error("API /api/facturacion/registrar-comprobante: Error al parsear JSON del body:", parseError.message, "Body:", rawBody);
      return NextResponse.json({ 
        success: false, 
        message: `Error al parsear los datos de la solicitud: ${parseError.message}` 
      }, { status: 400 });
    }
    
    console.log("API /api/facturacion/registrar-comprobante: Parsed request data:", data);
    const { facturaId, comprobanteUrl, comprobanteKey, comentarios } = data;
    
    // Validaciones
    if (!facturaId || !comprobanteUrl || !comprobanteKey) {
      console.warn("API /api/facturacion/registrar-comprobante: Validación fallida - Faltan datos.", { facturaId, comprobanteUrl, comprobanteKey });
      return NextResponse.json({ 
        success: false, 
        message: 'Faltan datos requeridos: facturaId, comprobanteUrl o comprobanteKey' 
      }, { status: 400 });
    }
    
    // 2. Verificar que la factura existe y tiene un estado válido
    const { data: factura, error: facturaError } = await supabaseAdmin
      .from('facturas')
      .select('id, estado')
      .eq('id', facturaId)
      .single();
      
    if (facturaError) {
      return NextResponse.json({ 
        success: false, 
        message: `Error al obtener factura: ${facturaError.message}` 
      }, { status: 500 });
    }
    
    if (!factura) {
      return NextResponse.json({ 
        success: false, 
        message: 'Factura no encontrada' 
      }, { status: 404 });
    }
    
    // Verificar que el estado sea válido para añadir un comprobante
    if (factura.estado !== 'Enviada' && factura.estado !== 'Aprobada') {
      return NextResponse.json({ 
        success: false, 
        message: `No se puede registrar un comprobante para una factura en estado "${factura.estado}". Debe estar en estado "Enviada" o "Aprobada".` 
      }, { status: 400 });
    }
    
    // 3. Crear el registro de archivo para el comprobante
    const now = new Date().toISOString();
    
    const { data: archivo, error: archivoError } = await supabaseAdmin
      .from('archivos')
      .insert({
        filename: `Comprobante-Factura-${facturaId}.pdf`,
        external_storage_key: comprobanteKey,
        external_url: comprobanteUrl,
        created_at: now,
        updated_at: now
      })
      .select('id')
      .single();
      
    if (archivoError) {
      return NextResponse.json({ 
        success: false, 
        message: `Error al crear registro de archivo: ${archivoError.message}` 
      }, { status: 500 });
    }
    
    // 4. Actualizar la factura con el nuevo estado y el comprobante
    const { error: updateError } = await supabaseAdmin
      .from('facturas')
      .update({
        estado: 'PendienteValidacion',
        comprobante_pago_id: archivo.id,
        comentarios_pago: comentarios || null,
        fecha_comprobante: now
      })
      .eq('id', facturaId);
      
    if (updateError) {
      return NextResponse.json({ 
        success: false, 
        message: `Error al actualizar factura: ${updateError.message}` 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Comprobante registrado correctamente. La factura ha sido actualizada a estado "PendienteValidacion".',
      archivoId: archivo.id
    });
    
  } catch (error: any) {
    console.error("Error general en registrarComprobante:", error);
    return NextResponse.json({ 
      success: false, 
      message: `Error general: ${error.message}` 
    }, { status: 500 });
  }
} 