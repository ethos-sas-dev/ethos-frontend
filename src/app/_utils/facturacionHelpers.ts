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