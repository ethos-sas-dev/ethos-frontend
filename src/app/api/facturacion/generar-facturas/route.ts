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

type GenerarFacturasRequest = {
  proyectoId: number;
  servicioId: number;
  periodo: string; // Formato YYYY-MM
  propiedadesIds?: number[]; // IDs de propiedades específicas (opcional)
};

export async function POST(request: Request) {
  if (!supabaseAdmin) {
    console.error("API /api/facturacion/generar-facturas: Error de configuración del servidor (Supabase Admin Client no disponible)");
    return NextResponse.json({ 
      success: false, 
      message: 'Error de configuración del servidor' 
    }, { status: 500 });
  }

  try {
    // 1. Obtener datos del request
    console.log("API /api/facturacion/generar-facturas: Request recibido.");
    const rawBody = await request.text();
    console.log("API /api/facturacion/generar-facturas: Raw request body:", rawBody);

    let data: GenerarFacturasRequest;
    try {
      data = JSON.parse(rawBody);
    } catch (parseError: any) {
      console.error("API /api/facturacion/generar-facturas: Error al parsear JSON del body:", parseError.message, "Body:", rawBody);
      return NextResponse.json({ 
        success: false, 
        message: `Error al parsear los datos de la solicitud: ${parseError.message}` 
      }, { status: 400 });
    }
    
    console.log("API /api/facturacion/generar-facturas: Parsed request data:", data);
    const { proyectoId, servicioId, periodo, propiedadesIds } = data;
    
    // Validaciones
    if (!proyectoId || !servicioId || !periodo) {
      console.warn("API /api/facturacion/generar-facturas: Validación fallida - Faltan datos. ProyectoID:", proyectoId, "ServicioID:", servicioId, "Periodo:", periodo);
      return NextResponse.json({ 
        success: false, 
        message: 'Faltan datos requeridos: proyectoId, servicioId o periodo' 
      }, { status: 400 });
    }
    
    // 2. Obtener información del servicio
    const { data: servicio, error: servicioError } = await supabaseAdmin
      .from('servicios')
      .select('*')
      .eq('id', servicioId)
      .single();
      
    if (servicioError || !servicio) {
      return NextResponse.json({ 
        success: false, 
        message: `Error al obtener servicio: ${servicioError?.message || 'No encontrado'}` 
      }, { status: 404 });
    }
    
    // 3. Obtener propiedades del proyecto
    let query = supabaseAdmin
      .from('propiedades')
      .select(`
        id, estado_uso, monto_alicuota_ordinaria, area_total, encargado_pago,
        proyecto_id, propietario_id, ocupante_id, ocupante_externo,
        identificadores,
        propietario:propietario_id (
          id, tipo_persona, rol,
          persona_natural:persona_natural_id (id, razon_social, ruc, cedula),
          persona_juridica:persona_juridica_id (id, razon_social, ruc, nombre_comercial)
        ),
        ocupante:ocupante_id (
          id, tipo_persona, rol,
          persona_natural:persona_natural_id (id, razon_social, ruc, cedula),
          persona_juridica:persona_juridica_id (id, razon_social, ruc, nombre_comercial)
        )
      `)
      .eq('proyecto_id', proyectoId);
      
    // Si hay propiedades específicas, filtrar solo por esas
    if (propiedadesIds && propiedadesIds.length > 0) {
      query = query.in('id', propiedadesIds);
      console.log(`API /api/facturacion/generar-facturas: Filtrando por propiedades específicas: ${propiedadesIds.join(', ')}`);
    }
      
    const { data: propiedades, error: propiedadesError } = await query;
      
    if (propiedadesError) {
      return NextResponse.json({ 
        success: false, 
        message: `Error al obtener propiedades: ${propiedadesError.message}` 
      }, { status: 500 });
    }
    
    // Si no hay propiedades que procesar
    if (!propiedades || propiedades.length === 0) {
      return NextResponse.json({
        success: true,
        generadas: 0,
        omitidas: 0,
        errores: 0,
        message: propiedadesIds && propiedadesIds.length > 0 
          ? 'No se encontraron propiedades con los IDs proporcionados' 
          : 'No hay propiedades en este proyecto'
      });
    }
    
    // 4. Procesar cada propiedad y crear facturas borrador
    const resultados = { generadas: 0, omitidas: 0, errores: 0, erroresDetalle: [] as string[] };
    const now = new Date().toISOString();
    
    console.log(`API /api/facturacion/generar-facturas: Procesando ${propiedades.length} propiedades para servicio ${servicio.codigo} (${servicio.nombre})`);
    
    for (const propiedad of propiedades || []) {
      try {
        console.log(`API /api/facturacion/generar-facturas: Procesando propiedad ID ${propiedad.id}`);
        
        // Filtro por tipo de propiedad según el servicio
        if (servicio.codigo === 'AOACL') {
          // AOACL: Solo para propiedades tipo "local"
          const tieneLocal = propiedad.identificadores && (
            (propiedad.identificadores.inferior && propiedad.identificadores.inferior.toLowerCase().includes('local')) ||
            (propiedad.identificadores.superior && propiedad.identificadores.superior.toLowerCase().includes('local')) ||
            (propiedad.identificadores.intermedio && propiedad.identificadores.intermedio.toLowerCase().includes('local'))
          );
          if (!tieneLocal) {
            console.log(`API /api/facturacion/generar-facturas: Omitiendo propiedad ID ${propiedad.id} - servicio AOACL requiere identificador "local" (identificadores: ${JSON.stringify(propiedad.identificadores)})`);
            resultados.omitidas++;
            continue;
          }
        } else if (servicio.codigo === 'AOACO') {
          // AOACO: Solo para propiedades tipo "oficina"
          const tieneOficina = propiedad.identificadores && (
            (propiedad.identificadores.inferior && propiedad.identificadores.inferior.toLowerCase().includes('oficina')) ||
            (propiedad.identificadores.superior && propiedad.identificadores.superior.toLowerCase().includes('oficina')) ||
            (propiedad.identificadores.intermedio && propiedad.identificadores.intermedio.toLowerCase().includes('oficina'))
          );
          if (!tieneOficina) {
            console.log(`API /api/facturacion/generar-facturas: Omitiendo propiedad ID ${propiedad.id} - servicio AOACO requiere identificador "oficina" (identificadores: ${JSON.stringify(propiedad.identificadores)})`);
            resultados.omitidas++;
            continue;
          }
        }
        
        // Verificar si la propiedad está en uso
        // if (propiedad.estado_uso !== 'enUso') {
        //   resultados.omitidas++;
        //   continue;
        // }
        
        // Determinar el cliente a facturar
        let clienteId: number | null = null;
        let clienteData = null;
        
        // Lógica especial: Si el servicio es APA2, siempre facturar al propietario
        if (servicio.codigo === 'APA2') {
          console.log(`API /api/facturacion/generar-facturas: Servicio APA2 detectado - forzando facturación al propietario`);
          if (propiedad.propietario) {
            clienteId = propiedad.propietario_id as number;
            clienteData = propiedad.propietario;
            console.log(`API /api/facturacion/generar-facturas: Propietario encontrado - ID: ${clienteId}`);
          } else {
            console.log(`API /api/facturacion/generar-facturas: PROBLEMA - Propiedad ID ${propiedad.id} no tiene propietario asignado`);
          }
        } else {
          // Lógica normal: usar el encargado_pago configurado
          console.log(`API /api/facturacion/generar-facturas: Usando encargado_pago: ${propiedad.encargado_pago}`);
          if (propiedad.encargado_pago === 'Propietario' && propiedad.propietario) {
            clienteId = propiedad.propietario_id as number;
            clienteData = propiedad.propietario;
            console.log(`API /api/facturacion/generar-facturas: Facturando al propietario - ID: ${clienteId}`);
          } else if (propiedad.encargado_pago === 'Arrendatario' && propiedad.ocupante && !propiedad.ocupante_externo) {
            clienteId = propiedad.ocupante_id as number;
            clienteData = propiedad.ocupante;
            console.log(`API /api/facturacion/generar-facturas: Facturando al arrendatario - ID: ${clienteId}`);
          } else {
            console.log(`API /api/facturacion/generar-facturas: PROBLEMA - No se pudo determinar cliente para propiedad ID ${propiedad.id}`);
            console.log(`API /api/facturacion/generar-facturas: - encargado_pago: ${propiedad.encargado_pago}`);
            console.log(`API /api/facturacion/generar-facturas: - tiene propietario: ${!!propiedad.propietario}`);
            console.log(`API /api/facturacion/generar-facturas: - tiene ocupante: ${!!propiedad.ocupante}`);
            console.log(`API /api/facturacion/generar-facturas: - ocupante_externo: ${propiedad.ocupante_externo}`);
          }
        }
        
        if (!clienteId || !clienteData) {
          console.log(`API /api/facturacion/generar-facturas: Omitiendo propiedad ID ${propiedad.id} - sin cliente válido`);
          resultados.omitidas++;
          continue;
        }
        
        // Calcular montos
        let precioUnitario = servicio.precio_base;
        let cantidad = 1;
        let usarArea = servicio.unidad?.toLowerCase().includes('m2');
        let area = propiedad.area_total || 0;
        let porcentajeIva = servicio.porcentaje_iva_defecto || 0;
        
        // Buscar configuración específica para esta propiedad, cliente y servicio
        const { data: configuracionEspecifica, error: configError } = await supabaseAdmin
          .from('configuraciones_facturacion')
          .select('*')
          .eq('propiedad_id', propiedad.id)
          .eq('cliente_id', clienteId)
          .eq('servicio_id', servicioId)
          .eq('activo', true)
          .maybeSingle();
        
        if (configError && configError.code !== 'PGRST116') {
          throw new Error(`Error al buscar configuración de facturación: ${configError.message}`);
        }
        
        // Aplicar configuración específica si existe
        if (configuracionEspecifica) {
          // Si hay tasa base especial, usarla en lugar del precio base
          if (configuracionEspecifica.tasa_base_especial !== null) {
            precioUnitario = configuracionEspecifica.tasa_base_especial;
            // Si tenemos tasa especial, asumimos que debemos usar el área
            usarArea = true;
          }
          
          // Si hay configuración de IVA, usarla
          if (configuracionEspecifica.aplica_iva_general !== null) {
            porcentajeIva = configuracionEspecifica.aplica_iva_general ? 
              (configuracionEspecifica.porcentaje_iva_general || 0) : 0;
              
            // Convertir de porcentaje a decimal si es necesario
            if (porcentajeIva > 1) {
              porcentajeIva = porcentajeIva / 100;
            }
          }
        }
        
        // Si es alícuota, usar el monto específico de la propiedad si está configurado
        if (servicio.codigo === 'AOA3' && propiedad.monto_alicuota_ordinaria) {
          precioUnitario = propiedad.monto_alicuota_ordinaria;
          usarArea = false; // No multiplicar por área si ya tenemos monto específico
        }
        
        // Calcular base imponible
        let baseImponible = 0;
        if (usarArea) {
          if (area <= 0) {
            resultados.omitidas++;
            continue; // No se puede facturar sin área si es por m2
          }
          baseImponible = precioUnitario * area;
          precioUnitario = baseImponible; // Ajustar precio unitario
        } else {
          baseImponible = precioUnitario * cantidad;
        }
        
        // Redondear a 2 decimales
        baseImponible = parseFloat(baseImponible.toFixed(2));
        
        // Calcular IVA y total
        const iva = porcentajeIva > 0 ? parseFloat((baseImponible * porcentajeIva).toFixed(2)) : 0;
        const total = parseFloat((baseImponible + iva).toFixed(2));
        
        // Verificar si ya existe una factura para este periodo, propiedad, servicio y estado borrador
        const { data: facturasExistentes, error: facturaExistenteError } = await supabaseAdmin
          .from('facturas')
          .select('id, items_factura')
          .eq('periodo', periodo)
          .eq('propiedad_id', propiedad.id)
          .eq('estado', 'Borrador');
          
        if (facturaExistenteError) {
          throw new Error(`Error al verificar facturas existentes: ${facturaExistenteError.message}`);
        }
        
        // Verificar si ya existe una factura con el mismo servicio
        let facturaDelMismoServicio = false;
        if (facturasExistentes && facturasExistentes.length > 0) {
          facturaDelMismoServicio = facturasExistentes.some(factura => {
            if (factura.items_factura && factura.items_factura.length > 0) {
              return factura.items_factura[0].codigoServicio === servicio.codigo;
            }
            return false;
          });
        }
        
        if (facturaDelMismoServicio) {
          console.log(`API /api/facturacion/generar-facturas: Omitiendo propiedad ID ${propiedad.id} - ya existe factura borrador para servicio ${servicio.codigo}`);
          resultados.omitidas++;
          continue; // Omitir si ya existe factura borrador para este servicio específico
        }
        
        // Preparar items_factura
        const descripcionServicio = usarArea 
          ? `${servicio.nombre} (Área: ${area} ${servicio.unidad || 'm²'})`
          : servicio.nombre;
          
        const itemsFactura = [{
          descripcion: descripcionServicio,
          codigoServicio: servicio.codigo,
          cantidad: cantidad,
          precioUnitario: precioUnitario,
          porcentajeIva: porcentajeIva
        }];
        
        // Crear factura borrador
        const { data: facturaCreada, error: facturaError } = await supabaseAdmin
          .from('facturas')
          .insert({
            periodo: periodo,
            estado: 'Borrador',
            propiedad_id: propiedad.id,
            cliente_id: clienteId,
            fecha_generacion: now,
            subtotal: baseImponible,
            monto_iva: iva,
            total: total,
            items_factura: itemsFactura
          })
          .select('id')
          .single();
          
        if (facturaError) {
          throw new Error(`Error al crear factura: ${facturaError.message}`);
        }
        
        resultados.generadas++;
      } catch (error: any) {
        resultados.errores++;
        resultados.erroresDetalle.push(
          `Propiedad ID ${propiedad.id}: ${error.message || 'Error desconocido'}`
        );
        console.error(`Error procesando propiedad ${propiedad.id}:`, error);
      }
    }
    
    console.log(`API /api/facturacion/generar-facturas: RESUMEN FINAL:`);
    console.log(`API /api/facturacion/generar-facturas: - Propiedades procesadas: ${propiedades.length}`);
    console.log(`API /api/facturacion/generar-facturas: - Facturas generadas: ${resultados.generadas}`);
    console.log(`API /api/facturacion/generar-facturas: - Propiedades omitidas: ${resultados.omitidas}`);
    console.log(`API /api/facturacion/generar-facturas: - Errores: ${resultados.errores}`);
    if (resultados.erroresDetalle.length > 0) {
      console.log(`API /api/facturacion/generar-facturas: - Detalles de errores:`, resultados.erroresDetalle);
    }
    
    return NextResponse.json({
      success: true,
      ...resultados,
      mensaje: `Proceso completado. Generadas: ${resultados.generadas}, Omitidas: ${resultados.omitidas}, Errores: ${resultados.errores}`
    });
    
  } catch (error: any) {
    console.error("Error general en generarFacturas:", error);
    return NextResponse.json({ 
      success: false, 
      message: `Error general: ${error.message}` 
    }, { status: 500 });
  }
} 