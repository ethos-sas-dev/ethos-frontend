"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase/client";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/app/_components/ui/select";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { StatusModal } from "@/app/_components/StatusModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/_components/ui/table";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  CheckIcon,
  DocumentTextIcon,
  PencilIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  Cog6ToothIcon
} from "@heroicons/react/24/outline";
import { Skeleton } from "@/app/_components/ui/skeleton";
import ConfiguracionFacturacionModal from "@/app/_components/ConfiguracionFacturacionModal";
import { recalcularFactura } from "@/app/_utils/facturacionHelpers";
import ConfirmApprovalModal from "@/app/_components/ConfirmApprovalModal";
import { Progress } from "@/components/ui/progress";

// Tipos
type Proyecto = {
  id: number;
  nombre: string;
};

type Servicio = {
  id: number;
  codigo: string;
  nombre: string;
  precio_base: number;
  unidad: string;
  porcentaje_iva_defecto: number;
};

type ItemFactura = {
  cantidad: number;
  descripcion: string;
  porcentajeIva: number;
  codigoServicio: string;
  precioUnitario: number;
};

type Factura = {
  id: number;
  periodo: string;
  estado: string;
  propiedad_id: number;
  cliente_id: number;
  subtotal: number;
  monto_iva: number;
  total: number;
  observaciones?: string;
  contifico_id?: string;
  items_factura: ItemFactura[];
  propiedad?: {
    identificadores: any;
    encargado_pago: string;
    propietario_id?: number;
    propietario?: {
      tipo_persona: string;
      persona_natural?: { razon_social: string };
      persona_juridica?: { razon_social: string };
    };
    ocupante_id?: number;
    ocupante?: {
      tipo_persona: string;
      persona_natural?: { razon_social: string };
      persona_juridica?: { razon_social: string };
    };
    proyecto_id?: number;
    proyecto?: Proyecto;
    area_total?: number;
  };
  cliente?: {
    tipo_persona: string;
    persona_natural?: { razon_social: string };
    persona_juridica?: { razon_social: string };
  };
  proyecto?: {
    id: number;
    nombre: string;
  };
};

export default function FacturacionPage() {
  const router = useRouter();
  const supabase = createClient();
  
  // Estados para filtros/form
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [selectedProyecto, setSelectedProyecto] = useState<string>("");
  const [selectedServicio, setSelectedServicio] = useState<string>("");
  const [mes, setMes] = useState<string>(new Date().getMonth() + 1 + "");
  const [ano, setAno] = useState<string>(new Date().getFullYear() + "");
  
  // Estados de UI
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [selectedFacturas, setSelectedFacturas] = useState<number[]>([]);
  const [loadingProyectos, setLoadingProyectos] = useState(true);
  const [loadingServicios, setLoadingServicios] = useState(true);
  const [globalSearch, setGlobalSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [statusModal, setStatusModal] = useState({
    open: false,
    title: "",
    message: "",
    type: "success" as "success" | "error",
  });
  
  // Estados para modal de configuración
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configModalData, setConfigModalData] = useState<{
    propiedadId: number;
    clienteId: number;
    servicioId: number;
    propiedadNombre: string;
    servicioNombre: string;
    clienteNombre: string;
    facturaId?: number;
    areaPropiedad?: number;
  }>({
    propiedadId: 0,
    clienteId: 0,
    servicioId: 0,
    propiedadNombre: '',
    servicioNombre: '',
    clienteNombre: '',
    facturaId: undefined,
    areaPropiedad: 0
  });
  
  // Estados para modal de confirmación
  const [isConfirmApprovalOpen, setIsConfirmApprovalOpen] = useState<boolean>(false);
  const [isApprovingFacturas, setIsApprovingFacturas] = useState<boolean>(false);
  
  // Dentro del componente FacturacionPage, añadir estos estados:
  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<{
    processed: number;
    success: number;
    errors: number;
    total: number;
    currentBatch: number;
    totalBatches: number;
  } | null>(null);
  const [batchErrorsDetails, setBatchErrorsDetails] = useState<string[]>([]);
  
  // Verificar si todos los datos iniciales están cargados
  const isInitialDataLoading = loadingProyectos || loadingServicios;
  
  // Cargar proyectos y servicios al iniciar
  useEffect(() => {
    fetchProyectos();
    fetchServicios();
  }, []);
  
  // Cargar facturas borrador cuando cambian los filtros
  useEffect(() => {
    if (selectedProyecto) {
      fetchFacturasBorrador();
    }
  }, [selectedProyecto, selectedServicio, mes, ano]);
  
  // Efecto para depurar valores de periodo
  useEffect(() => {
    console.log("Periodo actual:", getPeriodo());
  }, [mes, ano]);
  
  // Funciones para cargar datos
  const fetchProyectos = async () => {
    setLoadingProyectos(true);
    try {
      const { data, error } = await supabase
        .from("proyectos")
        .select("id, nombre")
        .order("nombre");
        
      if (error) throw error;
      setProyectos(data || []);
      
      // Seleccionar el primer proyecto por defecto si hay proyectos
      if (data && data.length > 0 && !selectedProyecto) {
        setSelectedProyecto(data[0].id.toString());
      }
    } catch (error: any) {
      console.error("Error al cargar proyectos:", error.message);
    } finally {
      setLoadingProyectos(false);
    }
  };
  
  const fetchServicios = async () => {
    setLoadingServicios(true);
    try {
      const { data, error } = await supabase
        .from("servicios")
        .select("id, codigo, nombre, precio_base, unidad, porcentaje_iva_defecto")
        .eq("activo", true)
        .order("nombre");
        
      if (error) throw error;
      setServicios(data || []);
      
      // Seleccionar el servicio de alícuota ordinaria por defecto
      if (data && data.length > 0) {
        const alicuotaServicio = data.find(s => s.codigo === "AOA3") || data[0];
        setSelectedServicio(alicuotaServicio.codigo);
      }
    } catch (error: any) {
      console.error("Error al cargar servicios:", error.message);
    } finally {
      setLoadingServicios(false);
    }
  };
  
  const fetchFacturasBorrador = async () => {
    setIsLoading(true);
    try {
      // Consulta directa para obtener todas las facturas borrador con su información relacionada
      const { data, error } = await supabase
        .from("facturas")
        .select(`
          id, periodo, estado, propiedad_id, cliente_id, subtotal, monto_iva, total, 
          observaciones, contifico_id, items_factura,
          propiedad:propiedades!inner (
            identificadores,
            encargado_pago,
            proyecto_id,
            area_total,
            proyecto:proyectos!inner (
              id, 
              nombre
            ),
            propietario:perfiles_cliente!propietario_id (
              id,
              tipo_persona,
              persona_natural:persona_natural_id (razon_social),
              persona_juridica:persona_juridica_id (razon_social)
            ),
            ocupante:perfiles_cliente!ocupante_id (
              id,
              tipo_persona,
              persona_natural:persona_natural_id (razon_social),
              persona_juridica:persona_juridica_id (razon_social)
            )
          )
        `)
        .eq("estado", "Borrador");
        
      if (error) throw error;
      
      // Si no hay resultados, mostrar mensaje en consola para diagnóstico
      if (!data || data.length === 0) {
        console.log("No se encontraron facturas borrador");
        setFacturas([]);
        setIsLoading(false);
        return;
      }
      
      console.log("Facturas encontradas:", data.length);
      
      // Formatear los datos para tener la estructura correcta 
      const facturasFormateadas = data.map((factura: any) => {
        // Transferir el proyecto desde propiedad.proyecto a factura.proyecto
        const proyecto = factura.propiedad?.proyecto;
        
        return {
          ...factura,
          proyecto: proyecto,
          items_factura: factura.items_factura || []
        };
      });
      
      setFacturas(facturasFormateadas);
      
    } catch (error: any) {
      console.error("Error al cargar facturas borrador:", error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Función para generar periodo en formato YYYY-MM
  const getPeriodo = () => {
    const anoNum = parseInt(ano);
    const mesNum = parseInt(mes);
    // Asegurar que el mes tenga dos dígitos (con cero al inicio si es necesario)
    return `${anoNum}-${mesNum.toString().padStart(2, "0")}`;
  };
  
  // Función para generar facturas
  const generarFacturas = async () => {
    if (!selectedProyecto || !selectedServicio) {
      setStatusModal({
        open: true,
        title: "Error",
        message: "Debe seleccionar un proyecto y un servicio",
        type: "error",
      });
      return;
    }
    
    // Verificar que se ha seleccionado un periodo
    if (!mes || !ano) {
      setStatusModal({
        open: true,
        title: "Error",
        message: "Debe seleccionar un periodo (mes y año)",
        type: "error",
      });
      return;
    }
    
    // Imprimir los valores para depuración
    console.log("Generando facturas con:");
    console.log("Proyecto ID:", selectedProyecto);
    console.log("Servicio ID/Código:", selectedServicio);
    console.log("Periodo:", getPeriodo());
    
    setIsGenerating(true);
    try {
      const periodo = getPeriodo();
      
      // Buscar el ID del servicio a partir del código seleccionado
      const servicioSeleccionado = servicios.find(s => s.codigo === selectedServicio);
      
      if (!servicioSeleccionado) {
        throw new Error(`No se encontró el servicio con código: ${selectedServicio}`);
      }
      
      const response = await fetch("/api/facturacion/generar-facturas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proyectoId: parseInt(selectedProyecto),
          servicioId: servicioSeleccionado.id,
          periodo: periodo,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || "Error al generar facturas");
      }
      
      // Actualizar la lista de facturas con las nuevas facturas borrador
      fetchFacturasBorrador();
      
      setStatusModal({
        open: true,
        title: "Éxito",
        message: `Se generaron ${result.generadas} facturas borrador. Omitidas: ${result.omitidas}. Errores: ${result.errores}.`,
        type: "success",
      });
    } catch (error: any) {
      console.error("Error al generar facturas:", error);
      setStatusModal({
        open: true,
        title: "Error",
        message: error.message || "Error al generar facturas",
        type: "error",
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Modificar la función procesarAprobacionFacturas para que acepte prefijo y numeroInicial
  const procesarAprobacionFacturas = async (prefijo?: string, numeroInicial?: number) => {
    setIsConfirmApprovalOpen(false); // Cerrar modal de confirmación
    setIsBatchProcessing(true);
    setBatchErrorsDetails([]);
    const facturaIdsToProcess = [...selectedFacturas]; // Copiar los IDs
    const totalFacturas = facturaIdsToProcess.length;
    const batchSize = 10; // Tamaño del lote (ajustable)
    const totalBatches = Math.ceil(totalFacturas / batchSize);
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;

    setBatchProgress({
      processed: 0,
      success: 0,
      errors: 0,
      total: totalFacturas,
      currentBatch: 0,
      totalBatches: totalBatches,
    });

    for (let i = 0; i < totalFacturas; i += batchSize) {
      const currentBatchNum = Math.floor(i / batchSize) + 1;
      const batchIds = facturaIdsToProcess.slice(i, i + batchSize);
      
      // Actualizar progreso antes de enviar el lote
      setBatchProgress(prev => ({ 
        ...(prev as any), 
        currentBatch: currentBatchNum 
      }));

      try {
        // Construir el cuerpo del request
        const requestBody: { facturaIds: number[]; prefijoSecuencia?: string; numeroSecuenciaInicial?: number } = {
          facturaIds: batchIds,
        };
        // Solo añadir si se proporcionaron valores válidos
        if (prefijo && numeroInicial !== undefined) {
          requestBody.prefijoSecuencia = prefijo;
          // El número inicial solo se envía para el primer lote
          if (i === 0) { 
            requestBody.numeroSecuenciaInicial = numeroInicial;
          }
        }
        
        const response = await fetch('/api/facturacion/aprobar-facturas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody), // Enviar el cuerpo construido
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
          successCount += result.aprobadas || 0;
          errorCount += result.errores || 0;
          // Guardar detalles de errores si existen
          if (result.erroresDetalle && result.erroresDetalle.length > 0) {
            setBatchErrorsDetails(prev => [
              ...prev,
              ...result.erroresDetalle.map((e: { facturaId: number; error: string }) => `Factura ID ${e.facturaId}: ${e.error}`)
            ]);
          }
        } else {
          // Error en la respuesta completa del lote
          errorCount += batchIds.length; // Asumir que todas en el lote fallaron
          const errorMsg = result.message || `Error en lote ${currentBatchNum}`;
           setBatchErrorsDetails(prev => [
             ...prev,
             `Lote ${currentBatchNum}: ${errorMsg}`
           ]);
        }
      } catch (error: any) {
        // Error de red para el lote
        errorCount += batchIds.length; // Asumir que todas en el lote fallaron
        const errorMsg = error.message || `Error de red en lote ${currentBatchNum}`;
        setBatchErrorsDetails(prev => [
          ...prev,
          `Lote ${currentBatchNum}: ${errorMsg}`
        ]);
        console.error(`Error en lote ${currentBatchNum}:`, error);
      }
      
      processedCount += batchIds.length;
      // Actualizar progreso después de procesar el lote
      setBatchProgress(prev => ({ 
        ...(prev as any),
        processed: Math.min(processedCount, totalFacturas), // Asegurar que no exceda el total
        success: successCount,
        errors: errorCount,
      }));
      
      // Pequeña pausa entre lotes (opcional, para no saturar)
      // await new Promise(resolve => setTimeout(resolve, 100)); 
    }

    // Proceso completado
    setIsBatchProcessing(false);
    
    // Mostrar resumen final
    setStatusModal({
      open: true,
      title: "Proceso de Aprobación por Lotes Completado",
      message: `Resultados: ${successCount} aprobadas, ${errorCount} con errores de ${totalFacturas} seleccionadas.${batchErrorsDetails.length > 0 ? `\nErrores detallados: ${batchErrorsDetails.join("; ")}` : ''}`,
      type: errorCount > 0 ? "error" : "success",
    });

    // Recargar facturas y limpiar selección
    await fetchFacturasBorrador();
    setSelectedFacturas([]);
    setBatchProgress(null); // Limpiar progreso
  };
  
  // Manejo de selección/deselección de facturas
  const toggleFacturaSelection = (facturaId: number) => {
    setSelectedFacturas(prev => {
      if (prev.includes(facturaId)) {
        return prev.filter(id => id !== facturaId);
      } else {
        return [...prev, facturaId];
      }
    });
  };
  
  const toggleSelectAll = () => {
    if (selectedFacturas.length === facturas.length) {
      setSelectedFacturas([]);
    } else {
      setSelectedFacturas(facturas.map(f => f.id));
    }
  };
  
  // Calcular totales de facturas seleccionadas
  const totalesSeleccionados = useMemo(() => {
    const facturasFiltradas = facturas.filter(f => selectedFacturas.includes(f.id));
    return {
      cantidad: facturasFiltradas.length,
      subtotal: facturasFiltradas.reduce((sum, f) => sum + (f.subtotal || 0), 0),
      iva: facturasFiltradas.reduce((sum, f) => sum + (f.monto_iva || 0), 0),
      total: facturasFiltradas.reduce((sum, f) => sum + (f.total || 0), 0),
    };
  }, [facturas, selectedFacturas]);
  
  // Formatear moneda para mostrar
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };
  
  // Obtener nombre del mes para mostrar
  const getNombreMes = (mesNum: string) => {
    const meses = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    return meses[parseInt(mesNum) - 1] || "";
  };
  
  // Helper para formatear identificadores de propiedad (similar a PropertiesView.tsx)
  const formatPropertyIdentifier = (identificadores: any): string => {
    if (!identificadores) return "N/A";
    
    const parts: string[] = [];

    if (identificadores.superior && identificadores.idSuperior) {
      parts.push(`${identificadores.superior} ${identificadores.idSuperior}`);
    }
    if (identificadores.intermedio && identificadores.idIntermedio) {
      parts.push(`${identificadores.intermedio} ${identificadores.idIntermedio}`);
    }
    if (identificadores.inferior && identificadores.idInferior) {
      parts.push(`${identificadores.inferior} ${identificadores.idInferior}`);
    }

    // Si hay partes de identificadores, unirlas
    if (parts.length > 0) {
      return parts.join(' - ');
    }

    // Fallback si no hay identificadores específicos
    if (identificadores.codigo) {
      return identificadores.codigo;
    }
    
    return "Sin identificador";
  };
  
  // Función para filtrar facturas según criterio de búsqueda global
  const filterFacturas = (facturas: Factura[], searchTerm: string) => {
    if (!searchTerm) return facturas;
    
    const lowerSearch = searchTerm.toLowerCase();
    return facturas.filter(factura => {
      // Buscar en los datos de la propiedad
      const identificador = formatPropertyIdentifier(factura.propiedad?.identificadores);
      
      // Buscar en los datos del responsable de pago
      let nombreResponsable = '';
      if (factura.propiedad) {
        const encargadoPago = factura.propiedad.encargado_pago;
        const responsable = encargadoPago === 'Propietario' 
          ? factura.propiedad.propietario 
          : factura.propiedad.ocupante;
        
        if (responsable) {
          nombreResponsable = responsable.tipo_persona === 'Natural'
            ? (responsable.persona_natural?.razon_social || '')
            : (responsable.persona_juridica?.razon_social || '');
        }
      }
      
      // Buscar en otros datos relevantes
      const estado = factura.estado?.toLowerCase() || '';
      const facturaId = factura.id?.toString() || '';
      
      // Verificar si el término de búsqueda está presente en algún campo
      return (
        identificador.toLowerCase().includes(lowerSearch) ||
        nombreResponsable.toLowerCase().includes(lowerSearch) ||
        estado.includes(lowerSearch) ||
        facturaId.includes(lowerSearch)
      );
    });
  };

  // Facturas filtradas por la búsqueda global
  const facturasFiltradasGlobal = useMemo(() => {
    return globalSearch ? filterFacturas(facturas, globalSearch) : facturas;
  }, [facturas, globalSearch]);

  // Agrupar facturas por proyecto, periodo y servicio (después de filtrar por búsqueda global)
  const facturasPorGrupoFiltradas = useMemo(() => {
    // Crear estructura para agrupar
    const grupos: Record<string, Record<string, Record<string, Factura[]>>> = {};
    
    facturasFiltradasGlobal.forEach(factura => {
      // Obtener valores para agrupar
      const proyectoId = factura.propiedad?.proyecto?.id;
      const proyectoNombre = factura.propiedad?.proyecto?.nombre || 'Sin proyecto';
      const periodo = factura.periodo || 'Sin periodo';
      
      // Obtener servicio del primer ítem de factura (o usar "Sin servicio")
      let servicioNombre = 'Sin servicio';
      let servicioCodigo = 'N/A';
      
      if (factura.items_factura && factura.items_factura.length > 0) {
        servicioNombre = factura.items_factura[0].descripcion || 'Sin servicio';
        servicioCodigo = factura.items_factura[0].codigoServicio || 'N/A';
      }
      
      // Crear claves para agrupar
      const proyectoClave = `${proyectoId}:${proyectoNombre}`;
      const periodoClave = periodo;
      const servicioClave = `${servicioCodigo}:${servicioNombre}`;
      
      // Crear la estructura de grupos si no existe
      if (!grupos[proyectoClave]) grupos[proyectoClave] = {};
      if (!grupos[proyectoClave][periodoClave]) grupos[proyectoClave][periodoClave] = {};
      if (!grupos[proyectoClave][periodoClave][servicioClave]) grupos[proyectoClave][periodoClave][servicioClave] = [];
      
      // Agregar factura al grupo
      grupos[proyectoClave][periodoClave][servicioClave].push(factura);
    });
    
    return grupos;
  }, [facturasFiltradasGlobal]);
  
  // Función para calcular los totales agrupados
  const totalesPorGrupo = useMemo(() => {
    const totales: Record<string, Record<string, Record<string, {
      cantidad: number;
      subtotal: number;
      iva: number;
      total: number;
    }>>> = {};
    
    // Recorrer la estructura de agrupación
    Object.entries(facturasPorGrupoFiltradas).forEach(([proyectoClave, periodos]) => {
      totales[proyectoClave] = {};
      
      Object.entries(periodos).forEach(([periodoClave, servicios]) => {
        totales[proyectoClave][periodoClave] = {};
        
        Object.entries(servicios).forEach(([servicioClave, facturas]) => {
          // Calcular totales para este grupo específico
          const subtotal = facturas.reduce((sum, f) => sum + (f.subtotal || 0), 0);
          const iva = facturas.reduce((sum, f) => sum + (f.monto_iva || 0), 0);
          const total = facturas.reduce((sum, f) => sum + (f.total || 0), 0);
          
          totales[proyectoClave][periodoClave][servicioClave] = {
            cantidad: facturas.length,
            subtotal,
            iva,
            total
          };
        });
      });
    });
    
    return totales;
  }, [facturasPorGrupoFiltradas]);
  
  // Función para exportar a Excel (CSV) agrupado
  const exportarAExcel = () => {
    if (facturas.length === 0) {
      setStatusModal({
        open: true,
        title: "Error",
        message: "No hay facturas para exportar",
        type: "error",
      });
      return;
    }
    
    try {
      // Preparar los datos para CSV con estructura jerárquica
      const headers = [
        "Proyecto", 
        "Periodo", 
        "Servicio",
        "Total Facturas",
        "Subtotal",
        "IVA",
        "Total"
      ];
      
      // Crear filas para el resumen
      const filasResumen: any[] = [];
      
      // Añadir una fila por cada combinación proyecto-periodo-servicio
      Object.entries(facturasPorGrupoFiltradas).forEach(([proyectoClave, periodos]) => {
        const [proyectoId, proyectoNombre] = proyectoClave.split(':');
        
        Object.entries(periodos).forEach(([periodoClave, servicios]) => {
          // Formatear periodo
          const periodoPartes = periodoClave.split('-');
          const periodoFormateado = periodoPartes.length === 2 
            ? `${getNombreMes(periodoPartes[1])} ${periodoPartes[0]}`
            : periodoClave;
          
          Object.entries(servicios).forEach(([servicioClave, facturasServicio]) => {
            const [servicioCodigo, servicioNombre] = servicioClave.split(':');
            
            // Calcular totales para este grupo
            const subtotal = facturasServicio.reduce((sum, f) => sum + (f.subtotal || 0), 0);
            const iva = facturasServicio.reduce((sum, f) => sum + (f.monto_iva || 0), 0);
            const total = facturasServicio.reduce((sum, f) => sum + (f.total || 0), 0);
            
            filasResumen.push([
              proyectoNombre,
              periodoFormateado,
              servicioNombre,
              facturasServicio.length,
              subtotal,
              iva,
              total
            ]);
          });
        });
      });
      
      // Generar contenido CSV para el resumen
      let csvContent = headers.join(",") + "\n";
      
      filasResumen.forEach(fila => {
        // Asegurar que los strings con comas estén entre comillas
        const filaProcesada = fila.map((celda: any) => {
          if (typeof celda === 'string' && celda.includes(',')) {
            return `"${celda}"`;
          }
          return celda;
        });
        
        csvContent += filaProcesada.join(",") + "\n";
      });
      
      // Añadir una línea en blanco entre el resumen y el detalle
      csvContent += "\n";
      
      // Añadir cabecera para el detalle
      const headersDetalle = [
        "ID", 
        "Proyecto", 
        "Propiedad", 
        "Periodo", 
        "Servicio", 
        "Encargado de Pago",
        "Estado", 
        "Subtotal", 
        "IVA", 
        "Total"
      ];
      
      csvContent += headersDetalle.join(",") + "\n";
      
      // Preparar las filas con los datos detallados
      facturas.forEach(factura => {
        // Obtener detalles de la factura
        const proyectoNombre = factura.propiedad?.proyecto?.nombre || 'N/A';
        const identificador = formatPropertyIdentifier(factura.propiedad?.identificadores);
        
        // Formatear periodo
        const periodoPartes = factura.periodo ? factura.periodo.split('-') : [];
        const periodoFormateado = periodoPartes.length === 2 
          ? `${getNombreMes(periodoPartes[1])} ${periodoPartes[0]}`
          : factura.periodo || 'N/A';
        
        // Obtener servicio
        const servicio = factura.items_factura && factura.items_factura.length > 0 
          ? factura.items_factura[0].descripcion 
          : 'N/A';
        
        // Obtener encargado de pago
        let encargadoPago = 'N/A';
        if (factura.propiedad) {
          const tipo = factura.propiedad.encargado_pago;
          const responsable = tipo === 'Propietario' 
            ? factura.propiedad.propietario 
            : factura.propiedad.ocupante;
          
          if (responsable) {
            const tipoPersona = responsable.tipo_persona || 'N/A';
            const nombre = tipoPersona === 'Natural'
              ? responsable.persona_natural?.razon_social
              : responsable.persona_juridica?.razon_social;
            
            encargadoPago = nombre || 'N/A';
          }
        }
        
        const fila = [
          factura.id,
          proyectoNombre,
          identificador,
          periodoFormateado,
          servicio,
          encargadoPago,
          factura.estado,
          factura.subtotal || 0,
          factura.monto_iva || 0,
          factura.total || 0
        ];
        
        // Asegurar que los strings con comas estén entre comillas
        const filaProcesada = fila.map((celda: any) => {
          if (typeof celda === 'string' && celda.includes(',')) {
            return `"${celda}"`;
          }
          return celda;
        });
        
        csvContent += filaProcesada.join(",") + "\n";
      });
      
      // Crear un blob y descargar
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `facturas_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setStatusModal({
        open: true,
        title: "Éxito",
        message: `Se han exportado ${facturas.length} facturas correctamente.`,
        type: "success",
      });
    } catch (error: any) {
      console.error("Error al exportar a Excel:", error);
      setStatusModal({
        open: true,
        title: "Error",
        message: error.message || "Error al exportar a Excel",
        type: "error",
      });
    }
  };
  
  // Función para alternar la expansión de un grupo
  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  // Inicializar todos los grupos como expandidos por defecto
  useEffect(() => {
    if (facturas.length > 0 && Object.keys(expandedGroups).length === 0) {
      const initialExpandedState: Record<string, boolean> = {};
      Object.keys(facturasPorGrupoFiltradas).forEach(proyectoClave => {
        initialExpandedState[`proyecto-${proyectoClave}`] = true;
        
        Object.keys(facturasPorGrupoFiltradas[proyectoClave]).forEach(periodoClave => {
          initialExpandedState[`periodo-${proyectoClave}-${periodoClave}`] = true;
          
          Object.keys(facturasPorGrupoFiltradas[proyectoClave][periodoClave]).forEach(servicioClave => {
            initialExpandedState[`servicio-${proyectoClave}-${periodoClave}-${servicioClave}`] = true;
          });
        });
      });
      
      setExpandedGroups(initialExpandedState);
    }
  }, [facturasPorGrupoFiltradas]);
  
  // Función para abrir modal de configuración
  const openConfiguracionModal = (factura: Factura) => {
    if (!factura.propiedad || !factura.items_factura[0]) {
      setStatusModal({
        open: true,
        title: "Error",
        message: "No se puede configurar esta factura, faltan datos de propiedad o servicio",
        type: "error",
      });
      return;
    }
    
    // Verificar si tenemos un ID de propiedad válido
    if (!factura.propiedad_id || factura.propiedad_id <= 0) {
      setStatusModal({
        open: true,
        title: "Error",
        message: "No se puede configurar esta factura, el ID de propiedad no es válido",
        type: "error",
      });
      return;
    }
    
    // Obtener responsable de pago
    let clienteNombre = 'Cliente';
    const encargadoPago = factura.propiedad.encargado_pago;
    const responsable = encargadoPago === 'Propietario' 
      ? factura.propiedad.propietario 
      : factura.propiedad.ocupante;
    
    if (responsable) {
      clienteNombre = responsable.tipo_persona === 'Natural'
        ? (responsable.persona_natural?.razon_social || 'Cliente')
        : (responsable.persona_juridica?.razon_social || 'Cliente');
    }
    
    // Obtener el área de la propiedad (podría venir en la propiedad o habría que buscarla)
    const areaPropiedad = factura.propiedad.area_total || 0;
    
    // Buscar el ID del servicio a partir del código
    const servicioSeleccionado = servicios.find(s => s.codigo === factura.items_factura[0].codigoServicio);
    
    if (!servicioSeleccionado) {
      setStatusModal({
        open: true,
        title: "Error",
        message: "No se puede configurar esta factura, no se encontró el servicio",
        type: "error",
      });
      return;
    }
    
    // Establecer datos para el modal
    setConfigModalData({
      propiedadId: factura.propiedad_id,
      clienteId: factura.cliente_id || 0,
      servicioId: servicioSeleccionado.id,
      propiedadNombre: formatPropertyIdentifier(factura.propiedad.identificadores),
      servicioNombre: factura.items_factura[0].descripcion,
      clienteNombre: clienteNombre,
      facturaId: factura.id,
      areaPropiedad: areaPropiedad
    });
    
    setShowConfigModal(true);
  };
  
  // Actualizar la lista después de recalcular
  const handleRecalculoFactura = async (facturaId: number, configuracion: any) => {
    try {
      await recalcularFactura(facturaId, configuracion);
      // Actualizar la lista de facturas con los nuevos datos
      await fetchFacturasBorrador();
    } catch (error: any) {
      console.error("Error al recalcular factura:", error);
      setStatusModal({
        open: true,
        title: "Error",
        message: error.message || "Error al recalcular la factura",
        type: "error",
      });
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generación de Facturas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {isInitialDataLoading ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="proyecto">Proyecto</Label>
                <Select
                  value={selectedProyecto}
                  onValueChange={setSelectedProyecto}
                  disabled={isInitialDataLoading}
                >
                  <SelectTrigger id="proyecto">
                    <SelectValue placeholder="Seleccionar proyecto" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* {proyectos.map((proyecto) => ( */}
                      <SelectItem key={proyectos[1].id} value={proyectos[1].id.toString()}>
                        {proyectos[1].nombre}
                      </SelectItem>
                    {/* ))} */}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="servicio">Servicio</Label>
                <Select
                  value={selectedServicio}
                  onValueChange={setSelectedServicio}
                  disabled={isInitialDataLoading}
                >
                  <SelectTrigger id="servicio">
                    <SelectValue placeholder="Seleccionar servicio" />
                  </SelectTrigger>
                  <SelectContent>
                    {servicios.map((servicio) => (
                      <SelectItem key={servicio.id} value={servicio.codigo}>
                        {servicio.nombre} ({servicio.codigo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="periodo">Periodo</Label>
                <div className="flex space-x-2">
                  <Select 
                    value={mes} 
                    onValueChange={setMes}
                    disabled={isInitialDataLoading}
                  >
                    <SelectTrigger id="mes" className="w-full">
                      <SelectValue placeholder="Mes" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((mesNum) => (
                        <SelectItem key={mesNum} value={mesNum.toString()}>
                          {getNombreMes(mesNum.toString())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select 
                    value={ano} 
                    onValueChange={setAno}
                    disabled={isInitialDataLoading}
                  >
                    <SelectTrigger id="ano" className="w-full">
                      <SelectValue placeholder="Año" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from(
                        { length: 5 },
                        (_, i) => new Date().getFullYear() - 2 + i
                      ).map((anoNum) => (
                        <SelectItem key={anoNum} value={anoNum.toString()}>
                          {anoNum}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-end">
                <Button
                  onClick={generarFacturas}
                  disabled={isGenerating || !selectedProyecto || !selectedServicio || isInitialDataLoading}
                  className="w-full bg-[#008A4B] hover:bg-[#006837]"
                >
                  {isGenerating ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    "Generar Facturas Borrador"
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de Facturas Borrador */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Facturas Borrador</CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchFacturasBorrador}
              disabled={isLoading || isBatchProcessing}
            >
              <ArrowPathIcon className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={exportarAExcel}
              disabled={isLoading || facturas.length === 0 || isBatchProcessing}
            >
              <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
              Exportar a Excel
            </Button>
            
            <Button
              size="sm"
              className="bg-[#008A4B] hover:bg-[#006837]"
              disabled={selectedFacturas.length === 0 || isBatchProcessing}
              onClick={() => setIsConfirmApprovalOpen(true)}
            >
              <CheckCircleIcon className="w-4 h-4 mr-2" />
              Aprobar Seleccionadas ({selectedFacturas.length})
            </Button>
          </div>
        </CardHeader>
        
        {isBatchProcessing && batchProgress && (
          <CardContent className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Procesando Aprobación por Lotes...</h4>
            <Progress value={(batchProgress.processed / batchProgress.total) * 100} className="w-full mb-2" />
            <div className="text-sm text-gray-600 flex justify-between">
              <span>{`Lote ${batchProgress.currentBatch} de ${batchProgress.totalBatches}`}</span>
              <span>{`${batchProgress.processed} de ${batchProgress.total} facturas procesadas`}</span>
            </div>
            <div className="text-sm text-gray-600 mt-1">
              <span>{`Éxito: ${batchProgress.success}`}</span>
              <span className="ml-4 text-red-600">{`Errores: ${batchProgress.errors}`}</span>
            </div>
            {batchErrorsDetails.length > 0 && (
              <div className="mt-2 text-xs text-red-700 bg-red-50 p-2 rounded border border-red-200 max-h-20 overflow-y-auto">
                <strong>Detalle de errores:</strong>
                <ul>
                  {batchErrorsDetails.map((err, index) => <li key={index}>{err}</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        )}
        
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <ArrowPathIcon className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : facturas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <DocumentTextIcon className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p>No hay facturas borrador disponibles.</p>
              <p className="text-sm">Genere facturas usando el formulario superior.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Búsqueda global */}
              <div className="relative max-w-md mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <Input
                  className="h-10 pl-10"
                  placeholder="Buscar en todas las facturas..."
                  value={globalSearch}
                  onChange={e => setGlobalSearch(e.target.value)}
                />
                {globalSearch && (
                  <div className="absolute right-3 top-1/4 transform -translate-y-1/2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-5 w-5 p-0" 
                      onClick={() => setGlobalSearch('')}
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              
              {facturasFiltradasGlobal.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No se encontraron facturas que coincidan con "{globalSearch}".</p>
                </div>
              ) : (
                <>
                  {/* Resumen de totales combinados */}
                  <div className="bg-gray-50 p-4 rounded-md border border-gray-200 mb-6">
                    <h3 className="text-base font-medium text-gray-700 mb-3">Resumen Combinado (Proyecto + Periodo + Servicio)</h3>
                    <div className="overflow-auto max-h-[400px]">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-white sticky top-0">
                          <tr>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proyecto</th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Periodo</th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Servicio</th>
                            <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Facturas</th>
                            <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
                            <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">IVA</th>
                            <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {Object.entries(facturasPorGrupoFiltradas).flatMap(([proyectoClave, periodos]) => {
                            const [proyectoId, proyectoNombre] = proyectoClave.split(':');
                            
                            return Object.entries(periodos).flatMap(([periodoClave, servicios]) => {
                              // Formatear periodo para mostrar
                              const periodoPartes = periodoClave.split('-');
                              const periodoFormateado = periodoPartes.length === 2 
                                ? `${getNombreMes(periodoPartes[1])} ${periodoPartes[0]}`
                                : periodoClave;
                              
                              return Object.entries(servicios).map(([servicioClave, facturasServicio]) => {
                                const [servicioCodigo, servicioNombre] = servicioClave.split(':');
                                
                                // Calcular totales para esta combinación
                                const subtotal = facturasServicio.reduce((sum, f) => sum + (f.subtotal || 0), 0);
                                const iva = facturasServicio.reduce((sum, f) => sum + (f.monto_iva || 0), 0);
                                const total = facturasServicio.reduce((sum, f) => sum + (f.total || 0), 0);
                                
                                return (
                                  <tr key={`${proyectoClave}-${periodoClave}-${servicioClave}`}>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">{proyectoNombre}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">{periodoFormateado}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                                      {servicioNombre} <span className="text-xs text-gray-500">({servicioCodigo})</span>
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-700">{facturasServicio.length}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-700">{formatCurrency(subtotal)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-700">{formatCurrency(iva)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-right font-medium text-emerald-600">{formatCurrency(total)}</td>
                                  </tr>
                                );
                              });
                            });
                          })}
                          
                          {/* Total general */}
                          <tr className="bg-gray-50 font-medium">
                            <td colSpan={3} className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">Total General</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-700">{facturasFiltradasGlobal.length}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-700">{formatCurrency(facturasFiltradasGlobal.reduce((sum, f) => sum + (f.subtotal || 0), 0))}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-700">{formatCurrency(facturasFiltradasGlobal.reduce((sum, f) => sum + (f.monto_iva || 0), 0))}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-right font-medium text-emerald-600">{formatCurrency(facturasFiltradasGlobal.reduce((sum, f) => sum + (f.total || 0), 0))}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* Iterar por cada proyecto */}
                  {Object.entries(facturasPorGrupoFiltradas).map(([proyectoClave, periodos]) => {
                    const [proyectoId, proyectoNombre] = proyectoClave.split(':');
                    const proyectoGroupKey = `proyecto-${proyectoClave}`;
                    const isProyectoExpanded = expandedGroups[proyectoGroupKey] !== false; // por defecto expandido
                    
                    // Calcular total del proyecto
                    const totalProyecto = Object.values(periodos)
                      .flatMap(servicios => Object.values(servicios).flat())
                      .reduce((sum, f) => sum + (f.total || 0), 0);
                    
                    return (
                      <div key={proyectoClave} className="space-y-4 mb-8 border border-gray-200 rounded-lg overflow-hidden">
                        {/* Cabecera del proyecto con toggle */}
                        <div className="bg-gray-100 p-3 flex items-center justify-between">
                          <div 
                            className="flex items-center cursor-pointer" 
                            onClick={() => toggleGroup(proyectoGroupKey)}
                          >
                            <ChevronDownIcon 
                              className={`w-5 h-5 mr-2 transition-transform ${isProyectoExpanded ? 'transform rotate-0' : 'transform rotate-270'}`} 
                            />
                            <h3 className="text-lg font-medium text-gray-800">
                              {proyectoNombre}
                            </h3>
                          </div>
                          
                          <div className="flex items-center">
                            <div className="text-sm text-gray-500">
                              {Object.values(periodos).flatMap(servicios => 
                                Object.values(servicios).flat()
                              ).length} facturas
                            </div>
                          </div>
                        </div>
                        
                        {/* Contenido del proyecto (periodos) */}
                        {isProyectoExpanded && (
                          <div className="p-3">
                            {/* Iterar por cada periodo dentro del proyecto */}
                            {Object.entries(periodos).map(([periodoClave, servicios]) => {
                              // Formatear periodo para mostrar
                              const periodoPartes = periodoClave.split('-');
                              const periodoFormateado = periodoPartes.length === 2 
                                ? `${getNombreMes(periodoPartes[1])} ${periodoPartes[0]}`
                                : periodoClave;
                                
                              const periodoGroupKey = `periodo-${proyectoClave}-${periodoClave}`;
                              const isPeriodoExpanded = expandedGroups[periodoGroupKey] !== false; // por defecto expandido
                              
                              // Calcular totales para este período
                              const facturasPeríodo = Object.values(servicios).flat();
                              const subtotalPeriodo = facturasPeríodo.reduce((sum, f) => sum + (f.subtotal || 0), 0);
                              const ivaPeriodo = facturasPeríodo.reduce((sum, f) => sum + (f.monto_iva || 0), 0);
                              const totalPeriodo = facturasPeríodo.reduce((sum, f) => sum + (f.total || 0), 0);
                              
                              return (
                                <div key={periodoClave} className="ml-2 mb-4 border border-gray-100 rounded-md overflow-hidden">
                                  {/* Cabecera del periodo con toggle */}
                                  <div className="bg-gray-50 p-2 flex items-center justify-between">
                                    <div 
                                      className="flex items-center cursor-pointer" 
                                      onClick={() => toggleGroup(periodoGroupKey)}
                                    >
                                      <ChevronDownIcon 
                                        className={`w-4 h-4 mr-2 transition-transform ${isPeriodoExpanded ? 'transform rotate-0' : 'transform rotate-270'}`} 
                                      />
                                      <h4 className="text-md font-medium text-gray-700">
                                        Periodo: {periodoFormateado}
                                      </h4>
                                    </div>
                                    
                                    <div className="flex items-center">
                                      <div className="text-sm text-gray-500">
                                        {facturasPeríodo.length} facturas
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Contenido del periodo (servicios) */}
                                  {isPeriodoExpanded && (
                                    <div className="p-2">
                                      {/* Mostrar resumen por servicios */}
                                      {Object.keys(servicios).length > 1 && (
                                        <div className="mb-4 overflow-hidden">
                                          <div className="bg-white rounded-md shadow-sm border border-gray-100">
                                            <table className="min-w-full divide-y divide-gray-200">
                                              <thead className="bg-gray-50">
                                                <tr>
                                                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Servicio</th>
                                                  <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Facturas</th>
                                                  <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
                                                  <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">IVA</th>
                                                  <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                                </tr>
                                              </thead>
                                              <tbody className="bg-white divide-y divide-gray-200">
                                                {Object.entries(servicios).map(([servicioClave, facturasServicio]) => {
                                                  const [servicioCodigo, servicioNombre] = servicioClave.split(':');
                                                  
                                                  // Calcular totales para este servicio
                                                  const subtotal = facturasServicio.reduce((sum, f) => sum + (f.subtotal || 0), 0);
                                                  const iva = facturasServicio.reduce((sum, f) => sum + (f.monto_iva || 0), 0);
                                                  const total = facturasServicio.reduce((sum, f) => sum + (f.total || 0), 0);
                                                  
                                                  return (
                                                    <tr key={servicioClave}>
                                                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                                                        {servicioNombre} <span className="text-xs text-gray-500">({servicioCodigo})</span>
                                                      </td>
                                                      <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-700">
                                                        {facturasServicio.length}
                                                      </td>
                                                      <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-700">
                                                        {formatCurrency(subtotal)}
                                                      </td>
                                                      <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-700">
                                                        {formatCurrency(iva)}
                                                      </td>
                                                      <td className="px-3 py-2 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                                                        {formatCurrency(total)}
                                                      </td>
                                                    </tr>
                                                  );
                                                })}
                                                
                                                {/* Total del periodo */}
                                                <tr className="bg-gray-50">
                                                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-700">
                                                    Total {periodoFormateado}
                                                  </td>
                                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-center font-medium text-gray-700">
                                                    {facturasPeríodo.length}
                                                  </td>
                                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-right font-medium text-gray-700">
                                                    {formatCurrency(subtotalPeriodo)}
                                                  </td>
                                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-right font-medium text-gray-700">
                                                    {formatCurrency(ivaPeriodo)}
                                                  </td>
                                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                                                    {formatCurrency(totalPeriodo)}
                                                  </td>
                                                </tr>
                                              </tbody>
                                            </table>
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Iterar por cada servicio dentro del periodo */}
                                      {Object.entries(servicios).map(([servicioClave, facturasServicio]) => {
                                        // Separar código y nombre del servicio
                                        const [servicioCodigo, servicioNombre] = servicioClave.split(':');
                                        const servicioGroupKey = `servicio-${proyectoClave}-${periodoClave}-${servicioClave}`;
                                        const isServicioExpanded = expandedGroups[servicioGroupKey] !== false; // por defecto expandido
                                        
                                        return (
                                          <div key={servicioClave} className="ml-2 mb-4 border border-gray-100 rounded-md overflow-hidden">
                                            {/* Cabecera del servicio con toggle */}
                                            <div className="bg-gray-50 p-2 flex items-center justify-between">
                                              <div 
                                                className="flex items-center cursor-pointer" 
                                                onClick={() => toggleGroup(servicioGroupKey)}
                                              >
                                                <ChevronDownIcon 
                                                  className={`w-4 h-4 mr-2 transition-transform ${isServicioExpanded ? 'transform rotate-0' : 'transform rotate-270'}`} 
                                                />
                                                <div className="flex items-center">
                                                  <h5 className="text-sm font-medium text-gray-600">
                                                    {servicioNombre} 
                                                    <span className="text-xs text-gray-500 ml-2">
                                                      ({servicioCodigo})
                                                    </span>
                                                  </h5>
                                                  <div className="text-xs text-gray-500 ml-2 bg-gray-100 px-1.5 py-0.5 rounded">
                                                    {facturasServicio.length} facturas
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                            
                                            {/* Tabla de facturas con scroll */}
                                            {isServicioExpanded && (
                                              <div className="max-h-80 overflow-y-auto">
                                                <div className="rounded-md border">
                                                  <Table>
                                                    <TableHeader>
                                                      <TableRow>
                                                        <TableHead className="w-[40px] sticky top-0 bg-white">
                                                          <div className="flex items-center">
                                                            <input
                                                              type="checkbox"
                                                              checked={
                                                                facturasServicio.length > 0 && 
                                                                facturasServicio.every(f => selectedFacturas.includes(f.id))
                                                              }
                                                              onChange={() => {
                                                                const ids = facturasServicio.map(f => f.id);
                                                                if (ids.every(id => selectedFacturas.includes(id))) {
                                                                  // Deseleccionar todas de este grupo
                                                                  setSelectedFacturas(prev => 
                                                                    prev.filter(id => !ids.includes(id))
                                                                  );
                                                                } else {
                                                                  // Seleccionar todas de este grupo
                                                                  setSelectedFacturas(prev => 
                                                                    [...new Set([...prev, ...ids])]
                                                                  );
                                                                }
                                                              }}
                                                              disabled={isBatchProcessing}
                                                              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
                                                            />
                                                          </div>
                                                        </TableHead>
                                                        <TableHead className="sticky top-0 bg-white">Propiedad</TableHead>
                                                        <TableHead className="sticky top-0 bg-white">Encargado Pago</TableHead>
                                                        <TableHead className="sticky top-0 bg-white">Estado</TableHead>
                                                        <TableHead className="text-right sticky top-0 bg-white">Subtotal</TableHead>
                                                        <TableHead className="text-right sticky top-0 bg-white">IVA</TableHead>
                                                        <TableHead className="text-right sticky top-0 bg-white">Total</TableHead>
                                                        <TableHead className="text-center sticky top-0 bg-white">Acciones</TableHead>
                                                      </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                      {facturasServicio.map((factura) => {
                                                        // Usar el helper para formatear identificadores
                                                        const identificadorPropiedad = formatPropertyIdentifier(factura.propiedad?.identificadores);
                                                        
                                                        return (
                                                          <TableRow key={factura.id}>
                                                            <TableCell>
                                                              <input
                                                                type="checkbox"
                                                                checked={selectedFacturas.includes(factura.id)}
                                                                onChange={() => toggleFacturaSelection(factura.id)}
                                                                disabled={isBatchProcessing}
                                                                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
                                                              />
                                                            </TableCell>
                                                            <TableCell>{identificadorPropiedad}</TableCell>
                                                            <TableCell>
                                                              {factura.propiedad ? (
                                                                (() => {
                                                                  const encargadoPago = factura.propiedad.encargado_pago;
                                                                  const responsable = encargadoPago === 'Propietario' 
                                                                    ? factura.propiedad.propietario 
                                                                    : factura.propiedad.ocupante;
                                                                  
                                                                  if (!responsable) return <div className="text-gray-500">No asignado</div>;
                                                                  
                                                                  const tipoPersona = responsable.tipo_persona || 'N/A';
                                                                  const nombre = tipoPersona === 'Natural'
                                                                    ? responsable.persona_natural?.razon_social
                                                                    : responsable.persona_juridica?.razon_social;
                                                                  
                                                                  return (
                                                                    <>
                                                                      <div className="font-medium">{nombre || 'N/A'}</div>
                                                                      <div className="text-xs text-gray-500">{encargadoPago} ({tipoPersona})</div>
                                                                    </>
                                                                  );
                                                                })()
                                                              ) : (
                                                                <div className="text-gray-500">Sin propiedad</div>
                                                              )}
                                                            </TableCell>
                                                            <TableCell>
                                                              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800">
                                                                {factura.estado}
                                                              </span>
                                                            </TableCell>
                                                            <TableCell className="text-right">{formatCurrency(factura.subtotal || 0)}</TableCell>
                                                            <TableCell className="text-right">{formatCurrency(factura.monto_iva || 0)}</TableCell>
                                                            <TableCell className="text-right font-medium">{formatCurrency(factura.total || 0)}</TableCell>
                                                            <TableCell className="text-center">
                                                              <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => openConfiguracionModal(factura)}
                                                                title="Configuración de facturación"
                                                              >
                                                                <Cog6ToothIcon className="h-4 w-4" />
                                                              </Button>
                                                            </TableCell>
                                                          </TableRow>
                                                        );
                                                      })}
                                                    </TableBody>
                                                  </Table>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Modal de Estado */}
      <StatusModal
        open={statusModal.open}
        onOpenChange={(open) => setStatusModal({ ...statusModal, open })}
        title={statusModal.title}
        message={statusModal.message}
        type={statusModal.type}
      />
      
      {/* Modal de configuración de facturación */}
      <ConfiguracionFacturacionModal 
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        propiedadId={configModalData.propiedadId}
        clienteId={configModalData.clienteId}
        servicioId={configModalData.servicioId}
        facturaId={configModalData.facturaId}
        propiedadNombre={configModalData.propiedadNombre}
        servicioNombre={configModalData.servicioNombre}
        clienteNombre={configModalData.clienteNombre}
        areaPropiedad={configModalData.areaPropiedad}
        onSaved={() => {
          // Actualizar datos si es necesario
          fetchFacturasBorrador();
        }}
        onRecalcular={handleRecalculoFactura}
      />
      
      {/* Modal de confirmación de aprobación */}
      <ConfirmApprovalModal
        isOpen={isConfirmApprovalOpen}
        onClose={() => setIsConfirmApprovalOpen(false)}
        onConfirm={procesarAprobacionFacturas}
        isLoading={isApprovingFacturas || isBatchProcessing}
        facturaCount={selectedFacturas.length}
      />
    </div>
  );
} 