import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient } from '../../../../../lib/supabase/server'; // Para verificar permisos del usuario

// --- Configuración Cliente Supabase Admin (con Service Role Key) ---
const supabaseAdminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = supabaseAdminUrl && supabaseServiceKey
    ? createAdminClient(supabaseAdminUrl, supabaseServiceKey, { auth: { persistSession: false } })
    : null;

export async function POST(request: Request) {
  if (!supabaseAdmin) {
    console.error("API /api/propiedades/editar: Error de configuración del servidor (Supabase Admin Client no disponible)");
    return NextResponse.json({ 
      success: false, 
      message: 'Error de configuración del servidor' 
    }, { status: 500 });
  }

  // Verificar Autenticación y Autorización del Usuario
  const supabaseUserClient = await createClient();
  const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();

  if (userError || !user) {
      console.warn("API /api/propiedades/editar: Unauthorized attempt.");
      return NextResponse.json({ 
        success: false,
        message: 'No autorizado.' 
      }, { status: 401 });
  }

  // Obtener rol del usuario
  const { data: profileData, error: profileError } = await supabaseUserClient
      .from('perfiles_operacional')
      .select('rol')
      .eq('usuario_id', user.id)
      .single();

  if (profileError || !profileData) {
       console.error("API /api/propiedades/editar: Error verificando rol de usuario");
      return NextResponse.json({ 
        success: false,
        message: 'Error al verificar permisos de usuario.' 
      }, { status: 500 });
  }

  const userRole = profileData.rol;
  const isAdmin = userRole === 'Administrador';
  const isDirectorio = userRole === 'Directorio';

  // Solo Admin o Directorio pueden editar
  if (!isAdmin && !isDirectorio) {
      console.warn("API /api/propiedades/editar: Forbidden attempt.", { userId: user.id, role: userRole });
      return NextResponse.json({ 
        success: false,
        message: 'Acción no permitida para tu rol.' 
      }, { status: 403 });
  }

  try {
    // Obtener datos de la solicitud
    const { propertyId, propertyData, pendingUploads } = await request.json();

    // Validar datos obligatorios
    if (!propertyId) {
      return NextResponse.json({ 
        success: false, 
        message: 'ID de propiedad requerido' 
      }, { status: 400 });
    }

    // Preparar datos para actualizar en Supabase
    const updateData = { ...propertyData };

    // Procesar documentos pendientes
    if (pendingUploads && Object.keys(pendingUploads).length > 0) {
      console.log("Procesando documentos pendientes:", pendingUploads);
      
      // Para cada documento pendiente, crear primero un registro en 'archivos'
      for (const docType in pendingUploads) {
        if (pendingUploads[docType]) {
          const upload = pendingUploads[docType];
          console.log(`Procesando documento tipo ${docType}:`, upload);
          
          // Crear archivo en la tabla 'archivos'
          const { data: newFile, error: fileError } = await supabaseAdmin
            .from('archivos')
            .insert({
              external_storage_key: upload.key,
              external_url: upload.url,
              filename: upload.name
            })
            .select()
            .single();
            
          if (fileError) {
            console.error(`Error al crear archivo para ${docType}:`, fileError);
            return NextResponse.json({
              success: false,
              message: `Error al crear archivo para ${docType}: ${fileError.message}`
            }, { status: 500 });
          }
          
          if (!newFile) {
            console.error(`No se pudo crear el archivo para ${docType}`);
            return NextResponse.json({
              success: false,
              message: `No se pudo crear el archivo para ${docType}`
            }, { status: 500 });
          }
          
          console.log(`Archivo creado para ${docType}:`, newFile);
          
          // Actualizar la referencia en los datos de la propiedad
          // Para imagen, guardamos la URL directamente
          // Para otros documentos, guardamos el ID del archivo
          if (docType === 'imagen') {
            updateData[docType] = newFile.external_url;
          } else {
            // Para documentos como escritura_pdf_id, acta_entrega_pdf_id, etc.
            updateData[docType] = newFile.id;
          }
        }
      }
    }

    console.log("Datos finales para actualizar propiedad:", updateData);

    // Realizar la actualización en Supabase
    const { data, error } = await supabaseAdmin
      .from('propiedades')
      .update(updateData)
      .eq('id', propertyId)
      .select()
      .single();

    if (error) {
      console.error("Error actualizando propiedad:", error);
      return NextResponse.json({ 
        success: false, 
        message: `Error al actualizar la propiedad: ${error.message}` 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Propiedad actualizada correctamente',
      updatedProperty: data
    });

  } catch (error: any) {
    console.error("Error en API /api/propiedades/editar:", error);
    return NextResponse.json({ 
      success: false, 
      message: `Error en el servidor: ${error.message}` 
    }, { status: 500 });
  }
} 