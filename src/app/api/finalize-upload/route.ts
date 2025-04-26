import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js'; // O la forma que uses para el cliente de SERVIDOR

// --- Configuración del Cliente Supabase (Servidor - Admin) ---
// ¡¡¡ASEGÚRATE DE USAR VARIABLES DE ENTORNO SEGURAS PARA ESTO!!!
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;


if (!supabaseUrl || !supabaseServiceKey) {
    console.error("!!! Supabase URL or Service Role Key not set in environment variables !!!");
    // Consider throwing an error in production or handling it appropriately
}

// Crear cliente Admin usando la Service Role Key (bypass RLS)
// ¡ASEGÚRATE DE QUE ESTA RUTA ESTÉ PROTEGIDA ADECUADAMENTE!
const supabaseAdmin = supabaseUrl && supabaseServiceKey 
    ? createClient(supabaseUrl, supabaseServiceKey, {
        // Opcional: Especificar auth: { persistSession: false } si no necesitas persistencia
        auth: { persistSession: false }
      })
    : null;

// Tipo esperado en el cuerpo de la solicitud POST
type RequestBody = {
    fileDetails: {
        name: string;
        url: string;
        key: string; // external_storage_key
    };
    docType: string;      // Campo a actualizar (e.g., 'escritura_pdf_id')
    targetTable: string;  // Tabla a actualizar (e.g., 'propiedades')
    targetId: number;       // ID del registro a actualizar
};

// Handler para POST
export async function POST(request: Request) {
    if (!supabaseAdmin) {
        return NextResponse.json({ message: 'Server configuration error.' }, { status: 500 });
    }

    try {
        // 1. Parsear el cuerpo de la solicitud
        const body = await request.json() as RequestBody;
        const { fileDetails, docType, targetTable, targetId } = body;

        if (!fileDetails || !fileDetails.name || !fileDetails.url || !fileDetails.key || !docType || !targetTable || !targetId) {
            return NextResponse.json({ message: 'Missing required fields in request body.' }, { status: 400 });
        }

        // 2. (MUY RECOMENDADO) Verificar Autenticación/Autorización
        // Aunque usemos el cliente Admin para las operaciones DB,
        // DEBES verificar aquí si el *usuario que llama a esta API*
        // tiene permiso para hacerlo. Puedes usar el cliente de `server.ts` para esto:
        // import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
        // const supabaseUserClient = await createServerSupabaseClient();
        // const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();
        // if (userError || !user) {
        //     return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        // }
        // ... añadir lógica de permisos basada en el `user` y `targetId`/`targetTable` ...

        // 3. Crear la entrada en la tabla 'archivos' usando el cliente Admin
        console.log('Creating archivo record:', { filename: fileDetails.name, external_url: fileDetails.url, external_storage_key: fileDetails.key });
        const { data: newArchivo, error: createError } = await supabaseAdmin
            .from('archivos')
            .insert({
                filename: fileDetails.name,
                external_url: fileDetails.url,
                external_storage_key: fileDetails.key
            })
            .select()
            .single();

        if (createError) {
            console.error('Supabase insert error:', createError);
            throw new Error(`Failed to create archivo record: ${createError.message}`);
        }

        if (!newArchivo || !newArchivo.id) {
             console.error('No data returned after insert');
            throw new Error('Failed to get new archivo ID after insert.');
        }

        console.log('Archivo record created:', newArchivo.id);

        // 4. Actualizar la tabla de destino usando el cliente Admin
        console.log(`Updating ${targetTable} record ${targetId}, setting ${docType} to ${newArchivo.id}`);
        const { error: updateError } = await supabaseAdmin
            .from(targetTable)
            .update({ [docType]: newArchivo.id })
            .eq('id', targetId);

        if (updateError) {
             console.error(`Supabase update error on ${targetTable}:`, updateError);
             // Considerar eliminar el registro 'archivos' huérfano
             // await supabaseAdmin.from('archivos').delete().eq('id', newArchivo.id);
            throw new Error(`Failed to update ${targetTable}: ${updateError.message}`);
        }

        console.log('Update successful.');

        // 5. Devolver el objeto Archivo creado como confirmación
        return NextResponse.json({ newArchivo }, { status: 200 });

    } catch (error: any) {
        console.error("Error in /api/finalize-upload:", error);
        return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
    }
} 