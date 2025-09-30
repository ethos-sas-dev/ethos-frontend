/**
 * Funciones de utilidad para facturación
 */

/**
 * Recalcula una factura con configuraciones especiales
 * Esta función de interfaz envía una petición al API de recálculo
 */
export const recalcularFactura = async (facturaId: number, configuracion: any) => {
  try {
    // Aquí hacemos la llamada a la API para recalcular la factura
    const response = await fetch("/api/facturacion/recalcular-factura", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        facturaId: facturaId,
        tasa_base_especial: configuracion.tasa_base_especial,
        aplica_iva: configuracion.aplica_iva,
        porcentaje_iva: configuracion.porcentaje_iva,
        area_propiedad: configuracion.area_propiedad,
        solo_factura_actual: configuracion.solo_factura_actual
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Error al recalcular la factura");
    }
    
    return await response.json();
    
  } catch (error: any) {
    console.error("Error al recalcular factura:", error);
    throw error;
  }
}; 

// -----------------------------------------------------------
// NUEVAS UTILIDADES PARA MOSTRAR VALORES EN PÁGINA DE PROPIEDAD
// -----------------------------------------------------------
import { createClient } from "../../../lib/supabase/client";

export type ServicioInfo = {
  id: number;
  codigo: string;
  nombre: string;
  precio_base: number;
  porcentaje_iva_defecto: number | null;
  unidad: string | null;
};

/**
 * Devuelve el área que debe usarse para cada servicio.
 *  - APAC → área de parqueo
 *  - AOACO → área útil
 *  - AOACL → área útil
 *  - Caso general → área total
 */
export function obtenerAreaParaServicioFront(
  propiedad: any,
  codigoServicio: string
): number {
  if (codigoServicio === "APAC") {
    const area = propiedad.areas_desglosadas?.find((a: any) =>
      (a.tipo_area || "").toLowerCase().includes("parqueo")
    );
    return area?.area || 0;
  }
  if (codigoServicio === "AOACO" || codigoServicio === "AOACL") {
    const area = propiedad.areas_desglosadas?.find(
      (a: any) => (a.tipo_area || "").toLowerCase() === "util"
    );
    return area?.area || propiedad.area_total || 0;
  }
  // Default
  return propiedad.area_total || 0;
}

/**
 * Calcula subtotal y total (con IVA) para un servicio en una propiedad, tomando en cuenta configuración especial.
 * @param propiedad Registro de la propiedad (con areas_desglosadas, identificadores, etc.)
 * @param servicio  Registro de servicio
 * @param configuracion Configuración especial o null
 */
export function calcularValorServicio(
  propiedad: any,
  servicio: ServicioInfo,
  configuracion: any | null
) {
  // 1. Determinar la tasa a usar
  let tasa = servicio.precio_base;
  if (
    configuracion &&
    configuracion.tasa_base_especial !== null &&
    configuracion.tasa_base_especial !== undefined
  ) {
    tasa = Number(configuracion.tasa_base_especial);
  }

  // 2. Determinar área y si multiplicar
  const unidad = (servicio.unidad || "").toLowerCase();
  const esPorM2 = unidad.includes("m2");
  let area = 1;
  if (esPorM2) {
    area = obtenerAreaParaServicioFront(propiedad, servicio.codigo);
  }

  const subtotal = parseFloat((tasa * area).toFixed(2));
  const porcentajeIva = configuracion && configuracion.aplica_iva_general !== null
    ? configuracion.aplica_iva_general
      ? configuracion.porcentaje_iva_general || servicio.porcentaje_iva_defecto || 0
      : 0
    : servicio.porcentaje_iva_defecto || 0;
  const iva = parseFloat((subtotal * porcentajeIva).toFixed(2));
  const total = parseFloat((subtotal + iva).toFixed(2));

  return { subtotal, iva, total, tasa, area };
}

/**
 * Helper para obtener servicio y configuración especial de Supabase y devolver valores.
 */
export async function fetchValorServicio(
  propiedad: any,
  codigoServicio: string
) {
  const supabase = createClient();

  // 1. Obtener servicio
  const { data: servicio, error: srvErr } = await supabase
    .from("servicios")
    .select("id,codigo,nombre,precio_base,porcentaje_iva_defecto,unidad")
    .eq("codigo", codigoServicio)
    .single();
  if (srvErr || !servicio) throw srvErr || new Error("Servicio no encontrado");

  // 2. Obtener configuración especial (si existe) usando propietario como cliente por defecto
  const clienteId = propiedad.propietario_id;
  const { data: config } = await supabase
    .from("configuraciones_facturacion")
    .select("tasa_base_especial,aplica_iva_general,porcentaje_iva_general")
    .eq("propiedad_id", propiedad.id)
    .eq("cliente_id", clienteId)
    .eq("servicio_id", servicio.id)
    .eq("activo", true)
    .maybeSingle();

  return calcularValorServicio(propiedad, servicio as ServicioInfo, config);
} 