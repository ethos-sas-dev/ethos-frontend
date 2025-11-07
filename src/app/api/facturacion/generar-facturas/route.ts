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

type AreaDesglosada = {
  area: number;
  tipo_area: string;
  nombre_adicional?: string;
};

/**
 * Extrae el área útil del desglose de áreas de una propiedad.
 * Si no hay desglose o no se encuentra área útil, retorna el área total.
 */
function obtenerAreaParaCalculo(propiedad: any, codigoServicio: string): number {
  // Para el servicio APAC (parqueo), usar solo el área de parqueo/estacionamiento
  if (codigoServicio === 'APAC') {
    if (propiedad.areas_desglosadas && Array.isArray(propiedad.areas_desglosadas)) {
      const areaParqueo = propiedad.areas_desglosadas.find((area: AreaDesglosada) => {
        const tipo = area.tipo_area?.toLowerCase() || '';
        // cubrir variaciones: parqueo, parqueadero, estacionamiento
        return tipo.includes('parqueo')
      });
      if (areaParqueo && areaParqueo.area > 0) {
        console.log(`API /api/facturacion/generar-facturas: Usando área de parqueo para APAC - Propiedad ID ${propiedad.id}: ${areaParqueo.area} m²`);
        return areaParqueo.area;
      }
      console.warn(`API /api/facturacion/generar-facturas: No se encontró área de parqueo para APAC - Propiedad ID ${propiedad.id}`);
      // Para APAC, si no hay área de parqueo, no se debe facturar
      return 0;
    }
    console.warn(`API /api/facturacion/generar-facturas: Propiedad ID ${propiedad.id} no tiene desglose de áreas para APAC`);
    return 0;
  }

  // Para el servicio AOACO, usar solo el área útil
  if (codigoServicio === 'AOACO' && propiedad.areas_desglosadas && Array.isArray(propiedad.areas_desglosadas)) {
    const areaUtil = propiedad.areas_desglosadas.find((area: AreaDesglosada) => 
      area.tipo_area?.toLowerCase() === 'util'
    );
    
    if (areaUtil && areaUtil.area > 0) {
      console.log(`API /api/facturacion/generar-facturas: Usando área útil para AOACO - Propiedad ID ${propiedad.id}: ${areaUtil.area} m²`);
      return areaUtil.area;
    } else {
      console.warn(`API /api/facturacion/generar-facturas: No se encontró área útil para AOACO - Propiedad ID ${propiedad.id}, usando área total`);
    }
  }
  
  // Para otros servicios o cuando no hay desglose, usar área total
  return propiedad.area_total || 0;
}

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
        identificadores, areas_desglosadas,
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
        let area = obtenerAreaParaCalculo(propiedad, servicio.codigo);
        let porcentajeIva = servicio.porcentaje_iva_defecto || 0;
        
        // Buscar configuración específica: 1) intentar por servicio_id; 2) fallback genérico
        let configuracionEspecifica: any = null;
        let origenConfig: 'por_servicio' | 'generica' | 'ninguna' = 'ninguna';

        console.log(`API /api/facturacion/generar-facturas: Buscando configuración para propiedad ${propiedad.id}, cliente ${clienteId}, servicio ${servicioId}`);

        // Intento 1: por servicio_id (si la columna existe en la BD)
        try {
          const { data: confSrv, error: errSrv } = await supabaseAdmin
            .from('configuraciones_facturacion')
            .select('*')
            .eq('propiedad_id', propiedad.id)
            .eq('cliente_id', clienteId)
            .eq('servicio_id', servicioId)
            .eq('activo', true)
            .maybeSingle();
          
          console.log(`API /api/facturacion/generar-facturas: Búsqueda por servicio_id resultado:`, { confSrv, errSrv });
          
          if (errSrv && errSrv.code && errSrv.code !== 'PGRST116') {
            // Si es error de columna inexistente, ignorar; otros errores detener
            if (errSrv.details?.includes('servicio_id') || (errSrv.message && errSrv.message.toLowerCase().includes('servicio_id'))) {
              console.warn('API /api/facturacion/generar-facturas: columna servicio_id no existe en configuraciones_facturacion, se usará fallback genérico');
            } else {
              console.error('API /api/facturacion/generar-facturas: Error inesperado buscando configuración por servicio_id:', errSrv);
              throw errSrv;
            }
          }
          if (confSrv) {
            configuracionEspecifica = confSrv;
            origenConfig = 'por_servicio';
            console.log(`API /api/facturacion/generar-facturas: ✅ Configuración específica por servicio encontrada:`, confSrv);
          }
        } catch (e) {
          console.warn('API /api/facturacion/generar-facturas: error consultando configuración por servicio_id, usando fallback genérico', e);
        }

        // Intento 2: genérica activa para propiedad+cliente (solo si no tiene servicio_id o tiene servicio_id NULL)
        if (!configuracionEspecifica) {
          console.log(`API /api/facturacion/generar-facturas: No se encontró configuración específica, buscando genérica...`);
          const { data: confGen, error: errGen } = await supabaseAdmin
            .from('configuraciones_facturacion')
            .select('*')
            .eq('propiedad_id', propiedad.id)
            .eq('cliente_id', clienteId)
            .eq('activo', true)
            .is('servicio_id', null)  // Solo configuraciones genéricas (sin servicio_id)
            .maybeSingle();
          
          console.log(`API /api/facturacion/generar-facturas: Búsqueda genérica resultado:`, { confGen, errGen });
          
          if (errGen && errGen.code !== 'PGRST116') {
            throw new Error(`Error al buscar configuración de facturación: ${errGen.message}`);
          }
          if (confGen) {
            configuracionEspecifica = confGen;
            origenConfig = 'generica';
            console.log(`API /api/facturacion/generar-facturas: ✅ Configuración genérica encontrada:`, confGen);
          } else {
            console.log(`API /api/facturacion/generar-facturas: ❌ No se encontró ninguna configuración`);
          }
        }
        
        // Aplicar configuración específica si existe
        if (configuracionEspecifica) {
          // 1) IVA general (si está definido en la config)
          if (configuracionEspecifica.aplica_iva_general !== null) {
            porcentajeIva = configuracionEspecifica.aplica_iva_general ? 
              (configuracionEspecifica.porcentaje_iva_general || 0) : 0;
            if (porcentajeIva > 1) porcentajeIva = porcentajeIva / 100;
          }

          // 2) Tasa especial. Dos fuentes:
          //   a) Campo tasa_base_especial general
          //   b) precios_especiales_por_servicio[codigoServicio] si existe
          let tasaEspecial: number | null = null;
          if (configuracionEspecifica.tasa_base_especial !== null && configuracionEspecifica.tasa_base_especial !== undefined) {
            tasaEspecial = Number(configuracionEspecifica.tasa_base_especial);
          }
          if (!tasaEspecial && configuracionEspecifica.precios_especiales_por_servicio) {
            try {
              const mapa = configuracionEspecifica.precios_especiales_por_servicio as Record<string, any>;
              const porServicio = mapa?.[servicio.codigo];
              if (porServicio && typeof porServicio === 'number') {
                tasaEspecial = porServicio;
              } else if (porServicio && typeof porServicio === 'object' && porServicio.monto) {
                tasaEspecial = Number(porServicio.monto);
              }
            } catch (e) {
              console.warn(`API /api/facturacion/generar-facturas: precios_especiales_por_servicio inválido para propiedad ${propiedad.id}`, e);
            }
          }
          if (tasaEspecial !== null && !isNaN(tasaEspecial)) {
            precioUnitario = tasaEspecial;
            usarArea = true;
          }

          // Log diagnóstico
          console.log(`API /api/facturacion/generar-facturas: Config (${origenConfig}) aplicada prop ${propiedad.id}, cliente ${clienteId}, servicio ${servicio.codigo}: IVA=${porcentajeIva}, tasaEspecial=${tasaEspecial ?? 'N/A'}`);
        }
        
        // MACROLOTES: Si es un macrolote, usar directamente monto_alicuota_ordinaria (ya está calculado)
        // Los macrolotes tienen el Total Alícuota pre-calculado y NO se debe recalcular
        const esMacrolote = propiedad.identificadores?.inferior === 'Macrolote';
        
        // Calcular base imponible
        let baseImponible = 0;
        
        if (esMacrolote && propiedad.monto_alicuota_ordinaria) {
          // Para macrolotes, usar directamente el monto_alicuota_ordinaria (Total Alícuota)
          baseImponible = Number(propiedad.monto_alicuota_ordinaria);
          usarArea = false; // No multiplicar por área, ya es el total
          cantidad = 1; // Cantidad fija para macrolotes
          console.log(`API /api/facturacion/generar-facturas: Macrolote detectado - usando monto_alicuota_ordinaria: $${baseImponible}`);
          
          // Para macrolotes, asegurar que el IVA se maneje según configuración
          // Si hay configuración con aplica_iva_general = false, respetarla
          if (configuracionEspecifica && configuracionEspecifica.aplica_iva_general !== null) {
            porcentajeIva = configuracionEspecifica.aplica_iva_general ? 
              (configuracionEspecifica.porcentaje_iva_general || 0) : 0;
            if (porcentajeIva > 1) porcentajeIva = porcentajeIva / 100;
          } else {
            // Si no hay configuración explícita para macrolote, no aplicar IVA por defecto
            porcentajeIva = 0;
            console.log(`API /api/facturacion/generar-facturas: Macrolote sin configuración de IVA - estableciendo IVA = 0`);
          }
        } else {
          // Lógica normal para propiedades que no son macrolotes
          if (usarArea) {
            if (area <= 0) {
              resultados.omitidas++;
              continue; // No se puede facturar sin área si es por m2
            }
            cantidad = area; // La cantidad en items_factura debe reflejar el área
            baseImponible = precioUnitario * cantidad;
          } else {
            baseImponible = precioUnitario * cantidad;
          }
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