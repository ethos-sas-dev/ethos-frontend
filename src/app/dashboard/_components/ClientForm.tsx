"use client";

import { useEffect, useState } from "react";
import { Button } from "../../../components/ui/button"; // Ajustar ruta
import { Input } from "../../_components/ui/input";
import { Label } from "../../_components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../_components/ui/select"; // Ajustar ruta
import { Switch } from "../../_components/ui/switch"; // Ajustar ruta
import { RadioGroup, RadioGroupItem } from "../../_components/ui/radio-group"; // Para Natural/Juridica
import { UploadButton } from "@uploadthing/react"; // Assuming UploadButton is needed
import type { OurFileRouter } from "../../api/uploadthing/core"; // Adjust path if needed
import { ExclamationTriangleIcon, DocumentCheckIcon, ArrowUpCircleIcon, LinkIcon, ArrowPathIcon, TrashIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import get from 'lodash/get'; // Importar lodash.get para acceso anidado seguro
import set from 'lodash/set'; // Importar lodash.set para actualización anidada segura
// --- Tipos (Basados en SCHEMA.MD - Simplificados por ahora) ---

// Tipos para los datos específicos de persona
export type PersonaNaturalData = {
    id?: number;
    aplica_ruc?: boolean;
    razon_social?: string; // Nombre completo
    ruc?: string;
    cedula?: string;
    // Document IDs (optional, for edit mode)
    ruc_pdf_id?: number | null;
    cedula_pdf_id?: number | null;
};

// Nuevo tipo para Empresa Representada
export type EmpresaRepresentadaData = {
    id?: number;
    razon_social?: string; // Razón social de la empresa representante
    ruc?: string;          // RUC de la empresa representante
    nombre_representante_persona_natural?: string; // Nombre de la persona natural que representa a la empresa
    cedula_representante_persona_natural?: string; // Cédula de la persona natural que representa a la empresa
    // Document IDs (optional, for edit mode)
    ruc_empresa_pdf_id?: number | null;
    autorizacion_representacion_pdf_id?: number | null;
    cedula_representante_persona_natural_pdf_id?: number | null; // PDF Cédula de la persona natural representante
};

export type PersonaJuridicaData = {
    id?: number;
    razon_social?: string;
    nombre_comercial?: string;
    razon_social_representante_legal?: string;
    representante_legal_es_empresa?: boolean;
    cedula_representante_legal?: string;
    ruc?: string;
    // Link a empresa_representada (optional)
    empresa_representante_legal_id?: number | null; // ID for relation
    empresa_representante_legal?: EmpresaRepresentadaData | null; // Nested data
    // Document IDs (optional, for edit mode)
    ruc_pdf_id?: number | null;
    cedula_representante_legal_pdf_id?: number | null;
    nombramiento_representante_legal_pdf_id?: number | null;
};

// Tipo para Contactos (Simplificado)
export type ContactoData = {
    nombre?: string;
    email?: string;
    telefono?: string;
};

// Tipo principal para el formulario
export type ClientFormData = {
    id?: number; // ID del PerfilCliente (para edición)
    tipo_persona: 'Natural' | 'Juridica';
    // Contactos como objetos (parsear/stringify al enviar/recibir si API usa JSONB string)
    contacto_gerente?: ContactoData | null;
    contacto_administrativo?: ContactoData | null;
    contacto_proveedores?: ContactoData | null;
    contacto_accesos?: ContactoData | null;
    rol?: 'Propietario' | 'Arrendatario' | 'Externo' | null; // << AÑADIDO Rol (con 'Externo')
    // Datos específicos anidados
    persona_natural?: PersonaNaturalData | null;
    persona_juridica?: PersonaJuridicaData | null;
};

// Tipo para el estado de subidas pendientes en el formulario
type PendingUpload = {
    name: string;
    url: string; // ufsUrl from UploadThing response
    key: string; // key from UploadThing response
};
// Exportar este tipo
export type PendingUploadsState = {
    [docType: string]: PendingUpload | null; // e.g., { cedula_pdf_id: { name: '...', url: '...', key: '...' } }
};

// Tipo para el objeto archivo esperado en formData (viene de EditClientPage)
type ArchivoInfo = { id: number; filename: string | null; external_url: string | null } | null;

// --- Props del Componente ---
interface ClientFormProps {
    initialData: Partial<ClientFormData>;
    onSubmit: (data: ClientFormData, pendingUploads: PendingUploadsState) => Promise<void>;
    onCancel: () => void;
    isSaving: boolean;
    mode: 'create' | 'edit';
    // Nuevo prop opcional para restringir los roles seleccionables
    allowedRoles?: ('Propietario' | 'Arrendatario' | 'Externo')[];
}

// --- Estado Inicial Default ---
const defaultInitialData: ClientFormData = {
    tipo_persona: 'Natural', // Default a Natural
    contacto_gerente: null,
    contacto_administrativo: null,
    contacto_proveedores: null,
    contacto_accesos: null,
    rol: null, // << ROL INICIALIZADO A NULL
    persona_natural: { aplica_ruc: false }, // Simplified defaults
    persona_juridica: null,
};

const defaultPersonaJuridica: PersonaJuridicaData = {
    representante_legal_es_empresa: false,
    empresa_representante_legal: null, // Initialize nested structure
};

const defaultEmpresaRepresentada: EmpresaRepresentadaData = {};

// --- Spinner Componente Simple ---
const MiniSpinner = () => (
    <ArrowPathIcon className="h-4 w-4 animate-spin text-gray-500" />
);

// --- Componente ---
export function ClientForm({
    initialData,
    onSubmit,
    onCancel,
    isSaving,
    mode,
    allowedRoles
}: ClientFormProps) {

    const [formData, setFormData] = useState<ClientFormData>(() => initializeFormData(initialData));
    const [pendingUploads, setPendingUploads] = useState<PendingUploadsState>({});
    const [error, setError] = useState<string | null>(null);
    const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
    const [isUploading, setIsUploading] = useState<Record<string, boolean>>({}); // <<< Nuevo estado para carga

    // --- Helper para inicializar estado ---
    function initializeFormData(initData: Partial<ClientFormData>): ClientFormData {
        const currentType = initData?.tipo_persona || 'Natural';
        const initialized: ClientFormData = {
            ...defaultInitialData, // Start with base defaults
            ...initData,         // Override with incoming data (like ID, contacts)
            tipo_persona: currentType,
            // Parse contacts if they are strings initially (optional)
            // contacto_gerente: parseContact(initData.contacto_gerente), ...
        };

        if (currentType === 'Natural') {
            initialized.persona_juridica = null;
            initialized.persona_natural = {
                ...defaultInitialData.persona_natural, // Default natural person fields
                ...initData.persona_natural,         // Override with specific initial natural data
            };
        } else { // Juridica
            initialized.persona_natural = null;
            const initialJuridica = initData.persona_juridica || {};
            initialized.persona_juridica = {
                ...defaultPersonaJuridica,      // Default juridica fields (incl. nested null)
                ...initialJuridica,           // Override with specific initial juridica data
                // Explicitly handle nested empresa_representante_legal
                empresa_representante_legal: initialJuridica.representante_legal_es_empresa
                    ? {
                          ...defaultEmpresaRepresentada,
                          ...(initialJuridica.empresa_representante_legal || {}), // Merge nested defaults/initial
                      }
                    : null, // Ensure it's null if not applicable
            };
        }
        return initialized;
    }

     // --- Efecto para resetear cuando initialData cambia ---
     useEffect(() => {
         setFormData(initializeFormData(initialData));
         setPendingUploads({}); // Reset pending uploads when initial data changes
         setError(null);
         setUploadErrors({});
         setIsUploading({}); // <<< Resetear estado de carga
     }, [initialData]);

    // --- Handlers ---

    const handleTypeChange = (value: 'Natural' | 'Juridica') => {
        setFormData(prev => {
            const newState = { ...prev, tipo_persona: value };
            if (value === 'Natural') {
                newState.persona_juridica = null; // Clear juridica data
                newState.persona_natural = prev.persona_natural ?? { ...defaultInitialData.persona_natural }; // Restore or init natural
            } else {
                newState.persona_natural = null; // Clear natural data
                newState.persona_juridica = prev.persona_juridica ?? { ...defaultPersonaJuridica }; // Restore or init juridica
                 // Ensure nested empresa_representante_legal is null if just switched to Juridica unless it existed
                 if (!newState.persona_juridica.representante_legal_es_empresa) {
                     newState.persona_juridica.empresa_representante_legal = null;
                 } else if (!newState.persona_juridica.empresa_representante_legal) {
                     // If switching to Juridica AND RL is Empresa was already true, initialize the nested obj
                    newState.persona_juridica.empresa_representante_legal = { ...defaultEmpresaRepresentada };
                }

            }
            return newState;
        });
        // Consider resetting pending uploads related to the switched-away type
    };

    // Handler genérico para inputs (mejorado para anidación)
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked; // Safe access for checked property
        const keys = name.split('.'); // e.g., 'persona_juridica.empresa_representante_legal.ruc'

        setFormData(prev => {
            // Use structuredClone for deep copy to safely modify nested state
            let newState = structuredClone(prev);
            let currentLevel: any = newState;

            // Navigate through the state object based on the keys
            for (let i = 0; i < keys.length - 1; i++) {
                const key = keys[i];
                // If a level doesn't exist, create it (important for nested objects)
                if (!currentLevel[key]) {
                    // Initialize based on the structure (e.g., persona_juridica, empresa_representante_legal)
                    if (key === 'persona_natural' && newState.tipo_persona === 'Natural') currentLevel[key] = {};
                    else if (key === 'persona_juridica' && newState.tipo_persona === 'Juridica') currentLevel[key] = { ...defaultPersonaJuridica }; // Ensure nested defaults if creating juridica level
                    else if (key === 'empresa_representante_legal' && currentLevel === newState.persona_juridica) currentLevel[key] = { ...defaultEmpresaRepresentada }; // Ensure nested defaults
                    else currentLevel[key] = {}; // Fallback
                }
                currentLevel = currentLevel[key];
            }

            const finalKey = keys[keys.length - 1];

            // Update the final value based on input type
            if (type === 'checkbox') {
                currentLevel[finalKey] = checked;

                 // Special logic for 'representante_legal_es_empresa' switch
                 if (name === 'persona_juridica.representante_legal_es_empresa') {
                    if (checked && !currentLevel.empresa_representante_legal) {
                        // If switching ON and nested object doesn't exist, initialize it
                         currentLevel.empresa_representante_legal = { ...defaultEmpresaRepresentada };
                     } else if (!checked) {
                         // If switching OFF, clear the nested object's data
                         currentLevel.empresa_representante_legal = null;
                         // TODO: Optionally clear related pending uploads?
                     }
                 }

            } else if (type === 'number') {
                // Handle empty string for optional number inputs
                currentLevel[finalKey] = value === '' ? null : Number(value);
            } else {
                currentLevel[finalKey] = value;
            }

            return newState;
        });
    };

     // --- Handlers for Upload (Actualizados) ---
     const handleUploadBegin = (docTypeKey: string) => {
        console.log(`[UploadBegin] for ${docTypeKey}`);
        setIsUploading(prev => ({ ...prev, [docTypeKey]: true }));
        setUploadErrors(prev => ({ ...prev, [docTypeKey]: '' })); // Limpiar error anterior al reintentar
        setPendingUploads(prev => ({ ...prev, [docTypeKey]: null })); // Limpiar pendiente anterior si se reintenta
    };

    const handleUploadComplete = (docTypeKey: string, res: any[]) => {
        console.log(`[UploadComplete] for ${docTypeKey}`);
        setIsUploading(prev => ({ ...prev, [docTypeKey]: false })); // <<< Finaliza carga
        if (res && res.length > 0) {
            const file = res[0];
            const newUpload: PendingUpload = {
                name: file.name,
                url: file.url,
                key: file.key
            };
            setPendingUploads(prev => ({ ...prev, [docTypeKey]: newUpload }));
            setUploadErrors(prev => ({ ...prev, [docTypeKey]: '' })); 
            console.log(`Upload successful for ${docTypeKey}:`, newUpload);
        } else {
            console.error(`Upload for ${docTypeKey} completed but no result found.`);
            setUploadErrors(prev => ({ ...prev, [docTypeKey]: 'Respuesta de subida inválida.' }));
            setPendingUploads(prev => ({ ...prev, [docTypeKey]: null }));
        }
    };

    const handleUploadError = (docTypeKey: string, error: Error) => {
        console.error(`[UploadError] for ${docTypeKey}:`, error);
        setIsUploading(prev => ({ ...prev, [docTypeKey]: false })); // <<< Finaliza carga (con error)
        setPendingUploads(prev => ({ ...prev, [docTypeKey]: null })); // Limpiar pendiente en error

        let friendlyMessage = error.message || 'Error desconocido al subir.';
        // <<< Mejorar mensaje para errores comunes
        if (error.message.includes('FileSizeMismatch') || error.message.includes('maximum file size')) {
            friendlyMessage = 'El archivo excede el tamaño máximo permitido (4MB).';
        } else if (error.message.includes('Invalid file type')) {
            friendlyMessage = 'Tipo de archivo no permitido. Intente con PDF o imagen.'; // Ajustar según tipos permitidos
        }
        // Añadir más condiciones si identificas otros errores comunes

        setUploadErrors(prev => ({ ...prev, [docTypeKey]: friendlyMessage }));
    };

     // Handler para Select (simplificado)
     const handleSelectChange = (name: string, value: string) => {
          setFormData(prev => ({
              ...prev,
              [name]: value === 'NONE' ? null : value,
          }));
      };

    // --- Submit ---
    const handleInternalSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setUploadErrors({});

        // TODO: Validar datos aquí antes de enviar

        // Basic validation example: Check required fields based on type
        if (formData.tipo_persona === 'Natural' && !formData.persona_natural?.cedula) {
             setError("La cédula es requerida para Persona Natural.");
             return;
        }
        if (formData.tipo_persona === 'Juridica' && !formData.persona_juridica?.ruc) {
             setError("El RUC es requerido para Persona Jurídica.");
             return;
        }
        // Add more validations as needed...


        // TODO: Parsear objetos de contacto a JSON string si la API lo espera
        // const dataToSend = { ...formData, contacto_gerente: JSON.stringify(formData.contacto_gerente), ... }

        try {
             // Llamar al onSubmit del padre, pasando formData y pendingUploads
             await onSubmit(formData, pendingUploads);
        } catch (submitError: any) {
            console.error("Error submitting client form:", submitError);
            setError(submitError.message || "Ocurrió un error al guardar.");
        }
    };

    // --- Handler para Cancelar Subida Pendiente ---
    const handleCancelPendingUpload = (docTypeKey: string) => {
        console.log(`[CancelPending] for ${docTypeKey}`);
        // Limpiar estado de pendiente y error
        setPendingUploads(prev => ({ ...prev, [docTypeKey]: null }));
        setUploadErrors(prev => ({ ...prev, [docTypeKey]: '' }));
        // También limpiar el campo del archivo en formData para asegurar que se guarde NULL
        const objectPath = getPathForDocType(docTypeKey); // Reutilizamos getPathForDocType
        if (objectPath) {
            const newState = structuredClone(formData);
            set(newState, objectPath, null);
            setFormData(newState);
            console.log(`Also set file state to null for ${docTypeKey} at path ${objectPath}`);
        } else {
            console.warn(`Cannot clear file state: No object path found for ${docTypeKey}`);
        }
    };

    // Función auxiliar interna (usada por renderUploadStatus y handleCancelPendingUpload)
    const getPathForDocType = (key: string): string | null => {
         switch (key) {
             // Persona Natural
             case 'cedula_pdf_id': return 'persona_natural.cedula_pdf';
             case 'ruc_pdf_id_natural': return 'persona_natural.ruc_pdf';
             // Persona Juridica
             case 'ruc_pdf_id_juridica': return 'persona_juridica.ruc_pdf';
             case 'cedula_representante_legal_pdf_id': return 'persona_juridica.cedula_representante_legal_pdf';
             case 'nombramiento_representante_legal_pdf_id': return 'persona_juridica.nombramiento_representante_legal_pdf';
             // Empresa Representada (anidado)
             case 'ruc_empresa_pdf_id': return 'persona_juridica.empresa_representante_legal.ruc_empresa_pdf';
             case 'autorizacion_representacion_pdf_id': return 'persona_juridica.empresa_representante_legal.autorizacion_representacion_pdf';
             case 'cedula_representante_persona_natural_pdf_id': return 'persona_juridica.empresa_representante_legal.cedula_representante_legal_pdf';
             default:
                 console.warn(`Unknown docTypeKey in getPathForDocType: ${key}`);
                 return null;
         }
     };

    // --- Helper para renderizar estado de subida (Actualizado) ---
    const renderUploadStatus = (docTypeKey: string, docName: string) => {
        const pending = pendingUploads[docTypeKey];
        // getPathForDocType ahora está fuera, pero es accesible
        const objectPath = getPathForDocType(docTypeKey);
        const existingFile = objectPath ? get(formData, objectPath, undefined) as ArchivoInfo | undefined : undefined;
        const uploadingNow = isUploading[docTypeKey] ?? false;
        const showUploadButton = !pending && !(mode === 'edit' && existingFile?.external_url) && !uploadingNow;

        return (
            <div className="space-y-1">
                <Label htmlFor={docTypeKey}>{docName}</Label>
                <div className="flex items-center gap-2 mt-1 min-h-[36px]"> {/* Altura mínima */} 

                    {/* Mostrar Spinner si se está subiendo */} 
                    {uploadingNow && (
                        <div className="flex items-center justify-center p-2 flex-grow text-sm text-gray-500">
                            <MiniSpinner />
                            <span className="ml-2">Subiendo...</span>
                        </div>
                    )}

                    {/* Mostrar subida pendiente */} 
                    {pending && !uploadingNow && (
                         <div className="flex items-center gap-1 text-sm text-green-700 p-2 bg-green-50 rounded border border-green-200 flex-grow">
                            <DocumentCheckIcon className="h-4 w-4 flex-shrink-0" />
                             <span className="truncate" title={pending.name}>{pending.name}</span>
                            <button
                                type="button"
                                onClick={() => handleCancelPendingUpload(docTypeKey)}
                                className="ml-auto text-xs text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-100"
                                title="Cancelar subida pendiente"
                            >
                                &times;
                            </button>
                         </div>
                    )}

                    {/* Mostrar enlace a archivo existente */} 
                    {mode === 'edit' && existingFile?.external_url && !pending && !uploadingNow && (
                        <div className="flex items-center gap-2 text-sm text-gray-700 p-2 bg-gray-50 rounded border border-gray-200 flex-grow">
                            <LinkIcon className="h-4 w-4 flex-shrink-0 text-gray-500" />
                            <a
                                href={existingFile.external_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="truncate hover:underline text-blue-600"
                                title={`Ver ${existingFile.filename || docName}`}
                            >
                                {existingFile.filename || `Ver ${docName}`}
                            </a>
                             {/* Botón para remover/reemplazar (Opcional) */}
                             <button
                                 type="button"
                                 onClick={() => {
                                     if (objectPath) {
                                        // Clonar profundamente el estado para evitar mutaciones directas
                                        const newState = structuredClone(formData);
                                        // Usar lodash.set para poner el valor en la ruta anidada a null
                                        set(newState, objectPath, null);
                                        // Actualizar el estado del formulario
                                        setFormData(newState);
                                        console.log(`Cleared existing file state for ${docTypeKey} at path ${objectPath}`);
                                     } else {
                                         console.warn(`Cannot clear file: No object path found for ${docTypeKey}`);
                                     }
                                 }}
                                 className="ml-auto p-1 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded"
                                 title={`Quitar ${docName}`}
                            >
                                 <TrashIcon className="h-4 w-4" /> 
                             </button>
                         </div>
                    )}

                    {/* Mostrar botón de subida */} 
                    {showUploadButton && (
                        <UploadButton<OurFileRouter, "clientDocument"> 
                            endpoint="clientDocument"
                             // <<< Pasar handlers para inicio/error/completo
                            onUploadBegin={() => handleUploadBegin(docTypeKey)}
                            onClientUploadComplete={(res) => handleUploadComplete(docTypeKey, res)}
                            onUploadError={(error) => handleUploadError(docTypeKey, error)}
                            appearance={{
                                button: `text-xs text-black font-medium px-3 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center gap-1 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`,
                                allowedContent: "hidden",
                                container: "w-auto", 
                            }}
                            content={{
                                button() {
                                    return (
                                        <>
                                            <ArrowUpCircleIcon className="w-4 h-4 text-black"/>
                                            <span className="text-black">Subir {docName}</span>
                                        </>
                                    );
                                },
                            }}
                        />
                     )}
                 </div>
                {uploadErrors[docTypeKey] && !uploadingNow && <p className="text-xs text-red-600 mt-1">{uploadErrors[docTypeKey]}</p>}
            </div>
        );
    };


    // --- JSX ---
    return (
        <form onSubmit={handleInternalSubmit} className="bg-white rounded-xl border p-4 md:p-6 shadow-sm space-y-6"> {/* Padding reducido */}
            {error && (
                <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert"> {/* Padding reducido */}
                    <span className="font-medium">Error:</span> {error}
                </div>
            )}

            {/* Selector Tipo Persona */}
             <fieldset className="space-y-2"> {/* Reduced spacing */}
                <Label className="text-base font-semibold">Tipo de Cliente</Label>
                 <RadioGroup
                     value={formData.tipo_persona}
                     onValueChange={handleTypeChange}
                     className="flex space-x-4 mt-6"
                 >
                     <div className="flex items-center space-x-2">
                         <RadioGroupItem value="Natural" id="r-natural" />
                         <Label htmlFor="r-natural" className="font-normal">Persona Natural</Label> {/* Font normal */}
                     </div>
                     <div className="flex items-center space-x-2">
                         <RadioGroupItem value="Juridica" id="r-juridica" />
                         <Label htmlFor="r-juridica" className="font-normal">Persona Jurídica</Label> {/* Font normal */}
                     </div>
                 </RadioGroup>
             </fieldset>

             {/* Selector de Rol (Requerido) */}
              <fieldset className="space-y-2">
                 <Label htmlFor="rol" className="text-base font-semibold">Rol del Cliente <span className="text-red-500">*</span></Label>
                  <Select
                     name="rol" // Nombre para el estado
                     value={formData.rol ?? ''} // Usar string vacío como valor no seleccionado
                     onValueChange={(value) => handleSelectChange('rol', value)} // Usa el handler existente
                     required
                     // Deshabilitar si solo hay una opción permitida (después de inicializar)
                     disabled={allowedRoles?.length === 1 && mode === 'create'}
                 >
                     <SelectTrigger id="rol" className="w-full md:w-1/2">
                         <SelectValue placeholder="Seleccione un rol..." />
                     </SelectTrigger>
                     <SelectContent>
                         {/* Renderizar opciones según allowedRoles o todas por defecto */} 
                         {(allowedRoles && allowedRoles.length > 0 ? allowedRoles : ['Propietario', 'Arrendatario', 'Externo']).map(roleValue => (
                             <SelectItem key={roleValue} value={roleValue}>
                                 {roleValue} {/* Muestra el valor directamente */}
                             </SelectItem>
                         ))}
                     </SelectContent>
                 </Select>
                 {/* Mensaje si está deshabilitado? */}
                 {allowedRoles?.length === 1 && mode === 'create' && (
                    <p className="text-xs text-gray-500 italic mt-1">Rol preseleccionado según el contexto.</p>
                 )}
                 {/* Mostrar error si no se selecciona rol? */}
              </fieldset>

             {/* --- Campos Persona Natural --- */}
             {formData.tipo_persona === 'Natural' && formData.persona_natural && (
                 <motion.div
                    key="natural"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4 border p-4 rounded-md" // Standard padding
                >
                     <h3 className="text-sm font-semibold text-gray-700 mb-3">Datos Persona Natural</h3> {/* Title style */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                             <Label htmlFor="persona_natural.razon_social">Nombre Completo / Razón Social</Label>
                             <Input
                                 id="persona_natural.razon_social"
                                 name="persona_natural.razon_social"
                                 value={formData.persona_natural.razon_social ?? ''}
                                 onChange={handleInputChange}
                                 required
                                 className="mt-1"
                             />
                         </div>
                         <div>
                             <Label htmlFor="persona_natural.cedula">Cédula</Label>
                             <Input
                                 id="persona_natural.cedula"
                                 name="persona_natural.cedula"
                                 value={formData.persona_natural.cedula ?? ''}
                                 onChange={handleInputChange}
                                 required
                                 className="mt-1"
                             />
                         </div>
                         {/* Documento Cédula */}
                         {renderUploadStatus('cedula_pdf_id', 'PDF Cédula')}

                          {/* RUC Section for Natural Person */}
                          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 items-center border-t pt-4 mt-2">
                             <div className="flex items-center space-x-2 md:col-span-1">
                                 <Switch
                                    id="persona_natural.aplica_ruc"
                                    name="persona_natural.aplica_ruc"
                                    checked={formData.persona_natural.aplica_ruc ?? false}
                                     onCheckedChange={(checked) => handleInputChange({ target: { name: 'persona_natural.aplica_ruc', type: 'checkbox', checked } } as any)}
                                 />
                                 <Label htmlFor="persona_natural.aplica_ruc">¿Aplica RUC?</Label>
                             </div>
                             <div className={`md:col-span-1 ${formData.persona_natural.aplica_ruc ? '' : 'opacity-50'}`}>
                                 <Label htmlFor="persona_natural.ruc">RUC</Label>
                                 <Input
                                     id="persona_natural.ruc"
                                     name="persona_natural.ruc"
                                     value={formData.persona_natural.ruc ?? ''}
                                     onChange={handleInputChange}
                                     disabled={!formData.persona_natural.aplica_ruc}
                                     required={formData.persona_natural.aplica_ruc}
                                     className="mt-1"
                                 />
                             </div>
                              {/* Documento RUC Persona Natural */}
                             <div className={`md:col-span-1 ${formData.persona_natural.aplica_ruc ? '' : 'opacity-100'}`}> {/* Always show upload */}
                                 {renderUploadStatus('ruc_pdf_id_natural', 'PDF RUC')} {/* Unique key for natural ruc */}
                             </div>
                         </div>
                     </div>
                 </motion.div>
             )}

            {/* --- Campos Persona Jurídica --- */}
             {formData.tipo_persona === 'Juridica' && formData.persona_juridica && (
                 <motion.div
                    key="juridica"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4 border p-4 rounded-md"
                 >
                     <h3 className="text-sm font-semibold text-gray-700 mb-3">Datos Persona Jurídica</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="persona_juridica.razon_social">Razón Social</Label>
                            <Input
                                id="persona_juridica.razon_social"
                                name="persona_juridica.razon_social"
                                value={formData.persona_juridica.razon_social ?? ''}
                                onChange={handleInputChange}
                                required
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="persona_juridica.nombre_comercial">Nombre Comercial</Label>
                            <Input
                                id="persona_juridica.nombre_comercial"
                                name="persona_juridica.nombre_comercial"
                                value={formData.persona_juridica.nombre_comercial ?? ''}
                                onChange={handleInputChange}
                                className="mt-1"
                            />
                        </div>
                        <div>
                             <Label htmlFor="persona_juridica.ruc">RUC</Label>
                             <Input
                                 id="persona_juridica.ruc"
                                 name="persona_juridica.ruc"
                                 value={formData.persona_juridica.ruc ?? ''}
                                 onChange={handleInputChange}
                                 required
                                 className="mt-1"
                             />
                         </div>
                         {/* Documento RUC Empresa */}
                         {renderUploadStatus('ruc_pdf_id_juridica', 'PDF RUC Empresa')} {/* Unique key for juridica ruc */}
                     </div>

                     {/* --- Representante Legal --- */}
                     <div className="pt-4 mt-4 border-t">
                         <h4 className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">Representante Legal</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                 <Label htmlFor="persona_juridica.razon_social_representante_legal">Nombre Completo / Razón Social RL</Label>
                                 <Input
                                     id="persona_juridica.razon_social_representante_legal"
                                     name="persona_juridica.razon_social_representante_legal"
                                     value={formData.persona_juridica.razon_social_representante_legal ?? ''}
                                     onChange={handleInputChange}
                                     required
                                     className="mt-1"
                                 />
                             </div>
                              {/* --- Switch y campos condicionales para RL es Empresa --- */}
                               <div className="flex items-center space-x-2 pt-5"> {/* Alineación vertical */}
                                  <Switch
                                      id="persona_juridica.representante_legal_es_empresa"
                                      name="persona_juridica.representante_legal_es_empresa"
                                      checked={formData.persona_juridica.representante_legal_es_empresa ?? false}
                                       onCheckedChange={(checked) => handleInputChange({ target: { name: 'persona_juridica.representante_legal_es_empresa', type: 'checkbox', checked } } as any)}
                                   />
                                  <Label htmlFor="persona_juridica.representante_legal_es_empresa">Representante Legal es Empresa</Label>
                              </div>


                              {/* Si RL NO es empresa, mostrar Cédula RL y sus documentos */}
                              {!formData.persona_juridica.representante_legal_es_empresa && (
                                  <>
                                      <div>
                                         <Label htmlFor="persona_juridica.cedula_representante_legal">Cédula RL</Label>
                                         <Input
                                             id="persona_juridica.cedula_representante_legal"
                                             name="persona_juridica.cedula_representante_legal"
                                             value={formData.persona_juridica.cedula_representante_legal ?? ''}
                                             onChange={handleInputChange}
                                             required
                                             className="mt-1"
                                         />
                                      </div>
                                      {/* Documento Cédula RL */}
                                      {renderUploadStatus('cedula_representante_legal_pdf_id', 'PDF Cédula RL')}
                                      {/* Documento Nombramiento RL */}
                                      {renderUploadStatus('nombramiento_representante_legal_pdf_id', 'PDF Nombramiento RL')}
                                 </>
                              )}
                          </div>
                      </div>

                    {/* --- Campos Empresa Representante Legal (Condicional) --- */}
                     {formData.persona_juridica.representante_legal_es_empresa && formData.persona_juridica.empresa_representante_legal && (
                         <motion.div
                             key="empresaRep"
                             initial={{ opacity: 0, y: -10 }}
                             animate={{ opacity: 1, y: 0 }}
                             exit={{ opacity: 0, y: -10 }}
                             className="space-y-4 border p-4 rounded-md mt-4 bg-gray-50" // Slightly different background
                         >
                             <h4 className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">Datos Empresa Representante</h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div>
                                     <Label htmlFor="persona_juridica.empresa_representante_legal.razon_social">Razón Social Empresa Rep.</Label>
                                     <Input
                                         id="persona_juridica.empresa_representante_legal.razon_social"
                                         name="persona_juridica.empresa_representante_legal.razon_social"
                                         value={formData.persona_juridica.empresa_representante_legal.razon_social ?? ''}
                                         onChange={handleInputChange}
                                         required
                                         className="mt-1"
                                     />
                                 </div>
                                 <div>
                                    <Label htmlFor="persona_juridica.empresa_representante_legal.ruc">RUC Empresa Rep.</Label>
                                     <Input
                                         id="persona_juridica.empresa_representante_legal.ruc"
                                         name="persona_juridica.empresa_representante_legal.ruc"
                                         value={formData.persona_juridica.empresa_representante_legal.ruc ?? ''}
                                         onChange={handleInputChange}
                                         required
                                         className="mt-1"
                                     />
                                 </div>
                                  {/* Nuevos campos para la persona natural representante */}
                                 <div>
                                     <Label htmlFor="persona_juridica.empresa_representante_legal.nombre_representante_persona_natural">Nombre Rep. Persona Natural</Label>
                                     <Input
                                         id="persona_juridica.empresa_representante_legal.nombre_representante_persona_natural"
                                         name="persona_juridica.empresa_representante_legal.nombre_representante_persona_natural"
                                         value={formData.persona_juridica.empresa_representante_legal.nombre_representante_persona_natural ?? ''}
                                         onChange={handleInputChange}
                                         required
                                         className="mt-1"
                                     />
                                 </div>
                                 <div>
                                    <Label htmlFor="persona_juridica.empresa_representante_legal.cedula_representante_persona_natural">Cédula Rep. Persona Natural</Label>
                                     <Input
                                         id="persona_juridica.empresa_representante_legal.cedula_representante_persona_natural"
                                         name="persona_juridica.empresa_representante_legal.cedula_representante_persona_natural"
                                         value={formData.persona_juridica.empresa_representante_legal.cedula_representante_persona_natural ?? ''}
                                         onChange={handleInputChange}
                                         required
                                         className="mt-1"
                                     />
                                 </div>
                                  {/* Documento RUC Empresa Rep. */}
                                 {renderUploadStatus('ruc_empresa_pdf_id', 'PDF RUC Empresa Rep.')}
                                  {/* Documento Autorización Rep. */}
                                 {renderUploadStatus('autorizacion_representacion_pdf_id', 'PDF Autorización Rep.')}
                                  {/* Documento Cédula Persona Natural Rep. */}
                                 {renderUploadStatus('cedula_representante_persona_natural_pdf_id', 'PDF Cédula Rep. Persona Natural')}
                             </div>
                         </motion.div>
                     )}

                 </motion.div>
             )}

             {/* --- Campos Comunes Perfil Cliente (Contactos - Simplificado) --- */}
             <fieldset className="space-y-4 border p-4 rounded-md">
                 <legend className="text-sm font-semibold text-gray-700 mb-2 px-1">Información de Contacto</legend>
                 {/* Ejemplo con un solo contacto, replicar para otros */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div>
                         <Label htmlFor="contacto_gerente.nombre">Nombre Gerente</Label>
                         <Input
                             id="contacto_gerente.nombre"
                             name="contacto_gerente.nombre"
                             value={formData.contacto_gerente?.nombre ?? ''}
                             onChange={handleInputChange}
                             className="mt-1"
                             placeholder="Juan Pérez"
                         />
                     </div>
                      <div>
                         <Label htmlFor="contacto_gerente.email">Email Gerente</Label>
                         <Input
                             id="contacto_gerente.email"
                             name="contacto_gerente.email"
                             type="email"
                             value={formData.contacto_gerente?.email ?? ''}
                             onChange={handleInputChange}
                             className="mt-1"
                             placeholder="gerente@ejemplo.com"
                         />
                     </div>
                     <div>
                         <Label htmlFor="contacto_gerente.telefono">Teléfono Gerente</Label>
                         <Input
                             id="contacto_gerente.telefono"
                             name="contacto_gerente.telefono"
                             value={formData.contacto_gerente?.telefono ?? ''}
                             onChange={handleInputChange}
                             className="mt-1"
                             placeholder="0991234567"
                         />
                     </div>
                 </div>

                 {/* Contacto Administrativo */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                    <div>
                        <Label htmlFor="contacto_administrativo.nombre">Nombre Admin.</Label>
                        <Input
                            id="contacto_administrativo.nombre"
                            name="contacto_administrativo.nombre"
                            value={formData.contacto_administrativo?.nombre ?? ''}
                            onChange={handleInputChange}
                            className="mt-1"
                            placeholder="Ana García"
                        />
                    </div>
                     <div>
                        <Label htmlFor="contacto_administrativo.email">Email Admin.</Label>
                        <Input
                            id="contacto_administrativo.email"
                            name="contacto_administrativo.email"
                            type="email"
                            value={formData.contacto_administrativo?.email ?? ''}
                            onChange={handleInputChange}
                            className="mt-1"
                            placeholder="admin@ejemplo.com"
                        />
                    </div>
                    <div>
                        <Label htmlFor="contacto_administrativo.telefono">Teléfono Admin.</Label>
                        <Input
                            id="contacto_administrativo.telefono"
                            name="contacto_administrativo.telefono"
                            value={formData.contacto_administrativo?.telefono ?? ''}
                            onChange={handleInputChange}
                            className="mt-1"
                            placeholder="0987654321"
                        />
                    </div>
                </div>

                {/* Contacto Proveedores */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                    <div>
                        <Label htmlFor="contacto_proveedores.nombre">Nombre Proveedores</Label>
                        <Input
                            id="contacto_proveedores.nombre"
                            name="contacto_proveedores.nombre"
                            value={formData.contacto_proveedores?.nombre ?? ''}
                            onChange={handleInputChange}
                            className="mt-1"
                            placeholder="Carlos Ruiz"
                        />
                    </div>
                     <div>
                        <Label htmlFor="contacto_proveedores.email">Email Proveedores</Label>
                        <Input
                            id="contacto_proveedores.email"
                            name="contacto_proveedores.email"
                            type="email"
                            value={formData.contacto_proveedores?.email ?? ''}
                            onChange={handleInputChange}
                            className="mt-1"
                            placeholder="proveedores@ejemplo.com"
                        />
                    </div>
                    <div>
                        <Label htmlFor="contacto_proveedores.telefono">Teléfono Proveedores</Label>
                        <Input
                            id="contacto_proveedores.telefono"
                            name="contacto_proveedores.telefono"
                            value={formData.contacto_proveedores?.telefono ?? ''}
                            onChange={handleInputChange}
                            className="mt-1"
                            placeholder="0976543210"
                        />
                    </div>
                </div>

             </fieldset>


            {/* Botones Submit/Cancel */}
            <div className="flex justify-end gap-3 pt-5 border-t border-gray-200"> {/* Reduced padding */}
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={isSaving} className="bg-[#007F44] hover:bg-[#007F44]/80"> {/* Added Ethos green */}
                    {isSaving ? "Guardando..." : (mode === 'create' ? "Crear Cliente" : "Guardar Cambios")}
                </Button>
            </div>
        </form>
    );
}
