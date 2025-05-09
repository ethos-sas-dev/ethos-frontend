import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient } from '../../../../lib/supabase/server'; // Para verificar permisos del usuario

// --- Configuración Cliente Supabase Admin (con Service Role Key) ---
const supabaseAdminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = supabaseAdminUrl && supabaseServiceKey
    ? createAdminClient(supabaseAdminUrl, supabaseServiceKey, { auth: { persistSession: false } })
    : null;

// --- Handler POST para crear propiedad ---
export async function POST(request: Request) {
    // 1. Verificar si el cliente Admin está configurado
    if (!supabaseAdmin) {
        console.error("API /propiedades: Supabase Admin client not configured.");
        return NextResponse.json({ message: 'Error de configuración del servidor.' }, { status: 500 });
    }

    // 2. Verificar Autenticación y Autorización del Usuario que Llama
    const supabaseUserClient = await createClient(); // Cliente para verificar usuario
    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();

    if (userError || !user) {
        console.warn("API /propiedades: Unauthorized attempt.", { userId: user?.id, error: userError?.message });
        return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
    }

    // Obtener el perfil/rol del usuario para la autorización
    // (Ajusta esto según cómo almacenes los roles, ejemplo asumiendo una tabla 'perfiles')
    const { data: profileData, error: profileError } = await supabaseUserClient
        .from('perfiles_operacional') // O tu tabla de perfiles/usuarios
        .select('rol')    // O el campo donde guardas el rol
        .eq('usuario_id', user.id) // Asumiendo que el ID del perfil coincide con el user ID
        .single();

    if (profileError || !profileData) {
         console.error("API /propiedades: Error fetching user profile or profile not found.", { userId: user.id, error: profileError?.message });
        return NextResponse.json({ message: 'Error al verificar permisos de usuario.' }, { status: 500 });
    }

    const userRole = profileData.rol; // Obtener el rol
    const isAdmin = userRole === 'Administrador';
    const isDirectorio = userRole === 'Directorio';

    // Aplicar lógica de autorización
    if (!isAdmin && !isDirectorio) { // Solo Admin o Directorio pueden crear
        console.warn("API /propiedades: Forbidden attempt.", { userId: user.id, role: userRole });
        return NextResponse.json({ message: 'Acción no permitida para tu rol.' }, { status: 403 }); // Forbidden
    }

    console.log("API /propiedades: Authorized user.", { userId: user.id, role: userRole });

    // 3. Parsear y Validar el Cuerpo de la Solicitud
    let propertyData;
    try {
        propertyData = await request.json();
        console.log("API /propiedades: Received payload:", propertyData);

        // Validación básica (añadir más según sea necesario)
        if (!propertyData || typeof propertyData !== 'object') {
            throw new Error("Cuerpo de la solicitud inválido.");
        }
        if (!propertyData.proyecto_id || typeof propertyData.proyecto_id !== 'number') {
            throw new Error("Falta o es inválido el ID del proyecto.");
        }
        if (!propertyData.identificadores || typeof propertyData.identificadores !== 'object' || !propertyData.identificadores.idInferior) {
             throw new Error("Faltan o son inválidos los identificadores.");
        }
        // Añadir más validaciones para otros campos requeridos...

    } catch (parseError: any) {
        console.warn("API /propiedades: Invalid request body.", { error: parseError.message });
        return NextResponse.json({ message: `Error en los datos recibidos: ${parseError.message}` }, { status: 400 }); // Bad Request
    }

    // 4. Insertar la Nueva Propiedad usando el Cliente Admin
    try {
        const { data: newProperty, error: insertError } = await supabaseAdmin
            .from('propiedades')
            .insert({
                // Mapear campos del payload a columnas de la DB
                proyecto_id: propertyData.proyecto_id,
                identificadores: propertyData.identificadores,
                codigo_catastral: propertyData.codigo_catastral,
                estado_entrega: propertyData.estado_entrega,
                estado_uso: propertyData.estado_uso || 'disponible', // Default 'disponible'
                actividad: propertyData.actividad,
                estado_de_construccion: propertyData.estado_de_construccion,
                area_total: propertyData.area_total,
                areas_desglosadas: propertyData.areas_desglosadas,
                pagos: propertyData.pagos,
                monto_fondo_inicial: propertyData.monto_fondo_inicial,
                monto_alicuota_ordinaria: propertyData.monto_alicuota_ordinaria,
                // Otros campos que puedan venir o tener defaults en DB:
                // modo_incognito: true, // Ejemplo default
                // created_at, updated_at serán manejados por la DB
            })
            .select() // Devolver el registro insertado
            .single(); // Esperamos insertar solo uno

        if (insertError) {
            console.error("API /propiedades: Supabase insert error.", { error: insertError });
            // Podrías intentar dar un mensaje más específico basado en el código de error de Supabase si es necesario
            throw new Error(`Error al guardar en base de datos: ${insertError.message}`);
        }

        if (!newProperty) {
            console.error("API /propiedades: No data returned after insert.");
            throw new Error('No se recibió confirmación de la base de datos después de crear.');
        }

        console.log("API /propiedades: Property created successfully.", { propertyId: newProperty.id });

        // 5. Devolver la propiedad creada
        return NextResponse.json({ newProperty }, { status: 201 }); // 201 Created

    } catch (error: any) {
        console.error("API /propiedades: Error during insert process.", { error: error.message });
        // Determinar si el error fue por validación previa o DB
        const status = error.message.startsWith("Error al guardar") ? 500 : 400; // O refinar más
        return NextResponse.json({ message: error.message || 'Error interno del servidor.' }, { status });
    }
} 