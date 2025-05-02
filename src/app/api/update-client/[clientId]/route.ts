import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
// Importar los tipos BASE del formulario
import type { 
    ClientFormData as BaseClientFormData, 
    PersonaNaturalData as BasePersonaNaturalData,
    PersonaJuridicaData as BasePersonaJuridicaData,
    EmpresaRepresentadaData as BaseEmpresaRepresentadaData,
    PendingUploadsState 
} from '@/app/dashboard/_components/ClientForm';

// --- Configuración del Cliente Supabase (Servidor - Admin) ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("!!! Supabase URL or Service Role Key not set in environment variables !!!");
}

const supabaseAdmin = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
    : null;

// --- Tipos internos API --- 
type ArchivoInfo = { id: number; filename: string | null; external_url: string | null } | null;
type ArchivoResult = { id: number; };
type PersonaResult = { id: number; };
type EmpresaResult = { id: number; };

// Tipos EXTENDIDOS para reflejar la estructura de datos que llega a la API
// (con objetos archivo en lugar de solo IDs)
type EmpresaRepresentadaDataForAPI = Omit<BaseEmpresaRepresentadaData, 'ruc_empresa_pdf_id' | 'autorizacion_representacion_pdf_id' | 'cedula_representante_persona_natural_pdf_id'> & {
    ruc_empresa_pdf?: ArchivoInfo;
    autorizacion_representacion_pdf?: ArchivoInfo;
    // Usar la misma clave que en el form para consistencia aquí
    cedula_representante_legal_pdf?: ArchivoInfo; 
};
type PersonaNaturalDataForAPI = Omit<BasePersonaNaturalData, 'ruc_pdf_id' | 'cedula_pdf_id'> & {
    ruc_pdf?: ArchivoInfo;
    cedula_pdf?: ArchivoInfo;
};
type PersonaJuridicaDataForAPI = Omit<BasePersonaJuridicaData, 'ruc_pdf_id' | 'cedula_representante_legal_pdf_id' | 'nombramiento_representante_legal_pdf_id' | 'empresa_representante_legal'> & {
    ruc_pdf?: ArchivoInfo;
    cedula_representante_legal_pdf?: ArchivoInfo;
    nombramiento_representante_legal_pdf?: ArchivoInfo;
    empresa_representante_legal?: EmpresaRepresentadaDataForAPI | null; // Usar el tipo extendido anidado
};
// Tipo final para el formData que llega a la API
type ClientFormDataForAPI = Omit<BaseClientFormData, 'persona_natural' | 'persona_juridica'> & {
    persona_natural?: PersonaNaturalDataForAPI | null;
    persona_juridica?: PersonaJuridicaDataForAPI | null;
};

// --- Handler para PUT (o POST si prefieres) ---
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
    if (!supabaseAdmin) {
        return NextResponse.json({ message: 'Server configuration error.' }, { status: 500 });
    }

    const paramsResolved = await params;
    const clientId = parseInt(paramsResolved.clientId, 10);
    if (isNaN(clientId)) {
        return NextResponse.json({ message: 'Invalid client ID.' }, { status: 400 });
    }

    try {
        // 1. Obtener y validar datos del body
        const { formData, pendingUploads } = await request.json() as { formData: ClientFormDataForAPI, pendingUploads: PendingUploadsState };
        if (!formData) {
            return NextResponse.json({ message: 'Missing formData in request body.' }, { status: 400 });
        }

        // 2. (Opcional pero recomendado) Verificar autenticación/autorización del usuario que llama
        // ... (Lógica similar a la de finalize-upload, usando Supabase server client)

        console.log(`[API Update Client ${clientId}] Received data:`, { formData, pendingUploads });

        // 3. Procesar Archivos Pendientes
        const createdArchivosMap: Record<string, number> = {}; // Map docTypeKey -> new archivo.id
        if (pendingUploads) {
            for (const docTypeKey in pendingUploads) {
                const uploadData = pendingUploads[docTypeKey];
                if (uploadData) {
                    console.log(`[API Update Client ${clientId}] Creating archivo for ${docTypeKey}`);
                    const { data: newArchivo, error: createError } = await supabaseAdmin
                        .from('archivos')
                        .insert({
                            filename: uploadData.name,
                            external_url: uploadData.url,
                            external_storage_key: uploadData.key
                        })
                        .select('id')
                        .single<ArchivoResult>();

                    if (createError) throw new Error(`Failed to create archivo for ${docTypeKey}: ${createError.message}`);
                    if (!newArchivo) throw new Error(`No ID returned after creating archivo for ${docTypeKey}`);
                    
                    createdArchivosMap[docTypeKey] = newArchivo.id;
                    console.log(`[API Update Client ${clientId}] Created archivo ID ${newArchivo.id} for ${docTypeKey}`);
                }
            }
        }

        // --- Mapeo de claves de formulario a claves de DB (incluyendo archivos) ---
        // Esto ayuda a construir los objetos para Supabase
        const mapDocTypeToDbField = (key: string): string | null => {
             // Claves usadas en pendingUploads y formData (con _pdf) vs. claves en DB (con _pdf_id)
             switch (key) {
                 case 'cedula_pdf_id': return 'cedula_pdf_id';
                 case 'ruc_pdf_id_natural': return 'ruc_pdf_id'; // Mapea a ruc_pdf_id en personas_natural
                 case 'ruc_pdf_id_juridica': return 'ruc_pdf_id'; // Mapea a ruc_pdf_id en personas_juridica
                 case 'cedula_representante_legal_pdf_id': return 'cedula_representante_legal_pdf_id';
                 case 'nombramiento_representante_legal_pdf_id': return 'nombramiento_representante_legal_pdf_id';
                 case 'ruc_empresa_pdf_id': return 'ruc_empresa_pdf_id'; // En empresas_representada
                 case 'autorizacion_representacion_pdf_id': return 'autorizacion_representacion_pdf_id'; // En empresas_representada
                 // OJO: Usamos la clave del form (con _persona_natural) pero el campo DB es solo cedula_representante_legal_pdf_id
                 case 'cedula_representante_persona_natural_pdf_id': return 'cedula_representante_legal_pdf_id'; // En empresas_representada
                 default: return null;
             }
         };

        let personaNaturalId: number | null = formData.persona_natural?.id ?? null;
        let personaJuridicaId: number | null = formData.persona_juridica?.id ?? null;
        let empresaRepresentadaId: number | null = formData.persona_juridica?.empresa_representante_legal?.id ?? null;

        // 4. Upsert Empresa Representada (si aplica)
        if (formData.tipo_persona === 'Juridica' && formData.persona_juridica?.representante_legal_es_empresa && formData.persona_juridica.empresa_representante_legal) {
            const empresaDataRaw = formData.persona_juridica.empresa_representante_legal;
            const empresaDataToSave: any = {
                id: empresaRepresentadaId,
                razon_social: empresaDataRaw.razon_social,
                ruc: empresaDataRaw.ruc,
                nombre_representante_persona_natural: empresaDataRaw.nombre_representante_persona_natural,
                cedula_representante_persona_natural: empresaDataRaw.cedula_representante_persona_natural,
                // Añadir IDs de archivos nuevos
                ruc_empresa_pdf_id: createdArchivosMap['ruc_empresa_pdf_id'] ?? (empresaDataRaw.ruc_empresa_pdf ? empresaDataRaw.ruc_empresa_pdf.id : null),
                autorizacion_representacion_pdf_id: createdArchivosMap['autorizacion_representacion_pdf_id'] ?? (empresaDataRaw.autorizacion_representacion_pdf ? empresaDataRaw.autorizacion_representacion_pdf.id : null),
                cedula_representante_legal_pdf_id: createdArchivosMap['cedula_representante_persona_natural_pdf_id'] ?? (empresaDataRaw.cedula_representante_legal_pdf ? empresaDataRaw.cedula_representante_legal_pdf.id : null),
            };
            
            // Remover IDs nulos para que upsert funcione correctamente si es una creación
            if (!empresaDataToSave.id) delete empresaDataToSave.id;

            console.log(`[API Update Client ${clientId}] Upserting empresa_representada:`, empresaDataToSave);
            const { data: upsertedEmpresa, error: empresaError } = await supabaseAdmin
                .from('empresas_representada')
                .upsert(empresaDataToSave)
                .select('id')
                .single<EmpresaResult>();

            if (empresaError) throw new Error(`Failed to upsert empresa_representada: ${empresaError.message}`);
            if (!upsertedEmpresa) throw new Error('No ID returned after upserting empresa_representada');
            empresaRepresentadaId = upsertedEmpresa.id;
             console.log(`[API Update Client ${clientId}] Upserted empresa_representada ID: ${empresaRepresentadaId}`);
        } else if (formData.tipo_persona === 'Juridica' && !formData.persona_juridica?.representante_legal_es_empresa) {
             // Si se cambió a que RL no es empresa, asegurarse que el ID de la empresa rep. sea null
             empresaRepresentadaId = null;
             // TODO: Considerar eliminar el registro antiguo de empresas_representada si ya no se usa?
        }

        // 5. Upsert Persona Natural / Jurídica
        if (formData.tipo_persona === 'Natural' && formData.persona_natural) {
            const naturalDataRaw = formData.persona_natural; // Ahora es de tipo PersonaNaturalDataForAPI
            const naturalDataToSave: any = {
                id: personaNaturalId,
                aplica_ruc: naturalDataRaw.aplica_ruc,
                razon_social: naturalDataRaw.razon_social,
                ruc: naturalDataRaw.aplica_ruc ? naturalDataRaw.ruc : null,
                cedula: naturalDataRaw.cedula,
                ruc_pdf_id: naturalDataRaw.aplica_ruc 
                    ? (createdArchivosMap['ruc_pdf_id_natural'] ?? (naturalDataRaw.ruc_pdf ? naturalDataRaw.ruc_pdf.id : null)) 
                    : null,
                cedula_pdf_id: createdArchivosMap['cedula_pdf_id'] ?? (naturalDataRaw.cedula_pdf ? naturalDataRaw.cedula_pdf.id : null),
            };
            if (!naturalDataToSave.id) delete naturalDataToSave.id;
            
            console.log(`[API Update Client ${clientId}] Upserting personas_natural:`, naturalDataToSave);
            const { data: upsertedNatural, error: naturalError } = await supabaseAdmin
                .from('personas_natural')
                .upsert(naturalDataToSave)
                .select('id')
                .single<PersonaResult>();

            if (naturalError) throw new Error(`Failed to upsert personas_natural: ${naturalError.message}`);
            if (!upsertedNatural) throw new Error('No ID returned after upserting personas_natural');
            personaNaturalId = upsertedNatural.id;
            personaJuridicaId = null; // Asegurar que el otro tipo sea null
             console.log(`[API Update Client ${clientId}] Upserted personas_natural ID: ${personaNaturalId}`);

        } else if (formData.tipo_persona === 'Juridica' && formData.persona_juridica) {
            const juridicaDataRaw = formData.persona_juridica; // Ahora es de tipo PersonaJuridicaDataForAPI
            let empresaRepIdToSave: number | null = null;
            if (juridicaDataRaw.representante_legal_es_empresa && juridicaDataRaw.empresa_representante_legal) {
                 empresaRepIdToSave = empresaRepresentadaId;
            }

            const juridicaDataToSave: any = {
                id: personaJuridicaId,
                razon_social: juridicaDataRaw.razon_social,
                nombre_comercial: juridicaDataRaw.nombre_comercial,
                razon_social_representante_legal: juridicaDataRaw.razon_social_representante_legal,
                representante_legal_es_empresa: juridicaDataRaw.representante_legal_es_empresa,
                cedula_representante_legal: juridicaDataRaw.representante_legal_es_empresa ? null : juridicaDataRaw.cedula_representante_legal,
                ruc: juridicaDataRaw.ruc,
                empresa_representante_legal_id: empresaRepIdToSave,
                ruc_pdf_id: createdArchivosMap['ruc_pdf_id_juridica'] ?? (juridicaDataRaw.ruc_pdf ? juridicaDataRaw.ruc_pdf.id : null),
                cedula_representante_legal_pdf_id: !juridicaDataRaw.representante_legal_es_empresa 
                    ? (createdArchivosMap['cedula_representante_legal_pdf_id'] ?? (juridicaDataRaw.cedula_representante_legal_pdf ? juridicaDataRaw.cedula_representante_legal_pdf.id : null)) 
                    : null,
                nombramiento_representante_legal_pdf_id: !juridicaDataRaw.representante_legal_es_empresa 
                    ? (createdArchivosMap['nombramiento_representante_legal_pdf_id'] ?? (juridicaDataRaw.nombramiento_representante_legal_pdf ? juridicaDataRaw.nombramiento_representante_legal_pdf.id : null)) 
                    : null,
             };
            if (!juridicaDataToSave.id) delete juridicaDataToSave.id;
            
            console.log(`[API Update Client ${clientId}] Upserting personas_juridica:`, juridicaDataToSave);
            const { data: upsertedJuridica, error: juridicaError } = await supabaseAdmin
                .from('personas_juridica')
                .upsert(juridicaDataToSave)
                .select('id')
                .single<PersonaResult>();

            if (juridicaError) throw new Error(`Failed to upsert personas_juridica: ${juridicaError.message}`);
            if (!upsertedJuridica) throw new Error('No ID returned after upserting personas_juridica');
            personaJuridicaId = upsertedJuridica.id;
            personaNaturalId = null; // Asegurar que el otro tipo sea null
             console.log(`[API Update Client ${clientId}] Upserted personas_juridica ID: ${personaJuridicaId}`);
        }

        // 6. Actualizar Perfil Cliente
        const perfilDataToUpdate: any = {
            tipo_persona: formData.tipo_persona,
            rol: formData.rol,
            contacto_gerente: formData.contacto_gerente ?? null,
            contacto_administrativo: formData.contacto_administrativo ?? null,
            contacto_proveedores: formData.contacto_proveedores ?? null,
            contacto_accesos: formData.contacto_accesos ?? null,
            // Asignar el ID correcto y asegurar que el otro sea null
            persona_natural_id: formData.tipo_persona === 'Natural' ? personaNaturalId : null,
            persona_juridica_id: formData.tipo_persona === 'Juridica' ? personaJuridicaId : null,
        };

        console.log(`[API Update Client ${clientId}] Updating perfiles_cliente:`, perfilDataToUpdate);
        const { error: updateError } = await supabaseAdmin
            .from('perfiles_cliente')
            .update(perfilDataToUpdate)
            .eq('id', clientId);

        if (updateError) {
            throw new Error(`Failed to update perfiles_cliente: ${updateError.message}`);
        }

        console.log(`[API Update Client ${clientId}] Update successful.`);

        // 7. Devolver respuesta exitosa
        // Podríamos devolver el perfil actualizado si quisiéramos
        return NextResponse.json({ message: 'Cliente actualizado con éxito.' }, { status: 200 });

    } catch (error: any) {
        console.error(`[API Update Client ${clientId}] Error:`, error);
        return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
    }
} 