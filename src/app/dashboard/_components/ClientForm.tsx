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
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
// --- Tipos (Basados en SCHEMA.MD - Simplificados por ahora) ---

// Tipos para los datos específicos de persona
type PersonaNaturalData = {
    id?: number;
    aplica_ruc?: boolean;
    razon_social?: string; // Nombre completo
    ruc?: string;
    cedula?: string;
    // IDs de PDFs se manejarán por separado
};

type PersonaJuridicaData = {
    id?: number;
    razon_social?: string;
    nombre_comercial?: string;
    razon_social_representante_legal?: string;
    representante_legal_es_empresa?: boolean;
    cedula_representante_legal?: string;
    ruc?: string;
    empresa_representante_legal_id?: number; // Simplificado por ahora
    // IDs de PDFs se manejarán por separado
};

// Tipo para Contactos (Simplificado)
type ContactoData = {
    nombre?: string;
    email?: string;
    telefono?: string;
};

// Tipo principal para el formulario
export type ClientFormData = {
    id?: number; // ID del PerfilCliente (para edición)
    tipo_persona: 'Natural' | 'Juridica';
    // Información de contacto (JSONB - usar textareas por ahora)
    contacto_gerente?: string; // JSON stringificado
    contacto_administrativo?: string; // JSON stringificado
    contacto_proveedores?: string; // JSON stringificado
    contacto_accesos?: string; // JSON stringificado
    rol?: 'Propietario' | 'Arrendatario' | null; // Rol en PerfilCliente
    // Datos específicos anidados
    persona_natural?: PersonaNaturalData | null;
    persona_juridica?: PersonaJuridicaData | null;
};

// --- Props del Componente ---
interface ClientFormProps {
    initialData: Partial<ClientFormData>;
    onSubmit: (data: ClientFormData) => Promise<void>; // Ajustar 'any' luego
    onCancel: () => void;
    isSaving: boolean;
    mode: 'create' | 'edit';
    // Podríamos añadir assignmentContext aquí si es necesario
}

// --- Estado Inicial Default ---
const defaultInitialData: ClientFormData = {
    tipo_persona: 'Natural', // Default a Natural
    contacto_gerente: '',
    contacto_administrativo: '',
    contacto_proveedores: '',
    contacto_accesos: '',
    rol: null,
    persona_natural: { aplica_ruc: false, razon_social: '', ruc: '', cedula: '' },
    persona_juridica: null,
};

// --- Componente ---
export function ClientForm({
    initialData,
    onSubmit,
    onCancel,
    isSaving,
    mode
}: ClientFormProps) {

    const [formData, setFormData] = useState<ClientFormData>({
        ...defaultInitialData,
        ...initialData,
         // Asegurar que solo uno de persona_natural/juridica esté activo basado en tipo_persona inicial
        persona_natural: initialData.tipo_persona === 'Natural' ? { ...defaultInitialData.persona_natural, ...initialData.persona_natural } : null,
        persona_juridica: initialData.tipo_persona === 'Juridica' ? { ...defaultInitialData.persona_juridica, ...initialData.persona_juridica } : null,
    });
    const [error, setError] = useState<string | null>(null);

    // --- Efecto para inicializar/resetear cuando initialData cambia ---
     useEffect(() => {
         const currentType = initialData?.tipo_persona || 'Natural';
         setFormData({
             id: initialData?.id,
             tipo_persona: currentType,
             contacto_gerente: initialData?.contacto_gerente || '', // Asumir stringified JSON o vacío
             contacto_administrativo: initialData?.contacto_administrativo || '',
             contacto_proveedores: initialData?.contacto_proveedores || '',
             contacto_accesos: initialData?.contacto_accesos || '',
             rol: initialData?.rol || null,
             persona_natural: currentType === 'Natural'
                 ? { // Merge defaults y datos iniciales para Natural
                     aplica_ruc: initialData?.persona_natural?.aplica_ruc ?? false,
                     razon_social: initialData?.persona_natural?.razon_social || '',
                     ruc: initialData?.persona_natural?.ruc || '',
                     cedula: initialData?.persona_natural?.cedula || '',
                     id: initialData?.persona_natural?.id // Mantener ID si existe (edición)
                 }
                 : null,
             persona_juridica: currentType === 'Juridica'
                 ? { // Merge defaults y datos iniciales para Juridica
                     razon_social: initialData?.persona_juridica?.razon_social || '',
                     nombre_comercial: initialData?.persona_juridica?.nombre_comercial || '',
                     razon_social_representante_legal: initialData?.persona_juridica?.razon_social_representante_legal || '',
                     representante_legal_es_empresa: initialData?.persona_juridica?.representante_legal_es_empresa ?? false,
                     cedula_representante_legal: initialData?.persona_juridica?.cedula_representante_legal || '',
                     ruc: initialData?.persona_juridica?.ruc || '',
                     id: initialData?.persona_juridica?.id // Mantener ID si existe (edición)
                     // empresa_representante_legal_id: ... (más complejo, añadir después)
                 }
                 : null,
         });
     }, [initialData]);

    // --- Handlers ---

    const handleTypeChange = (value: 'Natural' | 'Juridica') => {
        setFormData(prev => ({
            ...prev,
            tipo_persona: value,
            // Resetear los datos del otro tipo al cambiar
            persona_natural: value === 'Natural' ? (prev.persona_natural ?? { ...defaultInitialData.persona_natural }) : null,
            persona_juridica: value === 'Juridica' ? (prev.persona_juridica ?? { /* default Juridica */ }) : null,
        }));
    };

    // Handler genérico para inputs (simplificado, necesita mejorar para anidados)
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type, checked } = e.target as HTMLInputElement; // Type assertion for checked
        const keys = name.split('.'); // e.g., 'persona_natural.razon_social'

        setFormData(prev => {
            let newState = structuredClone(prev); // Deep clone para estado anidado
            let currentLevel: any = newState;

            for (let i = 0; i < keys.length - 1; i++) {
                if (!currentLevel[keys[i]]) {
                    // Si el nivel no existe (ej, cambiando a Juridica y editando persona_juridica.ruc), inicialízalo
                    if (keys[i] === 'persona_natural' && newState.tipo_persona === 'Natural') {
                         currentLevel[keys[i]] = { ...defaultInitialData.persona_natural };
                    } else if (keys[i] === 'persona_juridica' && newState.tipo_persona === 'Juridica') {
                         currentLevel[keys[i]] = { /* default Juridica */ }; // Añadir defaults de Juridica aquí
                     } else {
                         currentLevel[keys[i]] = {}; // Fallback genérico
                    }
                }
                currentLevel = currentLevel[keys[i]];
            }

            const finalKey = keys[keys.length - 1];

             // Manejar diferentes tipos de input
            if (type === 'checkbox') {
                currentLevel[finalKey] = checked;
            } else if (type === 'number') {
                 currentLevel[finalKey] = value === '' ? null : Number(value);
             } else {
                 currentLevel[finalKey] = value;
             }

            return newState;
        });
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

        // TODO: Validar datos aquí antes de enviar

        // TODO: Parsear strings JSON de contactos a objetos si es necesario por la API

        try {
            await onSubmit(formData);
        } catch (submitError: any) {
            console.error("Error submitting client form:", submitError);
            setError(submitError.message || "Ocurrió un error al guardar.");
        }
    };

    // --- JSX ---
    return (
        <form onSubmit={handleInternalSubmit} className="bg-white rounded-xl border p-6 md:p-8 shadow-sm space-y-8">
            {error && (
                <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
                    <span className="font-medium">Error:</span> {error}
                </div>
            )}

            {/* Selector Tipo Persona */}
             <fieldset className="space-y-3">
                <Label className="text-base font-semibold">Tipo de Cliente</Label>
                 <RadioGroup
                     defaultValue={formData.tipo_persona}
                     value={formData.tipo_persona}
                     onValueChange={handleTypeChange}
                     className="flex space-x-4"
                 >
                     <div className="flex items-center space-x-2">
                         <RadioGroupItem value="Natural" id="r-natural" />
                         <Label htmlFor="r-natural">Persona Natural</Label>
                     </div>
                     <div className="flex items-center space-x-2">
                         <RadioGroupItem value="Juridica" id="r-juridica" />
                         <Label htmlFor="r-juridica">Persona Jurídica</Label>
                     </div>
                 </RadioGroup>
             </fieldset>

             {/* --- Campos Persona Natural --- */}
             {formData.tipo_persona === 'Natural' && formData.persona_natural && (
                 <motion.div
                    key="natural"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4 border p-4 rounded-md"
                >
                     <h3 className="font-medium">Datos Persona Natural</h3>
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
                         <div className="flex items-center space-x-2 pt-4">
                             <Switch
                                id="persona_natural.aplica_ruc"
                                name="persona_natural.aplica_ruc"
                                checked={formData.persona_natural.aplica_ruc ?? false}
                                onCheckedChange={(checked) => handleInputChange({ target: { name: 'persona_natural.aplica_ruc', type: 'checkbox', checked } } as any)}
                             />
                             <Label htmlFor="persona_natural.aplica_ruc">¿Aplica RUC?</Label>
                         </div>
                          <div className={`${formData.persona_natural.aplica_ruc ? '' : 'opacity-50'}`}>
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
                     </div>
                     {/* TODO: Añadir campos para subir PDF Cédula y RUC */}
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
                     <h3 className="font-medium">Datos Persona Jurídica</h3>
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
                     </div>
                     <hr className="my-4"/>
                     <h4 className="font-medium text-sm">Representante Legal</h4>
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
                         {/* TODO: Añadir switch para representante_legal_es_empresa y campos condicionales */}
                     </div>
                     {/* TODO: Añadir campos para subir PDF RUC, Cédula RL, Nombramiento */}
                 </motion.div>
             )}

            {/* --- Campos Comunes Perfil Cliente --- */}
             <fieldset className="space-y-4 border p-4 rounded-md">
                 <legend className="text-sm font-medium px-1">Información de Contacto (Opcional)</legend>
                 {/* Usar Textareas para JSON por ahora */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="contacto_gerente">Contacto Gerente (JSON)</Label>
                        <textarea
                            id="contacto_gerente"
                            name="contacto_gerente"
                            rows={3}
                            value={formData.contacto_gerente ?? ''}
                            onChange={handleInputChange}
                            placeholder='Ej: { "nombre": "Juan Perez", "email": "jp@ejemplo.com" }'
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                    </div>
                     <div>
                        <Label htmlFor="contacto_administrativo">Contacto Administrativo (JSON)</Label>
                        <textarea
                            id="contacto_administrativo"
                            name="contacto_administrativo"
                            rows={3}
                            value={formData.contacto_administrativo ?? ''}
                            onChange={handleInputChange}
                            placeholder='Ej: { "nombre": "Ana Gomez", "telefono": "0991234567" }'
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                    </div>
                    {/* Añadir Proveedores y Accesos si se necesita */}
                 </div>
             </fieldset>

            {/* TODO: Campo Select para Rol (Propietario/Arrendatario) si mode == 'edit' y no hay contexto de asignación */}


            {/* Botones Submit/Cancel */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Guardando..." : (mode === 'create' ? "Crear Cliente" : "Guardar Cambios")}
                </Button>
            </div>
        </form>
    );
}
