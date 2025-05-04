"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProjectForm, type ProjectFormData } from "../../../_components/ProjectForm";
import { createClient } from "../../../../../lib/supabase/client";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

type PendingUpload = {
    name: string;
    url: string;
    key: string;
};

export default function CreateProjectPage() {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const supabase = createClient();

    const handleSubmit = async (data: ProjectFormData, pendingUpload: PendingUpload | null) => {
        setIsSaving(true);
        try {
            console.log("Creando proyecto...", data);
            
            // 1. Si hay una imagen pendiente de subir, primero la registramos en 'archivos'
            let foto_proyecto_id = null;
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

            // 2. Creamos el proyecto
            const { data: projectData, error: projectError } = await supabase
                .from('proyectos')
                .insert({
                    nombre: data.nombre,
                    descripcion: data.descripcion || null,
                    ubicacion: data.ubicacion,
                    tasa_base_fondo_inicial: data.tasa_base_fondo_inicial || 5,
                    tasa_base_alicuota_ordinaria: data.tasa_base_alicuota_ordinaria || null,
                    foto_proyecto_id: foto_proyecto_id
                })
                .select()
                .single();

            if (projectError) {
                console.error("Error al crear proyecto:", projectError);
                throw new Error(`Error al crear el proyecto: ${projectError.message}`);
            }

            console.log("Proyecto creado con éxito:", projectData);

            // 3. Redirigir a la lista de proyectos
            router.push('/dashboard/proyectos');
            
        } catch (error: any) {
            console.error("Error en handleSubmit:", error);
            alert(`Error: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        router.push('/dashboard/proyectos');
    };

    return (
        <div className="container mx-auto p-4 md:p-6 max-w-5xl">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Link href="/dashboard/proyectos" className="text-gray-500 hover:text-gray-800">
                        <ArrowLeftIcon className="h-5 w-5" />
                    </Link>
                    <h1 className="text-2xl font-bold">Crear Nuevo Proyecto</h1>
                </div>
            </div>

            <ProjectForm
                initialData={{
                    nombre: '',
                    ubicacion: '',
                    descripcion: '',
                    tasa_base_fondo_inicial: 5
                }}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                isSaving={isSaving}
                mode="create"
            />
        </div>
    );
} 