"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "../../../../../../_components/ui/button";
import {
    ArrowLeftIcon,
    ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../../../../../_lib/auth/AuthContext";
import { createClient } from '../../../../../../../../lib/supabase/client';
import Link from "next/link";
import { PropertyForm, PropertyFormData, PendingUploadsState } from "../../../../../_components/PropertyForm";

// Tipos locales simplificados
type ProjectData = {
    tasa_base_fondo_inicial: number | null;
    tasa_base_alicuota_ordinaria: number | null;
};

export default function EditPropertyPage() {
    const params = useParams();
    const router = useRouter();
    const { user, role, isLoading: authLoading } = useAuth();
    const supabase = createClient();

    // Estado para los datos originales y tasas del proyecto
    const [propertyData, setPropertyData] = useState<any | null>(null); // Para pasar como initialData
    const [projectData, setProjectData] = useState<ProjectData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const projectId = params.projectId as string;
    const propertyId = params.propertyId as string;

    const isAdmin = role === 'Administrador';
    const isDirectorio = role === 'Directorio';

    // --- Data Fetching (Simplificado) ---
    const fetchPropertyData = useCallback(async () => {
        if (!propertyId || !projectId || !supabase || authLoading) return;
        if (!isAdmin && !isDirectorio) {
            setError("No tienes permiso para editar esta propiedad.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            // Fetch property details con los documentos
            const { data: propDataResult, error: propError } = await supabase
                .from('propiedades')
                .select(`
                    id, proyecto_id, codigo_catastral, estado_entrega, estado_uso,
                    area_total, identificadores, estado_de_construccion, actividad,
                    monto_fondo_inicial, monto_alicuota_ordinaria,
                    areas_desglosadas, pagos, encargado_pago,
                    escritura_pdf_id, acta_entrega_pdf_id, contrato_arrendamiento_pdf_id
                `)
                .eq('id', propertyId)
                .maybeSingle();

            if (propError) throw propError;

            if (!propDataResult) {
                setError("Propiedad no encontrada.");
                setLoading(false);
                return;
            }

            // Crear una copia modificable de los datos de la propiedad
            let propertyDataWithDocs: any = { ...propDataResult };

            // Si hay referencias a documentos, cargarlos
            const docIds = [
                propertyDataWithDocs.escritura_pdf_id,
                propertyDataWithDocs.acta_entrega_pdf_id,
                propertyDataWithDocs.contrato_arrendamiento_pdf_id
            ].filter(id => id !== null);

            if (docIds.length > 0) {
                console.log("Cargando documentos con IDs:", docIds);
                const { data: documentos, error: docError } = await supabase
                    .from('archivos')
                    .select('id, filename, external_url')
                    .in('id', docIds);

                if (docError) {
                    console.error("Error al cargar documentos:", docError);
                } else if (documentos && documentos.length > 0) {
                    // Adjuntar la información del documento a los datos de la propiedad
                    const docsMap: Record<number, any> = documentos.reduce((acc: Record<number, any>, doc: any) => {
                        acc[doc.id] = doc;
                        return acc;
                    }, {});

                    // Crear referencias a los documentos en la estructura que espera PropertyForm
                    if (propertyDataWithDocs.escritura_pdf_id && docsMap[propertyDataWithDocs.escritura_pdf_id]) {
                        propertyDataWithDocs.escritura_pdf = docsMap[propertyDataWithDocs.escritura_pdf_id];
                    }
                    if (propertyDataWithDocs.acta_entrega_pdf_id && docsMap[propertyDataWithDocs.acta_entrega_pdf_id]) {
                        propertyDataWithDocs.acta_entrega_pdf = docsMap[propertyDataWithDocs.acta_entrega_pdf_id];
                    }
                    if (propertyDataWithDocs.contrato_arrendamiento_pdf_id && docsMap[propertyDataWithDocs.contrato_arrendamiento_pdf_id]) {
                        propertyDataWithDocs.contrato_arrendamiento_pdf = docsMap[propertyDataWithDocs.contrato_arrendamiento_pdf_id];
                    }
                }
            }

            // Fetch project details for rates
            const { data: projData, error: projError } = await supabase
                 .from('proyectos')
                 .select('tasa_base_fondo_inicial, tasa_base_alicuota_ordinaria')
                 .eq('id', propertyDataWithDocs.proyecto_id)
                 .maybeSingle();

            if (projError) throw projError;

            setProjectData({
                tasa_base_fondo_inicial: projData?.tasa_base_fondo_inicial,
                tasa_base_alicuota_ordinaria: projData?.tasa_base_alicuota_ordinaria,
            });

            console.log("Datos de propiedad cargados con documentos:", propertyDataWithDocs);
            setPropertyData(propertyDataWithDocs); // Guardar los datos con documentos

        } catch (err: any) {
            console.error("Error fetching data:", err);
            setError(err.message || "Error al cargar los datos.");
        } finally {
            setLoading(false);
        }
    }, [propertyId, projectId, supabase, authLoading, isAdmin, isDirectorio]);

    useEffect(() => {
        if (!authLoading) {
            fetchPropertyData();
        }
    }, [authLoading, fetchPropertyData]);

    // --- Form Submission Handler (Simplificado) ---
    // Recibe los datos ya procesados del PropertyForm
    const handleSubmit = async (formDataPayload: any, pendingUploads: PendingUploadsState) => {
        if (!isAdmin && !isDirectorio) return;
        if (!propertyData) return; // Ensure original data is loaded

        setSaving(true);
        setError(null);

        try {
            console.log("Updating property with payload:", formDataPayload);
            console.log("Pending uploads:", pendingUploads);

            // Si hay subidas pendientes, usamos la API para procesarlas junto con la actualización
            if (Object.keys(pendingUploads).length > 0) {
                // Usar API para manejar tanto la actualización como las subidas pendientes
                const response = await fetch('/api/propiedades/editar', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        propertyId,
                        propertyData: {
                            ...formDataPayload,
                            updated_at: new Date().toISOString(),
                        },
                        pendingUploads
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || `Error al actualizar la propiedad: ${response.statusText}`);
                }

                const { updatedProperty } = await response.json();
                console.log("Property updated successfully with documents:", updatedProperty);
            } else {
                // Si no hay archivos pendientes, hacemos la actualización directa con Supabase
                const { error: updateError } = await supabase
                    .from('propiedades')
                    .update({
                        ...formDataPayload,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', propertyId);

                if (updateError) throw updateError;
                console.log("Property updated successfully");
            }

            setSaving(false);
            // Redirigir a la página de detalles después de guardar
            router.push(`/dashboard/proyectos/${projectId}/propiedades/${propertyId}`);
            router.refresh(); // Refrescar datos en la página anterior

        } catch (err: any) {
            console.error("Error updating property:", err);
            setError(err.message || "Error al guardar los cambios.");
            setSaving(false);
        }
    };

    // --- Handle Cancel Action ---
    const handleCancel = () => {
        router.back(); // O redirigir a la página de detalles
        // router.push(`/dashboard/proyectos/${projectId}/propiedades/${propertyId}`);
    };

    // --- Render Logic ---
    if (loading || authLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto p-4 text-center text-red-600">
                <ExclamationTriangleIcon className="h-12 w-12 mx-auto text-red-400 mb-4" />
                <h2 className="text-xl font-semibold mb-2">Error</h2>
                <p>{error}</p>
                <Button variant="outline" onClick={handleCancel} className="mt-4">
                    Volver
                </Button>
            </div>
        );
    }

    // Renderizar el componente PropertyForm si hay datos
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="container mx-auto p-4 md:p-6"
        >
            <div className="flex items-center mb-6">
                <Button variant="outline" size="icon" onClick={handleCancel} className="mr-4">
                    <ArrowLeftIcon className="h-5 w-5" />
                </Button>
                <h1 className="text-2xl font-semibold">Editar Propiedad</h1>
                {/* Mostrar identificador si existe en los datos originales */}
                {propertyData?.identificadores?.inferior && (
                     <span className="ml-2 text-gray-500">
                         ({propertyData.identificadores.inferior} {propertyData.identificadores.idInferior})
                     </span>
                )}
            </div>

            {/* Renderizar el formulario reutilizable */}
            {propertyData && projectData ? (
                <PropertyForm
                    initialData={propertyData} // Pasar datos originales
                    projectData={projectData}
                    onSubmit={handleSubmit} // Pasar el handler simplificado
                    onCancel={handleCancel}
                    isSaving={saving}
                    mode="edit"
                />
            ) : (
                // Podría mostrar un mensaje o estado intermedio si algo falla
                // al cargar propertyData o projectData después del loading inicial
                <div className="text-center text-gray-500">Cargando datos del formulario...</div>
            )}
        </motion.div>
    );
}