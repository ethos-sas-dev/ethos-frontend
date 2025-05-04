"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  MagnifyingGlassIcon, 
  PlusIcon, 
  XMarkIcon,
  UserCircleIcon,
  EnvelopeIcon,
  KeyIcon,
  UserIcon,
  BuildingOffice2Icon,
  ArrowPathIcon,
  TrashIcon // Añadimos ícono de eliminación
} from "@heroicons/react/24/outline";
import { Button } from "../../_components/ui/button";
import { Input } from "../../_components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../_components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../_components/ui/dialog";
import { Label } from "../../_components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../_components/ui/tabs";
import { StatusModal } from "../../_components/StatusModal";
import { TableSkeleton } from "./_components/TableSkeleton"; // Asumimos que existe o lo creamos luego
import { ArrowDown, ArrowUp } from "lucide-react";
import { 
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell
} from "../../_components/ui/table";
import { createClient } from "../../../../lib/supabase/client"; // Cliente Supabase
import { useAuth } from "../../_lib/auth/AuthContext"; // Contexto de Auth

// --- Tipos de Datos --- 

type Proyecto = {
    id: number;
    nombre: string;
};

type PerfilClienteResumen = {
    id: number;
    tipo_persona: 'Natural' | 'Juridica';
    // Incluir campos para mostrar en el dropdown
    razon_social_natural?: string | null;
    cedula_natural?: string | null;
    razon_social_juridica?: string | null;
    ruc_juridica?: string | null;
    usuario_id: string | null; // Para filtrar los que ya tienen usuario
};

type PerfilOperacional = {
    id: number;
    rol: string | null;
    proyectosAsignados?: { id: number; nombre: string }[] | null; 
};

type UserProfile = {
    id: string; // UUID de auth.users
    email?: string | undefined;
    last_sign_in_at?: string | undefined;
    email_confirmed_at?: string | undefined;
    // Datos anidados de perfiles
    perfil_cliente: {
        id: number;
        rol: string | null;
        tipo_persona: string | null;
        // Campos para mostrar nombre/razón social
        personas_natural: { razon_social: string | null } | null;
        personas_juridica: { razon_social: string | null } | null;
    } | null;
    perfil_operacional: {
        id: number;
        rol: string | null;
        proyectosAsignados?: { nombre: string }[] | null; // Solo necesitamos nombres aquí
    } | null;
};

// --- Componente Principal --- 
export default function UsuariosPage() {
    const router = useRouter();
    const { user: authUser, role: authRole } = useAuth(); // Renombrar user a authUser para evitar conflicto
    const supabase = createClient();

    // Estados de UI
    const [searchQuery, setSearchQuery] = useState("");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false); // Para creación/actualización
    const [isLoading, setIsLoading] = useState(true); // Carga inicial
    const [isRefetching, setIsRefetching] = useState(false); // Recarga manual
    const [statusModal, setStatusModal] = useState<{ open: boolean; title: string; message: string; type: "success" | "error"; }>({ open: false, title: "", message: "", type: "success" });
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [sortField, setSortField] = useState<'email' | 'tipo'>('email'); // Default sort
    
    // Nuevo estado para eliminar usuarios
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Estados de Datos
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [availablePerfilesCliente, setAvailablePerfilesCliente] = useState<PerfilClienteResumen[]>([]);
    const [allProyectos, setAllProyectos] = useState<Proyecto[]>([]);

    // Estado del Formulario de Creación
    const [formData, setFormData] = useState({
        // Quitar username, se generará o usará email
        email: "",
        password: "",
        tipoUsuario: "cliente", // cliente o operacional
        perfilClienteId: "", // ID de perfiles_cliente
        rolOperacional: "Jefe Operativo",
        proyectosAsignados: [] as number[] // IDs de proyectos
    });
    
    // Nuevo estado para búsqueda de perfiles cliente
    const [clienteSearchTerm, setClienteSearchTerm] = useState("");
    
    // Perfiles cliente filtrados por búsqueda
    const filteredPerfilesCliente = useMemo(() => {
        if (!clienteSearchTerm.trim()) return availablePerfilesCliente;
        
        const searchLower = clienteSearchTerm.toLowerCase();
        return availablePerfilesCliente.filter(p => {
            const razonSocialNatural = (p.razon_social_natural || '').toLowerCase();
            const cedulaNatural = (p.cedula_natural || '').toLowerCase();
            const razonSocialJuridica = (p.razon_social_juridica || '').toLowerCase();
            const rucJuridica = (p.ruc_juridica || '').toLowerCase();
            
            return razonSocialNatural.includes(searchLower) || 
                  cedulaNatural.includes(searchLower) ||
                  razonSocialJuridica.includes(searchLower) ||
                  rucJuridica.includes(searchLower);
        });
    }, [availablePerfilesCliente, clienteSearchTerm]);

    // --- Control de Acceso (Ejemplo) ---
    // useEffect(() => {
    //     if (!authUser) { // Esperar a que cargue el usuario
    //         return;
    //     } 
    //     if (!["Administrador", "Directorio"].includes(authRole || '')) {
    //         router.push('/dashboard');
    //     }
    // }, [authRole, authUser, router]);

    // --- Carga de Datos --- 
    const fetchData = async () => {
        console.log("Fetching initial data...");
        setIsLoading(true);
        setIsRefetching(false);
        try {
            // 1. Fetch Users con sus perfiles (¡Consulta compleja!)
            // Necesitamos una función o vista DB para esto idealmente,
            // o hacer múltiples queries y unirlas en el cliente.
            // Por ahora, haremos múltiples queries.

            // Fetch auth.users (requiere permisos adecuados o una función)
            // Simulación: asumimos una función RPC `get_all_user_profiles`
            // ¡¡¡NECESITAS CREAR ESTA FUNCIÓN EN SUPABASE O USAR UNA RUTA API SEGURA!!!
             const { data: usersData, error: usersError } = await supabase
                 .rpc('get_all_user_profiles'); // Nombre hipotético de la función
            
            if (usersError) throw new Error(`Error fetching users: ${usersError.message}`);
            console.log("Users fetched:", usersData);
            setUsers(usersData || []);

            // 2. Fetch Perfiles Cliente sin usuario asignado
            const { data: perfilesData, error: perfilesError } = await supabase
                .from('perfiles_cliente')
                .select(`
                    id,
                    tipo_persona,
                    usuario_id,
                    personas_natural ( razon_social, cedula ),
                    personas_juridica ( razon_social, ruc )
                `)
                .is('usuario_id', null); // Solo los que no tienen usuario
            
            if (perfilesError) throw new Error(`Error fetching available client profiles: ${perfilesError.message}`);
             console.log("Available client profiles fetched:", perfilesData);
             // Mapeo para el dropdown (corregido)
             const mappedPerfiles = perfilesData?.map(p => {
                 // Acceder al primer elemento del array para relaciones 1-a-1
                 const pn = Array.isArray(p.personas_natural) ? p.personas_natural[0] : p.personas_natural;
                 const pj = Array.isArray(p.personas_juridica) ? p.personas_juridica[0] : p.personas_juridica;
                 return {
                    id: p.id,
                    tipo_persona: p.tipo_persona,
                    usuario_id: p.usuario_id,
                    razon_social_natural: pn?.razon_social,
                    cedula_natural: pn?.cedula,
                    razon_social_juridica: pj?.razon_social,
                    ruc_juridica: pj?.ruc,
                 }
             }) || [];
             setAvailablePerfilesCliente(mappedPerfiles);

            // 3. Fetch Todos los Proyectos
            const { data: proyectosData, error: proyectosError } = await supabase
                .from('proyectos')
                .select('id, nombre')
                .order('nombre', { ascending: true });

            if (proyectosError) throw new Error(`Error fetching proyectos: ${proyectosError.message}`);
            console.log("Proyectos fetched:", proyectosData);
            setAllProyectos(proyectosData || []);

        } catch (error: any) {
            console.error("Fetch data error:", error);
            setStatusModal({ open: true, title: "Error de Carga", message: `No se pudieron cargar los datos: ${error.message}`, type: "error" });
            setUsers([]);
            setAvailablePerfilesCliente([]);
            setAllProyectos([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Cargar al montar

    // --- Lógica de Creación (Llamada a API) ---
    const handleCreateUser = async () => {
        setIsProcessing(true);
        setStatusModal(prev => ({ ...prev, open: false })); // Cerrar modal anterior
        
        // Validaciones básicas
        if (!formData.email || !formData.password) {
             setStatusModal({ open: true, title: "Error", message: "Email y Contraseña son requeridos.", type: "error" });
             setIsProcessing(false);
             return;
        }
        if (formData.tipoUsuario === 'cliente' && !formData.perfilClienteId) {
             setStatusModal({ open: true, title: "Error", message: "Debe seleccionar un Perfil de Cliente.", type: "error" });
             setIsProcessing(false);
             return;
        }
        // Añadir más validaciones (formato email, seguridad contraseña, etc.)

        try {
            console.log("Calling API to create user:", formData);
            const response = await fetch('/api/create-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || `Error del servidor: ${response.status}`);
            }

            console.log("API create user successful:", result);
            setStatusModal({ open: true, title: "Éxito", message: "Usuario creado exitosamente.", type: "success" });
            setIsCreateModalOpen(false);
            setFormData({ // Reset form
                email: "", password: "", tipoUsuario: "cliente", perfilClienteId: "", rolOperacional: "Jefe Operativo", proyectosAsignados: []
            });
            // Recargar datos
            setIsRefetching(true);
            fetchData(); 

        } catch (error: any) {
            console.error("Create user error:", error);
            setStatusModal({ open: true, title: "Error", message: `Error al crear usuario: ${error.message}`, type: "error" });
        } finally {
            setIsProcessing(false);
        }
    };

    // --- Filtrado y Ordenamiento --- 
    const filteredUsers = useMemo(() => {
        return users.filter((user) => {
            const searchLower = searchQuery.toLowerCase();
            const emailMatch = user.email?.toLowerCase().includes(searchLower);
            const clienteNombreMatch = 
                user.perfil_cliente?.personas_natural?.razon_social?.toLowerCase().includes(searchLower) ||
                user.perfil_cliente?.personas_juridica?.razon_social?.toLowerCase().includes(searchLower);
            const opRolMatch = user.perfil_operacional?.rol?.toLowerCase().includes(searchLower);
            
            return emailMatch || clienteNombreMatch || opRolMatch;
        });
    }, [users, searchQuery]);

    // Separar usuarios por tipo
    const clienteUsers = useMemo(() => 
        filteredUsers.filter(user => user.perfil_cliente)
    , [filteredUsers]);

    const operacionalUsers = useMemo(() => 
        filteredUsers.filter(user => user.perfil_operacional)
    , [filteredUsers]);

    // Estado para la pestaña activa de la tabla
    const [activeTableTab, setActiveTableTab] = useState<'clientes' | 'operacionales'>('clientes');

    const sortedUsers = useMemo(() => {
        // Seleccionar el conjunto correcto de usuarios según la pestaña activa
        const usersToSort = activeTableTab === 'clientes' ? clienteUsers : operacionalUsers;
        
        return [...usersToSort].sort((a, b) => {
            const valA = sortField === 'email' 
                ? a.email?.toLowerCase() || '' 
                : (a.perfil_cliente ? 'Cliente' : 'Operacional');
            const valB = sortField === 'email' 
                ? b.email?.toLowerCase() || '' 
                : (b.perfil_cliente ? 'Cliente' : 'Operacional');
            
            const comparison = valA.localeCompare(valB);
            return sortOrder === 'asc' ? comparison : -comparison;
         });
    }, [clienteUsers, operacionalUsers, activeTableTab, sortField, sortOrder]);

    const toggleSortOrder = (field: 'email' | 'tipo') => {
         if (field === sortField) {
             setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
         } else {
             setSortField(field);
             setSortOrder('asc');
         }
    };

    // --- Handlers del Formulario --- 
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    const handleSelectChange = (name: string, value: string | number) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    // Nuevo handler para checkboxes de proyectos
    const handleProyectoCheckbox = (proyectoId: number, isChecked: boolean) => {
        setFormData(prev => {
            if (isChecked) {
                // Añadir proyecto si no está ya en el array
                return { 
                    ...prev, 
                    proyectosAsignados: [...prev.proyectosAsignados, proyectoId]
                };
            } else {
                // Quitar proyecto del array
                return { 
                    ...prev, 
                    proyectosAsignados: prev.proyectosAsignados.filter(id => id !== proyectoId)
                };
            }
        });
    };

    // --- Función para eliminar usuarios ---
    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        
        setIsDeleting(true);
        try {
            console.log("Eliminando usuario:", userToDelete.id);
            
            // 1. Llamar a la API para eliminar el usuario
            const response = await fetch('/api/delete-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userToDelete.id }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || `Error del servidor: ${response.status}`);
            }
            
            console.log("API delete user successful:", result);
            setStatusModal({ 
                open: true, 
                title: "Éxito", 
                message: "Usuario eliminado exitosamente.", 
                type: "success" 
            });
            
            // Cerrar el modal de confirmación
            setDeleteConfirmOpen(false);
            setUserToDelete(null);
            
            // Recargar datos
            setIsRefetching(true);
            fetchData();
        } catch (error: any) {
            console.error("Delete user error:", error);
            setStatusModal({ 
                open: true, 
                title: "Error", 
                message: `Error al eliminar usuario: ${error.message}`, 
                type: "error" 
            });
        } finally {
            setIsDeleting(false);
        }
    };

    // Función para abrir el modal de confirmación
    const confirmDelete = (user: UserProfile) => {
        setUserToDelete(user);
        setDeleteConfirmOpen(true);
    };

    // --- Renderizado --- 
    // if (isLoading) { // Podríamos tener un skeleton más grande para la página entera
    //     return <div>Cargando...</div>;
    // }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
            {/* Header */} 
            <div className="flex justify-between items-start">
                 <div>
                     <h1 className="text-2xl font-semibold text-gray-900">Gestión de Usuarios</h1>
                     <p className="text-gray-500 mt-1">Administra los accesos y perfiles de los usuarios.</p>
                 </div>
                 <div className="flex items-center gap-3">
                     {isRefetching && (
                         <div className="flex items-center text-sm text-gray-500">
                             <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" />
                             Actualizando...
                         </div>
                     )}
                      <Button 
                        onClick={() => { setIsRefetching(true); fetchData(); }}
                        variant="outline"
                        disabled={isLoading || isRefetching}
                        className="flex items-center gap-2"
                        title="Recargar lista"
                     >
                         <ArrowPathIcon className={`w-5 h-5 ${isRefetching ? 'animate-spin' : ''}`} />
                     </Button>
                     <Button 
                        onClick={() => setIsCreateModalOpen(true)}
                        disabled={isLoading || isRefetching}
                        className={`flex items-center gap-2 bg-[#008A4B] hover:bg-[#006837] text-white ${isLoading || isRefetching ? 'opacity-50 cursor-not-allowed' : ''}`}
                     >
                         <PlusIcon className="w-5 h-5" />
                         Crear Usuario
                     </Button>
                 </div>
             </div>

            {/* Filters */} 
             <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
                 <div className="relative w-full max-w-md">
                     <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                         <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
                     </div>
                     <Input
                         type="text"
                         value={searchQuery}
                         onChange={(e) => setSearchQuery(e.target.value)}
                         placeholder="Buscar por email, nombre o rol..."
                         disabled={isLoading}
                         className={`w-full pl-10 pr-4 py-2 border rounded-lg ${isLoading ? 'bg-gray-50 text-gray-400' : 'focus:outline-none focus:ring-2 focus:ring-[#008A4B]/20 focus:border-[#008A4B]'}`}
                         autoComplete="off"
                     />
                 </div>
                 {searchQuery && !isLoading && (
                     <Button
                         variant="ghost"
                         onClick={() => setSearchQuery("")}
                         className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mt-2 sm:mt-0"
                     >
                         <XMarkIcon className="w-5 h-5" />
                         Limpiar
                     </Button>
                 )}
             </div>

            {/* Count */} 
            {!isLoading && (
                 <div className="text-sm text-gray-700">
                     {filteredUsers.length} usuarios encontrados - {clienteUsers.length} clientes, {operacionalUsers.length} operacionales
                 </div>
             )}

            {/* Tabs para la tabla */}
            <Tabs value={activeTableTab} onValueChange={(value) => setActiveTableTab(value as 'clientes' | 'operacionales')}>
                <TabsList className="mb-4">
                    <TabsTrigger 
                        value="clientes" 
                        className="flex items-center gap-2"
                    >
                        <UserIcon className="h-4 w-4" />
                        <span>Clientes</span>
                        <span className="ml-1 text-xs bg-gray-100 text-gray-700 rounded-full px-2 py-0.5">
                            {clienteUsers.length}
                        </span>
                    </TabsTrigger>
                    <TabsTrigger 
                        value="operacionales" 
                        className="flex items-center gap-2"
                    >
                        <BuildingOffice2Icon className="h-4 w-4" />
                        <span>Operacionales</span>
                        <span className="ml-1 text-xs bg-gray-100 text-gray-700 rounded-full px-2 py-0.5">
                            {operacionalUsers.length}
                        </span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="clientes">
                    {/* Tabla Clientes */}
                    {isLoading ? (
                        <TableSkeleton rows={8} />
                    ) : (
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead 
                                            className="cursor-pointer hover:bg-gray-50" 
                                            onClick={() => toggleSortOrder('email')}
                                        >
                                            <div className="flex items-center gap-1">Email {sortField === 'email' && (sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}</div>
                                        </TableHead>
                                        <TableHead>Nombre / Razón Social</TableHead>
                                        <TableHead className="hidden lg:table-cell">Tipo Persona</TableHead>
                                        <TableHead className="hidden lg:table-cell">Rol</TableHead>
                                        <TableHead className="hidden xl:table-cell text-center">Estado</TableHead>
                                        <TableHead className="py-3 text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedUsers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="py-10 text-center text-gray-500">
                                                <UserCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
                                                <p className="mt-2 text-sm font-medium">{searchQuery ? 'No hay clientes que coincidan' : 'No hay clientes registrados'}</p>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        sortedUsers.map((u) => {
                                            const nombre = u.perfil_cliente
                                                ? (u.perfil_cliente.personas_natural?.razon_social || u.perfil_cliente.personas_juridica?.razon_social || 'N/A')
                                                : u.email;
                                            
                                            const tipoPersona = u.perfil_cliente?.tipo_persona || 'N/A';
                                            const rol = u.perfil_cliente?.rol || 'N/A';
                                            
                                            const isConfirmed = !!u.email_confirmed_at;
                                            const estadoClase = isConfirmed ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800";
                                            const estadoTexto = isConfirmed ? "Activo" : "Pendiente";

                                            return (
                                                <TableRow key={u.id} className="hover:bg-gray-50">
                                                    <TableCell className="py-3">
                                                        <div className="flex items-center">
                                                            <EnvelopeIcon className="h-4 w-4 text-gray-400 mr-2" />
                                                            <span className="text-sm font-medium text-gray-900 truncate">{u.email}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-3">
                                                        <span className="text-sm text-gray-800">{nombre}</span>
                                                    </TableCell>
                                                    <TableCell className="hidden lg:table-cell py-3">
                                                        <span className="text-sm px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">{tipoPersona}</span>
                                                    </TableCell>
                                                    <TableCell className="hidden lg:table-cell py-3">
                                                        <div className="text-sm text-gray-900">{rol}</div>
                                                    </TableCell>
                                                    <TableCell className="hidden xl:table-cell text-center py-3">
                                                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${estadoClase}`}>
                                                            {estadoTexto}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="py-3 text-right">
                                                        <Button
                                                            onClick={() => confirmDelete(u)}
                                                            variant="ghost"
                                                            className="text-gray-500 hover:text-red-600"
                                                            title="Eliminar usuario"
                                                        >
                                                            <TrashIcon className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="operacionales">
                    {/* Tabla Operacionales */}
                    {isLoading ? (
                        <TableSkeleton rows={8} />
                    ) : (
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead 
                                            className="cursor-pointer hover:bg-gray-50" 
                                            onClick={() => toggleSortOrder('email')}
                                        >
                                            <div className="flex items-center gap-1">Email {sortField === 'email' && (sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}</div>
                                        </TableHead>
                                        <TableHead>Rol</TableHead>
                                        <TableHead className="hidden lg:table-cell">Proyectos Asignados</TableHead>
                                        <TableHead className="hidden xl:table-cell text-center">Estado</TableHead>
                                        <TableHead className="py-3 text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedUsers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="py-10 text-center text-gray-500">
                                                <BuildingOffice2Icon className="mx-auto h-12 w-12 text-gray-400" />
                                                <p className="mt-2 text-sm font-medium">{searchQuery ? 'No hay usuarios operacionales que coincidan' : 'No hay usuarios operacionales registrados'}</p>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        sortedUsers.map((u) => {
                                            const rol = u.perfil_operacional?.rol || 'N/A';
                                            const proyectos = u.perfil_operacional?.proyectosAsignados?.map(p => p.nombre).join(', ') || '';
                                            
                                            const isConfirmed = !!u.email_confirmed_at;
                                            const estadoClase = isConfirmed ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800";
                                            const estadoTexto = isConfirmed ? "Activo" : "Pendiente";

                                            return (
                                                <TableRow key={u.id} className="hover:bg-gray-50">
                                                    <TableCell className="py-3">
                                                        <div className="flex items-center">
                                                            <EnvelopeIcon className="h-4 w-4 text-gray-400 mr-2" />
                                                            <span className="text-sm font-medium text-gray-900 truncate">{u.email}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-3">
                                                        <span className="text-sm px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">{rol}</span>
                                                    </TableCell>
                                                    <TableCell className="hidden lg:table-cell py-3">
                                                        <div className="text-sm text-gray-500 truncate" title={proyectos}>
                                                            {proyectos || "Sin proyectos asignados"}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="hidden xl:table-cell text-center py-3">
                                                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${estadoClase}`}>
                                                            {estadoTexto}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="py-3 text-right">
                                                        <Button
                                                            onClick={() => confirmDelete(u)}
                                                            variant="ghost"
                                                            className="text-gray-500 hover:text-red-600"
                                                            title="Eliminar usuario"
                                                        >
                                                            <TrashIcon className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Modal Crear Usuario */} 
             <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                 <DialogContent 
                     className="sm:max-w-[600px]" 
                     style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
                 >
                     <DialogHeader>
                         <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                     </DialogHeader>
                     <Tabs defaultValue="cliente" onValueChange={(value: string) => handleSelectChange('tipoUsuario', value)}>
                         <TabsList className="grid w-full grid-cols-2">
                             <TabsTrigger value="cliente">Usuario Cliente</TabsTrigger>
                             <TabsTrigger value="operacional">Usuario Operacional</TabsTrigger>
                         </TabsList>
                         
                         <div className="mt-6 space-y-4">
                             {/* Campos Comunes: Email, Password */} 
                             <div className="grid grid-cols-1 gap-4">
                                 <div className="space-y-2">
                                     <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                                     <Input id="email" name="email" type="email" value={formData.email} onChange={handleFormChange} placeholder="ejemplo@dominio.com" autoComplete="off" />
                                 </div>
                                 <div className="space-y-2">
                                     <Label htmlFor="password">Contraseña <span className="text-red-500">*</span></Label>
                                     <Input id="password" name="password" type="password" value={formData.password} onChange={handleFormChange} placeholder="••••••••" autoComplete="new-password" />
                                     <p className="text-xs text-gray-500">Se enviará la contraseña al usuario por email.</p>
                                 </div>
                             </div>
                             
                             {/* Tab Cliente */} 
                             <TabsContent value="cliente" className="space-y-4 mt-4">
                                 <div className="space-y-2">
                                     <Label htmlFor="perfilClienteSearch">Vincular a Perfil de Cliente Existente <span className="text-red-500">*</span></Label>
                                     
                                     {/* Campo de búsqueda mejorado */}
                                     <div className="relative mb-2">
                                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                             <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
                                         </div>
                                         <Input
                                             id="perfilClienteSearch"
                                             type="text"
                                             placeholder="Buscar por nombre, razón social o identificación..."
                                             value={clienteSearchTerm}
                                             onChange={(e) => setClienteSearchTerm(e.target.value)}
                                             className="pl-10"
                                         />
                                     </div>
                                     
                                     {/* Reemplazar el Select por una lista directa de resultados */}
                                     <div className="max-h-48 overflow-y-auto border rounded-md bg-white">
                                         {filteredPerfilesCliente.length === 0 ? (
                                             <div className="p-3 text-sm text-gray-500">
                                                 {clienteSearchTerm ? "No hay perfiles que coincidan con la búsqueda" : "No hay perfiles disponibles"}
                                             </div>
                                         ) : (
                                             <div className="divide-y divide-gray-100">
                                                 {filteredPerfilesCliente.map((p) => {
                                                     const displayName = p.tipo_persona === 'Natural' 
                                                         ? `${p.razon_social_natural || 'N/A'} (${p.cedula_natural || 'N/A'})`
                                                         : `${p.razon_social_juridica || 'N/A'} (${p.ruc_juridica || 'N/A'})`;
                                                     const isSelected = formData.perfilClienteId === p.id.toString();
                                                     
                                                     return (
                                                         <div 
                                                             key={p.id} 
                                                             onClick={() => handleSelectChange('perfilClienteId', p.id.toString())}
                                                             className={`p-3 cursor-pointer text-sm hover:bg-gray-50 transition-colors ${
                                                                 isSelected ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-700'
                                                             }`}
                                                         >
                                                             <div className="flex items-center">
                                                                 <div className={`w-4 h-4 mr-2 rounded-full flex-shrink-0 ${
                                                                     isSelected ? 'bg-emerald-500' : 'border border-gray-300'
                                                                 }`}>
                                                                     {isSelected && (
                                                                         <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                                                                             <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor" />
                                                                         </svg>
                                                                     )}
                                                                 </div>
                                                                 {displayName}
                                                             </div>
                                                         </div>
                                                     );
                                                 })}
                                             </div>
                                         )}
                                     </div>
                                     <p className="text-xs text-gray-500">Solo se muestran perfiles que aún no tienen un usuario asignado.</p>
                                 </div>
                             </TabsContent>
                             
                             {/* Tab Operacional */} 
                             <TabsContent value="operacional" className="space-y-4 mt-4">
                                 <div className="space-y-2">
                                     <Label htmlFor="rolOperacional">Rol Operacional <span className="text-red-500">*</span></Label>
                                     <Select onValueChange={(value) => handleSelectChange('rolOperacional', value)} value={formData.rolOperacional} >
                                         <SelectTrigger id="rolOperacional">
                                             <SelectValue placeholder="Seleccionar rol..." />
                                         </SelectTrigger>
                                         <SelectContent>
                                             <SelectItem value="Jefe Operativo">Jefe Operativo</SelectItem>
                                             <SelectItem value="Administrador">Administrador</SelectItem>
                                             <SelectItem value="Directorio">Directorio</SelectItem>
                                         </SelectContent>
                                     </Select>
                                 </div>
                                 <div className="space-y-2">
                                     <Label>Asignar Proyectos (Opcional)</Label>
                                     
                                     {/* Reemplazar select multiple por checkboxes */}
                                     <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2">
                                         {allProyectos.length === 0 ? (
                                             <p className="text-sm text-gray-500">No hay proyectos disponibles</p>
                                         ) : (
                                             allProyectos.map((proyecto) => (
                                                 <div key={proyecto.id} className="flex items-center space-x-2">
                                                     <input
                                                         type="checkbox"
                                                         id={`proyecto-${proyecto.id}`}
                                                         checked={formData.proyectosAsignados.includes(proyecto.id)}
                                                         onChange={(e) => handleProyectoCheckbox(proyecto.id, e.target.checked)}
                                                         className="h-4 w-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                                                     />
                                                     <label 
                                                         htmlFor={`proyecto-${proyecto.id}`}
                                                         className="text-sm text-gray-700 cursor-pointer"
                                                     >
                                                         {proyecto.nombre}
                                                     </label>
                                                 </div>
                                             ))
                                         )}
                                     </div>
                                     <p className="text-xs text-gray-500">Selecciona los proyectos a los que tendrá acceso este usuario.</p>
                                 </div>
                             </TabsContent>
                         </div>
                     </Tabs>
                     
                     <DialogFooter className="mt-6">
                         <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} disabled={isProcessing}>Cancelar</Button>
                         <Button onClick={handleCreateUser} className="bg-[#008A4B] text-white hover:bg-[#006837]" disabled={isProcessing}>
                             {isProcessing ? <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" /> : null}
                             Crear Usuario
                         </Button>
                     </DialogFooter>
                 </DialogContent>
             </Dialog>

            {/* Modal de Confirmación de Eliminación */}
            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Confirmar Eliminación</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-gray-600">
                            ¿Estás seguro de que deseas eliminar el usuario <span className="font-semibold">{userToDelete?.email}</span>?
                        </p>
                        <p className="mt-2 text-sm text-red-600">
                            Esta acción no se puede deshacer y eliminará el acceso del usuario al sistema.
                        </p>
                        
                        {userToDelete?.perfil_cliente && (
                            <div className="mt-4 p-3 bg-amber-50 rounded-md border border-amber-200">
                                <p className="text-sm text-amber-800">
                                    <strong>Nota:</strong> El perfil de cliente asociado se desvinculará pero NO se eliminará.
                                </p>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteConfirmOpen(false)}
                            disabled={isDeleting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteUser}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {isDeleting ? <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" /> : <TrashIcon className="h-4 w-4 mr-2" />}
                            Eliminar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Estado */} 
             <StatusModal
                 open={statusModal.open}
                 onOpenChange={(open: boolean) => setStatusModal(prev => ({ ...prev, open }))}
                 title={statusModal.title}
                 message={statusModal.message}
                 type={statusModal.type}
             />
        </motion.div>
    );
}

// --- Componente Skeleton (Ejemplo básico) ---
// Idealmente, mover a _components/TableSkeleton.tsx
// const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
//      <div className="space-y-2">
//          {[...Array(rows)].map((_, i) => (
//              <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
//          ))}
//      </div>
// ); 