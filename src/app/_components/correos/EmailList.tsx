import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../ui/table";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { 
  ArrowDown, 
  ArrowUp, 
  MoreHorizontal, 
  Eye, 
  CheckCircle, 
  Info, 
  AlertTriangle 
} from "lucide-react";
import { Email } from "../../_hooks/useEmails";

interface EmailListProps {
  emails: Email[];
  onOpenEmail: (email: Email) => void;
  onMarkAsInformative?: (emailId: string) => void;
  onMarkAsResponded?: (emailId: string) => void;
  onUpdateStatus?: (emailId: string, status: "necesitaAtencion" | "informativo" | "respondido") => void;
  sortOrder: "asc" | "desc";
  onChangeSortOrder: (order: "asc" | "desc") => void;
  emptyMessage: string;
}

export function EmailList({
  emails,
  onOpenEmail,
  onMarkAsInformative,
  onMarkAsResponded,
  onUpdateStatus,
  sortOrder,
  onChangeSortOrder,
  emptyMessage
}: EmailListProps) {
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
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

  if (emails.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>De</TableHead>
            <TableHead>Asunto</TableHead>
            <TableHead>Vista Previa</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="cursor-pointer" onClick={() => onChangeSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
              <div className="flex items-center gap-1">
                Fecha Recibido
                {sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              </div>
            </TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {emails.map((email) => (
            <TableRow key={email.id} className="hover:bg-gray-50">
              <TableCell className="max-w-[200px]">
                <div className="truncate" title={email.from}>
                  {email.from}
                </div>
              </TableCell>
              <TableCell className="max-w-[250px]">
                <div className="truncate font-medium" title={email.subject}>
                  {email.subject}
                </div>
              </TableCell>
              <TableCell className="max-w-[300px]">
                <div className="truncate text-sm text-gray-600" title={email.preview}>
                  {email.preview}
                </div>
              </TableCell>
              <TableCell>
                <Badge className={`${getStatusColor(email.status)} border`}>
                  {getStatusLabel(email.status)}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-gray-600">
                {formatDate(email.receivedDate)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpenEmail(email)}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {email.status !== 'necesitaAtencion' && (
                        <DropdownMenuItem 
                          onClick={() => onUpdateStatus?.(email.emailId, 'necesitaAtencion')}
                        >
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          Marcar como Necesita Atención
                        </DropdownMenuItem>
                      )}
                      {email.status !== 'informativo' && (
                        <DropdownMenuItem 
                          onClick={() => {
                            onMarkAsInformative?.(email.emailId);
                            onUpdateStatus?.(email.emailId, 'informativo');
                          }}
                        >
                          <Info className="mr-2 h-4 w-4" />
                          Marcar como Informativo
                        </DropdownMenuItem>
                      )}
                      {email.status !== 'respondido' && (
                        <DropdownMenuItem 
                          onClick={() => {
                            onMarkAsResponded?.(email.emailId);
                            onUpdateStatus?.(email.emailId, 'respondido');
                          }}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Marcar como Respondido
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 