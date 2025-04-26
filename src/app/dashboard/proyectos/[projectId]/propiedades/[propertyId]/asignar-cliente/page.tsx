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
};

export default function AssignClientPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const supabase = createClient();

    const projectId = params.projectId as string;
    const propertyId = params.propertyId as string;
    const roleToAssign = searchParams.get("role") as 'Propietario' | 'Arrendatario' | null; // 'Propietario' or 'Arrendatario'

    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<ClientSearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isAssigning, setIsAssigning] = useState(false); // Para bloqueo de botones

    // --- Validación Inicial ---
    useEffect(() => {
        if (!roleToAssign) {
            setError("Rol a asignar no especificado en la URL.");
            // Podrías redirigir o mostrar un error más permanente aquí
        }
        if (!propertyId) {
             setError("ID de propiedad no encontrado.");
        }
    }, [roleToAssign, propertyId]);

    // --- Funciones ---

    const handleSearch = useCallback(async () => {
        if (!searchQuery.trim() || !supabase) return;
        setIsLoading(true);
        setError(null);
        setSearchResults([]);

        console.log(`Buscando clientes con query: "${searchQuery}"`);

        try {
            // TODO: Implementar lógica de búsqueda en Supabase
            // Buscar en perfiles_cliente uniéndose a personas_natural y personas_juridica
            // por RUC, Cédula o Razón Social / Nombre Comercial
            // Ejemplo MUY simplificado (necesita RPC o query más compleja):
            const { data, error: dbError } = await supabase
                .from('perfiles_cliente')
                .select(`
                    id,
                    tipo_persona,
                    persona_natural:personas_natural!inner(razon_social, cedula, ruc),
                    persona_juridica:personas_juridica!inner(razon_social, ruc)
                 `)
                // .or(`persona_natural.razon_social.ilike.%${searchQuery}%, persona_natural.cedula.eq.${searchQuery}, persona_natural.ruc.eq.${searchQuery}, persona_juridica.razon_social.ilike.%${searchQuery}%, persona_juridica.ruc.eq.${searchQuery}`) // Esto es conceptual, requiere ajuste
                .limit(10); // Limitar resultados

            if (dbError) throw dbError;

            // TODO: Mapear 'data' al tipo ClientSearchResult
            console.log("Resultados crudos:", data);
             setSearchResults([]); // Reemplazar con datos mapeados


        } catch (err: any) {
            console.error("Error buscando clientes:", err);
            setError(err.message || "Error al buscar clientes.");
        } finally {
            setIsLoading(false);
        }
    }, [searchQuery, supabase]);

    const handleAssignClient = async (clientId: number) => {
         if (!propertyId || !roleToAssign || !supabase) {
             setError("Faltan datos para la asignación.");
             return;
         }
         setIsAssigning(true);
         setError(null);

         console.log(`Asignando cliente ${clientId} como ${roleToAssign} a la propiedad ${propertyId}`);

         try {
            // Determinar el campo a actualizar en la tabla 'propiedades'
            const fieldToUpdate = roleToAssign === 'Propietario' ? 'propietario_id' : 'ocupante_id';

            const { error: updateError } = await supabase
                .from('propiedades')
                .update({ [fieldToUpdate]: clientId })
                .eq('id', propertyId);

            if (updateError) throw updateError;

            console.log("Asignación exitosa.");
            // Redirigir de vuelta a la página de detalles de la propiedad
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
         // Navegar a una página de creación, pasando el contexto
         // Idealmente, la página de creación devolverá el ID del nuevo cliente
         // o esta página necesitará re-consultar después de la creación.
         // Por ahora, solo navegamos.
         // Necesitaremos pasar propertyId y roleToAssign para que el formulario sepa
         // que debe asignar automáticamente después de crear.
          router.push(`/dashboard/clientes/crear?assignToProperty=${propertyId}&assignRole=${roleToAssign}&redirectTo=/dashboard/proyectos/${projectId}/propiedades/${propertyId}`);
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
                     Asignar {roleToAssign || 'Cliente'} a Propiedad {propertyId}
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
                                <div>
                                    <p className="font-medium">{client.nombre}</p>
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
                         {searchQuery.trim() ? "No se encontraron clientes." : "Ingrese un término de búsqueda."}
                     </p>
                 )}
             </div>

             {/* Create New Client */}
             <div className="text-center pt-4">
                 <p className="text-sm text-gray-600 mb-2">¿No encuentras al cliente?</p>
                 <Button variant="outline" onClick={handleCreateNewClient} disabled={isLoading || isAssigning}>
                     <UserPlusIcon className="h-5 w-5 mr-2" />
                    Crear Cliente Nuevo y Asignar
                 </Button>
             </div>
        </div>
    );
} 