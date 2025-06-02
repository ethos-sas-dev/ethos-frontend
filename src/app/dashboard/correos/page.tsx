"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../_components/ui/card";
import { Badge } from "../../_components/ui/badge";
import { Button } from "../../_components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../_components/ui/tabs";
import { 
  Loader2, 
  Mail, 
  AlertTriangle, 
  RefreshCw, 
  Search, 
  ChevronLeft, 
  ChevronRight 
} from "lucide-react";
import { EmailModal } from "../../_components/correos/EmailModal";
import { EmailList } from "../../_components/correos/EmailList";
import { EmailStats } from "../../_components/correos/EmailStats";
import { TableSkeleton } from "../../_components/correos/TableSkeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../_components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../../_components/ui/pagination";
import { Input } from "../../_components/ui/input";
import { useEmails, Email } from "../../_hooks/useEmails";

// Definir el tipo EmailStatus para usar en toda la página 
type EmailStatus = "necesitaAtencion" | "informativo" | "respondido";

// Opciones de cantidad para mostrar
const displayOptions = [10, 20, 50, 100];

export default function CorreosPage() {
  const supabase = createClient();
  const router = useRouter();
  
  // Estados locales (todos los hooks al principio)
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("necesitaAtencion");
  const [displayLimit, setDisplayLimit] = useState(20);
  const [localSortOrder, setLocalSortOrder] = useState<"asc" | "desc">("desc");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLocalRefreshing, setIsLocalRefreshing] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  // Ref para evitar toasts duplicados
  const lastToastRef = useRef<string | null>(null);
  
  // Usar el hook de emails con SWR
  const { 
    emails: rawEmails, 
    stats, 
    isLoading, 
    isRefreshing, 
    error, 
    refreshEmails, 
    updateEmail 
  } = useEmails({ 
    // Desactivar refresco automático para evitar el efecto "tieso"
    refreshInterval: undefined,
    revalidateOnFocus: false
  });

  // Verificar permisos de usuario
  useEffect(() => {
    const checkUserRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('Checking role for user:', session.user.email);
        setUserEmail(session.user.email || null);
        
        // Buscar rol en las tablas correctas con los campos correctos
        const attempts = [
          { table: 'perfiles_operacional', field: 'rol', keyField: 'usuario_id', keyValue: session.user.id },
          { table: 'perfiles_cliente', field: 'rol', keyField: 'usuario_id', keyValue: session.user.id },
        ];
        
        for (const attempt of attempts) {
          try {
            console.log(`Attempting to get role from ${attempt.table} with ${attempt.keyField}:`, attempt.keyValue);
            
            const { data, error } = await supabase
              .from(attempt.table)
              .select(attempt.field)
              .eq(attempt.keyField, attempt.keyValue)
              .single();
              
            console.log(`Result from ${attempt.table}:`, { data, error });
              
            if (!error && data && (data as any).rol) {
              const foundRole = (data as any).rol;
              console.log('Found role:', foundRole);
              setUserRole(foundRole);
              return;
            }
          } catch (err) {
            console.log(`Error in attempt ${attempt.table}:`, err);
            // Continuar con el siguiente intento
          }
        }
        
        // Como último recurso
        console.log('Setting default role: Directorio');
        setUserRole('Directorio');
      }
    };
    
    checkUserRole();
  }, [supabase]);

  // Verificar si el usuario tiene permisos para ver correos
  const canViewEmails = useMemo(() => {
    console.log('Checking permissions for userRole:', userRole, 'userEmail:', userEmail);
    
    // Verificación por email específico (para casos especiales)
    const adminEmails = [
      'administracion3@almax.com.ec',
      'administracion3@almax',
      'administraciona3@almax.ec',
      'administraciona3@almax',
      'admin@almax.com.ec'
    ];
    
    const isAdminEmail = adminEmails.some(email => 
      userEmail?.toLowerCase().includes(email.toLowerCase()) || 
      email.toLowerCase().includes(userEmail?.toLowerCase() || '')
    );
    
    // Hacer la verificación más flexible - aceptar diferentes variaciones
    const allowedRoles = ['Administrador', 'administrador', 'ADMINISTRADOR', 'Admin', 'admin'];
    const hasRoleAccess = allowedRoles.includes(userRole || '');
    
    const hasAccess = hasRoleAccess || isAdminEmail;
    
    console.log('User has access to emails:', hasAccess, {
      hasRoleAccess,
      isAdminEmail,
      userRole,
      userEmail
    });
    
    return hasAccess;
  }, [userRole, userEmail]);

  // Filtrar correos por búsqueda y tab activo
  const filteredEmails = useMemo(() => {
    let filtered = rawEmails.filter((email: Email) => email.status === activeTab);
    
    // Filtrar por búsqueda si hay una consulta
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((email: Email) => 
        email.subject.toLowerCase().includes(query) || 
        email.from.toLowerCase().includes(query)
      );
    }
    
    // Aplicar ordenación
    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.receivedDate).getTime();
      const dateB = new Date(b.receivedDate).getTime();
      return localSortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [rawEmails, activeTab, searchQuery, localSortOrder]);

  // Calcular paginación
  const totalPages = useMemo(() => {
    return Math.ceil(filteredEmails.length / displayLimit);
  }, [filteredEmails.length, displayLimit]);

  // Obtener correos para la página actual
  const paginatedEmails = useMemo(() => {
    const startIndex = (currentPage - 1) * displayLimit;
    const endIndex = startIndex + displayLimit;
    return filteredEmails.slice(startIndex, endIndex);
  }, [filteredEmails, currentPage, displayLimit]);

  // Generar elementos de paginación
  const generatePaginationItems = useMemo(() => {
    const items: (number|string)[] = [];
    
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(i);
      }
      return items;
    }
    
    items.push(1);
    
    let startPage = Math.max(2, currentPage - 1);
    let endPage = Math.min(totalPages - 1, currentPage + 1);
    
    if (startPage === 2) {
      endPage = Math.min(totalPages - 1, 4);
    } else if (endPage === totalPages - 1) {
      startPage = Math.max(2, totalPages - 3);
    }
    
    if (startPage > 2) {
      items.push('ellipsis-start');
    }
    
    for (let i = startPage; i <= endPage; i++) {
      items.push(i);
    }
    
    if (endPage < totalPages - 1) {
      items.push('ellipsis-end');
    }
    
    if (totalPages > 1) {
      items.push(totalPages);
    }
    
    return items;
  }, [currentPage, totalPages]);

  // Formatear la fecha de última actualización
  const formattedLastUpdated = useMemo(() => {
    if (!lastUpdated) return '';
    
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(lastUpdated);
  }, [lastUpdated]);

  // Establecer la fecha de última actualización al cargar
  useEffect(() => {
    if (rawEmails.length > 0 && !lastUpdated) {
      setLastUpdated(new Date());
    }
  }, [rawEmails, lastUpdated]);

  // Ajustar página actual cuando cambian los datos
  useEffect(() => {
    if (filteredEmails.length > 0) {
      const maxValidPage = Math.ceil(filteredEmails.length / displayLimit);
      if (currentPage > maxValidPage) {
        setCurrentPage(maxValidPage);
      }
    } else {
      if (currentPage !== 1) {
        setCurrentPage(1);
      }
    }
  }, [filteredEmails.length, displayLimit, currentPage]);

  // Función para manejar el cambio de ordenación
  const handleSortChange = (order: "asc" | "desc") => {
    setLocalSortOrder(order);
  };

  // Cambiar el límite de correos mostrados
  const handleDisplayLimitChange = (value: string) => {
    setDisplayLimit(Number(value));
    setCurrentPage(1); // Reset a la primera página
  };

  // Función para manejar actualizaciones de estado
  const handleUpdateStatus = async (emailId: string, newStatus: EmailStatus) => {
    const success = await updateEmail(emailId, { status: newStatus });
    
    // Crear un identificador único para este toast
    const toastId = `${emailId}-${newStatus}-${Date.now()}`;
    
    if (success) {
      setLastUpdated(new Date());
      
      // Verificar si ya se mostró un toast muy reciente para evitar duplicados
      if (lastToastRef.current !== `${emailId}-${newStatus}`) {
        lastToastRef.current = `${emailId}-${newStatus}`;
        
        // Mostrar toast de éxito
        setTimeout(() => {
          dispatchEvent(
            new CustomEvent('showNotification', {
              detail: {
                type: 'success',
                title: 'Estado actualizado',
                message: `El correo ha sido marcado como ${newStatus === 'necesitaAtencion' ? 'Necesita Atención' : newStatus === 'informativo' ? 'Informativo' : 'Respondido'}`
              }
            })
          );
        }, 100);
        
        // Limpiar la referencia después de un tiempo
        setTimeout(() => {
          lastToastRef.current = null;
        }, 1000);
      }
    } else {
      // Mostrar toast de error (solo si no hay un toast reciente)
      if (lastToastRef.current !== `error-${emailId}`) {
        lastToastRef.current = `error-${emailId}`;
        
        setTimeout(() => {
          dispatchEvent(
            new CustomEvent('showNotification', {
              detail: {
                type: 'error',
                title: 'Error al actualizar',
                message: 'No se pudo actualizar el estado del correo'
              }
            })
          );
        }, 100);
        
        // Limpiar la referencia después de un tiempo
        setTimeout(() => {
          lastToastRef.current = null;
        }, 1000);
      }
    }
  };

  // Función para abrir email
  const handleOpenEmail = (email: Email) => {
    setSelectedEmail(email);
    setModalOpen(true);
  };

  // Función para refrescar correos
  const handleRefresh = async () => {
    if (isRefreshing || isLocalRefreshing) return;
    
    try {
      setIsLocalRefreshing(true);
      const result = await refreshEmails();
      
      if (result) {
        setLastUpdated(new Date());
        
        // Mostrar notificación de éxito
        setTimeout(() => {
          dispatchEvent(
            new CustomEvent('showNotification', {
              detail: {
                type: 'success',
                title: 'Correos actualizados',
                message: 'La lista de correos ha sido actualizada'
              }
            })
          );
        }, 100);
      }
    } catch (error) {
      console.error('Error al refrescar correos:', error);
      
      setTimeout(() => {
        dispatchEvent(
          new CustomEvent('showNotification', {
            detail: {
              type: 'error',
              title: 'Error',
              message: 'No se pudieron actualizar los correos'
            }
          })
        );
      }, 100);
    } finally {
      setIsLocalRefreshing(false);
    }
  };

  // Función para cambiar de página
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Función para manejar la búsqueda
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  // Loading inicial - verificar userRole primero
  if (!userRole) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Si no tiene permisos, mostrar mensaje (DESPUÉS de todos los hooks)
  if (userRole && !canViewEmails) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] p-4 text-center">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Acceso restringido</h1>
        <p className="text-gray-600 max-w-md">
          Este módulo solo está disponible para usuarios con rol de Administrador.
            </p>
        <Button 
          className="mt-6" 
          onClick={() => router.push('/dashboard')}
        >
          Volver al dashboard
        </Button>
          </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestión de Correos</h1>
        <div className="flex flex-col items-end">
          <Button onClick={handleRefresh} disabled={isRefreshing || isLocalRefreshing} className="mb-1">
            {isRefreshing || isLocalRefreshing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Actualizando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Actualizar
              </>
            )}
          </Button>
          {lastUpdated ? (
            <span className="text-xs text-gray-500">
              Última sincronización: {formattedLastUpdated}
            </span>
          ) : (
            <span className="text-xs text-gray-500">
              No hay información de sincronización disponible
            </span>
          )}
        </div>
      </div>

      <EmailStats stats={stats} />

      <Card className="mt-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Bandeja de Entrada</CardTitle>
              <CardDescription>
                Gestiona tus correos según su estado y prioridad
              </CardDescription>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs text-gray-500 mt-1">
                {filteredEmails.length > 0 ? (
                  <>
                    {(currentPage - 1) * displayLimit + 1} - {Math.min(currentPage * displayLimit, filteredEmails.length)} de {filteredEmails.length}
                  </>
                ) : (
                  <>0 correos en esta categoría</>
                )}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <div className="bg-background p-4 border-b">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por asunto o remitente"
                      className="pl-8"
                      value={searchQuery}
                      onChange={handleSearchChange}
                    />
                  </div>
                </div>
                
                <div className="flex flex-col items-end sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                  <div className="flex items-center space-x-2">
                    <Select
                      value={displayLimit.toString()}
                      onValueChange={handleDisplayLimitChange}
                    >
                      <SelectTrigger className="w-[150px] h-8">
                        <SelectValue placeholder="Mostrar" />
                      </SelectTrigger>
                      <SelectContent>
                        {displayOptions.map((option) => (
                          <SelectItem key={option} value={option.toString()}>
                            {option} por página
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {totalPages > 1 && (
                    <Pagination className="sm:ml-2">
                      <PaginationContent>
                        {currentPage > 1 && (
                          <PaginationItem>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-8 w-8" 
                              onClick={(e: React.MouseEvent) => {
                                e.preventDefault();
                                handlePageChange(currentPage - 1);
                              }}
                            >
                              <ChevronLeft className="h-4 w-4" />
                              <span className="sr-only">Anterior</span>
                            </Button>
                          </PaginationItem>
                        )}
                        
                        {generatePaginationItems.map((page, idx) => {
                          if (typeof page === 'string') {
                            return (
                              <PaginationItem key={`ellipsis-${idx}`}>
                                <PaginationEllipsis />
                              </PaginationItem>
                            );
                          }
                          
                          return (
                            <PaginationItem key={`page-${page}`}>
                              <PaginationLink 
                                href="#" 
                                isActive={currentPage === page}
                                onClick={(e: React.MouseEvent) => {
                                  e.preventDefault();
                                  handlePageChange(page);
                                }}
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        
                        {currentPage < totalPages && (
                          <PaginationItem>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-8 w-8" 
                              onClick={(e: React.MouseEvent) => {
                                e.preventDefault();
                                handlePageChange(currentPage + 1);
                              }}
                            >
                              <ChevronRight className="h-4 w-4" />
                              <span className="sr-only">Siguiente</span>
                            </Button>
                          </PaginationItem>
                        )}
                      </PaginationContent>
                    </Pagination>
                  )}
                </div>
              </div>
            </div>

            <Tabs defaultValue="necesitaAtencion" onValueChange={setActiveTab} value={activeTab}>
              <div className="px-4">
                <TabsList className="grid w-full grid-cols-3 mt-2">
                  <TabsTrigger value="necesitaAtencion" className="data-[state=active]:bg-red-50 data-[state=active]:text-red-700">
                    Necesitan Atención
                    {stats.necesitaAtencion > 0 && (
                      <Badge className="ml-2 bg-red-100 text-red-700 border-red-200">
                        {stats.necesitaAtencion}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="informativo" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                    Informativos
                    {stats.informativo > 0 && (
                      <Badge className="ml-2 bg-blue-100 text-blue-700 border-blue-200">
                        {stats.informativo}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="respondido" className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700">
                    Respondidos
                    {stats.respondido > 0 && (
                      <Badge className="ml-2 bg-green-100 text-green-700 border-green-200">
                        {stats.respondido}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Contenido de las pestañas */}
              <TabsContent value="necesitaAtencion" className="p-4 pt-6">
                {isLoading ? (
                  <TableSkeleton rows={8} />
                ) : (
                  <EmailList
                    emails={paginatedEmails}
                    onOpenEmail={handleOpenEmail}
                    onMarkAsInformative={(emailId) => handleUpdateStatus(emailId, 'informativo')}
                    onMarkAsResponded={(emailId) => handleUpdateStatus(emailId, 'respondido')}
                    onUpdateStatus={handleUpdateStatus}
                    sortOrder={localSortOrder}
                    onChangeSortOrder={handleSortChange}
                    emptyMessage={searchQuery ? "No hay correos que coincidan con la búsqueda" : "No hay correos que requieran atención"}
                  />
                )}
              </TabsContent>
              
              <TabsContent value="informativo" className="p-4 pt-6">
                {isLoading ? (
                  <TableSkeleton rows={8} />
                ) : (
                  <EmailList
                    emails={paginatedEmails}
                    onOpenEmail={handleOpenEmail}
                    onMarkAsResponded={(emailId) => handleUpdateStatus(emailId, 'respondido')}
                    onUpdateStatus={handleUpdateStatus}
                    sortOrder={localSortOrder}
                    onChangeSortOrder={handleSortChange}
                    emptyMessage={searchQuery ? "No hay correos que coincidan con la búsqueda" : "No hay correos informativos"}
                  />
                )}
              </TabsContent>
              
              <TabsContent value="respondido" className="p-4 pt-6">
                {isLoading ? (
                  <TableSkeleton rows={8} />
                ) : (
                  <EmailList
                    emails={paginatedEmails}
                    onOpenEmail={handleOpenEmail}
                    onMarkAsInformative={(emailId) => handleUpdateStatus(emailId, 'informativo')}
                    onUpdateStatus={handleUpdateStatus}
                    sortOrder={localSortOrder}
                    onChangeSortOrder={handleSortChange}
                    emptyMessage={searchQuery ? "No hay correos que coincidan con la búsqueda" : "No hay correos respondidos"}
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {selectedEmail && (
        <EmailModal 
          isOpen={modalOpen} 
          onClose={() => setModalOpen(false)} 
          email={selectedEmail}
          onUpdateStatus={handleUpdateStatus}
        />
      )}
    </div>
  );
}
