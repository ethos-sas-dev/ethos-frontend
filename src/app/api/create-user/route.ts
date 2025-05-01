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
type CreateUserRequest = {
    email: string;
    password: string;
    tipoUsuario: 'cliente' | 'operacional';
    perfilClienteId?: string;  // ID para vincular con perfil cliente existente
    rolOperacional?: string;   // Rol para perfil operacional nuevo
    proyectosAsignados?: number[]; // IDs de proyectos para vincular
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
        const formData: CreateUserRequest = await request.json();
        
        // Validar campos requeridos
        if (!formData.email || !formData.password) {
            return NextResponse.json({ 
                success: false, 
                message: 'Email y contraseña son requeridos' 
            }, { status: 400 });
        }

        if (formData.tipoUsuario === 'cliente' && !formData.perfilClienteId) {
            return NextResponse.json({ 
                success: false, 
                message: 'ID de perfil cliente es requerido para usuarios tipo cliente' 
            }, { status: 400 });
        }

        if (formData.tipoUsuario === 'operacional' && !formData.rolOperacional) {
            return NextResponse.json({ 
                success: false, 
                message: 'Rol operacional es requerido para usuarios tipo operacional' 
            }, { status: 400 });
        }

        // 1. Crear usuario en auth.users
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: formData.email,
            password: formData.password,
            email_confirm: true, // Auto-confirmar email para pruebas
        });

        if (authError || !authData.user) {
            console.error("Error creating user:", authError);
            return NextResponse.json({ 
                success: false, 
                message: `Error al crear usuario: ${authError?.message || 'Error desconocido'}` 
            }, { status: 500 });
        }

        const userId = authData.user.id;
        console.log(`Usuario creado con ID: ${userId}`);

        // 2. Procesamiento según tipo de usuario
        if (formData.tipoUsuario === 'cliente') {
            // Vincular usuario con perfil cliente existente
            const perfilClienteId = parseInt(formData.perfilClienteId || '', 10);
            
            const { error: updateError } = await supabaseAdmin
                .from('perfiles_cliente')
                .update({ usuario_id: userId })
                .eq('id', perfilClienteId);

            if (updateError) {
                console.error("Error updating perfil_cliente:", updateError);
                // Intentar eliminar el usuario creado para evitar usuarios huérfanos
                await supabaseAdmin.auth.admin.deleteUser(userId);
                
                return NextResponse.json({ 
                    success: false, 
                    message: `Error al vincular usuario con perfil cliente: ${updateError.message}` 
                }, { status: 500 });
            }
        } else {
            // Crear perfil operacional
            const { data: perfilData, error: perfilError } = await supabaseAdmin
                .from('perfiles_operacional')
                .insert({ 
                    usuario_id: userId,
                    rol: formData.rolOperacional 
                })
                .select('id')
                .single();

            if (perfilError || !perfilData) {
                console.error("Error creating perfil_operacional:", perfilError);
                // Intentar eliminar el usuario creado
                await supabaseAdmin.auth.admin.deleteUser(userId);
                
                return NextResponse.json({ 
                    success: false, 
                    message: `Error al crear perfil operacional: ${perfilError?.message || 'Error desconocido'}` 
                }, { status: 500 });
            }

            // Vincular con proyectos si es necesario
            if (formData.proyectosAsignados && formData.proyectosAsignados.length > 0) {
                const perfilOperacionalId = perfilData.id;
                
                // Preparar los registros para insert masivo
                const proyectoLinks = formData.proyectosAsignados.map(proyectoId => ({
                    proyecto_id: proyectoId,
                    perfil_operacional_id: perfilOperacionalId
                }));

                const { error: linksError } = await supabaseAdmin
                    .from('proyecto_perfil_operacional_links')
                    .insert(proyectoLinks);

                if (linksError) {
                    console.error("Error linking proyectos:", linksError);
                    // No eliminamos el usuario aquí porque el perfil ya fue creado correctamente
                    // Solo reportamos el error en la respuesta
                    return NextResponse.json({ 
                        success: true, 
                        partialSuccess: true,
                        userId: userId,
                        message: `Usuario y perfil creados correctamente pero hubo un error al vincular proyectos: ${linksError.message}` 
                    });
                }
            }
        }

        // Respuesta exitosa
        return NextResponse.json({ 
            success: true, 
            userId: userId,
            message: 'Usuario creado correctamente' 
        });

    } catch (error: any) {
        console.error("Unhandled error in create-user API:", error);
        return NextResponse.json({ 
            success: false, 
            message: `Error interno del servidor: ${error.message}` 
        }, { status: 500 });
    }
} 