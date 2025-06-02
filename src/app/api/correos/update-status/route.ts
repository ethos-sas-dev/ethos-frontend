import { NextResponse } from 'next/server';

// Mapear estados a los valores del ENUM de Strapi
function mapStatusToStrapiEnum(status: string): string {
  switch (status) {
    case 'necesitaAtencion':
      return 'necesitaAtencion';
    case 'informativo':
      return 'informativo';
    case 'respondido':
      return 'respondido';
    default:
      return 'necesitaAtencion';
  }
}

export async function POST(request: Request) {
  try {
    const { emailId, status, lastResponseBy } = await request.json();
    
    if (!emailId || !status) {
      return NextResponse.json({ error: 'emailId y status son requeridos' }, { status: 400 });
    }

    const mappedStatus = mapStatusToStrapiEnum(status);
    console.log(`Actualizando correo ${emailId} a estado ${mappedStatus}`);
    
    const graphqlUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL || '';
    const strapiToken = process.env.STRAPI_API_TOKEN || '';
    
    if (!graphqlUrl || !strapiToken) {
      console.error('Error: URL de GraphQL o token de Strapi no configurados');
      return NextResponse.json({ error: 'Configuración de servidor faltante' }, { status: 500 });
    }

    // Mutation para actualizar el estado del email usando documentId
    const mutation = `
      mutation UpdateEmailStatus($documentId: ID!, $status: ENUM_EMAILTRACKING_EMAILSTATUS!, $lastResponseBy: String) {
        updateEmailTracking(
          documentId: $documentId,
          data: {
            emailStatus: $status,
            lastResponseBy: $lastResponseBy
          }
        ) {
          documentId
          emailStatus
          lastResponseBy
        }
      }
    `;

    console.log('Variables enviadas a GraphQL:', {
      documentId: emailId,
      status: mappedStatus,
      lastResponseBy
    });

    const response = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${strapiToken}`,
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          documentId: emailId, // emailId en este caso es realmente el documentId
          status: mappedStatus,
          lastResponseBy
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error al actualizar correo en Strapi: ${response.status} ${response.statusText}`, errorText);
      return NextResponse.json({ error: 'Error al actualizar en Strapi' }, { status: 500 });
    }

    const data = await response.json();

    if (data.errors) {
      console.error(`Error de GraphQL al actualizar: ${JSON.stringify(data.errors, null, 2)}`);
      return NextResponse.json({ error: 'Error en GraphQL', details: data.errors }, { status: 500 });
    }

    // Verificar si la actualización fue exitosa
    if (!data.data || !data.data.updateEmailTracking) {
      console.error(`⚠️ La actualización retornó null para documentId: ${emailId}`);
      return NextResponse.json({ 
        error: 'No se pudo actualizar el correo', 
        details: 'El registro no fue encontrado o no se pudo modificar'
      }, { status: 404 });
    }

    console.log(`✅ Correo ${emailId} actualizado exitosamente a estado ${mappedStatus}`);
    
    return NextResponse.json({
      success: true,
      emailId,
      newStatus: status,
      lastResponseBy,
      data: data.data
    });

  } catch (error: any) {
    console.error('Error al actualizar estado del correo:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 