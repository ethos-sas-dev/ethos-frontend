import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { emailId, status, lastResponseBy } = await request.json();
    
    if (!emailId || !status) {
      return NextResponse.json({ error: 'emailId y status son requeridos' }, { status: 400 });
    }

    console.log(`Actualizando correo ${emailId} a estado ${status}`);
    
    const graphqlUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL || '';
    const strapiToken = process.env.STRAPI_API_TOKEN || '';
    
    if (!graphqlUrl || !strapiToken) {
      console.error('Error: URL de GraphQL o token de Strapi no configurados');
      return NextResponse.json({ error: 'Configuración de servidor faltante' }, { status: 500 });
    }

    // Mutation para actualizar el estado del email
    const mutation = `
      mutation UpdateEmailStatus($emailId: String!, $status: String!, $lastResponseBy: String) {
        updateEmailTracking(
          documentId: $emailId,
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

    const response = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${strapiToken}`,
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          emailId,
          status,
          lastResponseBy
        }
      }),
    });

    if (!response.ok) {
      console.error(`Error al actualizar correo en Strapi: ${response.status} ${response.statusText}`);
      return NextResponse.json({ error: 'Error al actualizar en Strapi' }, { status: 500 });
    }

    const data = await response.json();

    if (data.errors) {
      console.error(`Error de GraphQL al actualizar: ${JSON.stringify(data.errors, null, 2)}`);
      return NextResponse.json({ error: 'Error en GraphQL' }, { status: 500 });
    }

    console.log(`✅ Correo ${emailId} actualizado exitosamente a estado ${status}`);
    
    return NextResponse.json({
      success: true,
      emailId,
      newStatus: status,
      lastResponseBy
    });

  } catch (error: any) {
    console.error('Error al actualizar estado del correo:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 