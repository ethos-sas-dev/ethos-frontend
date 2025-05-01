"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../../../../lib/supabase/client"; // Ajusta la ruta según tu estructura
import { ClientForm } from "../../../_components/ClientForm"; // Ajusta la ruta
import type { ClientFormData, PendingUploadsState } from "../../../_components/ClientForm"; // Ajusta la ruta
import { Skeleton } from "../../../../_components/ui/skeleton"; // Para loading state
import { ArrowLeftIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

// --- Loading Component (Simple Example) ---
const LoadingSkeleton = () => (
    <div className="space-y-6 p-6 bg-white rounded-lg border shadow-sm">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-6 w-1/3" />
        <div className="space-y-4 border p-4 rounded-md">
            <Skeleton className="h-4 w-1/4" />
            <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        </div>
         <div className="space-y-4 border p-4 rounded-md">
             <Skeleton className="h-4 w-1/4" />
             <div className="grid grid-cols-3 gap-4">
                 <Skeleton className="h-10 w-full" />
                 <Skeleton className="h-10 w-full" />
                 <Skeleton className="h-10 w-full" />
             </div>
         </div>
        <div className="flex justify-end gap-3 pt-5 border-t">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
        </div>
    </div>
);


export default function EditClientPage() {
    const router = useRouter();
    const params = useParams();
    const clientId = params.clientId as string;
    const supabase = createClient();

    const [clientData, setClientData] = useState<Partial<ClientFormData> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!clientId) {
            setError("No se proporcionó un ID de cliente.");
            setIsLoading(false);
            return;
        }

        const fetchClientData = async () => {
            setIsLoading(true);
            setError(null);

            try {
                // NO necesitamos el tipo ArchivoInfo aquí por ahora
                // type ArchivoInfo = { id: number; filename: string | null; external_url: string | null };

                console.log(`Fetching client data for ID: ${clientId}`);
                const { data: clientProfileData, error: dbError } = await supabase
                    .from('perfiles_cliente')
                    .select(`
                        id,
                        tipo_persona,
                        rol,
                        contacto_gerente,
                        contacto_administrativo,
                        contacto_proveedores,
                        contacto_accesos,
                        persona_natural_id,
                        persona_juridica_id
                    `)
                    .eq('id', clientId)
                    .maybeSingle();

                if (dbError) {
                    console.error("Error fetching perfiles_cliente:", dbError);
                    throw new Error(`Error al cargar perfil cliente: ${dbError.message}`);
                }

                if (!clientProfileData) {
                    setError("Cliente no encontrado.");
                    setIsLoading(false);
                    return; // Salir si no se encontró el perfil base
                }

                console.log("Fetched client profile data:", clientProfileData);

                let fullData: any = { ...clientProfileData };
                let personaNaturalData = null;
                let personaJuridicaData = null;
                let fileIdsToFetch: number[] = [];

                // Fetch Persona Natural si existe ID
                if (clientProfileData.persona_natural_id) {
                    const { data: pnData, error: pnError } = await supabase
                        .from('personas_natural')
                        .select('*')
                        .eq('id', clientProfileData.persona_natural_id)
                        .single();
                    if (pnError) {
                        console.error("Error fetching personas_natural:", pnError);
                        throw new Error(`Error al cargar datos persona natural: ${pnError.message}`);
                    }
                    console.log("Fetched personas_natural data:", pnData);
                    personaNaturalData = pnData;
                    if (pnData?.ruc_pdf_id) fileIdsToFetch.push(pnData.ruc_pdf_id);
                    if (pnData?.cedula_pdf_id) fileIdsToFetch.push(pnData.cedula_pdf_id);
                }

                // Fetch Persona Juridica y Empresa Representada si existe ID
                if (clientProfileData.persona_juridica_id) {
                    const { data: pjData, error: pjError } = await supabase
                        .from('personas_juridica')
                        .select('*, empresa_representante_legal:empresa_representante_legal_id (*)') // Anidar empresa rep.
                        .eq('id', clientProfileData.persona_juridica_id)
                        .single();

                    if (pjError) {
                        console.error("Error fetching personas_juridica:", pjError);
                        throw new Error(`Error al cargar datos persona jurídica: ${pjError.message}`);
                    }
                    console.log("Fetched personas_juridica data (with nested empresa_representante_legal):", pjData);
                    personaJuridicaData = pjData;

                    // Recolectar IDs de archivos de persona_juridica
                    if (pjData?.ruc_pdf_id) fileIdsToFetch.push(pjData.ruc_pdf_id);
                    if (pjData?.cedula_representante_legal_pdf_id) fileIdsToFetch.push(pjData.cedula_representante_legal_pdf_id);
                    if (pjData?.nombramiento_representante_legal_pdf_id) fileIdsToFetch.push(pjData.nombramiento_representante_legal_pdf_id);

                    // Recolectar IDs de archivos de empresa_representante_legal (si existe)
                    const empresaRep = pjData?.empresa_representante_legal as any;
                    if (empresaRep) {
                        if (empresaRep.ruc_empresa_pdf_id) fileIdsToFetch.push(empresaRep.ruc_empresa_pdf_id);
                        if (empresaRep.autorizacion_representacion_pdf_id) fileIdsToFetch.push(empresaRep.autorizacion_representacion_pdf_id);
                        if (empresaRep.cedula_representante_legal_pdf_id) fileIdsToFetch.push(empresaRep.cedula_representante_legal_pdf_id);
                    }
                }

                // ---> Fetch Secundario: Obtener detalles de archivos
                let archivosDataMap: Record<number, { filename: string | null; external_url: string | null }> = {};
                if (fileIdsToFetch.length > 0) {
                    // Eliminar duplicados por si acaso
                    const uniqueFileIds = [...new Set(fileIdsToFetch)];
                    console.log("Fetching file details for IDs:", uniqueFileIds);
                    const { data: archivos, error: archivosError } = await supabase
                        .from('archivos')
                        .select('id, filename, external_url')
                        .in('id', uniqueFileIds);

                    if (archivosError) {
                        console.error("Error fetching archivos:", archivosError);
                        // Podríamos decidir continuar sin los detalles del archivo o lanzar un error
                        setError(`Advertencia: No se pudieron cargar los detalles de los archivos adjuntos (${archivosError.message})`);
                    } else if (archivos) {
                        console.log("Fetched archivos details:", archivos);
                        archivos.forEach(archivo => {
                            archivosDataMap[archivo.id] = { filename: archivo.filename, external_url: archivo.external_url };
                        });
                    }
                }

                // ---> Combinar y Formatear Datos Finales
                const formatWithArchivos = (data: any, idMap: Record<string, string>) => {
                    if (!data) return null;
                    const formatted: any = { ...data };
                    for (const key in idMap) {
                        const fileId = data[idMap[key]];
                        if (fileId && archivosDataMap[fileId]) {
                            formatted[key] = archivosDataMap[fileId]; // Reemplaza ID con objeto {filename, url}
                        } else {
                            formatted[key] = null; // Asegura que sea null si no hay archivo o no se encontró
                        }
                        // delete formatted[idMap[key]]; // Opcional: eliminar la clave _id original
                    }
                    return formatted;
                };

                const finalPersonaNatural = formatWithArchivos(personaNaturalData, {
                    'ruc_pdf': 'ruc_pdf_id',
                    'cedula_pdf': 'cedula_pdf_id'
                });

                const finalEmpresaRep = formatWithArchivos(personaJuridicaData?.empresa_representante_legal, {
                    'ruc_empresa_pdf': 'ruc_empresa_pdf_id',
                    'autorizacion_representacion_pdf': 'autorizacion_representacion_pdf_id',
                    'cedula_representante_legal_pdf': 'cedula_representante_legal_pdf_id'
                });

                const finalPersonaJuridica = formatWithArchivos(personaJuridicaData, {
                    'ruc_pdf': 'ruc_pdf_id',
                    'cedula_representante_legal_pdf': 'cedula_representante_legal_pdf_id',
                    'nombramiento_representante_legal_pdf': 'nombramiento_representante_legal_pdf_id'
                });
                // Reasignar la empresa representante formateada si existe
                if (finalPersonaJuridica && finalEmpresaRep) {
                   finalPersonaJuridica.empresa_representante_legal = finalEmpresaRep;
                }


                const finalClientData: Partial<ClientFormData> = {
                    ...clientProfileData,
                    persona_natural: finalPersonaNatural,
                    persona_juridica: finalPersonaJuridica,
                };


                console.log("Final data structure for ClientForm:", finalClientData);
                setClientData(finalClientData);

            } catch (err: any) {
                console.error("Error fetching client data:", err);
                setError(`Error al cargar los datos del cliente: ${err.message}`);
                setClientData(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchClientData();
    }, [clientId, supabase]);

    const handleSubmit = async (formData: ClientFormData, pendingUploads: PendingUploadsState) => {
        setIsSaving(true);
        setError(null);
        console.log("[EditClientPage] Submitting to API:", { formData, pendingUploads });

        try {
            const response = await fetch(`/api/update-client/${clientId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ formData, pendingUploads }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || `API Error: ${response.statusText}`);
            }

            console.log("[EditClientPage] API update successful:", result);
            // Navegar de vuelta a la lista o mostrar mensaje
            router.push("/dashboard/clientes?success=true"); // Añadir query param para posible mensaje
            // Opcional: Forzar refresh si es necesario, aunque idealmente el router maneja la cache
            // router.refresh(); 

        } catch (err: any) {
            console.error("[EditClientPage] Error submitting client update:", err);
            setError(`Error al guardar los cambios: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        router.back(); // Navegar a la página anterior
    };

    // --- Renderizado ---

    if (isLoading) {
        return <LoadingSkeleton />;
    }

    if (error && !clientData) { // Mostrar error solo si no hay datos para mostrar
        return (
            <div className="w-full p-6 text-center text-red-600 bg-red-50 rounded-lg border border-red-200">
                <ExclamationTriangleIcon className="w-12 h-12 mx-auto text-red-400 mb-3" />
                <h2 className="text-xl font-semibold mb-2">Error</h2>
                <p>{error}</p>
                <Link href="/dashboard/clientes" className="mt-4 inline-flex items-center gap-1 text-emerald-600 hover:underline">
                     <ArrowLeftIcon className="w-4 h-4"/>
                     Volver a Clientes
                 </Link>
            </div>
        );
    }

    if (!clientData) {
         // Podría ser un estado intermedio o si el fetch inicial no encontró nada
         return (
             <div className="w-full p-6 text-center text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                 <ExclamationTriangleIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                 <h2 className="text-xl font-semibold mb-2">Cliente no encontrado</h2>
                 <p>No pudimos encontrar los datos para el cliente solicitado.</p>
                 <Link href="/dashboard/clientes" className="mt-4 inline-flex items-center gap-1 text-emerald-600 hover:underline">
                     <ArrowLeftIcon className="w-4 h-4"/>
                     Volver a Clientes
                 </Link>
             </div>
         );
     }


    return (
        <div className="space-y-6">
            <Link href="/dashboard/clientes" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4">
                 <ArrowLeftIcon className="w-4 h-4" />
                 Volver a la lista de clientes
             </Link>
            <h1 className="text-2xl font-semibold text-gray-800">Editar Cliente</h1>
             {error && ( // Mostrar error encima del formulario si ocurre al guardar
                <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
                    <span className="font-medium">Error al guardar:</span> {error}
                </div>
            )}
            <ClientForm
                initialData={clientData}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                isSaving={isSaving}
                mode="edit"
                // Puedes pasar 'allowedRoles' si necesitas restringir aquí también
            />
        </div>
    );
} 