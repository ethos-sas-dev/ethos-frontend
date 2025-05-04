import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuración del Cliente Supabase Admin (con Service Role Key)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("!!! Supabase URL or Service Role Key not set in environment variables !!!");
}

const supabaseAdmin = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
    : null;

// Tipos
type DeleteUserRequest = {
    userId: string; // UUID del usuario a eliminar
};

export async function POST(request: Request) {
    // Verificar configuración del servidor
    if (!supabaseAdmin) {
        return NextResponse.json({ 
            success: false, 
            message: 'Error de configuración del servidor' 
        }, { status: 500 });
    }

    try {
        // Obtener datos del cuerpo de la solicitud
        const { userId }: DeleteUserRequest = await request.json();
        
        // Validar campos requeridos
        if (!userId) {
            return NextResponse.json({ 
                success: false, 
                message: 'El ID de usuario es requerido' 
            }, { status: 400 });
        }

        console.log(`Iniciando proceso de eliminación para usuario con ID: ${userId}`);

        // 1. Verificar si el usuario tiene un perfil de cliente asociado
        const { data: perfilCliente, error: errorPerfilCliente } = await supabaseAdmin
            .from('perfiles_cliente')
            .select('id')
            .eq('usuario_id', userId)
            .maybeSingle();

        if (errorPerfilCliente) {
            console.error("Error verificando perfil cliente:", errorPerfilCliente);
        } else if (perfilCliente) {
            // Si tiene perfil cliente, lo desvinculamos (no lo eliminamos)
            console.log(`Usuario tiene perfil cliente ID: ${perfilCliente.id}, desvinculando...`);
            const { error: errorDesvincular } = await supabaseAdmin
                .from('perfiles_cliente')
                .update({ usuario_id: null })
                .eq('id', perfilCliente.id);

            if (errorDesvincular) {
                console.error("Error desvinculando perfil cliente:", errorDesvincular);
                return NextResponse.json({ 
                    success: false, 
                    message: `Error al desvincular perfil cliente: ${errorDesvincular.message}` 
                }, { status: 500 });
            }
            console.log(`Perfil cliente desvinculado correctamente`);
        }

        // 2. Verificar si el usuario tiene un perfil operacional asociado
        const { data: perfilOperacional, error: errorPerfilOperacional } = await supabaseAdmin
            .from('perfiles_operacional')
            .select('id')
            .eq('usuario_id', userId)
            .maybeSingle();

        if (errorPerfilOperacional) {
            console.error("Error verificando perfil operacional:", errorPerfilOperacional);
        } else if (perfilOperacional) {
            console.log(`Usuario tiene perfil operacional ID: ${perfilOperacional.id}, eliminando vínculos de proyectos...`);
            
            // 2.1 Eliminar vínculos con proyectos
            const { error: errorEliminarLinks } = await supabaseAdmin
                .from('proyecto_perfil_operacional_links')
                .delete()
                .eq('perfil_operacional_id', perfilOperacional.id);

            if (errorEliminarLinks) {
                console.error("Error eliminando vínculos con proyectos:", errorEliminarLinks);
                // Continuamos a pesar del error, para intentar completar la eliminación
            }

            // 2.2 Eliminar el perfil operacional
            const { error: errorEliminarPerfil } = await supabaseAdmin
                .from('perfiles_operacional')
                .delete()
                .eq('id', perfilOperacional.id);

            if (errorEliminarPerfil) {
                console.error("Error eliminando perfil operacional:", errorEliminarPerfil);
                return NextResponse.json({ 
                    success: false, 
                    message: `Error al eliminar perfil operacional: ${errorEliminarPerfil.message}` 
                }, { status: 500 });
            }
            console.log(`Perfil operacional eliminado correctamente`);
        }

        // 3. Finalmente, eliminar el usuario de auth.users
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (authError) {
            console.error("Error eliminando usuario de auth:", authError);
            return NextResponse.json({ 
                success: false, 
                message: `Error al eliminar usuario: ${authError.message}` 
            }, { status: 500 });
        }

        console.log(`Usuario con ID: ${userId} eliminado correctamente`);

        // Respuesta exitosa
        return NextResponse.json({ 
            success: true, 
            message: 'Usuario eliminado correctamente' 
        });

    } catch (error: any) {
        console.error("Error no manejado en delete-user API:", error);
        return NextResponse.json({ 
            success: false, 
            message: `Error interno del servidor: ${error.message}` 
        }, { status: 500 });
    }
} 