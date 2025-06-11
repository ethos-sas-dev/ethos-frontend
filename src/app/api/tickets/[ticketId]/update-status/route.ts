import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '../../../../../../supabase-ethos-types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { estado } = await request.json();
    const { ticketId: ticketIdStr } = await params;

    const ticketId = parseInt(ticketIdStr);

    if (!ticketId || isNaN(ticketId)) {
      return NextResponse.json(
        { error: 'ID de ticket inválido' },
        { status: 400 }
      );
    }

    if (!estado || !['abierto', 'en_progreso', 'resuelto', 'cerrado'].includes(estado)) {
      return NextResponse.json(
        { error: 'Estado inválido' },
        { status: 400 }
      );
    }

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

    // Primero obtener el ticket actual
    const { data: currentTicket, error: fetchError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (fetchError || !currentTicket) {
      return NextResponse.json(
        { error: 'Ticket no encontrado' },
        { status: 404 }
      );
    }

    // Actualizar el estado del ticket
    const { data: updatedTicket, error: updateError } = await supabase
      .from('tickets')
      .update({ 
        estado: estado as Database["public"]["Enums"]["ticket_estado"]
      })
      .eq('id', ticketId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating ticket status:', updateError);
      return NextResponse.json(
        { error: 'Error al actualizar el estado del ticket' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedTicket);

  } catch (error) {
    console.error('Error in update-status API:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 