import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
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

    const supabase = createRouteHandlerClient<Database>({ 
      cookies 
    });

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