import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Crea un cliente Supabase del lado del navegador.
  // Asegúrate de configurar las variables de entorno públicas en tu entorno Next.js.
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
} 