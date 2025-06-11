import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Database } from '../../../../../../supabase-ethos-types';

// Tipos para la acción correctiva
type AccionCorrectivaInput = {
  descripcion: string;
  imagen_url?: string | null;
};

type AccionCorrectivaStored = {
  fecha: string;
  descripcion: string;
  imagen_url: string | null;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const cookieStore = await cookies();
  
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          return cookieStore.getAll();
        },
        async setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
  
  const { ticketId: ticketIdStr } = await params;

  if (!ticketIdStr || isNaN(parseInt(ticketIdStr))) {
    return NextResponse.json({ error: 'Ticket ID es requerido y debe ser un número' }, { status: 400 });
  }

  const numericTicketId = parseInt(ticketIdStr);

  try {
    const body: AccionCorrectivaInput = await request.json();
    const { descripcion, imagen_url = null } = body;

    if (!descripcion || typeof descripcion !== 'string' || descripcion.trim() === "") {
      return NextResponse.json({ error: 'Descripción es requerida y debe ser un texto no vacío' }, { status: 400 });
    }

    // 1. Obtener el ticket existente
    const { data: ticket, error: fetchError } = await supabase
      .from('tickets')
      .select('acciones_correctivas')
      .eq('id', numericTicketId)
      .single();

    if (fetchError) {
      console.error('Error fetching ticket:', fetchError);
      return NextResponse.json({ error: 'Ticket no encontrado o error al obtenerlo', details: fetchError.message }, { status: 404 });
    }
    if (!ticket) {
        return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });
    }


    // 2. Crear la nueva acción correctiva
    const nuevaAccion: AccionCorrectivaStored = {
      fecha: new Date().toISOString(),
      descripcion: descripcion.trim(),
      imagen_url,
    };

    // 3. Añadir al array de acciones existentes
    // Asegurarse de que acciones_correctivas es un array
    const accionesActuales = Array.isArray(ticket.acciones_correctivas) ? ticket.acciones_correctivas as AccionCorrectivaStored[] : [];
    const accionesActualizadas = [...accionesActuales, nuevaAccion];

    // 4. Actualizar el ticket
    const { data: updatedTicket, error: updateError } = await supabase
      .from('tickets')
      .update({
        acciones_correctivas: accionesActualizadas as any, // Supabase espera Json para este campo
        estado: 'en_progreso', // Actualizar estado como solicitado
        updated_at: new Date().toISOString(),
      })
      .eq('id', numericTicketId)
      .select('*') // Devolver el ticket actualizado completo
      .single();

    if (updateError) {
      console.error('Error updating ticket:', updateError);
      return NextResponse.json({ error: 'Error al actualizar el ticket', details: updateError.message }, { status: 500 });
    }

    return NextResponse.json(updatedTicket);

  } catch (error: any) {
    console.error('Error processing request (add-corrective-action):', error);
    // Verificar si es un error de parseo de JSON
    if (error instanceof SyntaxError) {
        return NextResponse.json({ error: 'Cuerpo de la solicitud mal formado (JSON inválido)' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error interno del servidor', details: error.message }, { status: 500 });
  }
} 