import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name) {
          return request.cookies.get(name)?.value
        },
        async set(name, value, options) {
          // Ajustar el objeto NextResponse
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        async remove(name, options) {
          // Ajustar el objeto NextResponse
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Refrescar la sesión del usuario si es posible
  await supabase.auth.getUser()

  return response
}

// Este middleware se aplica a todas las rutas excepto las que coinciden con los patterns especificados
export const config = {
  matcher: [
    // Excluir archivos estáticos y assets (imágenes, etc.)
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 