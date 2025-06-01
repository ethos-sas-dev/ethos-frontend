import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Función para obtener cobros de Contifico
async function obtenerCobrosDeFactura(contifico_id: string, proyecto_id: number) {
  console.log(`[obtenerCobrosDeFactura] Iniciando consulta para factura Contifico ID: ${contifico_id}, Proyecto ID: ${proyecto_id}`);
  try {
    // Obtener la API key de Contifico del proyecto
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, { 
      auth: { persistSession: false } 
    });
    
    console.log(`[obtenerCobrosDeFactura] Consultando API key para proyecto ${proyecto_id}`);
    // Consultar la API key de Contifico para el proyecto específico
    const { data: proyectoData, error: proyectoError } = await supabase
      .from('proyectos')
      .select('api_contifico')
      .eq('id', proyecto_id)
      .single();
      
    if (proyectoError || !proyectoData?.api_contifico) {
      console.error(`Error al obtener API key de Contifico para proyecto ${proyecto_id}:`, proyectoError);
      return null;
    }
    
    const apiKey = proyectoData.api_contifico;
    console.log(`[obtenerCobrosDeFactura] API key obtenida para proyecto ${proyecto_id}. Longitud: ${apiKey.length}`);
    
    // Llamar a la API de Contifico para obtener cobros
    const url = `https://api.contifico.com/sistema/api/v1/documento/${contifico_id}/cobro`;
    console.log(`[obtenerCobrosDeFactura] Consultando API Contifico en: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`[obtenerCobrosDeFactura] Respuesta de API Contifico - Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      throw new Error(`Error al consultar cobros: ${response.statusText} (${response.status})`);
    }
    
    const cobros = await response.json();
    console.log(`[obtenerCobrosDeFactura] Cobros obtenidos: ${cobros.length || 0}`, 
                cobros.length > 0 ? `Primer cobro: ${JSON.stringify(cobros[0]).substring(0, 100)}...` : 'Sin cobros');
    
    return cobros;
  } catch (error) {
    console.error('[obtenerCobrosDeFactura] Error al obtener cobros de Contifico:', error);
    return null;
  }
}

// Mapear forma de cobro de Contifico a nuestro formato
function mapearMedioPago(formaCobro: string): string {
  switch (formaCobro) {
    case 'CQ': return 'cheque';
    case 'TRA': return 'transferencia';
    case 'EF': return 'efectivo';
    case 'TC': return 'tarjeta';
    default: return 'transferencia'; // Valor por defecto
  }
}

// Definir tipo para factura
type Factura = {
  id: number;
  estado: string;
  contifico_id: string;
  total: number;
  retencion?: number;
  cliente_id: number;
  propiedad: {
    proyecto_id: number;
  };
};

export async function GET() {
  console.log('[verificarPagos] Iniciando verificación de pagos');
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Variables de entorno faltantes');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, { 
      auth: { persistSession: false } 
    });
    
    console.log('[verificarPagos] Consultando facturas pendientes');
    // Obtener facturas no Pagadas y no borrador (incluir PagadaConComprobante para verificar si hay nuevos pagos)
    const { data: facturas, error } = await supabase
      .from('facturas')
      .select(`
        id, 
        estado, 
        contifico_id, 
        total, 
        retencion,
        propiedad:propiedades (
          proyecto_id
        ),
        cliente_id
      `)
      .not('estado', 'eq', 'Borrador')
      .not('contifico_id', 'is', null);
      
    if (error) {
      throw error;
    }
    
    console.log(`[verificarPagos] ${facturas?.length || 0} facturas encontradas para verificar`);
    
    let actualizados = 0;
    let nuevosCobrosProcesados = 0;
    let totalCobrosOmitidos = 0;
    
    // Procesar cada factura
    for (const factura of facturas as unknown as Factura[] || []) {
      console.log(`[verificarPagos] Procesando factura ID: ${factura.id}, Contifico ID: ${factura.contifico_id}, Estado: ${factura.estado}`);
      
      // Extraer el proyecto_id de la propiedad
      const proyecto_id = factura.propiedad?.proyecto_id;
        
      if (!factura.contifico_id || !proyecto_id) {
        console.log(`[verificarPagos] Omitiendo factura ID: ${factura.id} - Sin Contifico ID o proyecto_id`);
        continue;
      }
      
      // Obtener cobros de Contifico
      const cobros = await obtenerCobrosDeFactura(
        factura.contifico_id, 
        proyecto_id
      );
      
      // Si no hay cobros, continuar con la siguiente factura
      if (!cobros || cobros.length === 0) {
        console.log(`[verificarPagos] No se encontraron cobros para factura ID: ${factura.id}`);
        continue;
      }
      
      console.log(`[verificarPagos] ${cobros.length} cobros encontrados para factura ID: ${factura.id}`);
      
      // Verificar cobros y actualizar registros
      let nuevosCobrosSincronizados = 0; // Solo cobros nuevos insertados exitosamente
      let nuevosPagosRegistradosEsteCiclo = 0;
      let cobrosOmitidosPorYaExistir = 0;
      let cobrosConError = 0;
      
      // Primero, obtener el total ya cobrado anteriormente (de pagos_cliente existentes)
      const { data: pagosExistentes, error: errorPagosExistentes } = await supabase
        .from('pagos_cliente')
        .select('monto')
        .eq('factura_id', factura.id);
        
      const totalYaCobrado = pagosExistentes?.reduce((sum, pago) => sum + (pago.monto || 0), 0) || 0;
      console.log(`[verificarPagos] Factura ID: ${factura.id}. Total ya cobrado anteriormente: $${totalYaCobrado.toFixed(2)}`);
      
      console.log(`[verificarPagos] Factura ID: ${factura.id}. Contifico devolvió ${cobros.length} cobro(s). Suma de montos reportados por Contifico: $${cobros.reduce((sum: number, c: any) => sum + parseFloat(c.monto), 0).toFixed(2)}`);
      
      for (const cobro of cobros) {
        // Verificar si ya existe un pago con este cobro
        console.log(`[verificarPagos] Procesando cobro de Contifico ID: ${cobro.id}, Monto: ${cobro.monto}`);
        const { data: pagoExistente, error: errorConsulta } = await supabase
          .from('pagos_cliente')
          .select('id')
          .eq('contifico_cobro_id', cobro.id)
          .maybeSingle();
          
        if (errorConsulta) {
          console.error(`[verificarPagos] Error al consultar pago existente para cobro Contifico ID: ${cobro.id}:`, errorConsulta);
          cobrosConError++;
          continue;
        }
        
        // Si ya existe un pago con este ID de cobro, solo omitirlo (NO sumarlo de nuevo)
        if (pagoExistente) {
          console.log(`[verificarPagos] Cobro Contifico ID: ${cobro.id} ya tiene un registro en pagos_cliente (ID: ${pagoExistente.id}). Omitiendo creación.`);
          cobrosOmitidosPorYaExistir++;
          // NO sumar aquí porque ya está incluido en totalYaCobrado
          continue;
        }
        
        const medioPago = mapearMedioPago(cobro.forma_cobro);
        console.log(`[verificarPagos] Forma de cobro: ${cobro.forma_cobro}, mapeada a: ${medioPago}`);
        
        // Mejorar el manejo de la fecha - verificar el formato
        let fechaPago: Date;
        try {
          // Intentar diferentes formatos de fecha
          if (cobro.fecha.includes('/')) {
            // Formato DD/MM/YYYY o MM/DD/YYYY
            const partes = cobro.fecha.split('/');
            if (partes.length === 3) {
              // Asumir DD/MM/YYYY (formato más común en Ecuador)
              fechaPago = new Date(`${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`);
            } else {
              fechaPago = new Date();
            }
          } else {
            fechaPago = new Date(cobro.fecha);
          }
          
          // Verificar si la fecha es válida
          if (isNaN(fechaPago.getTime())) {
            console.warn(`[verificarPagos] Fecha inválida para cobro ${cobro.id}: ${cobro.fecha}, usando fecha actual`);
            fechaPago = new Date();
          }
        } catch (error) {
          console.warn(`[verificarPagos] Error al parsear fecha para cobro ${cobro.id}: ${cobro.fecha}, usando fecha actual`);
          fechaPago = new Date();
        }
        
        console.log(`[verificarPagos] Fecha de cobro original: ${cobro.fecha}, convertida a: ${fechaPago.toISOString()}`);
        
        // Crear nuevo pago
        console.log(`[verificarPagos] Creando nuevo pago en pagos_cliente para cobro Contifico ID: ${cobro.id}, Monto: ${cobro.monto}`);
        
        const nuevoRegistro = {
          factura_id: factura.id,
          cliente_id: factura.cliente_id,
          monto: parseFloat(cobro.monto),
          medio_pago: medioPago,
          fecha_pago: fechaPago.toISOString(),
          contifico_cobro_id: cobro.id,
          numero_cheque: cobro.numero_cheque || null,
          observaciones: `Sincronizado automáticamente desde Contifico el ${new Date().toLocaleString('es-EC')}`
        };
        
        console.log(`[verificarPagos] Datos de nuevo pago:`, JSON.stringify(nuevoRegistro, null, 2));
        
        const { data: nuevoRegistroRes, error: errorInsert } = await supabase
          .from('pagos_cliente')
          .insert(nuevoRegistro)
          .select();
          
        if (errorInsert) {
          console.error(`[verificarPagos] ERROR al crear nuevo pago para cobro Contifico ID ${cobro.id}:`, errorInsert);
          console.error(`[verificarPagos] Datos que fallaron:`, JSON.stringify(nuevoRegistro, null, 2));
          cobrosConError++;
        } else {
          nuevosPagosRegistradosEsteCiclo++;
          nuevosCobrosProcesados++;
          nuevosCobrosSincronizados += parseFloat(cobro.monto); // Solo sumar cobros NUEVOS insertados exitosamente
          console.log(`[verificarPagos] ✅ Nuevo pago creado en pagos_cliente (ID: ${nuevoRegistroRes?.[0]?.id || 'desconocido'}) para cobro Contifico ID ${cobro.id}`);
        }
      }
      
      // El total cobrado es lo que ya existía + solo los nuevos cobros insertados
      const totalCobrado = totalYaCobrado + nuevosCobrosSincronizados;
      
      totalCobrosOmitidos += cobrosOmitidosPorYaExistir;
      
      console.log(`[verificarPagos] Factura ID: ${factura.id}. Resumen de procesamiento de cobros: ${nuevosPagosRegistradosEsteCiclo} nuevo(s) pago(s) registrado(s), ${cobrosOmitidosPorYaExistir} cobro(s) omitido(s) por ya existir, ${cobrosConError} cobro(s) con error.`);
      
      // Actualizar estado de la factura según el total cobrado + retención
      let nuevoEstado = factura.estado; // Mantener estado actual por defecto
      
      const retencion = factura.retencion || 0;
      const totalPagadoConRetencion = totalCobrado + retencion;
      
      if (totalPagadoConRetencion > 0) {
        // Solo cambiar estado si hay pagos o retenciones registradas
        if (totalPagadoConRetencion >= factura.total) {
          nuevoEstado = 'Pagada';
        } else {
          nuevoEstado = 'Parcial';
        }
      }
      
      console.log(`[verificarPagos] Factura ID: ${factura.id}. Total cobrado: $${totalCobrado.toFixed(2)} (Ya existente: $${totalYaCobrado.toFixed(2)} + Nuevos: $${nuevosCobrosSincronizados.toFixed(2)}) + Retención: $${retencion.toFixed(2)} = Total pagado: $${totalPagadoConRetencion.toFixed(2)} de $${factura.total.toFixed(2)}. Estado actual: ${factura.estado} → Nuevo estado: ${nuevoEstado}`);
      
      // Verificar si la factura tiene comprobante para el estado final
      const { data: comprobante, error: errorComprobante } = await supabase
        .from('facturas')
        .select('comprobante_pago_id')
        .eq('id', factura.id)
        .single();
        
      const estadoFinal = (nuevoEstado === 'Pagada' && comprobante?.comprobante_pago_id) 
        ? 'PagadaConComprobante' 
        : nuevoEstado;
      
      // Solo actualizar si el estado ha cambiado
      if (factura.estado !== estadoFinal) {
        console.log(`[verificarPagos] Actualizando factura ID: ${factura.id} de estado: ${factura.estado} a estado: ${estadoFinal}`);
        await supabase
          .from('facturas')
          .update({ estado: estadoFinal })
          .eq('id', factura.id);
        
        actualizados++;
      } else {
        console.log(`[verificarPagos] Factura ID: ${factura.id} mantiene estado: ${estadoFinal}`);
      }
    }
    
    console.log(`[verificarPagos] Proceso completado. Facturas procesadas: ${facturas?.length || 0}, Facturas actualizadas: ${actualizados}, Nuevos cobros procesados: ${nuevosCobrosProcesados}, Cobros omitidos: ${totalCobrosOmitidos}`);
    return NextResponse.json({ 
      mensaje: 'Sincronización de pagos completada exitosamente', 
      facturas_procesadas: facturas?.length || 0,
      facturas_actualizadas: actualizados,
      nuevos_cobros_procesados: nuevosCobrosProcesados,
      cobros_omitidos: totalCobrosOmitidos
    });
  } catch (error: any) {
    console.error('[verificarPagos] Error en el proceso de verificación de pagos:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Error en el proceso de sincronización',
        mensaje: 'Error al sincronizar pagos con Contifico'
      },
      { status: 500 }
    );
  }
} 