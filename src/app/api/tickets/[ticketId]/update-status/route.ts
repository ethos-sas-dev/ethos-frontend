import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '../../../../../../supabase-ethos-types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { estado, resolution_reason } = await request.json();
    const { ticketId: ticketIdStr } = await params;

    const recadoApiKey = process.env.RECADO_API_KEY;
    if (!recadoApiKey) {
      console.error('Error: La variable de entorno RECADO_API_KEY no está configurada.');
      return NextResponse.json(
        { error: 'Error de configuración del servidor.' },
        { status: 500 }
      );
    }

    const ticketId = parseInt(ticketIdStr);

    if (!ticketId || isNaN(ticketId)) {
      return NextResponse.json(
        { error: 'ID de ticket inválido' },
        { status: 400 }
      );
    }

    if (!estado || !['abierto', 'en_progreso', 'cerrado'].includes(estado)) {
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

    if (estado === 'cerrado' && currentTicket.numero_contacto_ticket) {
      if (!resolution_reason) {
        return NextResponse.json(
          { error: 'El motivo de cierre es requerido para notificar al cliente.' },
          { status: 400 }
        );
      }
      try {
        const normalizedPhoneNumber = currentTicket.numero_contacto_ticket.replace(/\\s/g, '');
        const recadoResponse = await fetch('https://api.recado.co/ethos-ticket-closed', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-ethos-api-key': recadoApiKey,
          },
          body: JSON.stringify({
            numero_contacto_ticket: normalizedPhoneNumber,
            ticket_id: ticketId,
            resolution_reason: resolution_reason,
          }),
        });
        if (!recadoResponse.ok) {
          const errorBody = await recadoResponse.text();
          console.error(`Error al notificar a Recado para ticket ${ticketId}: ${recadoResponse.status} ${recadoResponse.statusText}`, errorBody);
        } else {
          const responseData = await recadoResponse.json();
          console.log(`Notificación de cierre enviada a Recado para ticket ${ticketId}:`, responseData);
        }
      } catch (recadoError) {
        console.error(`Excepción al llamar a la API de Recado para ticket ${ticketId}:`, recadoError);
      }
    }

    const updatePayload: { 
      estado: Database["public"]["Enums"]["ticket_estado"]; 
      motivo_resolucion?: string | null;
    } = {
      estado: estado as Database["public"]["Enums"]["ticket_estado"]
    };

    if (estado === 'cerrado' && resolution_reason) {
      updatePayload.motivo_resolucion = resolution_reason;
    } else if (estado === 'cerrado') {
      // Opcional: asegúrate de que si no hay razón, no quede una antigua.
      updatePayload.motivo_resolucion = null;
    }

    // Actualizar el estado del ticket
    const { data: updatedTicket, error: updateError } = await supabase
      .from('tickets')
      .update(updatePayload)
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