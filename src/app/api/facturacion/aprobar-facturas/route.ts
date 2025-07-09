import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Configuración del Cliente Supabase Admin
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Error: Variables de entorno no configuradas para Supabase");
}

const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null;

type AprobarFacturasRequest = {
  facturaIds: number[];
  prefijoSecuencia?: string;      // Nuevo campo opcional
  numeroSecuenciaInicial?: number; // Nuevo campo opcional
};

// Tipos simplificados para datos relacionados (ajustar según schema real)
type Proyecto = { id: number; nombre: string; api_contifico?: string; ubicacion?: string };
type PersonaNatural = { id: number; razon_social: string; cedula: string };
type PersonaJuridica = { id: number; razon_social: string; ruc: string };
type PerfilCliente = {
  id: number;
  tipo_persona: 'Natural' | 'Juridica';
  persona_natural?: PersonaNatural;
  persona_juridica?: PersonaJuridica;
  contacto_administrativo?: { email?: string; telefono?: string };
  contacto_proveedores?: { email?: string; telefono?: string };
  contacto_gerente?: { email?: string; telefono?: string };
  // usuario?: { email?: string }; // Mantener comentado
};
type Propiedad = {
  id: number;
  identificadores?: any;
  encargado_pago: 'Propietario' | 'Arrendatario';
  propietario?: PerfilCliente;
  ocupante?: PerfilCliente;
  proyecto: Proyecto;
  area_total?: number;
};
type ItemFactura = {
  descripcion: string;
  codigoServicio: string;
  cantidad: number;
  precioUnitario: number;
  porcentajeIva: number; // Ya debería estar en formato decimal (0.12)
};
type FacturaCompleta = {
  id: number;
  periodo: string;
  subtotal: number;
  monto_iva: number;
  total: number;
  estado: string;
  propiedad_id: number;
  cliente_id: number;
  items_factura: ItemFactura[];
  propiedad: Propiedad;
  cliente: PerfilCliente;
  servicio?: { id_contifico?: string }; // Necesitamos el ID de Contifico del servicio
};

// URL base de la API de Contífico (basado en el ejemplo anterior)
const CONTIFICO_API_URL = 'https://api.contifico.com/sistema/api/v1/documento/';

// Funciones Auxiliares (Inspiradas en código anterior)

/**
 * Extrae y formatea los datos del cliente necesarios para la API de Contífico.
 */
function obtenerDatosClienteParaContifico(cliente: PerfilCliente, propiedad: Propiedad): object | null {
  if (!cliente || !propiedad?.proyecto) return null;
  
  const tipo = cliente.tipo_persona === 'Natural' ? 'N' : 'J';
  let identificacion: { cedula: string } | { ruc: string } | null = null;
  let razonSocial = '';
  let direccion = propiedad.proyecto.ubicacion || ''; 

  // Buscar email y teléfono en los campos de contacto JSONB con prioridad
  let email = '';
  let telefonos = '';
  
  if (cliente.contacto_administrativo?.email) email = cliente.contacto_administrativo.email;
  else if (cliente.contacto_proveedores?.email) email = cliente.contacto_proveedores.email;
  else if (cliente.contacto_gerente?.email) email = cliente.contacto_gerente.email;
  
  if (cliente.contacto_administrativo?.telefono) telefonos = cliente.contacto_administrativo.telefono;
  else if (cliente.contacto_proveedores?.telefono) telefonos = cliente.contacto_proveedores.telefono;
  else if (cliente.contacto_gerente?.telefono) telefonos = cliente.contacto_gerente.telefono;

  if (tipo === 'N' && cliente.persona_natural) {
    if (!cliente.persona_natural.cedula) return null;
    identificacion = { cedula: cliente.persona_natural.cedula };
    razonSocial = cliente.persona_natural.razon_social || '';
    // No se busca teléfono aquí
  } else if (tipo === 'J' && cliente.persona_juridica) {
    if (!cliente.persona_juridica.ruc) return null; 
    identificacion = { ruc: cliente.persona_juridica.ruc };
    razonSocial = cliente.persona_juridica.razon_social || '';
    // No se busca teléfono aquí
  } else {
    return null; 
  }

  if (!razonSocial || !identificacion) return null;

  return {
    ...identificacion,
    razon_social: razonSocial,
    telefonos: telefonos, // Usar el teléfono encontrado en los contactos
    direccion: direccion,
    tipo: tipo,
    email: email, 
    es_extranjero: false
  };
}

/**
 * Prepara el array de detalles para Contífico a partir de items_factura.
 */
function prepararDetallesContifico(items: ItemFactura[], factura: FacturaCompleta, servicioContificoId?: string): any[] | null {
  if (!items || items.length === 0) return null;
  
  // Por ahora, asumimos que el primer item contiene el servicio principal
  const itemPrincipal = items[0];
  const idProductoContifico = servicioContificoId; // Usar el ID obtenido del servicio
  
  if (!idProductoContifico) {
    console.warn("No se encontró id_contifico para el servicio principal", itemPrincipal.codigoServicio);
    // Decidir si fallar o usar un ID genérico/default?
    // return null; // Fallar si no hay ID de contifico
  }
  
  // USAR LOS VALORES EXACTOS DE LA FACTURA - NO RECALCULAR
  // Convertir el porcentaje de IVA de decimal a porcentaje para Contifico
  const porcentajeIvaContifico = itemPrincipal.porcentajeIva > 0 ? Math.round(itemPrincipal.porcentajeIva * 100) : 0;
  
  // Usar directamente los valores precalculados de la factura para evitar discrepancias de redondeo
  let base_cero = 0;
  let base_gravable = 0;
  
  if (porcentajeIvaContifico > 0) {
    base_gravable = parseFloat(factura.subtotal.toFixed(2));
  } else {
    base_cero = parseFloat(factura.subtotal.toFixed(2));
  }

  // Precio unitario debe ser consistente con el subtotal de la factura
  const precioUnitario = parseFloat((factura.subtotal / itemPrincipal.cantidad).toFixed(6));

  return [{
    producto_id: idProductoContifico || 'ID_PRODUCTO_PENDIENTE', // Usar ID real o placeholder
    cantidad: itemPrincipal.cantidad, 
    precio: precioUnitario, 
    porcentaje_iva: porcentajeIvaContifico,
    porcentaje_descuento: 0.00,
    base_cero: base_cero,
    base_gravable: base_gravable,
    base_no_gravable: 0.00,
    descripcion_adicional: itemPrincipal.descripcion // Podríamos añadir más info aquí
  }];
}

/**
 * Construye el payload completo y ENVÍA a Contifico.
 */
const prepararYEnviarAContifico = async (
  factura: FacturaCompleta, 
  numeroDocumento: string // Recibe el número de documento como argumento
): Promise<{ success: boolean; contificoId?: string; error?: string }> => {
  
  // 1. Validar datos necesarios
  if (!factura.propiedad?.proyecto?.api_contifico) {
    return { success: false, error: "Falta API Key de Contifico en el proyecto." };
  }
  if (!factura.servicio?.id_contifico) {
      console.warn(`Factura ID ${factura.id}: Falta id_contifico para el servicio ${factura.items_factura?.[0]?.codigoServicio}. Usando placeholder.`);
  }
  
  const datosClienteContifico = obtenerDatosClienteParaContifico(factura.cliente, factura.propiedad);
  if (!datosClienteContifico) {
    return { success: false, error: "Faltan datos del cliente para Contifico." };
  }
  
  const detallesContifico = prepararDetallesContifico(factura.items_factura, factura, factura.servicio?.id_contifico);
  if (!detallesContifico) {
    return { success: false, error: "No se pudieron preparar los detalles de la factura." };
  }
  
  // 2. Construir Payload (Ya no genera número de documento aquí)
  const ahora = new Date();
  const fechaEmision = `${('0' + ahora.getDate()).slice(-2)}/${('0' + (ahora.getMonth() + 1)).slice(-2)}/${ahora.getFullYear()}`;
  
  // Obtener los identificadores de la propiedad en formato "ETAPA 4 - LOTE 2 - BODEGA 8"
  let identificadoresFormateados = '';
  if (factura.propiedad.identificadores) {
    const ids = factura.propiedad.identificadores;
    
    // Obtener identificador superior (ej: ETAPA 4)
    if (ids.superior && ids.idSuperior) {
      identificadoresFormateados += `${ids.superior.toUpperCase()} ${ids.idSuperior}`;
    }
    
    // Obtener identificador intermedio si existe (ej: LOTE 2)
    if (ids.intermedio && ids.idIntermedio) {
      identificadoresFormateados += ` - ${ids.intermedio.toUpperCase()} ${ids.idIntermedio}`;
    }
    
    // Obtener identificador inferior (ej: BODEGA 8)
    if (ids.inferior && ids.idInferior) {
      identificadoresFormateados += ` - ${ids.inferior.toUpperCase()} ${ids.idInferior}`;
    }
  }
  
  if (!identificadoresFormateados) {
    identificadoresFormateados = `PROPIEDAD ${factura.propiedad_id}`;
  }
  
  // Formatear el período de factura (ej: ABRIL 2025)
  let periodoFormateado = '';
  try {
    // Asumiendo que el periodo tiene formato YYYY-MM
    const [anio, mes] = factura.periodo.split('-');
    const nombreMes = new Date(parseInt(anio), parseInt(mes) - 1, 1).toLocaleDateString('es-ES', { month: 'long' }).toUpperCase();
    periodoFormateado = `${nombreMes} ${anio}`;
  } catch (e) {
    periodoFormateado = factura.periodo; // Si hay error, usar el formato original
  }
  
  // Construir la descripción completa
  const servicioNombre = factura.items_factura?.[0]?.descripcion || factura.items_factura?.[0]?.codigoServicio || 'ALICUOTA';
  const descripcionPayload = `${servicioNombre} ${periodoFormateado}, ${identificadoresFormateados}`.substring(0, 300);

  const payloadContifico = {
    pos: 'b8dafe87-f3d4-46c6-92b8-24c36e151dfb', // Asegúrate que este POS sea el correcto
    fecha_emision: fechaEmision,
    tipo_documento: 'FAC',
    documento: numeroDocumento, // Usa el número de documento proporcionado
    estado: 'P', 
    autorizacion: '', 
    cliente: datosClienteContifico,
    descripcion: descripcionPayload,
    subtotal_0: detallesContifico[0].base_cero, 
    subtotal_12: detallesContifico[0].base_gravable,
    iva: parseFloat(factura.monto_iva.toFixed(2)), 
    total: parseFloat(factura.total.toFixed(2)), 
    detalles: detallesContifico,
    electronico: true
  };
  
  // 3. LLAMADA REAL a Contífico
  console.log(`Enviando a Contífico (Factura ID: ${factura.id}, Documento: ${numeroDocumento})...`);
  
  try {
    const configAxios = {
      headers: {
        'Authorization': factura.propiedad.proyecto.api_contifico,
        'Content-Type': 'application/json'
      }
    };
    
    const responseContifico = await axios.post(CONTIFICO_API_URL, payloadContifico, configAxios);

    // Verificar respuesta exitosa (Status 2xx)
    if (responseContifico.status >= 200 && responseContifico.status < 300 && responseContifico.data?.id) {
      const contificoId = responseContifico.data.id;
      console.log(`ÉXITO Contífico: Factura ID ${factura.id} -> Contifico ID ${contificoId}`);
      return { success: true, contificoId };
    } else {
      // Respuesta inesperada pero no necesariamente un error de Axios
      const errorMsg = `Respuesta inesperada de Contífico: Status ${responseContifico.status}, Data: ${JSON.stringify(responseContifico.data)}`;
      console.error(`ERROR Contífico (Respuesta Inesperada): Factura ID ${factura.id} -> ${errorMsg}`);
      return { success: false, error: errorMsg };
    }

  } catch (error: any) {
    // Manejar errores de Axios (ej. 4xx, 5xx, red)
    let errorMsg = 'Error desconocido al conectar con Contifico.';
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // El servidor respondió con un status fuera de 2xx
        errorMsg = `Error ${error.response.status} de Contifico: ${JSON.stringify(error.response.data)}`;
      } else if (error.request) {
        // La solicitud se hizo pero no se recibió respuesta
        errorMsg = 'No se recibió respuesta de Contifico.';
      } else {
        // Algo pasó al configurar la solicitud
        errorMsg = `Error configurando llamada a Contifico: ${error.message}`;
      }
    } else {
      // Otro tipo de error
      errorMsg = `Error inesperado: ${error.message}`;
    }
    console.error(`ERROR Contífico (Excepción): Factura ID ${factura.id} -> ${errorMsg}`, error.stack);
    return { success: false, error: errorMsg };
  }
};

// Endpoint POST
export async function POST(request: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, message: 'Error de configuración del servidor' }, { status: 500 });
  }

  try {
    const data: AprobarFacturasRequest = await request.json();
    const { facturaIds, prefijoSecuencia, numeroSecuenciaInicial } = data; // Obtener los campos
    
    // Validar que los IDs de factura existen
    if (!facturaIds || !Array.isArray(facturaIds) || facturaIds.length === 0) {
      return NextResponse.json({ success: false, message: 'Debe proporcionar un array de IDs de facturas para aprobar' }, { status: 400 });
    }

    // Validar que la secuencia es obligatoria y válida
    if (prefijoSecuencia === undefined || numeroSecuenciaInicial === undefined) {
      return NextResponse.json({ success: false, message: 'Falta el prefijo o el número inicial de la secuencia.' }, { status: 400 });
    }
    if (!/^\d{3}-\d{3}-$/.test(prefijoSecuencia) || numeroSecuenciaInicial <= 0 || numeroSecuenciaInicial.toString().length > 9) {
       return NextResponse.json({ success: false, message: 'Prefijo o número de secuencia inicial inválido.' }, { status: 400 });
    }
    
    let siguienteNumeroSecuencia: number = numeroSecuenciaInicial;
    
    // 2. Obtener las facturas CON DATOS RELACIONADOS para Contífico (SIN USUARIO)
    const { data: facturasParaProcesar, error: facturasError } = await supabaseAdmin
      .from('facturas')
      .select(`
        id, periodo, subtotal, monto_iva, total, estado, propiedad_id, cliente_id,
        items_factura,
        propiedad:propiedades!inner (
          id, identificadores, encargado_pago, area_total,
          proyecto:proyectos!inner (id, nombre, api_contifico, ubicacion),
          propietario:perfiles_cliente!propietario_id (
            id, tipo_persona,
            persona_natural:persona_natural_id (id, razon_social, cedula),
            persona_juridica:persona_juridica_id (id, razon_social, ruc),
            contacto_administrativo, contacto_proveedores, contacto_gerente
          ),
          ocupante:perfiles_cliente!ocupante_id (
            id, tipo_persona,
            persona_natural:persona_natural_id (id, razon_social, cedula),
            persona_juridica:persona_juridica_id (id, razon_social, ruc),
            contacto_administrativo, contacto_proveedores, contacto_gerente
          )
        ),
        cliente:perfiles_cliente!inner (
          id, tipo_persona,
          persona_natural:persona_natural_id (id, razon_social, cedula),
          persona_juridica:persona_juridica_id (id, razon_social, ruc),
          contacto_administrativo, contacto_proveedores, contacto_gerente
        )
      `)
      .in('id', facturaIds)
      .eq('estado', 'Borrador');
      
    if (facturasError) {
      console.error("Error Supabase Query:", facturasError);
      return NextResponse.json({ success: false, message: `Error al obtener facturas: ${facturasError.message}` }, { status: 500 });
    }
    
    if (!facturasParaProcesar || facturasParaProcesar.length === 0) {
      return NextResponse.json({ success: false, message: 'No se encontraron facturas borrador con los IDs proporcionados' }, { status: 404 });
    }
    
    // Obtener IDs de Contifico para los servicios involucrados (optimización)
    const codigosServicio = [...new Set(facturasParaProcesar.flatMap(f => 
      f.items_factura?.map((item: ItemFactura) => item.codigoServicio) || []
    ))];
    const { data: serviciosData, error: serviciosError } = await supabaseAdmin
        .from('servicios')
        .select('codigo, id_contifico')
        .in('codigo', codigosServicio);

    if (serviciosError) {
        console.error("Error fetching service Contifico IDs:", serviciosError);
        // Podríamos continuar sin los IDs o fallar
    }
    const servicioContificoIdMap = new Map(serviciosData?.map(s => [s.codigo, s.id_contifico]) || []);

    // 3. Procesar cada factura
    const resultados = { aprobadas: 0, errores: 0, erroresDetalle: [] as { facturaId: number; error: string }[] };
    
    for (const facturaBase of facturasParaProcesar) {
        // Asegurar que las relaciones sean objetos únicos y no arrays
        const propiedadUnica = Array.isArray(facturaBase.propiedad) ? facturaBase.propiedad[0] : facturaBase.propiedad;
        const clienteUnico = Array.isArray(facturaBase.cliente) ? facturaBase.cliente[0] : facturaBase.cliente;

        if (!propiedadUnica || !clienteUnico) {
            console.error(`Factura ID ${facturaBase.id}: Faltan datos de propiedad o cliente después de la consulta.`);
            resultados.errores++;
            resultados.erroresDetalle.push({ facturaId: facturaBase.id, error: 'Datos incompletos de propiedad/cliente' });
            continue; // Saltar esta factura
        }

        // Añadir el ID de contifico del servicio a la factura
        const factura: FacturaCompleta = {
            ...(facturaBase as any), // Usamos 'as any' para evitar conflictos profundos de tipo, confiando en nuestra lógica
            propiedad: propiedadUnica,
            cliente: clienteUnico,
            servicio: {
                id_contifico: servicioContificoIdMap.get(facturaBase.items_factura?.[0]?.codigoServicio)
            }
        };

      try {
        // Generar el número de documento secuencial usando la secuencia obligatoria
        const numeroDocumento = `${prefijoSecuencia}${siguienteNumeroSecuencia.toString().padStart(9, '0')}`;
        siguienteNumeroSecuencia++; // Incrementar para la próxima factura
        
        // Llamar a la función que envía a Contífico, pasando el número de documento
        const contificoResultado = await prepararYEnviarAContifico(factura, numeroDocumento);
        
        if (contificoResultado.success) {
          // Éxito: Actualizar estado en Supabase
          const { error: updateError } = await supabaseAdmin
            .from('facturas')
            .update({
              estado: 'Enviada', // O 'PendienteSRI' si Contifico solo la emite pero no envía
              contifico_id: contificoResultado.contificoId,
              fecha_aprobacion: new Date().toISOString(),
              observaciones: null // Limpiar observaciones previas
            })
            .eq('id', factura.id);
            
          if (updateError) {
            throw new Error(`Error al actualizar estado tras éxito Contifico: ${updateError.message}`);
          }
          resultados.aprobadas++;
        } else {
          // Error Contifico: Mantener borrador y registrar error
          const { error: updateError } = await supabaseAdmin
            .from('facturas')
            .update({ observaciones: contificoResultado.error })
            .eq('id', factura.id);
          // Loguear el error de update si ocurre, pero el error principal es el de Contifico
          if (updateError) console.error(`Error updating observations for Factura ID ${factura.id}:`, updateError);
          throw new Error(contificoResultado.error || 'Error desconocido al enviar a Contifico');
        }

      } catch (error: any) {
        resultados.errores++;
        resultados.erroresDetalle.push({ facturaId: factura.id, error: error.message || 'Error desconocido' });
        console.error(`Error procesando Factura ID ${factura.id}:`, error);
        // Intentar guardar el error en observaciones si no se hizo ya
        if (!error.message.toLowerCase().includes('contifico')) {
          await supabaseAdmin
            .from('facturas')
            .update({ observaciones: error.message })
            .eq('id', factura.id)
            .maybeSingle(); // Ignorar error si no se puede actualizar
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      ...resultados,
      mensaje: `Proceso completado. Aprobadas: ${resultados.aprobadas}, Errores: ${resultados.errores}`
    });
    
  } catch (error: any) {
    console.error("Error general en aprobarFacturas:", error);
    return NextResponse.json({ success: false, message: `Error general: ${error.message}` }, { status: 500 });
  }
} 