import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Convertir a función async para esperar a que se resuelva cookies()
export async function createClient() { 
  const cookieStore = await cookies()

  // Crea un cliente Supabase del lado del servidor.
  // Necesita leer/escribir cookies en el almacenamiento de cookies de Next.js.
  // Asegúrate de configurar las variables de entorno públicas en tu entorno Next.js.
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value
        },
        set(name, value, options) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // La llamada `set` puede fallar si se llama desde un Server Component.
            // Esto suele ocurrir cuando el encabezado Set-Cookie ya ha sido enviado.
            // Ignorar el error si se usa middleware para refrescar sesión.
          }
        },
        remove(name, options) {
          try {
            // Usar delete en lugar de set con valor vacío
            cookieStore.delete({ name, ...options }) 
          } catch (error) {
            // La llamada `delete` puede fallar si se llama desde un Server Component.
            // Esto suele ocurrir cuando el encabezado Set-Cookie ya ha sido enviado.
            // Ignorar el error si se usa middleware para refrescar sesión.
          }
        },
      },
    }
  )
} 