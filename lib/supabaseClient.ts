import { createClient } from '@supabase/supabase-js'

// Asegúrate de que las variables de entorno estén definidas.
// Considera usar una validación de esquemas como Zod si la configuración se vuelve compleja.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_URL");
}

if (!supabaseAnonKey) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

// Crear y exportar el cliente de Supabase
// Nota: Este es un cliente para el lado del cliente (navegador).
// Para operaciones del lado del servidor (Server Actions, Route Handlers),
// considera usar createServerClient de @supabase/ssr.
export const supabase = createClient(supabaseUrl, supabaseAnonKey); 