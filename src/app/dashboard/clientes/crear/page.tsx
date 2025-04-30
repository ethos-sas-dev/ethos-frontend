"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ClientForm, type ClientFormData } from "../../_components/ClientForm"; // Ajustar ruta
import { createClient } from "../../../../../lib/supabase/client"; // Ajustar ruta
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { Button } from "../../../_components/ui/button";

// Definir un tipo más específico para los datos que enviaremos a la función/API
type CreateClientPayload = ClientFormData; // Podría necesitar ajustes

export default function CreateClientPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = createClient();

    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- Obtener parámetros para asignación automática --- 
    const propertyIdToAssign = searchParams.get("assignToProperty");
    // Leer el rol del contexto (Propietario u Ocupante)
    const assignmentContext = searchParams.get("assignRole") as 'Propietario' | 'Ocupante' | null;
    const redirectTo = searchParams.get("redirectTo");

    // --- Determinar Roles Permitidos y Rol Inicial --- 
    let allowedRolesForForm: ('Propietario' | 'Arrendatario' | 'Externo')[] | undefined;
    let initialRole: 'Propietario' | 'Arrendatario' | 'Externo' | null = null;

    if (assignmentContext === 'Propietario') {
        allowedRolesForForm = ['Propietario'];
        initialRole = 'Propietario'; // Preseleccionar rol
    } else if (assignmentContext === 'Ocupante') {
         allowedRolesForForm = ['Arrendatario', 'Externo'];
        // No preseleccionamos entre Arrendatario/Externo, dejamos que el usuario elija
    } else {
         // Si no hay contexto, permitir todos los roles
         allowedRolesForForm = ['Propietario', 'Arrendatario', 'Externo'];
    }

    const handleCancel = () => {
        // Si venimos de asignar, volver a la página de propiedad
        if (redirectTo) {
             router.push(redirectTo);
         } else {
             router.back(); // O ir a la lista de clientes: router.push('/dashboard/clientes');
         }
    };

    // --- Lógica de Creación y Asignación ---
    const handleCreateClient = async (formData: ClientFormData, pendingUploads: any /* PendingUploadsState */) => { // Añadir pendingUploads
        setIsSaving(true);
        setError(null);
        console.log("Form data received:", JSON.stringify(formData, null, 2));
        console.log("Pending uploads received:", JSON.stringify(pendingUploads, null, 2));

        // --- Construir Payload para la RPC ---
        const personaData: any = {}; // Usamos 'any' temporalmente para flexibilidad
        const perfilData: any = {
             contacto_gerente: formData.contacto_gerente,
             contacto_administrativo: formData.contacto_administrativo,
             contacto_proveedores: formData.contacto_proveedores,
             contacto_accesos: formData.contacto_accesos,
             rol: formData.rol // Aunque aquí no lo pedimos, lo pasamos si existiera
        };

        if (formData.tipo_persona === 'Natural') {
            Object.assign(personaData, formData.persona_natural);
            // Reemplazar/Añadir detalles de documentos desde pendingUploads
            personaData.cedula_pdf = pendingUploads['cedula_pdf_id'] || null; // Usa la key del renderUploadStatus
            personaData.ruc_pdf = pendingUploads['ruc_pdf_id_natural'] || null; // Usa la key del renderUploadStatus
            // Remover los campos _id originales si existen para evitar confusión
            delete personaData.cedula_pdf_id;
            delete personaData.ruc_pdf_id;

        } else if (formData.tipo_persona === 'Juridica') {
            Object.assign(personaData, formData.persona_juridica);
             // Documentos de Persona Juridica
             personaData.ruc_pdf = pendingUploads['ruc_pdf_id_juridica'] || null;
             personaData.cedula_representante_legal_pdf = pendingUploads['cedula_representante_legal_pdf_id'] || null;
             personaData.nombramiento_representante_legal_pdf = pendingUploads['nombramiento_representante_legal_pdf_id'] || null;
             delete personaData.ruc_pdf_id;
             delete personaData.cedula_representante_legal_pdf_id;
             delete personaData.nombramiento_representante_legal_pdf_id;

            // Documentos de Empresa Representante (si aplica)
             if (personaData.representante_legal_es_empresa && personaData.empresa_representante_legal) {
                 personaData.empresa_representante_legal.ruc_empresa_pdf = pendingUploads['ruc_empresa_pdf_id'] || null;
                 personaData.empresa_representante_legal.autorizacion_representacion_pdf = pendingUploads['autorizacion_representacion_pdf_id'] || null;
                 personaData.empresa_representante_legal.cedula_representante_persona_natural_pdf = pendingUploads['cedula_representante_persona_natural_pdf_id'] || null;
                 // Remover IDs originales del sub-objeto
                 delete personaData.empresa_representante_legal.ruc_empresa_pdf_id;
                 delete personaData.empresa_representante_legal.autorizacion_representacion_pdf_id;
                 delete personaData.empresa_representante_legal.cedula_representante_persona_natural_pdf_id;
             } else {
                 // Asegurarse de que no se envíe si no aplica
                 // We need to keep the object but remove the document fields if they exist
                 if (personaData.empresa_representante_legal) {
                     delete personaData.empresa_representante_legal.ruc_empresa_pdf_id;
                     delete personaData.empresa_representante_legal.autorizacion_representacion_pdf_id;
                     delete personaData.empresa_representante_legal.cedula_representante_persona_natural_pdf_id;
                     // Set actual document fields to null before sending if RL is not Empresa
                     personaData.empresa_representante_legal.ruc_empresa_pdf = null;
                     personaData.empresa_representante_legal.autorizacion_representacion_pdf = null;
                     personaData.empresa_representante_legal.cedula_representante_persona_natural_pdf = null;
                     // The RPC should ignore empresa_representante_legal if representante_legal_es_empresa is false
                 }
             }
        }

        console.log("Payload final para RPC:", JSON.stringify({ tipo: formData.tipo_persona, persona: personaData, perfil: perfilData }, null, 2));


        try {
             console.log("Paso 1: Llamando RPC create_cliente_completo...");
             const { data: newClientId, error: createError } = await supabase.rpc('create_cliente_completo', {
                tipo_persona_input: formData.tipo_persona,
                persona_data_input: personaData,
                perfil_data_input: perfilData
             });

             if (createError) throw createError;

             // const newClientId = newClientData?.id; // El RPC debería devolver solo el ID

            if (!newClientId) { // Chequear si la RPC devolvió un ID válido
                throw new Error("La función RPC no devolvió un ID de cliente válido.");
            }

             console.log(`Cliente creado con ID: ${newClientId}`);

             // --- Paso 2: Asignar a propiedad si aplica ---
             if (propertyIdToAssign && assignmentContext && newClientId) {
                 console.log(`Paso 2: Asignando cliente ${newClientId} como ${assignmentContext} a propiedad ${propertyIdToAssign}...`);
                 const fieldToUpdate = assignmentContext === 'Propietario' ? 'propietario_id' : 'ocupante_id';

                 const { error: assignError } = await supabase
                     .from('propiedades')
                     .update({ [fieldToUpdate]: newClientId })
                    .eq('id', propertyIdToAssign);

                 if (assignError) {
                    // Si falla la asignación principal, mostramos error y NO continuamos
                     console.error(`Error en la asignación principal de ${assignmentContext}:`, assignError.message);
                     throw new Error(`Cliente creado (ID: ${newClientId}) pero falló la asignación como ${assignmentContext}: ${assignError.message}`);
                     // setError(`Cliente creado (ID: ${newClientId}) pero hubo un error al asignarlo: ${assignError.message}`);
                 } else {
                    console.log(`Asignación principal como ${assignmentContext} exitosa.`);

                     // --- Paso 2.1: Auto-asignar Ocupante si se asignó Propietario y está vacío ---
                     if (assignmentContext === 'Propietario') {
                         console.log("Verificando si se debe auto-asignar como ocupante...");
                         // Re-consultamos para estar seguros del estado actual
                         const { data: currentProperty, error: fetchError } = await supabase
                            .from('propiedades')
                            .select('ocupante_id')
                            .eq('id', propertyIdToAssign)
                            .maybeSingle();

                         if (fetchError) {
                             console.warn("Advertencia: No se pudo verificar el ocupante actual después de asignar propietario:", fetchError.message);
                         } else if (currentProperty && currentProperty.ocupante_id === null) {
                             console.log(`Propiedad ${propertyIdToAssign} no tiene ocupante. Asignando propietario ${newClientId} como ocupante...`);
                             const { error: occupantUpdateError } = await supabase
                                .from('propiedades')
                                .update({ ocupante_id: newClientId, ocupante_externo: false }) // Asegurar externo=false
                                .eq('id', propertyIdToAssign);

                             if (occupantUpdateError) {
                                 console.warn(`Advertencia: Propietario asignado, pero falló la auto-asignación como ocupante:`, occupantUpdateError.message);
                             } else {
                                 console.log("Auto-asignación como ocupante exitosa.");
                             }
                         } else {
                              console.log("La propiedad ya tiene un ocupante o no se pudo verificar. No se auto-asignará.");
                          }
                     }
                 }
             }

             // --- Paso 3: Redirección ---
             console.log(`Redirigiendo a: ${redirectTo || '/dashboard/clientes'}`);
             router.push(redirectTo || '/dashboard/clientes');

        } catch (err: any) {
            console.error("Error creando/asignando cliente:", err);
            setError(err.message || "Ocurrió un error en el proceso.");
             setIsSaving(false); // Permitir reintentar
        }
         // No ponemos setIsSaving(false) aquí en caso de éxito porque redirigimos
    };

    return (
        <div className="container mx-auto p-4 md:p-6 max-w-4xl">
             {/* Header */}
             <div className="flex items-center gap-4 mb-6">
                 <Button variant="outline" size="icon" onClick={handleCancel} aria-label="Volver">
                     <ArrowLeftIcon className="h-5 w-5" />
                 </Button>
                 <h1 className="text-xl md:text-2xl font-semibold">
                     Crear Nuevo Cliente
                 </h1>
            </div>

             {error && (
                 <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
                     <span className="font-medium">Error:</span> {error}
                 </div>
             )}

            <ClientForm
                 // Pasamos un objeto vacío como initialData para el modo creación
                 initialData={{ rol: initialRole }}
                 onSubmit={handleCreateClient} // Pasamos la función directamente
                 onCancel={handleCancel}
                 isSaving={isSaving}
                 mode="create"
                 allowedRoles={allowedRolesForForm}
             />
        </div>
    );
} 