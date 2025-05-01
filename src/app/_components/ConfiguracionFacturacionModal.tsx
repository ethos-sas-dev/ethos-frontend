"use client";

import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/app/_components/ui/dialog";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Checkbox } from "@/app/_components/ui/checkbox";
import { Textarea } from "@/app/_components/ui/textarea";
import { createClient } from "../../../lib/supabase/client";
import { AlertCircle, Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/app/_components/ui/alert";

type ConfiguracionFacturacion = {
  id?: number;
  propiedad_id: number;
  cliente_id: number;
  servicio_id: number;
  aplica_iva_general: boolean;
  porcentaje_iva_general: number | null;
  aplica_tasa_especial: boolean;
  tasa_base_especial: number | null;
  notas_configuracion: string | null;
  solo_factura_actual: boolean;
};

type ConfiguracionFacturacionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  propiedadId: number;
  clienteId: number;
  servicioId: number;
  facturaId?: number;
  propiedadNombre?: string;
  servicioNombre?: string;
  clienteNombre?: string;
  areaPropiedad?: number;
  onSaved?: () => void;
  onRecalcular?: (facturaId: number, configuracion: any) => Promise<void>;
};

export default function ConfiguracionFacturacionModal({
  isOpen,
  onClose,
  propiedadId,
  clienteId,
  servicioId,
  facturaId,
  propiedadNombre = "Esta propiedad",
  servicioNombre = "este servicio",
  clienteNombre = "este cliente",
  areaPropiedad = 0,
  onSaved,
  onRecalcular
}: ConfiguracionFacturacionModalProps) {
  const supabase = createClient();
  
  // Estados para el formulario
  const [configuracion, setConfiguracion] = useState<ConfiguracionFacturacion>({
    propiedad_id: propiedadId,
    cliente_id: clienteId,
    servicio_id: servicioId,
    aplica_iva_general: false,
    porcentaje_iva_general: 12, // Valor por defecto en Ecuador
    aplica_tasa_especial: false,
    tasa_base_especial: null,
    notas_configuracion: null,
    solo_factura_actual: false
  });
  
  // Estados para la UI
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [configExistente, setConfigExistente] = useState<boolean>(false);
  const [showReemplazarConfirmacion, setShowReemplazarConfirmacion] = useState<boolean>(false);
  
  // Cargar configuración existente al abrir el modal
  useEffect(() => {
    if (isOpen) {
      fetchConfiguracion();
    }
  }, [isOpen, propiedadId, clienteId, servicioId]);
  
  // Función para cargar configuración existente
  const fetchConfiguracion = async () => {
    setIsFetching(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from("configuraciones_facturacion")
        .select("*")
        .eq("propiedad_id", propiedadId)
        .eq("cliente_id", clienteId)
        .eq("servicio_id", servicioId)
        .eq("activo", true)
        .single();
      
      if (error && error.code !== "PGRST116") { // PGRST116 es "No se encontró un solo registro"
        throw error;
      }
      
      if (data) {
        setConfigExistente(true);
        setConfiguracion({
          id: data.id,
          propiedad_id: data.propiedad_id,
          cliente_id: data.cliente_id,
          servicio_id: data.servicio_id,
          aplica_iva_general: data.aplica_iva_general,
          porcentaje_iva_general: data.porcentaje_iva_general !== null ? 
            // Si el valor está en decimal (ej: 0.12), convertir a porcentaje (12)
            data.porcentaje_iva_general <= 1 ? data.porcentaje_iva_general * 100 : data.porcentaje_iva_general
            : null,
          aplica_tasa_especial: data.tasa_base_especial !== null,
          tasa_base_especial: data.tasa_base_especial,
          notas_configuracion: data.notas_configuracion,
          solo_factura_actual: data.solo_factura_actual || false
        });
      } else {
        setConfigExistente(false);
      }
    } catch (err: any) {
      console.error("Error al cargar configuración:", err);
      setError("Error al cargar la configuración. Por favor, inténtalo de nuevo.");
    } finally {
      setIsFetching(false);
    }
  };
  
  // Actualizar la vista previa cuando cambien los valores relevantes
  useEffect(() => {
    // Recalcular la vista previa cada vez que cambien estos valores
    calcularVistaPreviaImpacto();
  }, [configuracion.aplica_tasa_especial, configuracion.tasa_base_especial, configuracion.aplica_iva_general, configuracion.porcentaje_iva_general, areaPropiedad]);
  
  // Manejar cambios en campos del formulario
  const handleChange = (field: keyof ConfiguracionFacturacion, value: any) => {
    setConfiguracion(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Función para recalcular factura y guardar configuración
  const guardarYRecalcular = async () => {
    if (!facturaId || !onRecalcular) return;
    
    // Si existe configuración y no se ha confirmado el reemplazo, mostrar advertencia
    if (configExistente && !showReemplazarConfirmacion && !configuracion.solo_factura_actual) {
      setShowReemplazarConfirmacion(true);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      // Validar campos
      if (configuracion.aplica_iva_general && 
          (configuracion.porcentaje_iva_general === null || 
           isNaN(Number(configuracion.porcentaje_iva_general)))) {
        throw new Error("Por favor ingrese un porcentaje de IVA válido.");
      }
      
      if (configuracion.aplica_tasa_especial && 
          (configuracion.tasa_base_especial === null || 
           isNaN(Number(configuracion.tasa_base_especial)))) {
        throw new Error("Por favor ingrese una tasa base especial válida.");
      }
      
      // Verificar que al menos una opción esté seleccionada
      if (!configuracion.aplica_iva_general && !configuracion.aplica_tasa_especial) {
        throw new Error("Debe seleccionar al menos una configuración: IVA o tasa especial.");
      }
      
      // Preparar datos para recálculo
      const dataToRecalculate = {
        facturaId: facturaId,
        tasa_base_especial: configuracion.aplica_tasa_especial && configuracion.tasa_base_especial !== null 
          ? Number(configuracion.tasa_base_especial) 
          : null,
        aplica_iva: configuracion.aplica_iva_general,
        porcentaje_iva: configuracion.aplica_iva_general && configuracion.porcentaje_iva_general !== null
          ? Number(configuracion.porcentaje_iva_general) / 100 // Convertir de porcentaje (ej: 12%) a decimal (0.12)
          : null,
        area_propiedad: areaPropiedad,
        solo_factura_actual: configuracion.solo_factura_actual
      };
      
      console.log("Enviando datos para recalcular:", dataToRecalculate);
      
      // Llamar a la función proporcionada para recalcular
      const resultado = await onRecalcular(facturaId, dataToRecalculate);
      console.log("Resultado de recálculo:", resultado);
      
      setSuccessMessage(configuracion.solo_factura_actual
        ? "Factura recalculada correctamente"
        : configExistente 
          ? "Configuración reemplazada y factura recalculada correctamente" 
          : "Configuración guardada y factura recalculada correctamente");
      
      // Hacer que el mensaje de éxito desaparezca después de unos segundos
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      
    } catch (err: any) {
      console.error("Error al recalcular factura:", err);
      setError(err.message || "Error al recalcular la factura. Por favor, inténtalo de nuevo.");
    } finally {
      setIsLoading(false);
      setShowReemplazarConfirmacion(false);
    }
  };
  
  // Cancelar el reemplazo de configuración
  const cancelarReemplazo = () => {
    setShowReemplazarConfirmacion(false);
    // Establecer "solo esta factura" en true para que no afecte la configuración existente
    setConfiguracion(prev => ({
      ...prev,
      solo_factura_actual: true
    }));
  };
  
  // Calcular vista previa del impacto de la configuración
  const calcularVistaPreviaImpacto = () => {
    // Si no se aplica tasa especial o el área es 0, no hay cálculo de subtotal
    if (!configuracion.aplica_tasa_especial || configuracion.tasa_base_especial === null || areaPropiedad <= 0) {
      return { subtotal: 0, iva: 0, total: 0 };
    }
    
    const subtotal = configuracion.tasa_base_especial * areaPropiedad;
    const iva = configuracion.aplica_iva_general && configuracion.porcentaje_iva_general 
      ? (subtotal * configuracion.porcentaje_iva_general / 100) 
      : 0;
      
    return { 
      subtotal: parseFloat(subtotal.toFixed(2)), 
      iva: parseFloat(iva.toFixed(2)), 
      total: parseFloat((subtotal + iva).toFixed(2)) 
    };
  };
  
  const impactoCalculado = calcularVistaPreviaImpacto();
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configuración de Facturación</DialogTitle>
          <DialogDescription>
            Configure parámetros especiales para la facturación de este servicio en esta propiedad.
          </DialogDescription>
        </DialogHeader>
        
        {isFetching ? (
          <div className="flex justify-center items-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {successMessage && (
              <Alert className="bg-green-50 text-green-800 border-green-200">
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}
            
            {showReemplazarConfirmacion && (
              <Alert className="bg-amber-50 text-amber-800 border-amber-200">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <AlertDescription>
                  Ya existe una configuración para esta propiedad, cliente y servicio. 
                  ¿Deseas reemplazarla?
                </AlertDescription>
                <div className="flex gap-2 mt-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="bg-white" 
                    onClick={cancelarReemplazo}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    size="sm" 
                    className="bg-amber-600 hover:bg-amber-700 text-white" 
                    onClick={guardarYRecalcular}
                  >
                    Reemplazar
                  </Button>
                </div>
              </Alert>
            )}
            
            {configExistente && !showReemplazarConfirmacion && !configuracion.solo_factura_actual && (
              <Alert className="bg-blue-50 text-blue-800 border-blue-200">
                <AlertCircle className="h-4 w-4 mr-2" />
                <AlertDescription>
                  Estás editando una configuración existente para esta propiedad, cliente y servicio.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="solo_factura_actual" 
                checked={configuracion.solo_factura_actual}
                onCheckedChange={(checked) => handleChange("solo_factura_actual", checked)}
              />
              <Label htmlFor="solo_factura_actual">
                Aplicar solo a esta factura
                <span className="block text-xs text-gray-500">
                  Si está marcado, esta configuración no se guardará para facturas futuras
                </span>
              </Label>
            </div>
            
            <div className="mb-2 p-3 bg-blue-50 rounded-md border border-blue-200">
              <h4 className="text-sm font-medium mb-2">Opciones de facturación a configurar:</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="aplica_tasa_especial" 
                    checked={configuracion.aplica_tasa_especial}
                    onCheckedChange={(checked) => handleChange("aplica_tasa_especial", checked)}
                  />
                  <Label htmlFor="aplica_tasa_especial">Configurar tasa base especial</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="aplica_iva" 
                    checked={configuracion.aplica_iva_general}
                    onCheckedChange={(checked) => handleChange("aplica_iva_general", checked)}
                  />
                  <Label htmlFor="aplica_iva">Configurar IVA</Label>
                </div>
              </div>
            </div>
            
            {configuracion.aplica_tasa_especial && (
              <div className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor="tasa_base" className="text-right">
                  Tasa base especial <span className="text-red-500">*</span>
                </Label>
                <div className="col-span-2">
                  <div className="relative">
                    <Input
                      id="tasa_base"
                      type="number"
                      step="0.01"
                      min="0"
                      value={configuracion.tasa_base_especial !== null ? configuracion.tasa_base_especial : ""}
                      onChange={(e) => handleChange("tasa_base_especial", e.target.value ? parseFloat(e.target.value) : null)}
                      className="pr-8"
                      placeholder="Valor específico"
                      required={configuracion.aplica_tasa_especial}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">$</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Este valor se multiplicará por el área de la propiedad
                  </p>
                </div>
              </div>
            )}
            
            {configuracion.aplica_iva_general && (
              <div className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor="porcentaje_iva" className="text-right">
                  Porcentaje IVA <span className="text-red-500">*</span>
                </Label>
                <div className="col-span-2">
                  <div className="relative">
                    <Input
                      id="porcentaje_iva"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={configuracion.porcentaje_iva_general || ""}
                      onChange={(e) => handleChange("porcentaje_iva_general", e.target.value ? parseFloat(e.target.value) : null)}
                      className="pr-8"
                      required={configuracion.aplica_iva_general}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">%</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Ingrese el porcentaje (ejemplo: 12 para 12% de IVA)
                  </p>
                </div>
              </div>
            )}
            
            {/* Vista previa del impacto siempre visible si hay alguna config */}
            {(configuracion.aplica_tasa_especial || configuracion.aplica_iva_general) && (
              <div className="mt-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                <h4 className="text-sm font-medium mb-2">Vista previa del cálculo:</h4>
                <div className="grid grid-cols-2 gap-1 text-sm">
                  {configuracion.aplica_tasa_especial && (
                    <>
                      <div className="text-gray-600">Área de la propiedad:</div>
                      <div className="text-right font-medium">{areaPropiedad} m²</div>
                      
                      <div className="text-gray-600">Tasa base especial:</div>
                      <div className="text-right font-medium">
                        {configuracion.tasa_base_especial !== null
                          ? `$${configuracion.tasa_base_especial.toFixed(2)}`
                          : "No especificada"}
                      </div>
                      
                      <div className="text-gray-600">Subtotal calculado:</div>
                      <div className="text-right font-medium">${impactoCalculado.subtotal}</div>
                    </>
                  )}
                  
                  {configuracion.aplica_iva_general && configuracion.aplica_tasa_especial && (
                    <>
                      <div className="text-gray-600">IVA ({configuracion.porcentaje_iva_general || 0}%):</div>
                      <div className="text-right font-medium">${impactoCalculado.iva}</div>
                    </>
                  )}
                  
                  {configuracion.aplica_iva_general && !configuracion.aplica_tasa_especial && (
                    <>
                      <div className="text-gray-600">Porcentaje IVA:</div>
                      <div className="text-right font-medium">{configuracion.porcentaje_iva_general || 0}%</div>
                      <div className="text-gray-600">Nota:</div>
                      <div className="text-right font-medium text-amber-600">
                        Solo se aplicará el IVA al monto base del servicio
                      </div>
                    </>
                  )}
                  
                  {configuracion.aplica_tasa_especial && (
                    <>
                      <div className="text-gray-600 font-medium">Total calculado:</div>
                      <div className="text-right font-medium text-emerald-600">${impactoCalculado.total}</div>
                    </>
                  )}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-3 items-start gap-4">
              <Label htmlFor="notas" className="text-right pt-2">
                Notas
              </Label>
              <Textarea
                id="notas"
                value={configuracion.notas_configuracion || ""}
                onChange={(e) => handleChange("notas_configuracion", e.target.value)}
                placeholder="Ingrese notas o justificación para esta configuración especial"
                className="col-span-2"
                rows={3}
              />
            </div>
          </div>
        )}
        
        <DialogFooter className="flex sm:justify-end">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={isLoading || showReemplazarConfirmacion}
            className="mr-2"
          >
            Cancelar
          </Button>
          
          <Button 
            onClick={guardarYRecalcular} 
            disabled={isLoading || isFetching || (!configuracion.aplica_iva_general && !configuracion.aplica_tasa_especial) || 
              (configuracion.aplica_tasa_especial && configuracion.tasa_base_especial === null) ||
              (configuracion.aplica_iva_general && configuracion.porcentaje_iva_general === null) ||
              showReemplazarConfirmacion}
            className="bg-[#008A4B] hover:bg-[#006837]"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              "Guardar y recalcular factura"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 