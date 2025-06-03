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
import { AlertCircle, PlusCircle, Eye } from "lucide-react";
import { Alert, AlertDescription } from "@/app/_components/ui/alert";
import Link from "next/link";
import { Database } from "../../../../ethos-types";
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

  // Calcular estadísticas de tickets
  const ticketStats = useMemo(() => {
    const stats = {
      total: tickets.length,
      abierto: 0,
      en_progreso: 0,
      cerrado: 0,
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
    });

    return stats;
  }, [tickets]);

  useEffect(() => {
    async function fetchTickets() {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: supabaseError } = await supabase
          .from("tickets") 
          .select(`
            id,
            titulo,
            descripcion,
            estado,
            prioridad,
            departamento,
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
          .order("created_at", { ascending: false });

        if (supabaseError) {
          throw supabaseError;
        }

        console.log("Datos de tickets recibidos (con joins):", data);
        if (data && data.length > 0) {
            console.log("Primer ticket (con joins):", data[0]);
            console.log("Cliente del primer ticket:", data[0].cliente);
            console.log("Propiedad del primer ticket:", data[0].propiedad);
        }

        setTickets(data as any[] || []);
      } catch (err: any) {
        console.error("Error fetching tickets:", err);
        setError("No se pudieron cargar los tickets. Inténtalo de nuevo más tarde.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchTickets();
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

  const truncateText = (text: string | null | undefined, maxLength: number = 20): string => {
    if (!text) return "Sin título";
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
  };

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Mesa de Ayuda</h1>
          <p className="text-gray-600">Gestiona y visualiza los tickets de soporte.</p>
        </div>
        <Link href="/dashboard/mesa-de-ayuda/crear">
          <Button className="bg-[#008A4B] hover:bg-[#006837]">
            <PlusCircle className="mr-2 h-5 w-5" />
            Nuevo Ticket
          </Button>
        </Link>
      </div>

      <TicketStats stats={ticketStats} />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Listado de Tickets</CardTitle>
          <CardDescription>
            Aquí puedes ver todos los tickets generados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : tickets.length === 0 && !error ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay tickets para mostrar.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Creado en</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">#{ticket.id}</TableCell>
                    <TableCell className="whitespace-nowrap overflow-hidden text-ellipsis max-w-xs">
                      <>{truncateText(ticket.titulo)}</>
                    </TableCell>
                    <TableCell className="whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">
                        {getClientName(ticket)}
                    </TableCell>
                    <TableCell>
                      {ticket.departamento ? (
                        <Badge className="font-normal border border-gray-300 text-gray-700 bg-gray-50 hover:bg-gray-50">
                          {capitalizeText(ticket.departamento)}
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
                      <Badge className={getPriorityBadgeVariant(ticket.prioridad)}>
                        {capitalizeText(ticket.prioridad)}
                      </Badge>
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