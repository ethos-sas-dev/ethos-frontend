"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "../../../../lib/supabase/client";
import { useAuth } from "../../_lib/auth/AuthContext";
import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "../../api/uploadthing/core";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription
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
  DocumentTextIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ArrowUpCircleIcon,
  CheckCircleIcon,
  BanknotesIcon,
  PaperClipIcon,
  EyeIcon,
  CalendarIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ArrowDownTrayIcon
} from "@heroicons/react/24/outline";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/_components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/app/_components/ui/dialog";
import { Textarea } from "@/app/_components/ui/textarea";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/app/_components/ui/alert";

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
};

type UploadedFile = {
  name: string;
  url: string;
  key: string;
};

export default function MisFacturasPage() {
  const { user, role, isLoading: authLoading } = useAuth();
  const supabase = createClient();
  
  // Estados
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("porPagar");
  
  // Estados para el modal de subir comprobante
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null);
  const [uploadingComprobante, setUploadingComprobante] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [comentariosPago, setComentariosPago] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Estados para el modal de detalles
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [facturaDetalles, setFacturaDetalles] = useState<Factura | null>(null);
  
  // Estados para el balance
  const [showBalance, setShowBalance] = useState(true);
  
  // Verificar permisos
  useEffect(() => {
    if (!authLoading && !user) {
      setError("Debe iniciar sesión para acceder a esta página.");
      setIsLoading(false);
    } else if (!authLoading && user && role !== 'Propietario' && role !== 'Arrendatario') {
      setError("No tiene permisos para acceder a esta página. Solo propietarios y arrendatarios pueden ver sus facturas.");
      setIsLoading(false);
    } else if (!authLoading && user) {
      fetchFacturas();
    }
  }, [authLoading, user, role]);
  
  // Función para cargar facturas
  const fetchFacturas = useCallback(async () => {
    if (!user?.profileId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from("facturas")
        .select(`
          id, periodo, estado, propiedad_id, cliente_id, subtotal, monto_iva, total, 
          observaciones, contifico_id, fecha_generacion, fecha_aprobacion, fecha_envio,
          fecha_comprobante, comentarios_pago, comprobante_pago_id,
          items_factura,
          comprobante_pago:archivos!comprobante_pago_id(id, external_url),
          propiedad:propiedades(
            identificadores,
            proyecto_id,
            proyecto:proyectos(
              id, 
              nombre
            )
          )
        `)
        .eq("cliente_id", user.profileId)
        .order('fecha_generacion', { ascending: false });

      if (error) throw error;
      
      // Transformar los datos para manejar correctamente los arrays de objetos
      const facturasFormateadas = data.map((factura: any) => {
        return {
          ...factura,
          // Extraer el primer elemento del array si existe
          comprobante_pago: Array.isArray(factura.comprobante_pago) && factura.comprobante_pago.length > 0 
            ? factura.comprobante_pago[0] 
            : undefined,
          // Asegurar que propiedad sea un objeto y no un array
          propiedad: Array.isArray(factura.propiedad) && factura.propiedad.length > 0
            ? factura.propiedad[0]
            : factura.propiedad || {}
        };
      });
      
      setFacturas(facturasFormateadas);
    } catch (err: any) {
      console.error("Error al cargar facturas:", err.message);
      setError("Error al cargar sus facturas. Por favor, intente nuevamente.");
    } finally {
      setIsLoading(false);
    }
  }, [supabase, user?.profileId]);
  
  // Filtrar facturas por búsqueda y pestaña activa
  const filteredFacturas = facturas.filter(factura => {
    // Filtrar por término de búsqueda
    const searchMatch = 
      factura.id.toString().includes(searchTerm) ||
      factura.periodo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      factura.estado.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (factura.propiedad?.proyecto?.nombre || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtrar por pestaña
    if (activeTab === "porPagar") return searchMatch && factura.estado === "Enviada";
    if (activeTab === "enRevision") return searchMatch && factura.estado === "PendienteValidacion";
    if (activeTab === "pagadas") return searchMatch && factura.estado === "Pagada";
    
    return searchMatch;
  });
  
  // Abrir modal para subir comprobante
  const handleOpenUploadModal = (factura: Factura) => {
    setSelectedFactura(factura);
    setUploadedFile(null);
    setComentariosPago("");
    setUploadError(null);
    setSuccessMessage(null);
    setShowUploadModal(true);
  };
  
  // Procesar la subida del comprobante
  const handleFinalizarSubida = async () => {
    if (!uploadedFile || !selectedFactura) {
      setUploadError("Debe subir un comprobante de pago");
      return;
    }
    
    setUploadingComprobante(true);
    setUploadError(null);
    
    try {
      const response = await fetch('/api/facturacion/registrar-comprobante', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          facturaId: selectedFactura.id,
          comprobanteUrl: uploadedFile.url,
          comprobanteKey: uploadedFile.key,
          comentarios: comentariosPago
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || "Error al registrar el comprobante");
      }
      
      // Actualizar la lista de facturas
      await fetchFacturas();
      
      // Mostrar mensaje de éxito
      setSuccessMessage(result.message);
      setUploadedFile(null);
      
      // No cerrar el modal automáticamente para que el usuario vea el mensaje de éxito
    } catch (err: any) {
      console.error("Error al registrar comprobante:", err.message);
      setUploadError(err.message || "Error al registrar el comprobante de pago");
    } finally {
      setUploadingComprobante(false);
    }
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
  
  // Formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };
  
  // Formatear identificador de propiedad
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
  
  // Obtener color del badge según estado
  const getEstadoBadgeColor = (estado: string) => {
    switch (estado) {
      case "Enviada":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Pagada":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "PendienteValidacion":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "Vencido":
        return "bg-red-100 text-red-800 border-red-200";
      case "Anulado":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  };
  
  // Verificar si se puede subir comprobante
  const canUploadProof = (factura: Factura) => {
    return factura.estado === "Enviada";
  };
  
  // Función para abrir modal de detalles
  const handleOpenDetailsModal = (factura: Factura) => {
    setFacturaDetalles(factura);
    setShowDetailsModal(true);
  };
  
  // Calcular datos del balance
  const balanceData = useMemo(() => {
    // Ordenar facturas por fecha de generación (más recientes primero)
    const facturasSorted = [...facturas].sort((a, b) => {
      const dateA = a.fecha_generacion ? new Date(a.fecha_generacion).getTime() : 0;
      const dateB = b.fecha_generacion ? new Date(b.fecha_generacion).getTime() : 0;
      return dateB - dateA;
    });
    
    // Calcular montos totales
    const totalFacturado = facturas.reduce((sum, f) => sum + (f.total || 0), 0);
    const totalPagado = facturas
      .filter(f => f.estado === 'Pagada')
      .reduce((sum, f) => sum + (f.total || 0), 0);
    const totalPendiente = totalFacturado - totalPagado;
    
    // Agrupar por mes para visualización cronológica
    const facturasPorMes: Record<string, {facturas: Factura[], total: number, mesNombre: string}> = {};
    
    facturasSorted.forEach(factura => {
      if (!factura.fecha_generacion) return;
      
      const fecha = new Date(factura.fecha_generacion);
      const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      const mesNombre = fecha.toLocaleDateString('es-EC', { year: 'numeric', month: 'long' });
      
      if (!facturasPorMes[mesKey]) {
        facturasPorMes[mesKey] = {
          facturas: [],
          total: 0,
          mesNombre
        };
      }
      
      facturasPorMes[mesKey].facturas.push(factura);
      facturasPorMes[mesKey].total += factura.total || 0;
    });
    
    return {
      totalFacturado,
      totalPagado,
      totalPendiente,
      facturasPorMes
    };
  }, [facturas]);
  
  // Si hay error de permisos
  if (error && !isLoading && (!user || (role !== 'Propietario' && role !== 'Arrendatario'))) {
    return (
      <Card className="mb-4">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mb-2" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Acceso Denegado</h2>
            <p className="text-gray-600 text-center">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mis Facturas</CardTitle>
          <CardDescription>
            Gestione sus facturas y suba comprobantes de pago para las facturas pendientes de pago.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Balance de Facturas - Nuevo componente */}
          <div className="mb-6 bg-white border rounded-lg overflow-hidden shadow-sm">
            <div 
              className="flex justify-between items-center p-4 bg-gray-50 border-b cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => setShowBalance(!showBalance)}
            >
              <h3 className="font-medium flex items-center">
                <CalendarIcon className="h-5 w-5 mr-2 text-gray-500" />
                Balance de Pagos
              </h3>
              <div className="flex items-center">
                <div className="mr-4 text-sm">
                  <span className="text-gray-500">Saldo pendiente: </span>
                  <span className={`font-semibold ${balanceData.totalPendiente > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {formatCurrency(balanceData.totalPendiente)}
                  </span>
                </div>
                {showBalance ? (
                  <ChevronUpIcon className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                )}
              </div>
            </div>
            
            {showBalance && (
              <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-medium text-gray-700">Resumen de Cuenta</h4>
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => alert('Función para descargar estado de cuenta en desarrollo')}>
                    <ArrowDownTrayIcon className="h-3.5 w-3.5 mr-1" />
                    Descargar Estado de Cuenta
                  </Button>
                </div>
                
                {/* Resumen de totales */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 shadow-sm">
                    <p className="text-xs text-blue-500 mb-1 font-medium">Total Facturado</p>
                    <p className="text-lg font-semibold">{formatCurrency(balanceData.totalFacturado)}</p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100 shadow-sm">
                    <p className="text-xs text-emerald-500 mb-1 font-medium">Total Pagado</p>
                    <p className="text-lg font-semibold">{formatCurrency(balanceData.totalPagado)}</p>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-100 shadow-sm">
                    <p className="text-xs text-amber-500 mb-1 font-medium">Pendiente por Pagar</p>
                    <p className="text-lg font-semibold">{formatCurrency(balanceData.totalPendiente)}</p>
                  </div>
                </div>
                
                {/* Historial cronológico */}
                <div className="border rounded-lg overflow-hidden shadow-sm">
                  <div className="bg-gray-50 p-3 border-b flex justify-between text-sm font-medium text-gray-500">
                    <span>Detalle cronológico</span>
                    <span>Total</span>
                  </div>
                  <div className="max-h-[300px] overflow-auto">
                    {Object.entries(balanceData.facturasPorMes).length > 0 ? (
                      Object.entries(balanceData.facturasPorMes).map(([mesKey, { facturas, total, mesNombre }]) => (
                        <div key={mesKey} className="border-b last:border-0">
                          <div className="bg-gray-50 p-2 px-3 flex justify-between items-center border-b">
                            <span className="font-medium text-gray-700 capitalize">{mesNombre}</span>
                            <span className="font-medium">{formatCurrency(total)}</span>
                          </div>
                          <div className="divide-y">
                            {facturas.map(factura => (
                              <div 
                                key={factura.id} 
                                className="p-3 flex justify-between items-center hover:bg-gray-50 transition-colors cursor-pointer"
                                onClick={() => handleOpenDetailsModal(factura)}
                              >
                                <div className="flex-1">
                                  <div className="flex items-center">
                                    <span className="font-medium text-sm">Factura #{factura.id}</span>
                                    <Badge className={`ml-2 ${getEstadoBadgeColor(factura.estado)} border`}>
                                      {factura.estado}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {formatDate(factura.fecha_generacion)} • {factura.propiedad?.proyecto?.nombre}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatPropertyIdentifier(factura.propiedad?.identificadores)}
                                  </p>
                                </div>
                                <div className="text-right ml-4">
                                  <p className={`font-semibold ${factura.estado === 'Pagada' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    {formatCurrency(factura.total || 0)}
                                  </p>
                                  {factura.estado === 'Pagada' && factura.fecha_pago && (
                                    <p className="text-xs text-gray-500">Pagado: {formatDate(factura.fecha_pago)}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-gray-500">
                        <DocumentTextIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                        <p>No hay facturas disponibles.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            {/* Búsqueda */}
            <div className="relative w-full sm:w-auto sm:min-w-[300px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                className="pl-10"
                placeholder="Buscar facturas..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-5 w-5 p-0" 
                    onClick={() => setSearchTerm('')}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            
            {/* Botón Actualizar */}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchFacturas}
              disabled={isLoading}
            >
              <ArrowPathIcon className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
          
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid grid-cols-3 w-full sm:w-auto">
              <TabsTrigger value="porPagar">Por Pagar</TabsTrigger>
              <TabsTrigger value="enRevision">En Revisión</TabsTrigger>
              <TabsTrigger value="pagadas">Pagadas</TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* Contenido principal */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <ArrowPathIcon className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : filteredFacturas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <DocumentTextIcon className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p>No hay facturas disponibles{searchTerm ? " que coincidan con la búsqueda" : ""}.</p>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Propiedad</TableHead>
                    <TableHead>Periodo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha Emisión</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFacturas.map(factura => {
                    const identificador = formatPropertyIdentifier(factura.propiedad?.identificadores);
                    
                    return (
                      <TableRow key={factura.id}>
                        <TableCell className="font-medium">{factura.id}</TableCell>
                        <TableCell className="max-w-[150px] truncate" title={identificador}>
                          {identificador}
                        </TableCell>
                        <TableCell>{factura.periodo}</TableCell>
                        <TableCell>
                          <Badge className={`${getEstadoBadgeColor(factura.estado)} border`}>
                            {factura.estado}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(factura.fecha_generacion)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(factura.total || 0)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            {/* Ver detalles */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-gray-100 cursor-pointer"
                              title="Ver detalles"
                              onClick={() => handleOpenDetailsModal(factura)}
                            >
                              <EyeIcon className="h-4 w-4" />
                            </Button>
                            
                            {/* Ver comprobante si existe */}
                            {factura.comprobante_pago_id && factura.comprobante_pago && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 cursor-pointer"
                                title="Ver comprobante"
                                onClick={() => {
                                  if (factura.comprobante_pago?.external_url) {
                                    window.open(factura.comprobante_pago.external_url, '_blank');
                                  }
                                }}
                              >
                                <PaperClipIcon className="h-4 w-4" />
                              </Button>
                            )}
                            
                            {/* Subir comprobante solo si está en estado Enviado o Aprobado */}
                            {canUploadProof(factura) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                                title="Subir comprobante de pago"
                                onClick={() => handleOpenUploadModal(factura)}
                              >
                                <BanknotesIcon className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <p className="text-sm text-gray-500">
            Mostrando {filteredFacturas.length} de {facturas.length} facturas
          </p>
        </CardFooter>
      </Card>
      
      {/* Modal para subir comprobante */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Subir Comprobante de Pago</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            {selectedFactura && (
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="font-medium">Factura:</span> #{selectedFactura.id}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Periodo:</span> {selectedFactura.periodo}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Monto a pagar:</span> {formatCurrency(selectedFactura.total || 0)}
                </p>
              </div>
            )}
            
            {successMessage ? (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex items-start">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                  <p className="text-sm text-green-800">{successMessage}</p>
                </div>
              </div>
            ) : (
              <>
                <div className="border rounded-md p-4">
                  <div className="flex flex-col items-center justify-center min-h-[100px]">
                    {uploadedFile ? (
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircleIcon className="h-8 w-8 text-green-500" />
                        <p className="text-sm font-medium">Comprobante cargado correctamente</p>
                        <p className="text-xs text-gray-500">{uploadedFile.name}</p>
                      </div>
                    ) : (
                      <UploadButton<OurFileRouter, "paymentProof">
                        endpoint="paymentProof"
                        onUploadBegin={() => {
                          setUploadError(null);
                          setSuccessMessage(null);
                        }}
                        onClientUploadComplete={(res) => {
                          if (res && res.length > 0) {
                            setUploadedFile({
                              name: res[0].name,
                              url: res[0].url,
                              key: res[0].key
                            });
                          }
                        }}
                        onUploadError={(error) => {
                          console.error("Error uploading:", error);
                          setUploadError(`Error al subir el archivo: ${error.message}`);
                        }}
                        appearance={{
                          button: "bg-[#007F44] hover:bg-[#007F44]/80 text-white font-medium py-2 px-4 rounded-md flex items-center gap-2",
                          allowedContent: "flex gap-1 text-xs text-gray-500 mb-2"
                        }}
                        content={{
                          button: ({ ready }) => (ready ? (
                            <>
                              <ArrowUpCircleIcon className="h-5 w-5" />
                              <span>Seleccionar comprobante</span>
                            </>
                          ) : 'Cargando...'),
                        }}
                        config={{
                          mode: "auto",
                          appendOnPaste: true
                        }}
                      />
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="comentarios" className="text-sm font-medium">
                    Comentarios (opcional)
                  </label>
                  <Textarea
                    id="comentarios"
                    placeholder="Añada comentarios sobre el pago realizado"
                    value={comentariosPago}
                    onChange={e => setComentariosPago(e.target.value)}
                  />
                </div>
                
                {uploadError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{uploadError}</AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </div>
          
          <DialogFooter className="flex justify-between sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowUploadModal(false)}
            >
              {successMessage ? "Cerrar" : "Cancelar"}
            </Button>
            
            {!successMessage && (
              <Button
                type="button"
                onClick={handleFinalizarSubida}
                disabled={!uploadedFile || uploadingComprobante}
                className="bg-[#007F44] hover:bg-[#007F44]/80"
              >
                {uploadingComprobante ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                    Finalizar
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal para detalles de factura */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle de Factura</DialogTitle>
          </DialogHeader>
          
          {facturaDetalles && (
            <div className="space-y-6">
              {/* Información general */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Número de factura</p>
                  <p className="font-medium">{facturaDetalles.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Periodo</p>
                  <p className="font-medium">{facturaDetalles.periodo}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Estado</p>
                  <Badge className={`${getEstadoBadgeColor(facturaDetalles.estado)} border`}>
                    {facturaDetalles.estado}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Fecha de emisión</p>
                  <p className="font-medium">{formatDate(facturaDetalles.fecha_generacion)}</p>
                </div>
              </div>
              
              {/* Detalles de propiedad */}
              <div>
                <p className="text-sm text-gray-500 mb-1">Propiedad</p>
                <p className="font-medium">{formatPropertyIdentifier(facturaDetalles.propiedad?.identificadores)}</p>
                <p className="text-sm text-gray-500">{facturaDetalles.propiedad?.proyecto?.nombre}</p>
              </div>
              
              {/* Ítems facturados */}
              <div>
                <p className="text-sm font-medium mb-2">Conceptos facturados</p>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Concepto</TableHead>
                        <TableHead className="text-right">Importe</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {facturaDetalles.items_factura?.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.descripcion}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.precioUnitario || 0)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              
              {/* Resumen de factura */}
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Subtotal:</span>
                  <span>{formatCurrency(facturaDetalles.subtotal)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">IVA:</span>
                  <span>{formatCurrency(facturaDetalles.monto_iva)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Total:</span>
                  <span>{formatCurrency(facturaDetalles.total)}</span>
                </div>
              </div>
              
              {/* Comprobante de pago si existe */}
              {facturaDetalles.comprobante_pago && (
                <div>
                  <p className="text-sm font-medium mb-2">Comprobante de pago</p>
                  <div className="flex items-center justify-between border rounded-md p-3">
                    <div className="flex items-center">
                      <PaperClipIcon className="h-5 w-5 mr-2 text-blue-500" />
                      <span>Comprobante subido el {formatDate(facturaDetalles.fecha_comprobante)}</span>
                    </div>
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => facturaDetalles.comprobante_pago?.external_url && window.open(facturaDetalles.comprobante_pago.external_url, '_blank')}
                    >
                      Ver
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Comentarios si existen */}
              {facturaDetalles.comentarios_pago && (
                <div>
                  <p className="text-sm font-medium mb-1">Comentarios</p>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                    {facturaDetalles.comentarios_pago}
                  </p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDetailsModal(false)}
            >
              Cerrar
            </Button>
            
            {/* Mostrar botón de subir comprobante si aplica */}
            {facturaDetalles && canUploadProof(facturaDetalles) && !facturaDetalles.comprobante_pago_id && (
              <Button
                type="button"
                onClick={() => {
                  setShowDetailsModal(false);
                  if (facturaDetalles) {
                    handleOpenUploadModal(facturaDetalles);
                  }
                }}
                className="bg-[#007F44] hover:bg-[#007F44]/80"
              >
                <BanknotesIcon className="h-4 w-4 mr-2" />
                Subir comprobante
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 