"use client";

import { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "../api/uploadthing/core";
import { ArrowUpCircleIcon, LinkIcon, TrashIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";

// --- Tipos (Basados en SCHEMA.MD) ---
export type ProjectFormData = {
    id?: number;
    nombre: string;
    descripcion?: string | null;
    ubicacion: string;
    tasa_base_fondo_inicial?: number | null;
    tasa_base_alicuota_ordinaria?: number | null;
    foto_proyecto_id?: number | null;
    foto_url?: string | null; // Añadimos esta propiedad para manejar la URL de la foto
};

// Tipo para el estado de subida pendiente
type PendingUpload = {
    name: string;
    url: string; // ufsUrl from UploadThing response
    key: string; // key from UploadThing response
};

// Tipo para el objeto archivo esperado en formData
type ArchivoInfo = { id: number; filename: string | null; external_url: string | null } | null;

// --- Props del Componente ---
interface ProjectFormProps {
    initialData: Partial<ProjectFormData>;
    onSubmit: (data: ProjectFormData, pendingUpload: PendingUpload | null) => Promise<void>;
    onCancel: () => void;
    isSaving: boolean;
    mode: 'create' | 'edit';
}

// --- Estado Inicial Default ---
const defaultInitialData: ProjectFormData = {
    nombre: '',
    descripcion: null,
    ubicacion: '',
    tasa_base_fondo_inicial: 5,
    tasa_base_alicuota_ordinaria: null,
};

// --- Spinner Componente Simple ---
const MiniSpinner = () => (
    <ArrowPathIcon className="h-4 w-4 animate-spin text-gray-500" />
);

// --- Componente ---
export function ProjectForm({
    initialData,
    onSubmit,
    onCancel,
    isSaving,
    mode
}: ProjectFormProps) {
    const [formData, setFormData] = useState<ProjectFormData>(() => ({
        ...defaultInitialData,
        ...initialData
    }));
    const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState<boolean>(false);

    // --- Efecto para resetear cuando initialData cambia ---
    useEffect(() => {
        setFormData({ ...defaultInitialData, ...initialData });
        setPendingUpload(null);
        setError(null);
        setUploadError(null);
        setIsUploading(false);
    }, [initialData]);

    // Efecto para monitorear cambios en foto_proyecto_id
    useEffect(() => {
        console.log("Estado foto_proyecto_id actualizado:", formData.foto_proyecto_id);
    }, [formData.foto_proyecto_id]);

    // Handler para inputs
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? (value === '' ? null : parseFloat(value)) : value
        }));
    };

    // Handlers para Upload
    const handleUploadBegin = () => {
        console.log("[UploadBegin] for project image");
        setIsUploading(true);
        setUploadError(null);
        setPendingUpload(null);
    };

    const handleUploadComplete = (res: any[]) => {
        console.log("[UploadComplete] for project image");
        setIsUploading(false);
        if (res && res.length > 0) {
            const file = res[0];
            const newUpload: PendingUpload = {
                name: file.name,
                url: file.url,
                key: file.key
            };
            setPendingUpload(newUpload);
            setUploadError(null);
            console.log(`Upload successful for project image:`, newUpload);
        } else {
            console.error(`Upload for project image completed but no result found.`);
            setUploadError('Respuesta de subida inválida.');
            setPendingUpload(null);
        }
    };

    const handleUploadError = (error: Error) => {
        console.error(`[UploadError] for project image:`, error);
        setIsUploading(false);
        setPendingUpload(null);

        let friendlyMessage = error.message || 'Error desconocido al subir.';
        if (error.message.includes('FileSizeMismatch') || error.message.includes('maximum file size')) {
            friendlyMessage = 'El archivo excede el tamaño máximo permitido (4MB).';
        } else if (error.message.includes('Invalid file type')) {
            friendlyMessage = 'Tipo de archivo no permitido. Intente con JPG, PNG o WEBP.';
        }

        setUploadError(friendlyMessage);
    };

    // --- Submit ---
    const handleInternalSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setUploadError(null);

        // Validación básica
        if (!formData.nombre.trim()) {
            setError("El nombre del proyecto es requerido.");
            return;
        }
        if (!formData.ubicacion.trim()) {
            setError("La ubicación del proyecto es requerida.");
            return;
        }
        
        try {
            console.log("Enviando formulario con datos:", formData);
            console.log("Estado de foto_proyecto_id al enviar:", formData.foto_proyecto_id);
            await onSubmit(formData, pendingUpload);
        } catch (submitError: any) {
            console.error("Error submitting project form:", submitError);
            setError(submitError.message || "Ocurrió un error al guardar.");
        }
    };

    // Handler para Cancelar Subida Pendiente
    const handleCancelPendingUpload = () => {
        console.log(`[CancelPending] for project image`);
        setPendingUpload(null);
        setUploadError(null);
    };

    // Handler para eliminar foto existente
    const handleRemoveExistingPhoto = () => {
        console.log("Eliminando foto existente. Estado anterior:", formData.foto_proyecto_id);
        setFormData(prev => ({
            ...prev,
            foto_proyecto_id: null,
            foto_url: null
        }));
        console.log("Foto eliminada. Nuevo estado foto_proyecto_id: null");
    };

    // Obtener foto existente de initialData
    const existingPhoto = initialData.foto_proyecto_id && formData.foto_proyecto_id 
        ? { id: initialData.foto_proyecto_id, external_url: initialData.foto_url, filename: null } as ArchivoInfo 
        : null;

    return (
        <form onSubmit={handleInternalSubmit} className="bg-white rounded-xl border p-6 shadow-sm space-y-6">
            {error && (
                <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
                    <span className="font-medium">Error:</span> {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Información General */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Información General</h3>
                    
                    <div>
                        <Label htmlFor="nombre">Nombre del Proyecto<span className="text-red-500">*</span></Label>
                        <Input
                            id="nombre"
                            name="nombre"
                            value={formData.nombre}
                            onChange={handleInputChange}
                            required
                            className="mt-1"
                            placeholder="Edificio Central"
                        />
                    </div>
                    
                    <div>
                        <Label htmlFor="ubicacion">Ubicación<span className="text-red-500">*</span></Label>
                        <Input
                            id="ubicacion"
                            name="ubicacion"
                            value={formData.ubicacion}
                            onChange={handleInputChange}
                            required
                            className="mt-1"
                            placeholder="Av. Principal 123, Ciudad"
                        />
                    </div>
                    
                    <div>
                        <Label htmlFor="descripcion">Descripción</Label>
                        <Textarea
                            id="descripcion"
                            name="descripcion"
                            value={formData.descripcion || ''}
                            onChange={handleInputChange}
                            className="mt-1 min-h-24"
                            placeholder="Breve descripción del proyecto..."
                        />
                    </div>
                </div>

                {/* Configuración Financiera e Imagen */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Configuración y Foto</h3>
                    
                    <div>
                        <Label htmlFor="tasa_base_fondo_inicial">Tasa Base Fondo Inicial</Label>
                        <div className="relative mt-1">
                            <Input
                                id="tasa_base_fondo_inicial"
                                name="tasa_base_fondo_inicial"
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.tasa_base_fondo_inicial ?? ''}
                                onChange={handleInputChange}
                                className="pr-8"
                                placeholder="5.00"
                            />
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <span className="text-gray-500">$</span>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Valor predeterminado para el cálculo del fondo inicial</p>
                    </div>
                    
                    <div>
                        <Label htmlFor="tasa_base_alicuota_ordinaria">Tasa Base Alícuota Ordinaria</Label>
                        <div className="relative mt-1">
                            <Input
                                id="tasa_base_alicuota_ordinaria"
                                name="tasa_base_alicuota_ordinaria"
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.tasa_base_alicuota_ordinaria ?? ''}
                                onChange={handleInputChange}
                                className="pr-8"
                                placeholder="0.00"
                            />
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <span className="text-gray-500">$</span>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Valor predeterminado para cálculo de alícuotas</p>
                    </div>
                    
                    {/* Foto del Proyecto */}
                    <div className="mt-6">
                        <Label>Foto del Proyecto</Label>
                        <div className="flex items-center gap-2 mt-1 min-h-[36px]">
                            {/* Mostrar Spinner si se está subiendo */}
                            {isUploading && (
                                <div className="flex items-center justify-center p-2 flex-grow text-sm text-gray-500">
                                    <MiniSpinner />
                                    <span className="ml-2">Subiendo...</span>
                                </div>
                            )}

                            {/* Mostrar subida pendiente */}
                            {pendingUpload && !isUploading && (
                                <div className="flex items-center gap-1 text-sm text-green-700 p-2 bg-green-50 rounded border border-green-200 flex-grow">
                                    <div className="h-12 w-12 bg-green-100 rounded overflow-hidden mr-2 flex-shrink-0">
                                        {pendingUpload.url && (
                                            <img 
                                                src={pendingUpload.url} 
                                                alt="Vista previa"
                                                className="h-full w-full object-cover"
                                            />
                                        )}
                                    </div>
                                    <span className="truncate" title={pendingUpload.name}>{pendingUpload.name}</span>
                                    <button
                                        type="button"
                                        onClick={handleCancelPendingUpload}
                                        className="ml-auto text-xs text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-100"
                                        title="Cancelar subida pendiente"
                                    >
                                        &times;
                                    </button>
                                </div>
                            )}

                            {/* Mostrar enlace a archivo existente */}
                            {mode === 'edit' && existingPhoto?.external_url && formData.foto_proyecto_id && !pendingUpload && !isUploading && (
                                <div className="flex items-center gap-2 text-sm text-gray-700 p-2 bg-gray-50 rounded border border-gray-200 flex-grow">
                                    <div className="h-12 w-12 bg-gray-100 rounded overflow-hidden mr-2 flex-shrink-0">
                                        <img 
                                            src={existingPhoto.external_url} 
                                            alt="Foto del proyecto"
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                    <a
                                        href={existingPhoto.external_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="truncate hover:underline text-blue-600"
                                        title="Ver foto del proyecto"
                                    >
                                        Ver foto del proyecto
                                    </a>
                                    <button
                                        type="button"
                                        onClick={handleRemoveExistingPhoto}
                                        className="ml-auto p-1 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded"
                                        title="Quitar foto del proyecto"
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            )}

                            {/* Mostrar botón de subida */}
                            {!pendingUpload && !(mode === 'edit' && existingPhoto?.external_url && formData.foto_proyecto_id) && !isUploading && (
                                <UploadButton<OurFileRouter, "projectImage">
                                    endpoint="projectImage"
                                    onUploadBegin={handleUploadBegin}
                                    onClientUploadComplete={(res) => handleUploadComplete(res)}
                                    onUploadError={(error) => handleUploadError(error)}
                                    appearance={{
                                        button: `text-xs text-black font-medium px-3 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center gap-1 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`,
                                        allowedContent: "hidden",
                                        container: "w-auto",
                                    }}
                                    content={{
                                        button() {
                                            return (
                                                <>
                                                    <ArrowUpCircleIcon className="w-4 h-4 text-black" />
                                                    <span className="text-black">Subir foto del proyecto</span>
                                                </>
                                            );
                                        },
                                    }}
                                />
                            )}
                        </div>
                        {uploadError && !isUploading && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
                    </div>
                </div>
            </div>

            {/* Botones Submit/Cancel */}
            <div className="flex justify-end gap-3 pt-5 border-t border-gray-200">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={isSaving} className="bg-[#007F44] hover:bg-[#007F44]/80">
                    {isSaving ? "Guardando..." : (mode === 'create' ? "Crear Proyecto" : "Actualizar Proyecto")}
                </Button>
            </div>
        </form>
    );
} 