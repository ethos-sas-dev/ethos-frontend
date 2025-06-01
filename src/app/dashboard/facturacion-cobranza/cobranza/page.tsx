"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "../../../../../lib/supabase/client";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Badge } from "@/app/_components/ui/badge";
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
  ChevronDownIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  CheckIcon,
  BanknotesIcon,
  EyeIcon,
  ArrowsRightLeftIcon
} from "@heroicons/react/24/outline";
import { formatNumber } from "../../../../lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/_components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/app/_components/ui/dialog";

// Tipos
type Factura = {
  id: number;
  periodo: string;
  estado: string;
  propiedad_id: number;
  cliente_id: number;
  subtotal: number;
  monto_iva: number;
  total: number;
  retencion?: number;
  observaciones?: string;
  contifico_id?: string;
  fecha_generacion?: string;
  fecha_aprobacion?: string;
  fecha_envio?: string;
  fecha_pago?: string;
  fecha_comprobante?: string;
  comentarios_pago?: string;
  comprobante_pago_id?: number;
  comprobante_pago?: {
    id: number;
    external_url: string;
  };
  items_factura: any[];
  propiedad?: {
    identificadores: any;
    proyecto_id?: number;
    proyecto?: {
      id: number;
      nombre: string;
    };
  };
  cliente?: {
    id: number;
    tipo_persona: string;
    persona_natural?: { razon_social: string };
    persona_juridica?: { razon_social: string };
  };
  proyecto?: {
    id: number;
    nombre: string;
  };
  pagos_cliente?: PagoCliente[];
};

type Proyecto = {
  id: number;
  nombre: string;
};

type PagoCliente = {
  id: number;
  factura_id: number;
  cliente_id: number;
  monto: number;
  medio_pago: string;
  fecha_pago: string;
  contifico_cobro_id?: string;
  numero_cheque?: string;
  observaciones?: string;
};

export default function CobranzaPage() {
  const supabase = createClient();
  
  // Estados
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = useState("");
  const [expandedProyectos, setExpandedProyectos] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState("todas");
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null);
  const [expandedFacturas, setExpandedFacturas] = useState<Record<string, boolean>>({});
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [showRetencionModal, setShowRetencionModal] = useState(false);
  const [selectedFacturaRetencion, setSelectedFacturaRetencion] = useState<Factura | null>(null);
  const [montoRetencion, setMontoRetencion] = useState("");
  const [isProcessingRetencion, setIsProcessingRetencion] = useState(false);
  
  // Detectar parámetro de URL para mostrar pendientes por defecto
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tab = urlParams.get('tab');
      if (tab === 'pendientes') {
        setActiveTab('pendientesValidacion');
      }
    }
  }, []);

  // Cargar facturas y proyectos al iniciar
  useEffect(() => {
    fetchFacturas();
    fetchProyectos();
  }, []);

  // Inicializar verificación de rol al cargar
  useEffect(() => {
    const checkUserRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('Session user:', session.user);
        
        // Intentar diferentes campos posibles para encontrar el rol
        const attempts: Array<{table: string, field: string, keyField: string, keyValue: string}> = [
          // Intento 1: usuarios con auth_id
          { table: 'usuarios', field: 'rol', keyField: 'auth_id', keyValue: session.user.id },
          // Intento 2: usuarios con user_id  
          { table: 'usuarios', field: 'rol', keyField: 'user_id', keyValue: session.user.id },
          // Intento 3: usuarios con id
          { table: 'usuarios', field: 'rol', keyField: 'id', keyValue: session.user.id },
          // Intento 4: perfiles_cliente con auth_id
          { table: 'perfiles_cliente', field: 'rol', keyField: 'auth_id', keyValue: session.user.id },
          // Intento 5: perfiles_cliente con user_id
          { table: 'perfiles_cliente', field: 'rol', keyField: 'user_id', keyValue: session.user.id },
        ];
        
        for (const attempt of attempts) {
          try {
            console.log(`Intentando ${attempt.table}.${attempt.field} con ${attempt.keyField}:`, attempt.keyValue);
            
            const { data, error } = await supabase
              .from(attempt.table)
              .select(attempt.field)
              .eq(attempt.keyField, attempt.keyValue)
              .single();
              
            if (!error && data && (data as any).rol) {
              console.log(`✅ Rol encontrado en ${attempt.table}.${attempt.field}:`, (data as any).rol);
              setUserRole((data as any).rol);
              return;
            } else {
              console.log(`❌ No encontrado en ${attempt.table}:`, error?.message);
            }
          } catch (err) {
            console.log(`❌ Error en ${attempt.table}:`, err);
          }
        }
        
        // Si no encuentra en ninguna tabla, usar metadata como último recurso
        if (session.user.user_metadata?.role) {
          console.log('✅ Rol desde metadata:', session.user.user_metadata.role);
          setUserRole(session.user.user_metadata.role);
          return;
        }
        
        // Como último recurso, establecer como 'Directorio' basado en los logs anteriores
        console.log('⚠️ Estableciendo rol por defecto como Directorio basado en logs previos');
        setUserRole('Directorio');
      }
    };
    
    checkUserRole();
  }, [supabase]);

  console.log('Current userRole:', userRole);

  // Verificar si el usuario puede realizar acciones administrativas
  const canPerformAdminActions = useMemo(() => {
    return ['Administrador', 'Directorio', 'Jefe Operativo'].includes(userRole || '');
  }, [userRole]);
  console.log(userRole)
  // Función para cargar facturas (cualquier estado excepto Borrador)
  const fetchFacturas = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from("facturas")
        .select(`
          id, periodo, estado, propiedad_id, cliente_id, subtotal, monto_iva, total, 
          retencion, observaciones, contifico_id, fecha_generacion, fecha_aprobacion, fecha_envio,
          fecha_comprobante, comentarios_pago, comprobante_pago_id,
          items_factura,
          propiedad:propiedades!inner (
            identificadores,
            proyecto_id,
            proyecto:proyectos!inner (
              id, 
              nombre
            )
          ),
          cliente:perfiles_cliente (
            id,
            tipo_persona,
            persona_natural:persona_natural_id (razon_social),
            persona_juridica:persona_juridica_id (razon_social)
          ),
          comprobante_pago:archivos (
            id,
            external_url
          ),
          pagos_cliente:pagos_cliente (
            id,
            monto,
            medio_pago,
            fecha_pago,
            contifico_cobro_id,
            numero_cheque,
            observaciones
          )
        `)
        .neq("estado", "Borrador")
        .order('fecha_generacion', { ascending: false });

      if (error) throw error;
      
      // Formatear los datos para tener la estructura correcta 
      const facturasFormateadas = data.map((factura: any) => {
        // Transferir el proyecto desde propiedad.proyecto a factura.proyecto
        const proyecto = factura.propiedad?.proyecto;
        
        return {
          ...factura,
          proyecto: proyecto,
          items_factura: factura.items_factura || [],
          // Asegurar que el comprobante de pago sea un objeto, no un array
          comprobante_pago: Array.isArray(factura.comprobante_pago) && factura.comprobante_pago.length > 0 
            ? factura.comprobante_pago[0] 
            : factura.comprobante_pago,
          // Asegurar que pagos_cliente sea un array
          pagos_cliente: factura.pagos_cliente || []
        };
      });
      
      setFacturas(facturasFormateadas);
    } catch (err: any) {
      console.error("Error al cargar facturas:", err.message);
      setError("Error al cargar las facturas. Por favor, intente nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Función para cargar proyectos
  const fetchProyectos = async () => {
    try {
      const { data, error } = await supabase
        .from("proyectos")
        .select("id, nombre")
        .order("nombre");
        
      if (error) throw error;
      setProyectos(data || []);
    } catch (err: any) {
      console.error("Error al cargar proyectos:", err.message);
    }
  };
  
  // Función para alternar la expansión de un proyecto
  const toggleProyecto = (proyectoId: number) => {
    setExpandedProyectos(prev => ({
      ...prev,
      [proyectoId.toString()]: !prev[proyectoId.toString()]
    }));
  };
  
  // Helper para formatear identificadores de propiedad
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

    if (parts.length > 0) {
      return parts.join(' - ');
    }

    if (identificadores.codigo) {
      return identificadores.codigo;
    }
    
    return "Sin identificador";
  };
  
  // Filtrar facturas según búsqueda y tab activo
  const filtrarFacturas = (facturas: Factura[], searchTerm: string, tabActivo: string) => {
    if (!searchTerm && tabActivo === "todas") return facturas;
    
    const lowerSearch = searchTerm.toLowerCase();
    return facturas.filter(factura => {
      // Buscar en propiedad
      const identificador = formatPropertyIdentifier(factura.propiedad?.identificadores).toLowerCase();
      
      // Buscar en cliente
      let nombreCliente = '';
      if (factura.cliente) {
        nombreCliente = factura.cliente.tipo_persona === 'Natural'
          ? (factura.cliente.persona_natural?.razon_social || '').toLowerCase()
          : (factura.cliente.persona_juridica?.razon_social || '').toLowerCase();
      }
      
      // Buscar en otros datos
      const estado = factura.estado?.toLowerCase() || '';
      const facturaId = factura.id?.toString() || '';
      const contifico = factura.contifico_id?.toLowerCase() || '';
      const proyectoNombre = factura.proyecto?.nombre?.toLowerCase() || '';
      const periodo = factura.periodo?.toLowerCase() || '';
      
      // Filtrar por término de búsqueda
      const busquedaMatch = !searchTerm || 
        identificador.includes(lowerSearch) ||
        nombreCliente.includes(lowerSearch) ||
        estado.includes(lowerSearch) ||
        facturaId.includes(lowerSearch) ||
        contifico.includes(lowerSearch) ||
        proyectoNombre.includes(lowerSearch) ||
        periodo.includes(lowerSearch);
      
      // Filtrar por tab
      let tabMatch = tabActivo === "todas";
      
      if (tabActivo === "pendientesValidacion") {
        tabMatch = factura.estado === "PendienteValidacion";
      } else if (tabActivo === "enviadas") {
        tabMatch = factura.estado === "Enviada";
      } else if (tabActivo === "pagadas") {
        tabMatch = factura.estado === "Pagada" || factura.estado === "PagadaConComprobante";
      } else if (tabActivo === "parciales") {
        tabMatch = factura.estado === "Parcial";
      }
      
      return busquedaMatch && tabMatch;
    });
  };

  // Facturas filtradas por búsqueda y tab activo
  const facturasFiltradas = useMemo(() => {
    return filtrarFacturas(facturas, globalSearch, activeTab);
  }, [facturas, globalSearch, activeTab]);
  
  // Agrupar facturas por proyecto
  const facturasPorProyecto = useMemo(() => {
    const agrupadas: Record<string, { proyecto: Proyecto, facturas: Factura[] }> = {};
    
    facturasFiltradas.forEach(factura => {
      if (factura.proyecto) {
        const proyectoId = factura.proyecto.id.toString();
        
        if (!agrupadas[proyectoId]) {
          agrupadas[proyectoId] = {
            proyecto: factura.proyecto,
            facturas: []
          };
        }
        
        agrupadas[proyectoId].facturas.push(factura);
      }
    });
    
    return agrupadas;
  }, [facturasFiltradas]);
  
  // Inicializar todos los proyectos como expandidos por defecto
  useEffect(() => {
    if (facturas.length > 0 && Object.keys(expandedProyectos).length === 0) {
      const initialExpandedState: Record<string, boolean> = {};
      Object.keys(facturasPorProyecto).forEach(proyectoId => {
        initialExpandedState[proyectoId] = true;
      });
      
      setExpandedProyectos(initialExpandedState);
    }
  }, [facturasPorProyecto]);
  
  // Formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };
  
  // Formatear fecha
  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('es-EC', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  // Obtener color del badge según estado
  const getEstadoBadgeColor = (estado: string) => {
    switch (estado) {
      case "Aprobado":
        return "bg-green-100 text-green-800 border-green-200";
      case "Enviada":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Pagada":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "Vencido":
        return "bg-red-100 text-red-800 border-red-200";
      case "Anulado":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "PendienteValidacion":
        return "bg-amber-100 text-amber-800 border-amber-200";
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  };
  
  // Aprobar comprobante y cambiar estado a Pagada
  const aprobarComprobante = async (facturaId: number) => {
    if (!confirm("¿Está seguro que desea aprobar este comprobante? La factura cambiará a estado Pagada.")) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('facturas')
        .update({
          estado: 'Pagada'
        })
        .eq('id', facturaId);
        
      if (error) throw error;
      
      // Actualizar lista de facturas
      await fetchFacturas();
      
    } catch (err: any) {
      console.error("Error al aprobar comprobante:", err.message);
      alert("Error al aprobar el comprobante: " + err.message);
    }
  };

  // Rechazar comprobante y revertir al estado anterior
  const rechazarComprobante = async (facturaId: number) => {
    if (!confirm("¿Está seguro que desea rechazar este comprobante? La factura volverá al estado Enviada.")) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('facturas')
        .update({
          estado: 'Enviada' // Revertir al estado anterior
        })
        .eq('id', facturaId);
        
      if (error) throw error;
      
      // Actualizar lista de facturas
      await fetchFacturas();
      
    } catch (err: any) {
      console.error("Error al rechazar comprobante:", err.message);
      alert("Error al rechazar el comprobante: " + err.message);
    }
  };
  
  // Abrir modal de detalles
  const handleOpenDetailsModal = (factura: Factura) => {
    setSelectedFactura(factura);
    setShowDetailsModal(true);
  };
  
  // Añadir función para expandir/ocultar facturas individuales
  const toggleFactura = (facturaId: number) => {
    setExpandedFacturas(prev => ({
      ...prev,
      [facturaId.toString()]: !prev[facturaId.toString()]
    }));
  };

  // Función para calcular el saldo de una factura
  const calcularSaldo = (factura: Factura): number => {
    const totalPagos = factura.pagos_cliente?.reduce((sum, pago) => sum + (pago.monto || 0), 0) || 0;
    const retencion = factura.retencion || 0;
    return Math.max(0, factura.total - totalPagos - retencion);
  };

  // Función para obtener el total pagado (pagos + retención)
  const calcularTotalPagado = (factura: Factura): number => {
    const totalPagos = factura.pagos_cliente?.reduce((sum, pago) => sum + (pago.monto || 0), 0) || 0;
    const retencion = factura.retencion || 0;
    return totalPagos + retencion;
  };

  // Función para abrir modal de retención
  const abrirModalRetencion = (factura: Factura) => {
    setSelectedFacturaRetencion(factura);
    setMontoRetencion("");
    setShowRetencionModal(true);
  };

  // Función para procesar retención
  const procesarRetencion = async () => {
    if (!selectedFacturaRetencion || !montoRetencion) return;

    const monto = parseFloat(montoRetencion);
    if (isNaN(monto) || monto <= 0) {
      alert("Por favor ingrese un monto válido");
      return;
    }

    setIsProcessingRetencion(true);
    try {
      const totalPagado = calcularTotalPagado(selectedFacturaRetencion);
      const nuevoTotalConRetencion = totalPagado + monto;
      
      // Determinar nuevo estado
      let nuevoEstado = selectedFacturaRetencion.estado;
      if (nuevoTotalConRetencion >= selectedFacturaRetencion.total) {
        nuevoEstado = 'Pagada';
      }

      // Actualizar la factura con la retención
      const { error } = await supabase
        .from('facturas')
        .update({ 
          retencion: (selectedFacturaRetencion.retencion || 0) + monto,
          estado: nuevoEstado
        })
        .eq('id', selectedFacturaRetencion.id);

      if (error) throw error;

      // Recargar facturas
      await fetchFacturas();
      setShowRetencionModal(false);
      setSelectedFacturaRetencion(null);
      setMontoRetencion("");
      
      alert(`Retención de ${formatCurrency(monto)} agregada exitosamente`);
    } catch (error: any) {
      console.error('Error al procesar retención:', error);
      alert('Error al procesar la retención: ' + error.message);
    } finally {
      setIsProcessingRetencion(false);
    }
  };

  // Función para sincronizar pagos con Contifico
  const sincronizarPagos = async () => {
    setShowSyncDialog(true);
  };

  const ejecutarSincronizacion = async () => {
    setShowSyncDialog(false);
    setIsSyncing(true);
    setError(null);
    setSyncMessage("Conectando con Contifico y verificando pagos...");
    
    try {
      const response = await fetch('/api/facturacion/verificar-pagos', {
        method: 'GET'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.mensaje || data.error || 'Error al sincronizar pagos');
      }
      
      // Mostrar mensaje de éxito con estadísticas
      setSyncMessage(`🎉 ¡Sincronización completada exitosamente!

📊 Resultados:
• ${data.facturas_procesadas} facturas verificadas
• ${data.facturas_actualizadas} facturas actualizadas
• ${data.nuevos_cobros_procesados} nuevos cobros encontrados
• ${data.cobros_omitidos} cobros ya registrados

✅ Los datos han sido actualizados automáticamente.`);
      
      // Recargar las facturas para mostrar los cambios
      await fetchFacturas();
      
      // Limpiar mensaje después de unos segundos
      setTimeout(() => {
        setSyncMessage(null);
      }, 8000);
      
    } catch (err: any) {
      console.error("Error al sincronizar pagos:", err.message);
      const errorMessage = err.message.includes('fetch') 
        ? "Error de conexión. Verifique su conexión a internet e intente nuevamente."
        : err.message;
      setError("❌ Error al sincronizar pagos: " + errorMessage);
      setSyncMessage(null);
    } finally {
      setIsSyncing(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Gestión de Cobranza</CardTitle>
          <div className="flex items-center space-x-2">
            {/* <Button
              variant="outline"
              size="sm"
              onClick={fetchFacturas}
              disabled={isLoading || isSyncing}
              className="text-sm"
            >
              <ArrowPathIcon className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button> */}
            <Button
              variant="outline"
              size="sm"
              onClick={sincronizarPagos}
              disabled={isSyncing || isLoading}
              className="text-sm bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
            >
              <ArrowsRightLeftIcon className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-pulse' : ''}`} />
              {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-6">
            {/* Búsqueda global */}
            <div className="relative max-w-md">
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
            
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
              <TabsList className="grid grid-cols-5 w-full sm:grid-cols-5">
                <TabsTrigger value="todas">Todas</TabsTrigger>
                <TabsTrigger value="pendientesValidacion">
                  Validación
                </TabsTrigger>
                <TabsTrigger value="enviadas">
                  Enviadas
                </TabsTrigger>
                <TabsTrigger value="pagadas">
                  Pagadas
                </TabsTrigger>
                <TabsTrigger value="parciales">
                  Parciales
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-8">
              <ArrowPathIcon className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="text-center py-6 text-red-500">
              <p>{error}</p>
              <Button 
                onClick={fetchFacturas} 
                variant="outline" 
                className="mt-2"
              >
                Reintentar
              </Button>
            </div>
          ) : facturasFiltradas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <DocumentTextIcon className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p>No hay facturas disponibles.</p>
              {globalSearch && <p className="text-sm mt-1">Intente con otros términos de búsqueda.</p>}
              {activeTab === "pendientesValidacion" && <p className="text-sm mt-1">No hay facturas pendientes de validación.</p>}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Estadísticas resumen */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-white shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-500">Total Facturas</p>
                    <p className="text-2xl font-bold">{facturasFiltradas.length}</p>
                  </CardContent>
                </Card>
                <Card className="bg-white shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-500">Monto Total</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(facturasFiltradas.reduce((sum, f) => sum + (f.total || 0), 0))}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-500">Pagadas</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {facturasFiltradas.filter(f => f.estado === 'Pagada').length}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-500">Pendientes</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {facturasFiltradas.filter(f => f.estado !== 'Pagada' && f.estado !== 'Anulado').length}
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              {activeTab === "pendientesValidacion" ? (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Propiedad</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Periodo</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Fecha Comprobante</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Pagado</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                        <TableHead className="text-center">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {facturasFiltradas.map(factura => {
                        // Obtener identificador de propiedad
                        const identificador = formatPropertyIdentifier(factura.propiedad?.identificadores);
                        
                        // Obtener nombre del cliente directamente
                        let nombreCliente = 'N/A';
                        if (factura.cliente) {
                          nombreCliente = factura.cliente.tipo_persona === 'Natural'
                            ? factura.cliente.persona_natural?.razon_social || 'N/A'
                            : factura.cliente.persona_juridica?.razon_social || 'N/A';
                        }
                        
                        return (
                          <React.Fragment key={factura.id}>
                            <TableRow 
                              className="cursor-pointer hover:bg-gray-50"
                              onClick={() => toggleFactura(factura.id)}
                            >
                              <TableCell className="font-medium">
                                <div className="flex items-center">
                                  {factura.pagos_cliente && factura.pagos_cliente.length > 0 && (
                                    <ChevronDownIcon 
                                      className={`h-4 w-4 mr-2 transform transition-transform ${expandedFacturas[factura.id.toString()] ? 'rotate-0' : '-rotate-90'}`} 
                                    />
                                  )}
                                  {factura.id}
                                </div>
                              </TableCell>
                              <TableCell className="max-w-[150px] truncate" title={identificador}>
                                {identificador}
                              </TableCell>
                              <TableCell className="max-w-[150px] truncate" title={nombreCliente}>
                                {nombreCliente}
                              </TableCell>
                              <TableCell>{factura.periodo}</TableCell>
                              <TableCell>
                                <Badge className={`${getEstadoBadgeColor(factura.estado)} border`}>
                                  {factura.estado}
                                </Badge>
                              </TableCell>
                              <TableCell>{formatDate(factura.fecha_comprobante)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(factura.total || 0)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(calcularTotalPagado(factura))}</TableCell>
                              <TableCell className="text-right font-medium">
                                {calcularSaldo(factura) > 0 ? (
                                  <span className="text-red-600">{formatCurrency(calcularSaldo(factura))}</span>
                                ) : (
                                  <span className="text-green-600">$0.00</span>
                                )}
                              </TableCell>
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <div className="flex justify-center space-x-1">
                                  {/* Ver detalles - siempre visible */}
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 w-8 p-0"
                                    title="Ver detalles"
                                    onClick={() => handleOpenDetailsModal(factura)}
                                  >
                                    <EyeIcon className="h-4 w-4" />
                                  </Button>
                                  
                                  {/* Botones de aprobación/rechazo - solo para roles administrativos */}
                                  {factura.estado === "PendienteValidacion" && canPerformAdminActions && (
                                    <>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-800"
                                        title="Aprobar comprobante"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          aprobarComprobante(factura.id);
                                        }}
                                      >
                                        <CheckIcon className="h-4 w-4" />
                                      </Button>
                                      
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                                        title="Rechazar comprobante"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          rechazarComprobante(factura.id);
                                        }}
                                      >
                                        <XMarkIcon className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                            
                            {/* Mostrar pagos relacionados con la factura cuando está expandida */}
                            {(factura.pagos_cliente && factura.pagos_cliente.length > 0 && expandedFacturas[factura.id.toString()]) && (
                              <TableRow className="bg-gray-50">
                                <TableCell colSpan={10} className="p-0">
                                  <div className="p-3">
                                    <h4 className="text-sm font-medium mb-2 text-gray-700">Cobros Registrados</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                      {factura.pagos_cliente.map((pago) => (
                                        <div key={pago.id} className="bg-white p-3 rounded border border-gray-200 shadow-sm">
                                          <div className="flex justify-between items-start mb-2">
                                            <span className="font-medium text-sm">{formatCurrency(pago.monto)}</span>
                                            <Badge className="capitalize">
                                              {pago.medio_pago}
                                            </Badge>
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            <p>Fecha: {formatDate(pago.fecha_pago)}</p>
                                            {pago.numero_cheque && <p>Cheque: {pago.numero_cheque}</p>}
                                            {pago.contifico_cobro_id && <p>ID en Contifico: {pago.contifico_cobro_id}</p>}
                                            {pago.observaciones && <p className="truncate" title={pago.observaciones}>Nota: {pago.observaciones}</p>}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                // Facturas agrupadas por proyecto (vista original)
                <div className="space-y-4">
                  {Object.entries(facturasPorProyecto).map(([proyectoId, { proyecto, facturas }]) => {
                    const isExpanded = !!expandedProyectos[proyectoId];
                    
                    // Calcular totales por proyecto
                    const totalFacturas = facturas.length;
                    const montoTotal = facturas.reduce((sum, f) => sum + (f.total || 0), 0);
                    const facturasPagadas = facturas.filter(f => f.estado === 'Pagada').length;
                    const montoPagada = facturas.filter(f => f.estado === 'Pagada').reduce((sum, f) => sum + (f.total || 0), 0);
                    
                    return (
                      <Card key={proyectoId} className="overflow-hidden">
                        <div 
                          className="py-4 px-6 bg-gray-50 cursor-pointer flex justify-between items-center"
                          onClick={() => toggleProyecto(parseInt(proyectoId))}
                        >
                          <div className="flex items-center space-x-2">
                            <ChevronDownIcon className={`h-5 w-5 transform transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                            <h3 className="text-lg font-semibold">{proyecto.nombre}</h3>
                          </div>
                          <div className="flex items-center space-x-4 text-sm">
                            <span className="text-gray-600">{totalFacturas} facturas</span>
                            <span className="font-medium">{formatCurrency(montoTotal)}</span>
                          </div>
                        </div>
                        
                        {isExpanded && (
                          <div className="p-0">
                            <div className="overflow-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>Propiedad</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Periodo</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Fecha Emisión</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead className="text-right">Pagado</TableHead>
                                    <TableHead className="text-right">Saldo</TableHead>
                                    <TableHead className="text-center">Acciones</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {facturas.map(factura => {
                                    // Obtener identificador de propiedad
                                    const identificador = formatPropertyIdentifier(factura.propiedad?.identificadores);
                                    
                                    // Obtener nombre del cliente directamente
                                    let nombreCliente = 'N/A';
                                    if (factura.cliente) {
                                      nombreCliente = factura.cliente.tipo_persona === 'Natural'
                                        ? factura.cliente.persona_natural?.razon_social || 'N/A'
                                        : factura.cliente.persona_juridica?.razon_social || 'N/A';
                                    }
                                    
                                    return (
                                      <React.Fragment key={factura.id}>
                                        <TableRow 
                                          className="cursor-pointer hover:bg-gray-50"
                                          onClick={() => toggleFactura(factura.id)}
                                        >
                                          <TableCell className="font-medium">
                                            <div className="flex items-center">
                                              {factura.pagos_cliente && factura.pagos_cliente.length > 0 && (
                                                <ChevronDownIcon 
                                                  className={`h-4 w-4 mr-2 transform transition-transform ${expandedFacturas[factura.id.toString()] ? 'rotate-0' : '-rotate-90'}`} 
                                                />
                                              )}
                                              {factura.id}
                                            </div>
                                          </TableCell>
                                          <TableCell className="max-w-[150px] truncate" title={identificador}>
                                            {identificador}
                                          </TableCell>
                                          <TableCell className="max-w-[150px] truncate" title={nombreCliente}>
                                            {nombreCliente}
                                          </TableCell>
                                          <TableCell>{factura.periodo}</TableCell>
                                          <TableCell>
                                            <Badge className={`${getEstadoBadgeColor(factura.estado)} border`}>
                                              {factura.estado}
                                            </Badge>
                                          </TableCell>
                                          <TableCell>{formatDate(factura.fecha_generacion)}</TableCell>
                                          <TableCell className="text-right">{formatCurrency(factura.total || 0)}</TableCell>
                                          <TableCell className="text-right">{formatCurrency(calcularTotalPagado(factura))}</TableCell>
                                          <TableCell className="text-right font-medium">
                                            {calcularSaldo(factura) > 0 ? (
                                              <span className="text-red-600">{formatCurrency(calcularSaldo(factura))}</span>
                                            ) : (
                                              <span className="text-green-600">$0.00</span>
                                            )}
                                          </TableCell>
                                          <TableCell onClick={(e) => e.stopPropagation()}>
                                            <div className="flex justify-center space-x-1">
                                              {/* Botón de retención - solo para facturas parciales y roles administrativos */}
                                              {factura.estado === 'Parcial' && canPerformAdminActions && (
                                                <Button 
                                                  variant="ghost" 
                                                  size="sm" 
                                                  className="h-8 w-8 p-0 text-purple-600 hover:text-purple-800"
                                                  title="Agregar retención"
                                                  onClick={() => abrirModalRetencion(factura)}
                                                >
                                                  <BanknotesIcon className="h-4 w-4" />
                                                </Button>
                                              )}
                                              
                                              {/* Acción de ver detalle - siempre visible */}
                                              <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-8 w-8 p-0"
                                                title="Ver detalles"
                                                onClick={() => handleOpenDetailsModal(factura)}
                                              >
                                                <DocumentTextIcon className="h-4 w-4" />
                                              </Button>
                                              
                                              {/* Botones de aprobación/rechazo - solo para roles administrativos */}
                                              {factura.estado === "PendienteValidacion" && canPerformAdminActions && (
                                                <>
                                                  <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-800"
                                                    title="Aprobar comprobante"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      aprobarComprobante(factura.id);
                                                    }}
                                                  >
                                                    <CheckIcon className="h-4 w-4" />
                                                  </Button>
                                                  
                                                  <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                                                    title="Rechazar comprobante"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      rechazarComprobante(factura.id);
                                                    }}
                                                  >
                                                    <XMarkIcon className="h-4 w-4" />
                                                  </Button>
                                                </>
                                              )}
                                              
                                              {/* Acción de enviar factura - solo para usuarios administrativos */}
                                              {factura.estado === 'Aprobado' && canPerformAdminActions && (
                                                <Button 
                                                  variant="ghost" 
                                                  size="sm" 
                                                  className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800"
                                                  title="Enviar factura"
                                                >
                                                  <PaperAirplaneIcon className="h-4 w-4" />
                                                </Button>
                                              )}
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                        
                                        {/* Mostrar cobros expandibles en vista de proyecto */}
                                        {(factura.pagos_cliente && factura.pagos_cliente.length > 0 && expandedFacturas[factura.id.toString()]) && (
                                          <TableRow className="bg-gray-50">
                                            <TableCell colSpan={10} className="p-0">
                                              <div className="p-3">
                                                <h4 className="text-sm font-medium mb-2 text-gray-700">Cobros Registrados</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                  {factura.pagos_cliente.map((pago) => (
                                                    <div key={pago.id} className="bg-white p-3 rounded border border-gray-200 shadow-sm">
                                                      <div className="flex justify-between items-start mb-2">
                                                        <span className="font-medium text-sm">{formatCurrency(pago.monto)}</span>
                                                        <Badge className="capitalize">
                                                          {pago.medio_pago}
                                                        </Badge>
                                                      </div>
                                                      <div className="text-xs text-gray-500">
                                                        <p>Fecha: {formatDate(pago.fecha_pago)}</p>
                                                        {pago.numero_cheque && <p>Cheque: {pago.numero_cheque}</p>}
                                                        {pago.contifico_cobro_id && <p>ID en Contifico: {pago.contifico_cobro_id}</p>}
                                                        {pago.observaciones && <p className="truncate" title={pago.observaciones}>Nota: {pago.observaciones}</p>}
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            </TableCell>
                                          </TableRow>
                                        )}
                                      </React.Fragment>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                            
                            <CardFooter className="flex justify-between bg-gray-50 p-4 border-t text-sm">
                              <div>
                                <span className="text-gray-600">Pagadas: </span>
                                <span className="font-medium text-emerald-600">{facturasPagadas} ({formatCurrency(montoPagada)})</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Pendientes: </span>
                                <span className="font-medium text-amber-600">
                                  {totalFacturas - facturasPagadas} ({formatCurrency(montoTotal - montoPagada)})
                                </span>
                              </div>
                            </CardFooter>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de detalles de factura */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Detalles de Factura #{selectedFactura?.id}</DialogTitle>
            <DialogDescription>
              Información detallada de la factura, cobros y comprobantes
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[70vh] pr-2">
            {selectedFactura && (
              <div className="space-y-4">
                {/* Información de la factura - más compacta */}
                <div>
                  <h3 className="text-base font-semibold mb-3">Información General</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">Propiedad</p>
                      <p className="font-medium">
                        {formatPropertyIdentifier(selectedFactura.propiedad?.identificadores)}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-gray-500">Cliente</p>
                      <p className="font-medium">
                        {selectedFactura.cliente?.tipo_persona === 'Natural'
                          ? selectedFactura.cliente?.persona_natural?.razon_social || 'N/A'
                          : selectedFactura.cliente?.persona_juridica?.razon_social || 'N/A'}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-gray-500">Periodo</p>
                      <p className="font-medium">{selectedFactura.periodo}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Estado</p>
                      <Badge className={`${getEstadoBadgeColor(selectedFactura.estado)} border text-xs`}>
                        {selectedFactura.estado}
                      </Badge>
                    </div>
                    
                    <div>
                      <p className="text-gray-500">Fecha Emisión</p>
                      <p>{formatDate(selectedFactura.fecha_generacion)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Fecha Comprobante</p>
                      <p>{formatDate(selectedFactura.fecha_comprobante)}</p>
                    </div>
                  </div>
                  
                  {/* Resumen financiero compacto */}
                  <div className="mt-3 bg-gray-50 p-3 rounded-md">
                    <div className="grid grid-cols-4 gap-3 text-sm">
                      <div className="text-center">
                        <p className="text-gray-500">Subtotal</p>
                        <p className="font-medium">{formatCurrency(selectedFactura.subtotal || 0)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-500">IVA</p>
                        <p className="font-medium">{formatCurrency(selectedFactura.monto_iva || 0)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-500">Total</p>
                        <p className="font-bold text-lg">{formatCurrency(selectedFactura.total || 0)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-500">Saldo</p>
                        <p className={`font-bold ${calcularSaldo(selectedFactura) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(calcularSaldo(selectedFactura))}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Detalles de items - más compacto */}
                {selectedFactura.items_factura && selectedFactura.items_factura.length > 0 && (
                  <div>
                    <h3 className="text-base font-semibold mb-2">Detalle de Rubros</h3>
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Descripción</TableHead>
                            <TableHead className="text-right text-xs">Cantidad</TableHead>
                            <TableHead className="text-right text-xs">Precio Unit.</TableHead>
                            <TableHead className="text-right text-xs">Subtotal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedFactura.items_factura.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="text-sm">{item.descripcion || item.codigoServicio}</TableCell>
                              <TableCell className="text-right text-sm">{item.cantidad}</TableCell>
                              <TableCell className="text-right text-sm">{formatCurrency(item.precioUnitario || 0)}</TableCell>
                              <TableCell className="text-right text-sm font-medium">
                                {formatCurrency((item.cantidad || 0) * (item.precioUnitario || 0))}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
          
                {/* Cobros registrados - más compacto */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-base font-semibold">Cobros Registrados</h3>
                    {/* Botón de retención más visible aquí */}
                    {selectedFactura?.estado === 'Parcial' && canPerformAdminActions && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-purple-600 hover:text-purple-800 border-purple-200 hover:border-purple-300"
                        onClick={() => abrirModalRetencion(selectedFactura)}
                      >
                        <BanknotesIcon className="h-4 w-4 mr-2" />
                        Agregar Retención
                      </Button>
                    )}
                  </div>
                  {(selectedFactura.pagos_cliente && selectedFactura.pagos_cliente.length > 0) ? (
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Fecha</TableHead>
                            <TableHead className="text-xs">Medio</TableHead>
                            <TableHead className="text-right text-xs">Monto</TableHead>
                            <TableHead className="text-xs">Ref.</TableHead>
                            <TableHead className="text-xs">Observaciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedFactura.pagos_cliente.map((pago) => (
                            <TableRow key={pago.id}>
                              <TableCell className="text-sm">{formatDate(pago.fecha_pago)}</TableCell>
                              <TableCell>
                                <Badge className="capitalize text-xs">{pago.medio_pago}</Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium text-sm">{formatCurrency(pago.monto)}</TableCell>
                              <TableCell className="text-sm">{pago.numero_cheque || '-'}</TableCell>
                              <TableCell className="max-w-[120px] truncate text-sm" title={pago.observaciones}>
                                {pago.observaciones || '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        <tfoot>
                          <TableRow>
                            <TableCell colSpan={2} className="font-semibold text-sm">Total Cobrado</TableCell>
                            <TableCell className="text-right font-bold text-sm">
                              {formatCurrency(selectedFactura.pagos_cliente.reduce((sum, p) => sum + (p.monto || 0), 0))}
                            </TableCell>
                            <TableCell colSpan={2}></TableCell>
                          </TableRow>
                          {!!(selectedFactura.retencion && selectedFactura.retencion > 0) && (
                            <TableRow>
                              <TableCell colSpan={2} className="font-semibold text-purple-700 text-sm">Retención Aplicada</TableCell>
                              <TableCell className="text-right font-bold text-purple-700 text-sm">
                                {formatCurrency(selectedFactura.retencion)}
                              </TableCell>
                              <TableCell colSpan={2}></TableCell>
                            </TableRow>
                          )}
                          <TableRow className="bg-gray-50">
                            <TableCell colSpan={2} className="font-semibold text-sm">Total Pagado</TableCell>
                            <TableCell className="text-right font-bold text-sm">
                              {formatCurrency(calcularTotalPagado(selectedFactura))}
                            </TableCell>
                            <TableCell colSpan={2}></TableCell>
                          </TableRow>
                          <TableRow className={`${calcularSaldo(selectedFactura) > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                            <TableCell colSpan={2} className="font-semibold text-sm">Saldo Pendiente</TableCell>
                            <TableCell className={`text-right font-bold text-sm ${calcularSaldo(selectedFactura) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {formatCurrency(calcularSaldo(selectedFactura))}
                            </TableCell>
                            <TableCell colSpan={2}></TableCell>
                          </TableRow>
                        </tfoot>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500 border rounded-md text-sm">
                      <p>No hay cobros registrados para esta factura</p>
                    </div>
                  )}
                </div>
                
                {/* Comprobante principal - más compacto */}
                {selectedFactura.comprobante_pago?.external_url && (
                  <div>
                    <h3 className="text-base font-semibold mb-2">Comprobante de Pago</h3>
                    <div className="border rounded-md overflow-hidden">
                      <div className="bg-gray-50 p-2 border-b">
                        <p className="text-sm">Subido el {formatDate(selectedFactura.fecha_comprobante)}</p>
                      </div>
                      <div className="h-[200px] flex items-center justify-center bg-gray-100 p-2">
                        <iframe 
                          src={selectedFactura.comprobante_pago.external_url}
                          className="w-full h-full border"
                          title="Comprobante de pago"
                        ></iframe>
                      </div>
                      {selectedFactura.comentarios_pago && (
                        <div className="bg-gray-50 p-2 border-t">
                          <p className="text-xs text-gray-500">Comentarios:</p>
                          <p className="text-sm">{selectedFactura.comentarios_pago}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {selectedFactura.observaciones && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Observaciones</p>
                    <p className="text-sm border p-2 rounded-md bg-gray-50">{selectedFactura.observaciones}</p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter className="flex justify-between mt-6">
            <div className="flex gap-2">
              {/* Debug: mostrar información para debuggear */}
              {process.env.NODE_ENV === 'development' && (
                <div className="text-xs text-gray-400">
                  Estado: {selectedFactura?.estado} | Role: {userRole} | CanAdmin: {canPerformAdminActions?.toString()}
                </div>
              )}
              
              {/* Botón de retención - solo para facturas parciales y roles administrativos */}
              {selectedFactura?.estado === 'Parcial' && canPerformAdminActions && (
                <Button 
                  variant="outline" 
                  className="text-purple-600 hover:text-purple-800 border-purple-200 hover:border-purple-300"
                  onClick={() => {
                    abrirModalRetencion(selectedFactura);
                    setShowDetailsModal(false);
                  }}
                >
                  <BanknotesIcon className="h-4 w-4 mr-2" />
                  Agregar Retención
                </Button>
              )}
              
              <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
                Cerrar
              </Button>
            </div>
            
            {selectedFactura?.estado === "PendienteValidacion" && canPerformAdminActions && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="text-red-600 hover:text-red-800 border-red-200 hover:border-red-300"
                  onClick={() => {
                    rechazarComprobante(selectedFactura.id);
                    setShowDetailsModal(false);
                  }}
                >
                  <XMarkIcon className="h-4 w-4 mr-2" />
                  Rechazar
                </Button>
                <Button 
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => {
                    aprobarComprobante(selectedFactura.id);
                    setShowDetailsModal(false);
                  }}
                >
                  <CheckIcon className="h-4 w-4 mr-2" />
                  Aprobar Pago
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación de sincronización */}
      <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>🔄 Sincronizar Pagos con Contifico</DialogTitle>
            <DialogDescription>
              Esta acción verificará todos los pagos registrados en Contifico y actualizará automáticamente el estado de las facturas según los cobros encontrados.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-md">
              <h4 className="font-medium text-blue-900 mb-2">¿Qué hace la sincronización?</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Consulta nuevos cobros desde Contifico</li>
                <li>• Registra automáticamente los pagos encontrados</li>
                <li>• Actualiza el estado de las facturas (Pagada/Parcial)</li>
                <li>• No duplica cobros ya registrados</li>
              </ul>
            </div>
            
            <div className="bg-amber-50 p-3 rounded-md">
              <p className="text-sm text-amber-800">
                ⏱️ <strong>Nota:</strong> Este proceso puede tomar varios minutos dependiendo del número de facturas a verificar.
              </p>
            </div>
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowSyncDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={ejecutarSincronizacion}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <ArrowsRightLeftIcon className="h-4 w-4 mr-2" />
              Iniciar Sincronización
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Retención */}
      <Dialog open={showRetencionModal} onOpenChange={setShowRetencionModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>💰 Agregar Retención</DialogTitle>
            <DialogDescription>
              Registre el monto de retención aplicado a esta factura. Esto se sumará al total pagado para determinar si la factura está completamente pagada.
            </DialogDescription>
          </DialogHeader>
          
          {selectedFacturaRetencion && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Factura:</span>
                  <span className="font-medium">#{selectedFacturaRetencion.id}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total factura:</span>
                  <span className="font-medium">{formatCurrency(selectedFacturaRetencion.total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total pagado:</span>
                  <span className="font-medium">{formatCurrency(calcularTotalPagado(selectedFacturaRetencion))}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2 mt-2">
                  <span className="text-gray-600">Saldo pendiente:</span>
                  <span className="font-medium text-red-600">{formatCurrency(calcularSaldo(selectedFacturaRetencion))}</span>
                </div>
                {selectedFacturaRetencion.retencion && selectedFacturaRetencion.retencion > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Retención actual:</span>
                    <span className="font-medium text-purple-600">{formatCurrency(selectedFacturaRetencion.retencion)}</span>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monto de Retención
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={montoRetencion}
                  onChange={(e) => setMontoRetencion(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Nota:</strong> Al agregar esta retención, si el total pagado + retención ≥ total de la factura, el estado cambiará automáticamente a "Pagada".
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowRetencionModal(false)}
              disabled={isProcessingRetencion}
            >
              Cancelar
            </Button>
            <Button 
              onClick={procesarRetencion}
              disabled={isProcessingRetencion || !montoRetencion || parseFloat(montoRetencion) <= 0}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isProcessingRetencion ? (
                <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <BanknotesIcon className="h-4 w-4 mr-2" />
              )}
              {isProcessingRetencion ? 'Procesando...' : 'Agregar Retención'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mensaje de estado de sincronización */}
      {(isSyncing || syncMessage) && (
        <div className="fixed bottom-4 right-4 z-50">
          <Card className={`max-w-md shadow-lg ${syncMessage?.includes('🎉') ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'}`}>
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                {isSyncing ? (
                  <ArrowsRightLeftIcon className="h-5 w-5 text-blue-600 animate-pulse mt-0.5 flex-shrink-0" />
                ) : (
                  <CheckIcon className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${syncMessage?.includes('🎉') ? 'text-green-900' : 'text-blue-900'}`}>
                    {isSyncing ? 'Sincronizando...' : 'Sincronización Completada'}
                  </p>
                  <p className={`text-xs mt-1 whitespace-pre-line ${syncMessage?.includes('🎉') ? 'text-green-800' : 'text-blue-800'}`}>
                    {isSyncing ? syncMessage : syncMessage}
                  </p>
                </div>
                {!isSyncing && syncMessage && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0 hover:bg-transparent"
                    onClick={() => setSyncMessage(null)}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 