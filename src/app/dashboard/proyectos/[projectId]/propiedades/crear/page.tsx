"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "../../../../../_components/ui/button"; // Ajustar ruta si es necesario
import {
    ArrowLeftIcon,
    ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../../../../_lib/auth/AuthContext"; // Ajustar ruta si es necesario
import { createClient } from '../../../../../../../lib/supabase/client'; // Ajustar ruta si es necesario
import { PropertyForm, PropertyFormData, PendingUploadsState } from "@/app/dashboard/_components/PropertyForm"; // Importar PendingUploadsState

// Tipo para datos del proyecto (tasas)
type ProjectData = {
    tasa_base_fondo_inicial: number | null;
    tasa_base_alicuota_ordinaria: number | null;
};

export default function CreatePropertyPage() {
    const params = useParams();
    const router = useRouter();
    const { user, role, isLoading: authLoading } = useAuth();
    const supabase = createClient();

    const [projectData, setProjectData] = useState<ProjectData | null>(null);
    const [loading, setLoading] = useState(true); // Para cargar datos del proyecto
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const projectId = params.projectId as string;

    const isAdmin = role === 'Administrador';
    const isDirectorio = role === 'Directorio'; // O cualquier rol que pueda crear

    // --- Fetch Project Data (Rates) ---
    const fetchProjectData = useCallback(async () => {
        if (!projectId || !supabase || authLoading) return;
        // Añadir validación de rol si solo ciertos roles pueden crear
        if (!isAdmin && !isDirectorio) {
             setError("No tienes permiso para crear propiedades en este proyecto.");
             setLoading(false);
             return;
        }

        setLoading(true);
        setError(null);
        try {
            const { data: projData, error: projError } = await supabase
                 .from('proyectos')
                 .select('tasa_base_fondo_inicial, tasa_base_alicuota_ordinaria')
                 .eq('id', projectId)
                 .maybeSingle();

            if (projError) throw projError;

            if (!projData) {
                setError("Proyecto no encontrado o no se pudieron cargar las tasas.");
                setProjectData(null); // Asegurar que sea null si no se encuentra
            } else {
                setProjectData({
                    tasa_base_fondo_inicial: projData.tasa_base_fondo_inicial,
                    tasa_base_alicuota_ordinaria: projData.tasa_base_alicuota_ordinaria,
                });
            }

        } catch (err: any) {
            console.error("Error fetching project data:", err);
            setError(err.message || "Error al cargar datos del proyecto.");
            setProjectData(null);
        } finally {
            setLoading(false);
        }
    }, [projectId, supabase, authLoading, isAdmin, isDirectorio]);

    useEffect(() => {
        if (!authLoading) {
            fetchProjectData();
        }
    }, [authLoading, fetchProjectData]);

    // --- Form Submission Handler (for Creation) ---
    const handleSubmit = async (formDataPayload: any, pendingUploads: PendingUploadsState) => {
         if (!isAdmin && !isDirectorio) return;

        setSaving(true);
        setError(null);

        try {
            // Añadir projectId al payload
            const createPayload = {
                ...formDataPayload,
                proyecto_id: parseInt(projectId, 10), // Asegurar que projectId sea número
                // Podríamos añadir estado_uso default aquí si es necesario, ej: 'disponible'
                estado_uso: 'disponible'
            };

            console.log("Creating property with payload:", createPayload);
            console.log("Pending uploads:", pendingUploads);

            // --- LLAMADA A LA NUEVA API ROUTE ---
            const response = await fetch('/api/propiedades', { // Usaremos /api/propiedades (o la ruta que definamos)
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    propertyData: createPayload,
                    pendingUploads: pendingUploads
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Error al crear la propiedad: ${response.statusText}`);
            }

            const { newProperty } = await response.json(); // Asumiendo que la API devuelve la propiedad creada
            console.log("Property created successfully:", newProperty);
            // --- FIN LLAMADA API ---

            setSaving(false);
            // Redirigir a la página del proyecto o a la nueva propiedad
            router.push(`/dashboard/proyectos/${projectId}`);
            // Podríamos redirigir a la nueva propiedad si la API devuelve el ID:
            // router.push(`/dashboard/proyectos/${projectId}/propiedades/${newProperty.id}`);
            router.refresh(); // Importante para actualizar la lista en la página del proyecto

        } catch (err: any) {
            console.error("Error creating property:", err);
            setError(err.message || "Error al crear la propiedad.");
            setSaving(false);
        }
    };

    // --- Handle Cancel Action ---
    const handleCancel = () => {
        router.back(); // Volver a la página anterior (probablemente la del proyecto)
    };

    // --- Render Logic ---
    if (loading || authLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    // Mostrar error si no se pudo cargar la data del proyecto necesaria
    if (error && !projectData) {
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

    // Renderizar el formulario
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
                <h1 className="text-2xl font-semibold">Crear Nueva Propiedad</h1>
                {/* Podríamos mostrar el nombre del proyecto aquí si lo cargamos */}
            </div>

            {/* Renderizar el formulario reutilizable en modo 'create' */}
            {/* Asegurarse de que projectData no sea null antes de renderizar */}
            {projectData ? (
                <PropertyForm
                    initialData={{}} // Datos iniciales vacíos para creación
                    projectData={projectData}
                    onSubmit={handleSubmit}
                    onCancel={handleCancel}
                    isSaving={saving}
                    mode="create"
                />
            ) : (
                 // Estado por si acaso projectData es null después de cargar (aunque el error debería atraparlo)
                 <div className="text-center text-gray-500">Cargando configuración del proyecto...</div>
            )}

             {/* Mostrar error de guardado debajo del formulario si ocurre */}
             {error && !loading && (
                 <div className="mt-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
                     <span className="font-medium">Error al guardar:</span> {error}
                 </div>
             )}
        </motion.div>
    );
} 