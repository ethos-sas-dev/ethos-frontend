"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ProjectForm, type ProjectFormData } from "../../../../_components/ProjectForm";
import { createClient } from "../../../../../../lib/supabase/client";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

type PendingUpload = {
    name: string;
    url: string;
    key: string;
};

export default function EditProjectPage() {
    const router = useRouter();
    const params = useParams();
    const projectId = params.projectId as string;
    
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [projectData, setProjectData] = useState<Partial<ProjectFormData>>({});
    
    const supabase = createClient();

    // Cargar datos del proyecto
    useEffect(() => {
        const fetchProjectData = async () => {
            setIsLoading(true);
            setError(null);
            
            try {
                // Obtener datos del proyecto
                const { data: project, error: projectError } = await supabase
                    .from('proyectos')
                    .select(`
                        id,
                        nombre,
                        descripcion,
                        ubicacion,
                        tasa_base_fondo_inicial,
                        tasa_base_alicuota_ordinaria,
                        foto_proyecto_id
                    `)
                    .eq('id', projectId)
                    .single();

                if (projectError) throw projectError;
                if (!project) throw new Error(`No se encontró el proyecto con ID ${projectId}`);
                
                // Si hay foto, obtener su URL
                let foto_url = null;
                if (project.foto_proyecto_id) {
                    const { data: archivo, error: archivoError } = await supabase
                        .from('archivos')
                        .select('external_url')
                        .eq('id', project.foto_proyecto_id)
                        .single();
                    
                    if (!archivoError && archivo) {
                        foto_url = archivo.external_url;
                    }
                }

                // Preparar datos para el formulario
                setProjectData({
                    id: project.id,
                    nombre: project.nombre,
                    descripcion: project.descripcion,
                    ubicacion: project.ubicacion,
                    tasa_base_fondo_inicial: project.tasa_base_fondo_inicial,
                    tasa_base_alicuota_ordinaria: project.tasa_base_alicuota_ordinaria,
                    foto_proyecto_id: project.foto_proyecto_id,
                    foto_url: foto_url
                });
                
            } catch (error: any) {
                console.error("Error al cargar datos del proyecto:", error);
                setError(`Error al cargar los datos: ${error.message}`);
            } finally {
                setIsLoading(false);
            }
        };

        if (projectId) {
            fetchProjectData();
        }
    }, [projectId, supabase]);

    const handleSubmit = async (data: ProjectFormData, pendingUpload: PendingUpload | null) => {
        setIsSaving(true);
        setError(null);
        
        try {
            console.log("Actualizando proyecto...", data);
            console.log("Estado actual de foto_proyecto_id:", data.foto_proyecto_id);
            
            // 1. Si hay una imagen pendiente de subir, primero la registramos en 'archivos'
            let foto_proyecto_id = data.foto_proyecto_id;
            if (pendingUpload) {
                const { data: archivoData, error: archivoError } = await supabase
                    .from('archivos')
                    .insert({
                        filename: pendingUpload.name,
                        external_url: pendingUpload.url,
                        external_storage_key: pendingUpload.key
                    })
                    .select()
                    .single();

                if (archivoError) {
                    console.error("Error al guardar archivo:", archivoError);
                    throw new Error(`Error al guardar la imagen: ${archivoError.message}`);
                }

                foto_proyecto_id = archivoData.id;
                console.log("Archivo guardado con ID:", foto_proyecto_id);
            }

            // 2. Actualizamos el proyecto
            console.log("Valor final de foto_proyecto_id para actualización:", foto_proyecto_id);
            
            // Definimos explícitamente los campos a actualizar
            const updateFields: any = {
                nombre: data.nombre,
                descripcion: data.descripcion,
                ubicacion: data.ubicacion,
                tasa_base_fondo_inicial: data.tasa_base_fondo_inicial,
                tasa_base_alicuota_ordinaria: data.tasa_base_alicuota_ordinaria,
            };

            // Añadimos foto_proyecto_id solo si es distinto de undefined
            // Esto permite enviar null explícitamente para eliminar fotos
            if (foto_proyecto_id !== undefined) {
                updateFields.foto_proyecto_id = foto_proyecto_id;
            }
            
            const { error: projectError } = await supabase
                .from('proyectos')
                .update(updateFields)
                .eq('id', projectId);

            if (projectError) {
                console.error("Error al actualizar proyecto:", projectError);
                throw new Error(`Error al actualizar el proyecto: ${projectError.message}`);
            }

            console.log("Proyecto actualizado con éxito");

            // 3. Redirigir a la página del proyecto
            router.push(`/dashboard/proyectos/${projectId}`);
            
        } catch (error: any) {
            console.error("Error en handleSubmit:", error);
            setError(`Error: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        router.push(`/dashboard/proyectos/${projectId}`);
    };

    if (isLoading) {
        return (
            <div className="container mx-auto p-4 md:p-6 max-w-5xl flex justify-center items-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-700 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Cargando datos del proyecto...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-6 max-w-5xl">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Link href={`/dashboard/proyectos/${projectId}`} className="text-gray-500 hover:text-gray-800">
                        <ArrowLeftIcon className="h-5 w-5" />
                    </Link>
                    <h1 className="text-2xl font-bold">Editar Proyecto</h1>
                </div>
            </div>

            {error && (
                <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
                    <span className="font-medium">Error:</span> {error}
                </div>
            )}

            <ProjectForm
                initialData={projectData}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                isSaving={isSaving}
                mode="edit"
            />
        </div>
    );
} 