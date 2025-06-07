"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "../../../../lib/supabase/client";
import { Badge } from "@/app/_components/ui/badge";
import { Button } from "@/app/_components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/_components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/_components/ui/table";
import { Skeleton } from "@/app/_components/ui/skeleton";
import { AlertCircle, Eye, Search, ArrowUp, ArrowDown } from "lucide-react";
import { Alert, AlertDescription } from "@/app/_components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/_components/ui/tabs";
import { Input } from "@/app/_components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/_components/ui/select";
import { Checkbox } from "@/app/_components/ui/checkbox";
import { useDebounce } from '@uidotdev/usehooks';
import { Database } from "../../../../supabase-ethos-types";
import { TicketDetailsModal } from "./_components/TicketDetailsModal";
import { TicketStats } from "./_components/TicketStats";

// Definición del tipo para una Acción Correctiva
export type AccionCorrectivaItem = {
  fecha: string;
  descripcion: string;
  imagen_url: string | null;
};

// Actualización del tipo Ticket
export type Ticket = Database["public"]["Tables"]["tickets"]["Row"] & {
  acciones_correctivas: AccionCorrectivaItem[] | null;
  cliente?: {
    id: number;
    tipo_persona: Database["public"]["Enums"]["perfil_cliente_tipo_persona"];
    persona_natural?: {
      razon_social: string | null;
      cedula: string | null;
      ruc: string | null;
    } | null;
    persona_juridica?: {
      razon_social: string | null;
      nombre_comercial: string | null;
      ruc: string | null;
    } | null;
    contacto_administrativo?: any | null;
    contacto_gerente?: any | null;
  } | null;
  propiedad?: {
    id: number;
    identificadores?: any | null;
    proyecto?: {
      id: number;
      nombre: string;
    } | null;
  } | null;
};

export default function MesaDeAyudaPage() {
  const supabase = createClient();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para el modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // Estados para filtros
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroProyecto, setFiltroProyecto] = useState<string>('todos');
  const [ordenFecha, setOrdenFecha] = useState<'asc' | 'desc'>('desc');
  const [ordenVencimiento, setOrdenVencimiento] = useState<'asc' | 'desc' | null>(null);
  const [mostrarSoloVencidos, setMostrarSoloVencidos] = useState(false);
  const [mostrarPorVencer24h, setMostrarPorVencer24h] = useState(false);
  
  // Estados para search y tabs
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("activos");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Estados para configuraciones de vencimiento
  const [configuracionesVencimiento, setConfiguracionesVencimiento] = useState<any[]>([]);

  // Función para obtener vencimiento por defecto según categoría
  const getDefaultVencimiento = (categoria: Database["public"]["Enums"]["ticket_categoria"] | null): number => {
    switch (categoria) {
      case "Administrativo": return 5;
      case "Constructivo": return 10;
      case "Limpieza": return 3;
      case "Cobranza": return 7;
      case "Garantia": return 2; // Prioritario
      case "Mantenimiento": return 5;
      case "Contabilidad": return 7;
      default: return 5; // Fallback
    }
  };

  // Función para verificar si un ticket está vencido
  const isTicketVencido = (ticket: Ticket): boolean => {
    if (!ticket.categoria || !ticket.created_at) return false;
    
    const configuracion = configuracionesVencimiento.find(
      config => config.categoria === ticket.categoria
    );
    
    // Usar configuración de BD o valores por defecto
    const diasVencimiento = configuracion ? configuracion.dias_vencimiento : getDefaultVencimiento(ticket.categoria);
    
    const fechaCreacion = new Date(ticket.created_at);
    const fechaVencimiento = new Date(fechaCreacion);
    fechaVencimiento.setDate(fechaVencimiento.getDate() + diasVencimiento);
    
    return new Date() > fechaVencimiento && ticket.estado !== 'cerrado';
  };

  // Función para obtener días transcurridos desde la creación
  const getDiasTranscurridos = (ticket: Ticket): number => {
    if (!ticket.created_at) return 0;
    const fechaCreacion = new Date(ticket.created_at);
    const ahora = new Date();
    const diferencia = ahora.getTime() - fechaCreacion.getTime();
    return Math.floor(diferencia / (1000 * 60 * 60 * 24));
  };

  // Función para detectar si ticket vence en 24 horas
  const isTicketPorVencer24h = (ticket: Ticket): boolean => {
    if (ticket.estado === 'cerrado') return false;
    
    const configuracion = configuracionesVencimiento.find(
      config => config.categoria === ticket.categoria
    );
    const diasVencimiento = configuracion ? configuracion.dias_vencimiento : getDefaultVencimiento(ticket.categoria);
    const diasTranscurridos = getDiasTranscurridos(ticket);
    const diasRestantes = diasVencimiento - diasTranscurridos;
    
    // Vence en 24 horas si le queda 1 día o menos (pero no está vencido)
    return diasRestantes <= 1 && diasRestantes >= 0;
  };

  // Función para obtener el valor de ordenamiento de vencimiento
  const getVencimientoPriority = (ticket: Ticket): number => {
    if (ticket.estado === 'cerrado') return 1000; // Los cerrados van al final
    
    const configuracion = configuracionesVencimiento.find(
      config => config.categoria === ticket.categoria
    );
    const diasVencimiento = configuracion ? configuracion.dias_vencimiento : getDefaultVencimiento(ticket.categoria);
    const diasTranscurridos = getDiasTranscurridos(ticket);
    
    if (diasTranscurridos > diasVencimiento) {
      // Vencidos: prioridad negativa, el más vencido tiene prioridad más alta (número más negativo)
      return -(diasTranscurridos - diasVencimiento);
    } else {
      // Por vencer: prioridad positiva, el que vence más pronto tiene prioridad más baja
      return diasVencimiento - diasTranscurridos;
    }
  };

  // Función para obtener nombre del cliente (mover antes del useMemo)
  const getClientName = (ticket: Ticket): string => {
    const maxLength = 15;
    let name = 'N/A';

    if (ticket.cliente) {
      if (ticket.cliente.tipo_persona === 'Natural') {
        name = ticket.cliente.persona_natural?.razon_social || 'Sin nombre';
      } else {
        name = ticket.cliente.persona_juridica?.razon_social || ticket.cliente.persona_juridica?.nombre_comercial || 'Sin razón social';
      }
    }

    // Aplicar truncamiento solo si el nombre no es uno de los placeholders
    if (name !== 'N/A' && name !== 'Sin nombre' && name !== 'Sin razón social' && name.length > maxLength) {
      return `${name.substring(0, maxLength)}...`;
    }
    return name;
  };

  // Filtrar tickets según los filtros aplicados
  const ticketsFiltrados = useMemo(() => {
    let filtrados = [...tickets];

    // Filtro por tab (activos vs completados)
    if (activeTab === 'activos') {
      filtrados = filtrados.filter(ticket => ticket.estado !== 'cerrado');
    } else {
      filtrados = filtrados.filter(ticket => ticket.estado === 'cerrado');
    }

    // Filtro de búsqueda
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtrados = filtrados.filter(ticket => {
        // Buscar en título
        const tituloMatch = ticket.titulo?.toLowerCase().includes(searchLower);
        
        // Buscar en nombre del cliente
        const clienteMatch = getClientName(ticket).toLowerCase().includes(searchLower);
        
        // Buscar en proyecto/propiedad
        const proyectoMatch = ticket.propiedad?.proyecto?.nombre?.toLowerCase().includes(searchLower);
        const propiedadMatch = ticket.propiedad?.identificadores && 
          JSON.stringify(ticket.propiedad.identificadores).toLowerCase().includes(searchLower);
        
        return tituloMatch || clienteMatch || proyectoMatch || propiedadMatch;
      });
    }

    // Filtro por categoría
    if (filtroCategoria !== 'todos') {
      filtrados = filtrados.filter(ticket => ticket.categoria === filtroCategoria);
    }

    // Filtro por estado (solo aplicar si estamos en tab activos)
    if (filtroEstado !== 'todos' && activeTab === 'activos') {
      filtrados = filtrados.filter(ticket => ticket.estado === filtroEstado);
    }

    // Filtro por proyecto
    if (filtroProyecto !== 'todos') {
      filtrados = filtrados.filter(ticket => 
        ticket.propiedad?.proyecto?.id?.toString() === filtroProyecto
      );
    }

    // Filtro por vencidos (solo en tab activos)
    if (mostrarSoloVencidos && activeTab === 'activos') {
      filtrados = filtrados.filter(ticket => isTicketVencido(ticket));
    }

    // Filtro por vencer en 24h (solo en tab activos)
    if (mostrarPorVencer24h && activeTab === 'activos') {
      filtrados = filtrados.filter(ticket => isTicketPorVencer24h(ticket));
    }

    // Ordenar
    filtrados.sort((a, b) => {
      // Prioridad 1: Ordenar por vencimiento si está activo
      if (ordenVencimiento) {
        const priorityA = getVencimientoPriority(a);
        const priorityB = getVencimientoPriority(b);
        const vencimientoSort = ordenVencimiento === 'asc' ? priorityA - priorityB : priorityB - priorityA;
        if (vencimientoSort !== 0) return vencimientoSort;
      }
      
      // Prioridad 2: Ordenar por fecha como fallback o principal
      const fechaA = new Date(a.created_at || 0);
      const fechaB = new Date(b.created_at || 0);
      return ordenFecha === 'asc' ? fechaA.getTime() - fechaB.getTime() : fechaB.getTime() - fechaA.getTime();
    });

    return filtrados;
  }, [tickets, activeTab, debouncedSearchTerm, filtroCategoria, filtroEstado, filtroProyecto, mostrarSoloVencidos, mostrarPorVencer24h, ordenFecha, ordenVencimiento, configuracionesVencimiento]);

  // Calcular estadísticas de tickets (basado en TODOS los tickets, no filtrados)
  const ticketStats = useMemo(() => {
    const stats = {
      total: tickets.length,
      abierto: 0,
      en_progreso: 0,
      cerrado: 0,
      vencidos: 0,
    };

    tickets.forEach((ticket) => {
      switch (ticket.estado) {
        case 'abierto':
          stats.abierto++;
          break;
        case 'en_progreso':
          stats.en_progreso++;
          break;
        case 'cerrado':
          stats.cerrado++;
          break;
        default:
          break;
      }
      
      if (isTicketVencido(ticket)) {
        stats.vencidos++;
      }
    });

    return stats;
  }, [tickets, configuracionesVencimiento]);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);
      try {
        // Cargar tickets y configuraciones de vencimiento en paralelo
        const [ticketsResponse, vencimientosResponse] = await Promise.all([
          supabase
            .from("tickets") 
            .select(`
              id,
              titulo,
              descripcion,
              estado,
              prioridad,
              categoria,
              created_at,
              acciones_correctivas,
              numero_contacto_ticket,
              cliente:perfil_cliente_id (
                id,
                tipo_persona,
                contacto_administrativo,
                contacto_gerente,
                persona_natural:persona_natural_id (
                  razon_social,
                  cedula,
                  ruc
                ),
                persona_juridica:persona_juridica_id (
                  razon_social,
                  nombre_comercial,
                  ruc
                )
              ),
              propiedad:propiedad_id (
                id,
                identificadores,
                proyecto:proyecto_id (
                  id,
                  nombre
                )
              )
            `)
            .order("created_at", { ascending: false }),
          supabase
            .from("categoria_vencimientos")
            .select("*")
            .eq("activo", true)
        ]);

        if (ticketsResponse.error) {
          throw ticketsResponse.error;
        }

        if (vencimientosResponse.error) {
          console.warn("Error cargando configuraciones de vencimiento:", vencimientosResponse.error);
        }

        console.log("Datos de tickets recibidos (con joins):", ticketsResponse.data);
        if (ticketsResponse.data && ticketsResponse.data.length > 0) {
            console.log("Primer ticket (con joins):", ticketsResponse.data[0]);
            console.log("Cliente del primer ticket:", ticketsResponse.data[0].cliente);
            console.log("Propiedad del primer ticket:", ticketsResponse.data[0].propiedad);
        }

        setTickets(ticketsResponse.data as any[] || []);
        setConfiguracionesVencimiento(vencimientosResponse.data || []);
      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError("No se pudieron cargar los datos. Inténtalo de nuevo más tarde.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [supabase]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatShortDate = (dateString: string | null): string => {
    if (!dateString) return "Sin fecha";
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString("es-ES", { month: 'long' });
    const time = date.toLocaleTimeString("es-ES", { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${day} de ${month} - ${time}`;
  };

  // Función para capitalizar texto
  const capitalizeText = (text: string | null) => {
    if (!text) return 'N/A';
    if (text === 'en_progreso') return 'Progreso'; // Caso especial
    // Reemplazar guiones bajos con espacios y capitalizar
    return text.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getBadgeVariant = (status: Database["public"]["Enums"]["ticket_estado"] | null) => {
    switch (status?.toLowerCase()) {
      case "abierto":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "en_progreso":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 px-2.5";
      case "cerrado":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "resuelto":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      // No hay "pendiente" en el enum ticket_estado, considerar si se debe mapear o eliminar
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };
  
  const getPriorityBadgeVariant = (priority: Database["public"]["Enums"]["ticket_prioridad"] | null) => {
    switch (priority?.toLowerCase()) {
      case "baja":
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
      case "media":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case "alta":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      // "urgente" no está en el enum ticket_prioridad
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  // Función para obtener el estado de vencimiento
  const getVencimientoInfo = (ticket: Ticket) => {
    // Si el ticket está cerrado, no mostrar estado de vencimiento
    if (ticket.estado === 'cerrado') {
      return {
        texto: "Completado",
        variant: "bg-green-100 text-green-800 hover:bg-green-100"
      };
    }

    const diasTranscurridos = getDiasTranscurridos(ticket);
    const configuracion = configuracionesVencimiento.find(
      config => config.categoria === ticket.categoria
    );
    
    // Usar configuración de BD o valores por defecto
    const diasVencimiento = configuracion ? configuracion.dias_vencimiento : getDefaultVencimiento(ticket.categoria);
    const diasRestantes = diasVencimiento - diasTranscurridos;
    
    // Si está vencido (días transcurridos > días permitidos)
    if (diasTranscurridos > diasVencimiento) {
      const diasVencidos = diasTranscurridos - diasVencimiento;
      return {
        texto: `Vencido (${diasVencidos}d)`,
        variant: "bg-red-100 text-red-800 hover:bg-red-100"
      };
    }
    
    // Si está por vencer
    if (diasRestantes <= 1) {
      return {
        texto: `Urgente (${diasRestantes}d)`,
        variant: "bg-orange-100 text-orange-800 hover:bg-orange-100"
      };
    } else if (diasRestantes <= 2) {
      return {
        texto: `${diasRestantes} días`,
        variant: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
      };
    } else {
      return {
        texto: `${diasRestantes} días`,
        variant: "bg-green-100 text-green-800 hover:bg-green-100"
      };
    }
  };

  const truncateText = (text: string | null | undefined, maxLength: number = 20): string => {
    if (!text) return "Sin título";
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
  };

  // Obtener listas únicas para filtros
  const categoriasUnicas = useMemo(() => {
    const categorias = tickets.map(ticket => ticket.categoria).filter(Boolean);
    return [...new Set(categorias)];
  }, [tickets]);

  const proyectosUnicos = useMemo(() => {
    const proyectos = tickets
      .map(ticket => ticket.propiedad?.proyecto)
      .filter(Boolean)
      .filter((proyecto, index, self) => 
        index === self.findIndex(p => p?.id === proyecto?.id)
      );
    return proyectos;
  }, [tickets]);

  // Manejador para abrir el modal con el ticket seleccionado
  const handleOpenModal = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsModalOpen(true);
  };

  // Manejador para cuando se actualiza un ticket
  const handleTicketUpdated = (updatedTicket: Ticket) => {
    setTickets(prevTickets => 
      prevTickets.map(t => t.id === updatedTicket.id ? updatedTicket : t)
    );
    // Asegurarse de que el estado selectedTicket también se actualiza si es el ticket abierto en el modal
    if (selectedTicket && selectedTicket.id === updatedTicket.id) {
      setSelectedTicket(updatedTicket);
    }
  };

  // Manejador para ordenar por fecha
  const handleSortByDate = () => {
    setOrdenFecha(prev => prev === 'desc' ? 'asc' : 'desc');
    setOrdenVencimiento(null); // Resetear ordenamiento por vencimiento
  };

  // Manejador para ordenar por vencimiento
  const handleSortByVencimiento = () => {
    // Si es la primera vez, empezar con 'desc' (más urgentes primero)
    // Luego alternar infinitamente entre desc y asc
    if (ordenVencimiento === null) {
      setOrdenVencimiento('desc');
    } else {
      setOrdenVencimiento(prev => prev === 'desc' ? 'asc' : 'desc');
    }
  };

  // Función para renderizar el ícono de ordenamiento por fecha
  const renderSortIcon = () => {
    if (ordenVencimiento !== null) return null; // No mostrar si está activo el de vencimiento
    if (ordenFecha === 'desc') {
      return <ArrowDown className="h-4 w-4 inline ml-1" />;
    } else {
      return <ArrowUp className="h-4 w-4 inline ml-1" />;
    }
  };

  // Función para renderizar el ícono de ordenamiento por vencimiento
  const renderVencimientoSortIcon = () => {
    if (ordenVencimiento === 'desc') {
      return <ArrowDown className="h-4 w-4 inline ml-1" />;
    } else if (ordenVencimiento === 'asc') {
      return <ArrowUp className="h-4 w-4 inline ml-1" />;
    } else {
      return null; // No mostrar ícono cuando no está activo
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Mesa de Ayuda</h1>
          <p className="text-gray-600">Gestiona y visualiza los tickets de soporte.</p>
        </div>
      </div>

      <TicketStats stats={ticketStats} />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabs para Activos vs Completados */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 gap-2">
          <TabsTrigger 
            value="activos" 
            className="data-[state=inactive]:border data-[state=inactive]:border-gray-300 data-[state=inactive]:bg-white data-[state=inactive]:text-gray-700 data-[state=inactive]:hover:bg-gray-50 data-[state=active]:bg-[#008A4B] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200"
          >
            Tickets Activos
          </TabsTrigger>
          <TabsTrigger 
            value="completados"
            className="data-[state=inactive]:border data-[state=inactive]:border-gray-300 data-[state=inactive]:bg-white data-[state=inactive]:text-gray-700 data-[state=inactive]:hover:bg-gray-50 data-[state=active]:bg-[#008A4B] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200"
          >
            Tickets Completados
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="space-y-4">
          {/* Barra de búsqueda y filtros */}
          <Card>
            <CardHeader>
              <CardTitle>
                {activeTab === 'activos' ? 'Tickets Activos' : 'Tickets Completados'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Filtro por Categoría */}
                <div>
                  <label className="block text-sm font-medium mb-2">Categoría</label>
                  <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas las categorías" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas</SelectItem>
                      {categoriasUnicas.map(categoria => (
                        <SelectItem key={categoria} value={categoria || ''}>{categoria || 'Sin categoría'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro por Estado - Solo en activos */}
                {activeTab === 'activos' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Estado</label>
                    <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los estados" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="abierto">Abierto</SelectItem>
                        <SelectItem value="en_progreso">En Progreso</SelectItem>
                        <SelectItem value="resuelto">Resuelto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Filtro por Proyecto */}
                <div>
                  <label className="block text-sm font-medium mb-2">Proyecto</label>
                  <Select value={filtroProyecto} onValueChange={setFiltroProyecto}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los proyectos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {proyectosUnicos.map(proyecto => (
                        <SelectItem key={proyecto?.id || 'sin-id'} value={proyecto?.id?.toString() || ''}>
                          {proyecto?.nombre || 'Sin nombre'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtros Adicionales - Solo en activos */}
                {activeTab === 'activos' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Filtros adicionales</label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="mostrar-vencidos"
                          checked={mostrarSoloVencidos}
                          onCheckedChange={(checked) => setMostrarSoloVencidos(checked === true)}
                        />
                        <label htmlFor="mostrar-vencidos" className="text-sm">Solo vencidos</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="mostrar-por-vencer-24h"
                          checked={mostrarPorVencer24h}
                          onCheckedChange={(checked) => setMostrarPorVencer24h(checked === true)}
                        />
                        <label htmlFor="mostrar-por-vencer-24h" className="text-sm">Por vencer en 24h</label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Listado de Tickets</CardTitle>
              <CardDescription>
                Mostrando {ticketsFiltrados.length} de {tickets.length} tickets.
              </CardDescription>
            </div>
            <div className="relative w-70 transition-all duration-300 ease-in-out focus-within:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar tickets, clientes, proyectos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full transition-all duration-300 ease-in-out"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : ticketsFiltrados.length === 0 && !error ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay tickets que coincidan con los filtros.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>
                    <button 
                      onClick={handleSortByVencimiento}
                      className="flex items-center hover:text-gray-600 font-medium"
                    >
                      Vencimiento
                      {renderVencimientoSortIcon()}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button 
                      onClick={handleSortByDate}
                      className="flex items-center hover:text-gray-600 font-medium"
                    >
                      Creado en
                      {renderSortIcon()}
                    </button>
                  </TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ticketsFiltrados.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">#{ticket.id}</TableCell>
                    <TableCell className="whitespace-nowrap overflow-hidden text-ellipsis max-w-xs">
                      <>{truncateText(ticket.titulo)}</>
                    </TableCell>
                    <TableCell className="whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">
                        {getClientName(ticket)}
                    </TableCell>
                    <TableCell>
                      {ticket.categoria ? (
                        <Badge className="font-normal border border-gray-300 text-gray-700 bg-gray-50 hover:bg-gray-50">
                          {capitalizeText(ticket.categoria)}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getBadgeVariant(ticket.estado)}>
                        {capitalizeText(ticket.estado)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const vencimientoInfo = getVencimientoInfo(ticket);
                        return (
                          <Badge className={vencimientoInfo.variant}>
                            {vencimientoInfo.texto}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell>{formatShortDate(ticket.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleOpenModal(ticket)}
                        className="flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Ver Detalles
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

        </TabsContent>
      </Tabs>

      {/* Modal para ver detalles del ticket */} 
      {selectedTicket && (
         <TicketDetailsModal 
            isOpen={isModalOpen}
            onClose={() => {
                setIsModalOpen(false);
                setSelectedTicket(null);
            }}
            ticket={selectedTicket}
            onTicketUpdated={handleTicketUpdated}
        />
      )}
    </div>
  );
} 