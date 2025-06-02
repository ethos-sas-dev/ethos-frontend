import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  Calendar, 
  Mail, 
  User 
} from "lucide-react";
import { Email } from "../../_hooks/useEmails";

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: Email;
  onUpdateStatus: (emailId: string, status: "necesitaAtencion" | "informativo" | "respondido") => void;
}

export function EmailModal({ isOpen, onClose, email, onUpdateStatus }: EmailModalProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'necesitaAtencion':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'informativo':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'respondido':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'necesitaAtencion':
        return 'Necesita Atención';
      case 'informativo':
        return 'Informativo';
      case 'respondido':
        return 'Respondido';
      default:
        return status;
    }
  };

  const handleStatusChange = (newStatus: "necesitaAtencion" | "informativo" | "respondido") => {
    onUpdateStatus(email.id, newStatus);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {email.subject}
          </DialogTitle>
          <DialogDescription>
            Detalles completos del correo electrónico
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 overflow-y-auto max-h-[60vh]">
          {/* Información del correo */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">De:</span>
              </div>
              <p className="text-sm text-gray-700 break-all">{email.from}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Fecha:</span>
              </div>
              <p className="text-sm text-gray-700">{formatDate(email.receivedDate)}</p>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium">Para:</span>
              <p className="text-sm text-gray-700 break-all">{email.to || 'No especificado'}</p>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium">Estado actual:</span>
              <Badge className={`${getStatusColor(email.status)} border w-fit`}>
                {getStatusLabel(email.status)}
              </Badge>
            </div>
          </div>

          {/* Contenido del correo */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Contenido del Correo</h3>
            <div className="border rounded-lg p-4 bg-white max-h-[400px] overflow-y-auto">
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: email.fullContent || email.preview 
                }}
              />
            </div>
          </div>

          {/* Información adicional */}
          {email.lastResponseBy && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Última respuesta por:</strong> {email.lastResponseBy}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {email.status !== 'necesitaAtencion' && (
              <Button
                variant="outline"
                onClick={() => handleStatusChange('necesitaAtencion')}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Necesita Atención
              </Button>
            )}
            
            {email.status !== 'informativo' && (
              <Button
                variant="outline"
                onClick={() => handleStatusChange('informativo')}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <Info className="h-4 w-4 mr-2" />
                Informativo
              </Button>
            )}
            
            {email.status !== 'respondido' && (
              <Button
                variant="outline"
                onClick={() => handleStatusChange('respondido')}
                className="text-green-600 border-green-200 hover:bg-green-50"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Respondido
              </Button>
            )}
          </div>

          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 