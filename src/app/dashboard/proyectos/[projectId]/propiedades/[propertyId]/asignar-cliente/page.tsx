"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "../../../../../../../components/ui/button"; // Ajustar ruta si es necesario
import { Input } from "../../../../../../_components/ui/input"; // Ajustar ruta si es necesario
import { ArrowLeftIcon, MagnifyingGlassIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import { createClient } from "../../../../../../../../lib/supabase/client"; // Ajustar ruta si es necesario

// --- Tipos (simplificados, expandir según sea necesario) ---
type ClientSearchResult = {
    id: number; // perfil_cliente.id
    nombre: string; // Razón social o nombre completo
    identificacion: string; // RUC o Cédula
    tipo: 'Natural' | 'Juridica';
    rol: string; // Asegurarse de que la RPC devuelve el rol
};

export default function AssignClientPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const supabase = createClient();

    const projectId = params.projectId as string;
    const propertyId = params.propertyId as string;
    const roleToAssign = searchParams.get("assignRole") as 'Propietario' | 'Ocupante' | null;

    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<ClientSearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isAssigning, setIsAssigning] = useState(false); // Para bloqueo de botones

    // --- Validación Inicial ---
    useEffect(() => {
        if (!roleToAssign) {
            setError("Rol a asignar no especificado en la URL (assignRole=Propietario o assignRole=Ocupante).");
            // Podrías redirigir o mostrar un error más permanente aquí
        } else if (roleToAssign !== 'Propietario' && roleToAssign !== 'Ocupante') {
            setError(`Rol a asignar inválido: ${roleToAssign}. Debe ser 'Propietario' u 'Ocupante'.`);
        }
        if (!propertyId) {
             setError("ID de propiedad no encontrado.");
        }
    }, [roleToAssign, propertyId]);

    // --- Funciones ---

    const handleSearch = useCallback(async () => {
        const trimmedQuery = searchQuery.trim();
        // No buscar si la query está vacía (opcional, la RPC lo maneja pero ahorra llamada)
        if (!trimmedQuery || !supabase) {
             setSearchResults([]); // Limpiar resultados si no hay query
             return;
        }
        setIsLoading(true);
        setError(null);
        setSearchResults([]);

        console.log(`Buscando clientes con query: "${trimmedQuery}" (filtrado frontend por rol: ${roleToAssign})`);

        try {
            // Llamar a la RPC simplificada (solo con search_term)
            const { data, error: rpcError } = await supabase.rpc('search_clientes', {
                search_term_in: trimmedQuery
                // Ya no pasamos required_role
            });

            if (rpcError) throw rpcError;

            console.log("Resultados RPC (sin filtrar por rol):", data);

            let finalResults: ClientSearchResult[] = [];

            if (data && data.length > 0) {
                // Mapear los datos devueltos (la RPC debe devolver 'rol')
                const mappedResults = data.map((item: any) => ({
                    id: item.id,
                    nombre: item.nombre || 'Nombre no disponible',
                    identificacion: item.identificacion || 'Identificación no disponible',
                    tipo: item.tipo === 'Natural' || item.tipo === 'Juridica' ? item.tipo : 'Natural',
                    rol: item.rol // Asegurarse de que la RPC devuelve el rol
                }));

                // --- Filtrado Frontend --- 
                if (roleToAssign === 'Propietario') {
                    finalResults = mappedResults.filter((client: ClientSearchResult) => client.rol === 'Propietario');
                } else if (roleToAssign === 'Ocupante') {
                    finalResults = mappedResults.filter((client: ClientSearchResult) => client.rol === 'Arrendatario' || client.rol === 'Externo');
                } else {
                    finalResults = mappedResults; // Si no hay rol especificado, mostrar todo (o manejar error)
                }

                console.log(`Resultados después de filtrar por rol '${roleToAssign}':`, finalResults);

            } else {
                 console.log("No se recibieron datos o el array está vacío desde la RPC.");
            }
            
            setSearchResults(finalResults); // Actualizar estado con resultados filtrados

        } catch (err: any) {
            console.error("Error buscando clientes:", err);
            setError(err.message || "Error al buscar clientes.");
        } finally {
            setIsLoading(false);
        }
    }, [searchQuery, supabase, roleToAssign]);

    const handleAssignClient = async (clientId: number) => {
         if (!propertyId || !roleToAssign || !supabase) {
             setError("Faltan datos para la asignación.");
             return;
         }
         setIsAssigning(true);
         setError(null);

         console.log(`Asignando cliente ${clientId} como ${roleToAssign} a la propiedad ${propertyId}`);

         try {
            // Determinar el campo a actualizar
            const fieldToUpdate = roleToAssign === 'Propietario' ? 'propietario_id' : 'ocupante_id';
            let updates: { [key: string]: any } = { [fieldToUpdate]: clientId };

            // Si asignamos Ocupante, aseguramos que ocupante_externo sea false
            // (Aunque el rol del cliente asignado debería definir esto visualmente)
            if (roleToAssign === 'Ocupante') {
                 updates.ocupante_externo = false;
            }

            // --- Paso 1: Asignar el rol principal ---
            const { error: updateError } = await supabase
                .from('propiedades')
                .update(updates)
                .eq('id', propertyId)
                .select('ocupante_id') // Seleccionar ocupante_id para el siguiente paso
                .single(); // Usar single() si esperamos una sola fila actualizada

            if (updateError) throw updateError;

            console.log(`Asignación principal de ${roleToAssign} exitosa.`);

            // --- Paso 2: Si se asignó Propietario, verificar y asignar Ocupante si está vacío ---
            if (roleToAssign === 'Propietario') {
                // Necesitamos obtener el estado MÁS RECIENTE de ocupante_id *después* de la actualización anterior.
                // La data devuelta por .update().select() podría no ser la más fresca en todos los casos,
                // así que una re-consulta es más segura.
                 console.log("Verificando si se debe auto-asignar como ocupante...");
                 const { data: currentProperty, error: fetchError } = await supabase
                     .from('propiedades')
                    .select('ocupante_id')
                    .eq('id', propertyId)
                    .maybeSingle(); // Usar maybeSingle para manejar si la propiedad no se encuentra (poco probable aquí)

                 if (fetchError) {
                     console.warn("Advertencia: No se pudo verificar el ocupante actual después de asignar propietario:", fetchError.message);
                     // Continuar con la redirección, la asignación principal funcionó.
                 } else if (currentProperty && currentProperty.ocupante_id === null) {
                    console.log(`Propiedad ${propertyId} no tiene ocupante. Asignando propietario ${clientId} como ocupante...`);
                    const { error: occupantUpdateError } = await supabase
                        .from('propiedades')
                        .update({ ocupante_id: clientId })
                        .eq('id', propertyId);

                    if (occupantUpdateError) {
                         console.warn(`Advertencia: Propietario asignado, pero falló la auto-asignación como ocupante:`, occupantUpdateError.message);
                         // Continuar, pero quizás mostrar un mensaje sutil.
                     } else {
                         console.log("Auto-asignación como ocupante exitosa.");
                     }
                } else {
                    console.log("La propiedad ya tiene un ocupante o no se pudo verificar. No se auto-asignará.");
                }
            }

             // --- Paso 3: Redirección ---
             console.log("Redirigiendo a la página de la propiedad...");
             router.push(`/dashboard/proyectos/${projectId}/propiedades/${propertyId}`);
            // Opcional: mostrar un mensaje de éxito antes de redirigir

         } catch (err: any) {
             console.error("Error asignando cliente:", err);
             setError(err.message || "Error al asignar el cliente.");
             setIsAssigning(false); // Re-habilitar botón en caso de error
         }
         // No ponemos setIsAssigning(false) en caso de éxito porque redirigimos
     };

     const handleCreateNewClient = () => {
         // Asegurarse de pasar el roleToAssign correcto a la página de creación
         const creationUrl = `/dashboard/clientes/crear?assignToProperty=${propertyId}&assignRole=${roleToAssign}&redirectTo=/dashboard/proyectos/${projectId}/propiedades/${propertyId}`;
         console.log("Navegando a crear nuevo cliente:", creationUrl);
         router.push(creationUrl);
      };


    // --- Render ---
    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6">
             {/* Header */}
             <div className="flex items-center justify-between">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeftIcon className="h-5 w-5" />
                </Button>
                 <h1 className="text-xl md:text-2xl font-semibold">
                     Asignar {roleToAssign === 'Ocupante' ? 'Ocupante (Arrendatario/Externo)' : (roleToAssign || 'Cliente')} a Propiedad {propertyId}
                 </h1>
                 <div className="w-8"></div> {/* Spacer */}
             </div>

            {error && (
                <div className="p-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
                    <span className="font-medium">Error:</span> {error}
                 </div>
            )}

             {/* Search Section */}
             <div className="bg-white rounded-xl border p-4 md:p-6 shadow-sm">
                <h2 className="text-lg font-medium mb-3">Buscar Cliente Existente</h2>
                 <div className="flex gap-2">
                     <Input
                        type="text"
                        placeholder="Buscar por RUC, Cédula o Nombre/Razón Social..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="flex-grow"
                        disabled={isLoading || isAssigning}
                    />
                     <Button onClick={handleSearch} disabled={!searchQuery.trim() || isLoading || isAssigning}>
                         <MagnifyingGlassIcon className="h-5 w-5 mr-1" />
                         Buscar
                    </Button>
                 </div>
             </div>

             {/* Search Results */}
             <div className="bg-white rounded-xl border p-4 md:p-6 shadow-sm min-h-[200px]">
                 <h2 className="text-lg font-medium mb-3">Resultados</h2>
                 {isLoading ? (
                     <div className="flex justify-center items-center h-20">
                         <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
                     </div>
                 ) : searchResults.length > 0 ? (
                     <ul className="space-y-2">
                        {searchResults.map((client) => (
                            <li key={client.id} className="flex justify-between items-center p-3 border rounded-md hover:bg-gray-50">
                                <div className="flex-grow mr-4 overflow-hidden">
                                    <p className="font-medium truncate" title={client.nombre}>{client.nombre}</p>
                                    <p className="text-sm text-gray-500">{client.tipo} - {client.identificacion}</p>
                                 </div>
                                <Button
                                    size="sm"
                                    onClick={() => handleAssignClient(client.id)}
                                    disabled={isAssigning}
                                    variant="default" // o "secondary"
                                    className="bg-[#007F44] hover:bg-[#007F44]/80"
                                >
                                    {isAssigning ? "Asignando..." : "Asignar"}
                                 </Button>
                             </li>
                         ))}
                     </ul>
                 ) : (
                     <p className="text-sm text-gray-500 text-center py-4">
                         {searchQuery.trim() ? `No se encontraron clientes ${roleToAssign === 'Ocupante' ? 'de tipo Arrendatario o Externo' : 'de tipo Propietario'}.` : "Ingrese un término de búsqueda."}
                     </p>
                 )}
             </div>

             {/* Create New Client */}
             <div className="text-center pt-4">
                 <p className="text-sm text-gray-600 mb-2">¿No encuentras al cliente?</p>
                 <Button variant="outline" onClick={handleCreateNewClient} disabled={isLoading || isAssigning}>
                     <UserPlusIcon className="h-5 w-5 mr-2" />
                    Crear Nuevo {roleToAssign === 'Ocupante' ? 'Ocupante' : 'Propietario'} y Asignar
                 </Button>
             </div>
        </div>
    );
} 