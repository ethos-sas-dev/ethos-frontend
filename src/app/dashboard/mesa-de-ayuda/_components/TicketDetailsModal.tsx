"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/app/_components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/app/_components/ui/dialog';
import { Textarea } from '@/app/_components/ui/textarea';
import { Label } from '@/app/_components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/_components/ui/select';
import { Badge } from '@/app/_components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/_components/ui/card';
import { CalendarDays, User, Building, AlertTriangle, Plus, MessageSquare } from 'lucide-react';
import { Database } from "../../../../../supabase-ethos-types";

// Definición del tipo para una Acción Correctiva
type AccionCorrectivaItem = {
    fecha: string;
    descripcion: string;
    imagen_url: string | null; 
}; 

type Ticket = Database["public"]["Tables"]["tickets"]["Row"] & {
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

interface TicketDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket;
  onTicketUpdated: (updatedTicket: Ticket) => void;
}

export function TicketDetailsModal({ isOpen, onClose, ticket, onTicketUpdated }: TicketDetailsModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<Database["public"]["Enums"]["ticket_estado"] | null>(ticket.estado || null);
  const [newActionDescription, setNewActionDescription] = useState('');
  const [showAddAction, setShowAddAction] = useState(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedStatus(ticket.estado || null);
      setNewActionDescription('');
      setShowAddAction(false);
      setIsSubmittingAction(false);
      setIsUpdatingStatus(false);
    } 
  }, [isOpen, ticket]);

  // Función para capitalizar texto
  const capitalizeText = (text: string | null) => {
    if (!text) return 'N/A';
    if (text === 'en_progreso') return 'Progreso'; // Caso especial
    return text.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long", 
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getBadgeVariant = (status: Database["public"]["Enums"]["ticket_estado"] | null) => {
    switch (status?.toLowerCase()) {
      case "abierto":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "en_progreso":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case "cerrado":
      case "resuelto": // Tratar resuelto como cerrado para la visualización
        return "bg-green-100 text-green-800 hover:bg-green-100";
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
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  const handleStatusUpdate = async () => {
    if (selectedStatus === ticket.estado || !selectedStatus) return;

    const originalStatus = ticket.estado;
    const originalTicket = { ...ticket }; // Copia superficial para revertir

    // Actualización optimista local
    const optimisticTicket = {
      ...ticket,
      estado: selectedStatus,
    };
    onTicketUpdated(optimisticTicket as Ticket); // Actualiza la tabla principal
    // setSelectedStatus ya está actualizado por el Select

    setIsUpdatingStatus(true);
    try {
      const response = await fetch(`/api/tickets/${ticket.id}/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: selectedStatus }),
      });

      const updatedTicketData = await response.json();

      if (!response.ok) {
        throw new Error(updatedTicketData.error || 'Error al actualizar el estado');
      }
      
      // La API confirmó, los datos en el modal y tabla ya deberían estar actualizados optimistamente.
      // Opcionalmente, podrías llamar a onTicketUpdated aquí de nuevo con updatedTicketData
      // si la API devuelve más campos actualizados de los que manejaste optimistamente.
      // Por ahora, asumimos que el estado es el único cambio relevante.
      console.log("Estado actualizado para ticket (confirmado por API):", ticket.id);

    } catch (error: any) {
      console.error("Error updating ticket status:", error);
      // Revertir estado en caso de error
      setSelectedStatus(originalStatus); // Revertir en el modal
      onTicketUpdated(originalTicket as Ticket); // Revertir en la tabla principal
      // Aquí podrías mostrar una notificación de error al usuario
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddAction = async () => {
    if (!newActionDescription.trim()) {
      console.error("Error de validación: La descripción es obligatoria.");
      return;
    }

    const originalTicket = JSON.parse(JSON.stringify(ticket)); // Copia profunda para revertir

    // Crear la nueva acción para la UI optimista
    const newAction: AccionCorrectivaItem = {
      fecha: new Date().toISOString(), // Usar fecha actual para UI
      descripcion: newActionDescription.trim(),
      imagen_url: null, // Asumimos que la carga de imagen se maneja por separado si se implementa
    };

    // Actualización optimista local
    const optimisticTicket = {
      ...ticket,
      acciones_correctivas: [...(ticket.acciones_correctivas || []), newAction],
      estado: ticket.estado === 'abierto' ? 'en_progreso' : ticket.estado, // Cambiar a 'en_progreso' si estaba 'abierto'
    } as Ticket;

    onTicketUpdated(optimisticTicket);
    setNewActionDescription('');
    setShowAddAction(false);
    // El estado del ticket (selectedStatus) también podría necesitar ser actualizado aquí si cambia
    if (optimisticTicket.estado !== selectedStatus) {
      setSelectedStatus(optimisticTicket.estado);
    }

    setIsSubmittingAction(true);
    try {
      const response = await fetch(`/api/tickets/${ticket.id}/add-corrective-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descripcion: newActionDescription.trim(), imagen_url: null }), // Enviar solo lo necesario a la API
      });

      const updatedTicketData = await response.json();

      if (!response.ok) {
        throw new Error(updatedTicketData.error || 'Error al añadir la acción correctiva');
      }
      
      // La API confirmó. Es buena práctica reemplazar el ticket optimista con el de la API
      // ya que puede tener datos actualizados por el backend (ej: fecha exacta de la acción o ID)
      onTicketUpdated(updatedTicketData as Ticket);
      // Si la API actualiza el estado, asegúrate de que el selectedStatus lo refleje también.
      if (updatedTicketData.estado && updatedTicketData.estado !== selectedStatus) {
        setSelectedStatus(updatedTicketData.estado);
      }
      console.log("Acción Correctiva Añadida (confirmado por API) para ticket:", ticket.id);

    } catch (error: any) {
      console.error("Error adding corrective action:", error);
      // Revertir en caso de error
      onTicketUpdated(originalTicket as Ticket);
      if (originalTicket.estado !== selectedStatus) {
        setSelectedStatus(originalTicket.estado || null);
      }
      // Aquí podrías mostrar una notificación de error al usuario
    } finally {
      setIsSubmittingAction(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Ticket #{ticket.id} - {ticket.titulo || "Sin título"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información del Cliente y Propiedad */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Información del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(ticket as any).cliente ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Nombre/Razón Social:</Label>
                    <p className="text-sm text-gray-700 mt-1">
                      {(ticket as any).cliente?.tipo_persona === 'Natural' 
                        ? (ticket as any).cliente?.persona_natural?.razon_social || 'Sin nombre'
                        : (ticket as any).cliente?.persona_juridica?.razon_social || (ticket as any).cliente?.persona_juridica?.nombre_comercial || 'Sin razón social'
                      }
                    </p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Identificación:</Label>
                    <p className="text-sm text-gray-700 mt-1">
                      {(ticket as any).cliente?.tipo_persona === 'Natural' 
                        ? `${(ticket as any).cliente?.persona_natural?.cedula ? 'C.I: ' + (ticket as any).cliente.persona_natural.cedula : ''}${
                            (ticket as any).cliente?.persona_natural?.ruc ? ' | RUC: ' + (ticket as any).cliente.persona_natural.ruc : ''
                          }`.trim() || 'Sin identificación'
                        : (ticket as any).cliente?.persona_juridica?.ruc ? 'RUC: ' + (ticket as any).cliente.persona_juridica.ruc : 'Sin RUC'
                      }
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Tipo: </Label>
                    <Badge className="mt-1 font-normal border border-blue-300 text-blue-700 bg-blue-50">
                      Persona {capitalizeText((ticket as any).cliente?.tipo_persona)}
                    </Badge>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Teléfono de contacto:</Label>
                    <p className="text-sm text-gray-700 mt-1">
                      {ticket.numero_contacto_ticket || 
                       (ticket as any).cliente?.contacto_administrativo?.telefono || 
                       (ticket as any).cliente?.contacto_gerente?.telefono || 
                       'Sin teléfono registrado'}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No hay información del cliente disponible</p>
              )}

              {/* Información de la Propiedad */}
              {(ticket as any).propiedad && (
                <div className="border-t pt-4 mt-4">
                  <Label className="text-sm font-medium mb-3 block">Propiedad Vinculada:</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-gray-500">Proyecto:</Label>
                      <p className="text-sm text-gray-700">
                        {(ticket as any).propiedad?.proyecto?.nombre || 'Sin proyecto'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Propiedad:</Label>
                      <p className="text-sm text-gray-700">
                        {(() => {
                          const identificadores = (ticket as any).propiedad?.identificadores as Record<string, any> | undefined;
                          if (identificadores && 
                              typeof identificadores.inferior === 'string' && 
                              typeof identificadores.superior === 'string' && 
                              typeof identificadores.idInferior !== 'undefined' && 
                              typeof identificadores.idSuperior !== 'undefined') {
                            return `${identificadores.inferior} ${identificadores.idInferior}, ${identificadores.superior} ${identificadores.idSuperior}`;
                          } else if (identificadores) {
                            // Fallback para otros formatos de identificadores, si los hubiera
                            return Object.entries(identificadores)
                              .map(([key, value]) => `${key}: ${value}`)
                              .join(', ') || `Prop. #${(ticket as any).propiedad?.id}`;
                          }
                          return `Propiedad #${(ticket as any).propiedad?.id}`;
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Información General */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Departamento:</span>
                  <Badge className="font-normal border border-gray-300 text-gray-700 bg-gray-50">
                    {capitalizeText(ticket.departamento)}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Prioridad:</span>
                  <Badge className={getPriorityBadgeVariant(ticket.prioridad)}>
                    {capitalizeText(ticket.prioridad)}
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Creado:</span>
                <span className="text-sm">{ticket.created_at ? formatDate(ticket.created_at) : "Sin fecha"}</span>
              </div>

              {ticket.descripcion && (
                <div>
                  <Label className="text-sm font-medium">Descripción:</Label>
                  <p className="mt-1 text-sm text-gray-700 bg-gray-50 p-3 rounded-md">{ticket.descripcion}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Estado del Ticket */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Estado del Ticket</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Label htmlFor="status">Estado actual:</Label>
                <Badge className={getBadgeVariant(ticket.estado)}>
                  {capitalizeText(ticket.estado)}
                </Badge>
              </div>
              
              <div className="flex items-center gap-4">
                <Label htmlFor="status">Cambiar estado:</Label>
                <Select 
                  value={selectedStatus || undefined} 
                  onValueChange={(value: Database["public"]["Enums"]["ticket_estado"]) => setSelectedStatus(value)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="abierto">Abierto</SelectItem>
                    <SelectItem value="en_progreso">En Progreso</SelectItem>
                    <SelectItem value="cerrado">Cerrado</SelectItem>
                  </SelectContent>
                </Select>
                
                {selectedStatus !== ticket.estado && (
                  <Button 
                    onClick={handleStatusUpdate} 
                    disabled={isUpdatingStatus}
                    size="sm"
                  >
                    {isUpdatingStatus ? 'Actualizando...' : 'Actualizar'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Acciones Correctivas */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Acciones Correctivas ({Array.isArray(ticket.acciones_correctivas) ? ticket.acciones_correctivas.length : 0})</CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowAddAction(!showAddAction)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Añadir Acción
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Formulario para añadir nueva acción */}
              {showAddAction && (
                <div className="border rounded-lg p-4 bg-blue-50">
                  <Label htmlFor="newAction" className="text-sm font-medium">Nueva Acción Correctiva:</Label>
                  <Textarea
                    id="newAction"
                    value={newActionDescription}
                    onChange={(e) => setNewActionDescription(e.target.value)}
                    placeholder="Describe la acción realizada o por realizar..."
                    className="mt-2"
                    rows={3}
                  />
                  <div className="flex gap-2 mt-3">
                    <Button 
                      onClick={handleAddAction} 
                      disabled={isSubmittingAction || !newActionDescription.trim()}
                      size="sm"
                    >
                      {isSubmittingAction ? 'Guardando...' : 'Guardar'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowAddAction(false);
                        setNewActionDescription('');
                      }}
                      size="sm"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {/* Lista de acciones existentes */}
              {Array.isArray(ticket.acciones_correctivas) && ticket.acciones_correctivas.length > 0 ? (
                <div className="space-y-3">
                  {[...ticket.acciones_correctivas].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).map((accion, idx) => (
                    <div key={idx} className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs text-gray-500">
                          {accion.fecha ? new Date(accion.fecha).toLocaleString("es-ES", { 
                            dateStyle: "medium", 
                            timeStyle: "short" 
                          }) : "Sin fecha"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800">{accion.descripcion}</p>
                      {accion.imagen_url && (
                        <div className="mt-2">
                          <a href={accion.imagen_url} target="_blank" rel="noopener noreferrer">
                            <img 
                              src={accion.imagen_url} 
                              alt="Acción" 
                              className="max-h-20 rounded border cursor-pointer hover:opacity-80" 
                            />
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No hay acciones correctivas registradas aún.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" onClick={onClose}>Cerrar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 