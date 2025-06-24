"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/app/_components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/app/_components/ui/dialog';
import { Textarea } from '@/app/_components/ui/textarea';
import { Label } from '@/app/_components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/_components/ui/select';
import { Badge } from '@/app/_components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/_components/ui/card';
import { CalendarDays, User, Building, Plus, MessageSquare, Upload, X, Image, Paperclip, ExternalLink } from 'lucide-react';
import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "../../../api/uploadthing/core";
import { Database } from "../../../../../supabase-ethos-types";

// Definición del tipo para una Acción Correctiva
type AccionCorrectivaItem = {
  fecha: string;
  descripcion: string;
  imagen_url: string | null;
};

type Ticket = Database["public"]["Tables"]["tickets"]["Row"] & {
  acciones_correctivas: AccionCorrectivaItem[] | null;
  categoria_info?: {
    id: number;
    categoria: string;
    dias_vencimiento: number;
    descripcion: string | null;
  } | null;
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
  getTicketProjects?: (ticket: Ticket) => any[];
}

export function TicketDetailsModal({ isOpen, onClose, ticket, onTicketUpdated, getTicketProjects }: TicketDetailsModalProps) {
  // Estado local del ticket para evitar pérdida de datos durante actualizaciones
  const [localTicket, setLocalTicket] = useState<Ticket>(ticket);

  const [selectedStatus, setSelectedStatus] = useState<Database["public"]["Enums"]["ticket_estado"] | null>(localTicket.estado || null);
  const [resolutionReason, setResolutionReason] = useState('');
  const [newActionDescription, setNewActionDescription] = useState('');
  const [showAddAction, setShowAddAction] = useState(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Estados para manejo de imágenes
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);

  // Estado para tracking de imágenes que fallaron al cargar
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  // Actualizar ticket local cuando cambie el prop
  useEffect(() => {
    if (ticket && ticket.id) {
      setLocalTicket(ticket);
    }
  }, [ticket]);

  useEffect(() => {
    if (isOpen) {
      setSelectedStatus(localTicket.estado || null);
      setNewActionDescription('');
      setShowAddAction(false);
      setIsSubmittingAction(false);
      setIsUpdatingStatus(false);
      // Reset estados de imagen
      setUploadedImageUrl(null);
      setIsUploadingImage(false);
      setShowImageUpload(false);
      setFailedImages(new Set());
      setResolutionReason('');
    }
  }, [isOpen, localTicket]);

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
    if (selectedStatus === localTicket.estado || !selectedStatus) return;

    if (selectedStatus === 'cerrado' && !resolutionReason.trim()) {
      alert('Por favor, ingrese un motivo de cierre para notificar al cliente.');
      return;
    }

    const originalStatus = localTicket.estado;
    const originalTicket = { ...localTicket }; // Copia superficial para revertir

    // Actualización optimista local
    const optimisticTicket = {
      ...localTicket,
      estado: selectedStatus,
    };
    setLocalTicket(optimisticTicket); // Actualizar estado local
    onTicketUpdated(optimisticTicket as Ticket); // Actualiza la tabla principal

    setIsUpdatingStatus(true);
    try {
      const body: { 
        estado: Database["public"]["Enums"]["ticket_estado"]; 
        resolution_reason?: string 
      } = {
        estado: selectedStatus,
      };

      if (selectedStatus === 'cerrado') {
        body.resolution_reason = resolutionReason;
      }

      const response = await fetch(`/api/tickets/${localTicket.id}/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const updatedTicketData = await response.json();

      if (!response.ok) {
        throw new Error(updatedTicketData.error || 'Error al actualizar el estado');
      }

      // Actualizar con los datos confirmados de la API
      setLocalTicket(updatedTicketData);
      onTicketUpdated(updatedTicketData as Ticket);
      setResolutionReason(''); // Limpiar el motivo de resolución

      console.log("Estado actualizado para ticket (confirmado por API):", localTicket.id);

    } catch (error: any) {
      console.error("Error updating ticket status:", error);
      // Revertir estado en caso de error
      setSelectedStatus(originalStatus); // Revertir en el modal
      setLocalTicket(originalTicket); // Revertir estado local
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

    // Guarda los valores actuales antes de empezar
    const currentDescription = newActionDescription.trim();
    const currentImageUrl = uploadedImageUrl;

    setIsSubmittingAction(true);

    try {
      const response = await fetch(`/api/tickets/${localTicket.id}/add-corrective-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descripcion: currentDescription,
          imagen_url: currentImageUrl
        }),
      });

      const updatedTicketData = await response.json();

      if (!response.ok) {
        throw new Error(updatedTicketData.error || 'Error al añadir la acción correctiva');
      }

      // Actualizar el estado local del ticket primero
      setLocalTicket(updatedTicketData);

      // Luego notificar al componente padre
      onTicketUpdated(updatedTicketData as Ticket);

      // Actualizar el estado del modal si cambió
      if (updatedTicketData.estado && updatedTicketData.estado !== selectedStatus) {
        setSelectedStatus(updatedTicketData.estado);
      }

      // Resetear el formulario solo después del éxito
      setNewActionDescription('');
      setShowAddAction(false);
      setUploadedImageUrl(null);
      setShowImageUpload(false);

      console.log("Acción Correctiva Añadida exitosamente para ticket:", localTicket.id);

    } catch (error: any) {
      console.error("Error adding corrective action:", error);
      // Mostrar error al usuario - podrías implementar un toast o alert aquí
      alert(`Error al añadir la acción correctiva: ${error.message}`);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Función para parsear el número de teléfono y generar la URL de Recado
  // Función para truncar nombres de archivos largos
  const truncateFileName = (fileName: string, maxLength: number = 50) => {
    if (fileName.length <= maxLength) return fileName;
    return fileName.substring(0, maxLength) + '...';
  };

  const getRecadoUrl = (phoneNumber: string | null) => {
    if (!phoneNumber) return null;

    // Limpiar el número: remover espacios, guiones, paréntesis, etc.
    let cleanNumber = phoneNumber.replace(/[\s\-\(\)\+]/g, '');

    // Si no empieza con código de país, asumir Ecuador (593)
    if (!cleanNumber.startsWith('593') && cleanNumber.length === 10) {
      // Remover el 0 inicial si existe y añadir código de país
      if (cleanNumber.startsWith('0')) {
        cleanNumber = '593' + cleanNumber.substring(1);
      } else {
        cleanNumber = '593' + cleanNumber;
      }
    }

    return `https://recado.co/admin/conversations/${cleanNumber}@c.us`;
  };

  // Verificar si se puede mostrar el botón de Recado
  const canShowRecadoButton = localTicket.numero_contacto_ticket && localTicket.numero_contacto_ticket.trim() !== '';
  const recadoUrl = getRecadoUrl(localTicket.numero_contacto_ticket);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto [&>button]:hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Ticket #{localTicket.id}
            </DialogTitle>

            {/* Botón Responder en Recado */}
            {canShowRecadoButton && recadoUrl && (
              <Button
                variant="default"
                onClick={() => window.open(recadoUrl, '_blank')}
                className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-md transition-all border border-gray-300 group cursor-pointer"
                style={{ backgroundColor: '#FFEBA2', color: '#000' }}
              >
                <img
                  src="/recado-logo.png"
                  alt="Recado"
                  className="w-5 h-5 mr-0.5 transition-transform duration-600 group-hover:rotate-360"
                  loading="eager"
                  style={{ imageRendering: 'crisp-edges' }}
                />
                Responder en Recado
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información General */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Título del Ticket */}
              {localTicket.titulo && (
                <div>
                  <Label className="text-sm font-medium">Título:</Label>
                  <p className="mt-1 text-sm bg-gray-50 p-3 rounded-md text-gray-900">{localTicket.titulo || "Sin título"}</p>
                </div>
              )}

              {localTicket.descripcion && (
                <div className="pb-3">
                  <Label className="text-sm font-medium">Descripción:</Label>
                  <p className="mt-1 text-sm pb-2 bg-gray-50 p-3 rounded-md text-gray-900">{localTicket.descripcion}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 mb-0.5 text-gray-500" />
                  <span className="text-sm text-gray-900">Categoría:</span>
                  <Badge className="font-normal border border-gray-300 text-gray-900 bg-gray-50">
                    {capitalizeText(localTicket.categoria_info?.categoria || null)}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 mb-0.5 text-gray-500" />
                  <span className="text-sm text-gray-900">Creado:</span>
                  <span className="text-sm">{localTicket.created_at ? formatDate(localTicket.created_at) : "Sin fecha"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información del Cliente y Propiedad */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Información del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(localTicket as any).cliente ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Nombre/Razón Social:</Label>
                    <p className="text-sm text-gray-700 mt-1">
                      {(localTicket as any).cliente?.tipo_persona === 'Natural'
                        ? (localTicket as any).cliente?.persona_natural?.razon_social || 'Sin nombre'
                        : (localTicket as any).cliente?.persona_juridica?.razon_social || (localTicket as any).cliente?.persona_juridica?.nombre_comercial || 'Sin razón social'
                      }
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Identificación:</Label>
                    <p className="text-sm text-gray-700 mt-1">
                      {(localTicket as any).cliente?.tipo_persona === 'Natural'
                        ? `${(localTicket as any).cliente?.persona_natural?.cedula ? 'C.I: ' + (localTicket as any).cliente.persona_natural.cedula : ''}${(localTicket as any).cliente?.persona_natural?.ruc ? ' | RUC: ' + (localTicket as any).cliente.persona_natural.ruc : ''
                          }`.trim() || 'Sin identificación'
                        : (localTicket as any).cliente?.persona_juridica?.ruc ? 'RUC: ' + (localTicket as any).cliente.persona_juridica.ruc : 'Sin RUC'
                      }
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Tipo: </Label>
                    <Badge className="mt-1 font-normal border border-blue-300 text-blue-700 bg-blue-50">
                      Persona {capitalizeText((localTicket as any).cliente?.tipo_persona)}
                    </Badge>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Teléfono de contacto:</Label>
                    <p className="text-sm text-gray-700 mt-1">
                      {localTicket.numero_contacto_ticket ||
                        (localTicket as any).cliente?.contacto_administrativo?.telefono ||
                        (localTicket as any).cliente?.contacto_gerente?.telefono ||
                        'Sin teléfono registrado'}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No hay información del cliente disponible</p>
              )}

              {/* Información de la Propiedad */}
              {/* Información de Proyecto(s) - Siempre mostrar */}
              <div className="border-t pt-4 mt-4">
                <Label className="text-sm font-medium mb-3 block">
                  {(localTicket as any).propiedad ? 'Propiedad Vinculada' : 'Proyecto(s) Relacionados'}:
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-500">Proyecto(s):</Label>
                    {(() => {
                      const proyectos = getTicketProjects ? getTicketProjects(localTicket) :
                        ((localTicket as any).propiedad?.proyecto ? [(localTicket as any).propiedad.proyecto] : []);

                      if (proyectos.length === 0) {
                        return <p className="text-sm text-gray-500">Sin proyecto asignado</p>;
                      } else if (proyectos.length === 1) {
                        return <p className="text-sm text-gray-700">{proyectos[0].nombre}</p>;
                      } else {
                        return (
                          <div className="space-y-1">
                            <p className="text-sm text-gray-700">{proyectos.length} proyectos (ticket general):</p>
                            <div className="flex flex-wrap gap-1">
                              {proyectos.map((proyecto, idx) => (
                                <Badge key={idx} className="text-xs bg-gray-100 text-gray-700">
                                  {proyecto.nombre}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        );
                      }
                    })()}
                  </div>
                  {(localTicket as any).propiedad && (
                    <div>
                      <Label className="text-xs text-gray-500">Propiedad:</Label>
                      <p className="text-sm text-gray-700">
                        {(() => {
                          const identificadores = (localTicket as any).propiedad?.identificadores as Record<string, any> | undefined;
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
                              .join(', ') || `Prop. #${(localTicket as any).propiedad?.id}`;
                          }
                          return `Propiedad #${(localTicket as any).propiedad?.id}`;
                        })()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Archivos Adjuntos - Solo mostrar si hay archivos */}
          {localTicket.media_links && Array.isArray(localTicket.media_links) && localTicket.media_links.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Paperclip className="h-5 w-5" />
                  Archivos Adjuntos ({localTicket.media_links.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {localTicket.media_links.map((mediaUrl, index: number) => {
                    // Verificar que es un string válido
                    if (typeof mediaUrl !== 'string') return null;
                    // Extraer nombre del archivo de la URL
                    const fileName = mediaUrl.split('/').pop()?.split('?')[0] || `Archivo ${index + 1}`;
                    // Determinar si la imagen falló al cargar
                    const isFailedImage = failedImages.has(mediaUrl);

                    const handleImageError = () => {
                      setFailedImages(prev => new Set([...prev, mediaUrl]));
                    };

                    return (
                      <div key={index} className="border rounded-lg bg-gray-50 overflow-hidden">
                        {/* Header con info del archivo */}
                        <div className="flex items-center justify-between p-3">
                          <div className="flex items-center gap-3">
                            <Paperclip className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {truncateFileName(fileName)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {isFailedImage ? 'Archivo adjunto' : 'Imagen adjunta'}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(mediaUrl, '_blank')}
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Abrir
                          </Button>
                        </div>

                        {/* Preview del archivo */}
                        {!isFailedImage ? (
                          <div className="px-3 pb-3">
                            <img
                              src={mediaUrl}
                              alt={fileName}
                              className="w-full max-h-48 object-contain rounded border cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(mediaUrl, '_blank')}
                              onError={handleImageError}
                            />
                          </div>
                        ) : (
                          <div className="px-3 pb-3">
                            <div
                              className="w-full h-20 bg-gray-100 rounded border border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
                              onClick={() => window.open(mediaUrl, '_blank')}
                            >
                              <div className="text-center">
                                <Paperclip className="h-6 w-6 mx-auto text-gray-400 mb-1" />
                                <p className="text-xs text-gray-500">Clic para abrir</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Estado del Ticket */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Estado del Ticket</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Label htmlFor="status">Estado actual:</Label>
                <Badge className={getBadgeVariant(localTicket.estado)}>
                  {capitalizeText(localTicket.estado)}
                </Badge>
              </div>

              <div className="flex items-center gap-4">
                <Label htmlFor="status">Cambiar estado:</Label>
                <Select
                  value={selectedStatus || undefined}
                  onValueChange={(value: Database["public"]["Enums"]["ticket_estado"]) => setSelectedStatus(value)}
                  disabled={localTicket.estado === 'cerrado'}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem 
                      value="abierto" 
                      disabled={localTicket.estado === 'en_progreso'}
                    >
                      Abierto
                    </SelectItem>
                    <SelectItem value="en_progreso">En Progreso</SelectItem>
                    <SelectItem value="cerrado">Cerrado</SelectItem>
                  </SelectContent>
                </Select>

                {selectedStatus !== localTicket.estado && (
                  <Button
                    onClick={handleStatusUpdate}
                    disabled={isUpdatingStatus || (selectedStatus === 'cerrado' && !resolutionReason.trim())}
                    size="sm"
                  >
                    {isUpdatingStatus ? 'Actualizando...' : 'Actualizar Estado'}
                  </Button>
                )}
              </div>

              {/* Muestra el campo para INGRESAR el motivo si se va a cerrar */}
              {selectedStatus === 'cerrado' && localTicket.estado !== 'cerrado' && (
                <div>
                  <Label htmlFor="resolution-reason" className="font-medium">
                    Motivo de Cierre (se notificará al cliente)
                  </Label>
                  <Textarea
                    id="resolution-reason"
                    value={resolutionReason}
                    onChange={(e) => setResolutionReason(e.target.value)}
                    placeholder="Ej: El trabajo ha sido completado y el problema está resuelto."
                    className="mt-2"
                    rows={3}
                  />
                </div>
              )}

              {/* Muestra el motivo YA GUARDADO si el ticket está cerrado y tiene un motivo */}
              {localTicket.estado === 'cerrado' && localTicket.motivo_resolucion && (
                <div>
                  <Label htmlFor="resolution-reason-display" className="font-medium">
                    Motivo de Cierre
                  </Label>
                  <Textarea
                    id="resolution-reason-display"
                    value={localTicket.motivo_resolucion}
                    className="mt-2"
                    rows={3}
                    disabled
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Acciones Correctivas */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Acciones Correctivas ({Array.isArray(localTicket.acciones_correctivas) ? localTicket.acciones_correctivas.length : 0})</CardTitle>
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

                  {/* Sección de imagen */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">Imagen (opcional):</Label>
                      {!showImageUpload && !uploadedImageUrl && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowImageUpload(true)}
                          className="flex items-center gap-2"
                        >
                          <Image className="h-4 w-4" />
                          Añadir Imagen
                        </Button>
                      )}
                    </div>

                    {/* UploadButton */}
                    {showImageUpload && !uploadedImageUrl && (
                      <div className="border-dashed border-2 border-gray-300 rounded-lg p-4 text-center">
                        <UploadButton<OurFileRouter, "ticketActionImage">
                          endpoint="ticketActionImage"
                          onClientUploadComplete={(res) => {
                            if (res && res.length > 0) {
                              setUploadedImageUrl(res[0].url);
                              setIsUploadingImage(false);
                              setShowImageUpload(false);
                              console.log("Imagen subida exitosamente:", res[0].url);
                            }
                          }}
                          onUploadError={(error) => {
                            console.error("Error al subir imagen:", error);
                            setIsUploadingImage(false);
                            alert(`Error al subir imagen: ${error.message}`);
                          }}
                          onUploadBegin={() => {
                            setIsUploadingImage(true);
                          }}
                          appearance={{
                            button: "border border-gray-300 !text-gray-700 hover:bg-gray-50 text-xs font-medium px-4 py-2 rounded-md transition-all flex items-center gap-2 bg-white",
                            allowedContent: "text-xs text-gray-500 mt-2"
                          }}
                          content={{
                            button({ ready }) {
                              if (isUploadingImage) return "Subiendo...";
                              if (!ready) return "Cargando...";
                              return (
                                <>
                                  <Upload className="h-4 w-4" />
                                  Seleccionar Imagen
                                </>
                              );
                            },
                            allowedContent: "Imágenes hasta 4MB"
                          }}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowImageUpload(false)}
                          className="ml-2 mt-2"
                        >
                          <X className="h-4 w-4" />
                          Cancelar
                        </Button>
                      </div>
                    )}

                    {/* Imagen previa */}
                    {uploadedImageUrl && (
                      <div className="border rounded-lg p-3 bg-green-50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-green-700">Imagen añadida</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setUploadedImageUrl(null);
                              setShowImageUpload(false);
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <img
                          src={uploadedImageUrl}
                          alt="Imagen de acción correctiva"
                          className="max-h-24 rounded border cursor-pointer hover:opacity-80"
                          onClick={() => window.open(uploadedImageUrl, '_blank')}
                        />
                      </div>
                    )}
                  </div>

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
                        setUploadedImageUrl(null);
                        setShowImageUpload(false);
                      }}
                      size="sm"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {/* Lista de acciones existentes */}
              {Array.isArray(localTicket.acciones_correctivas) && localTicket.acciones_correctivas.length > 0 ? (
                <div className="space-y-3">
                  {[...localTicket.acciones_correctivas].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).map((accion, idx) => (
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
                  <MessageSquare className="h-6 w-6 mx-auto mb-2 opacity-50" />
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