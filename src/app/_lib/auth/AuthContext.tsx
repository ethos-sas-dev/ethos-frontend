'use client'

import { createClient } from '../../../../lib/supabase/client'
import { Session, User, AuthError, AuthChangeEvent } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { UserRole, UserData } from '../types'

// Definir el tipo para el contexto de autenticación
type AuthContextType = {
  user: UserData | null
  session: Session | null
  role: UserRole | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  reset: () => void
}

// Crear el contexto con un valor inicial
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Hook para usar el contexto de autenticación
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider')
  }
  return context
}

// --- Lógica de Obtención de Rol --- 
// Asume tablas: perfiles_operacional, perfiles_cliente
// Asume FK: user_id en ambas tablas que referencia auth.users.id
// Asume columna de rol: rol en ambas tablas
const fetchUserProfileAndRole = async (supabase: any, userId: string): Promise<{ role: UserRole | null, profileData: any | null }> => {
  console.log(`Fetching profiles for userId: ${userId}`)
  let role: UserRole | null = null;
  let profileData: any | null = null;

  // Intentar buscar perfil operacional
  const { data: perfilOp, error: errorOp } = await supabase
    .from('perfiles_operacional') // CONFIRMAR NOMBRE TABLA
    .select('*, rol') // Seleccionar todos los datos + rol
    .eq('usuario_id', userId) // CONFIRMAR NOMBRE COLUMNA FK
    .maybeSingle()

  if (errorOp) {
    console.error('Error fetching perfil operacional:', errorOp)
    // No lanzar error, puede que no exista
  }

  if (perfilOp && perfilOp.rol) {
    console.log("Perfil operacional encontrado:", perfilOp)
    role = perfilOp.rol as UserRole;
    profileData = perfilOp;
  } else {
    // Si no hay perfil operacional, buscar perfil cliente
    console.log("Perfil operacional no encontrado o sin rol, buscando perfil cliente...")
    const { data: perfilCli, error: errorCli } = await supabase
      .from('perfiles_cliente') // CONFIRMAR NOMBRE TABLA
      .select('*, rol') // Seleccionar todos los datos + rol
      .eq('usuario_id', userId) // CONFIRMAR NOMBRE COLUMNA FK
      .maybeSingle()

    if (errorCli) {
      console.error('Error fetching perfil cliente:', errorCli)
      // No lanzar error
    }

    if (perfilCli && perfilCli.rol) {
      console.log("Perfil cliente encontrado:", perfilCli)
      role = perfilCli.rol as UserRole;
      profileData = perfilCli;
    } else {
       console.log("No se encontró perfil cliente con rol para el usuario.")
       // Considerar qué hacer si no se encuentra ningún perfil con rol.
       // Podríamos asignar un rol por defecto o dejarlo null.
       // Por ahora, lo dejamos null.
    }
  }
  
  console.log(`Role determined: ${role}`) 
  return { role, profileData };
}

// Mapear usuario de Supabase y datos de perfil a nuestro formato UserData
const mapUserData = (user: User | null, profileData: any | null): UserData | null => {
  if (!user) return null;
  
  const role = profileData?.rol as UserRole | undefined;
  const profileId = typeof profileData?.id === 'number' ? profileData.id : null;
  
  return {
    id: user.id,
    profileId: profileId,
    email: user.email || '',
    role: role, 
    nombre: profileData?.nombre || user.user_metadata?.nombre, 
    apellido: profileData?.apellido || user.user_metadata?.apellido,
    perfil_cliente: profileData?.tipo_persona ? { documentId: String(profileId), tipo_persona: profileData.tipo_persona } : undefined,
    metadata: user.user_metadata
  };
};

// Proveedor del contexto de autenticación
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null) // Estado para UserData mapeado
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<AuthError | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // --- Efecto Principal para Manejar Estado de Autenticación y Rol --- 
  useEffect(() => {
    let isMounted = true; // Flag para evitar actualizaciones en componente desmontado

    const handleAuthChange = async (session: Session | null) => {
      if (!isMounted) return;
      console.log("Auth state changed, new session:", session)
      
      setIsLoading(true);
      setSession(session);
      
      if (session?.user) {
        try {
          const { role: fetchedRole, profileData } = await fetchUserProfileAndRole(supabase, session.user.id);
          if (isMounted) {
            setRole(fetchedRole);
            const mappedUser = mapUserData(session.user, profileData);
            setUserData(mappedUser);
            console.log("User data mapped with profile:", mappedUser)
          }
        } catch (fetchError) {
          console.error("Error fetching profile during auth change:", fetchError);
           if (isMounted) {
              setRole(null);
              setUserData(mapUserData(session.user, null));
           }
        }
      } else {
        // No hay sesión (logout o inicial)
        if (isMounted) {
           setRole(null);
           setUserData(null);
        }
      }
      
      if (isMounted) {
         setIsLoading(false);
      }
    };

    // 1. Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Initial getSession result:", session)
      handleAuthChange(session);
    }).catch(err => {
       console.error("Error in initial getSession:", err)
       if(isMounted) {
         setIsLoading(false)
       }
    });

    // 2. Suscribirse a cambios futuros
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        console.log(`onAuthStateChange event: ${_event}`) 
        handleAuthChange(session);
      }
    )

    // Limpiar suscripción y flag al desmontar
    return () => {
      isMounted = false;
      subscription.unsubscribe()
      console.log("Auth subscription unsubscribed")
    }
  }, [supabase])

  // --- Funciones de Autenticación --- 

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      console.log(`Attempting login for: ${email}`)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      console.log("Login signInWithPassword result:", { data, error })
      
      if (error) {
        throw error
      }
      
      // Si el login fue exitoso, onAuthStateChange debería dispararse
      // y manejar la actualización del estado (session, role, userData).
      // No necesitamos llamar a fetchUserProfileAndRole aquí directamente
      // para evitar posible condición de carrera con onAuthStateChange.
      console.log("Login successful, waiting for onAuthStateChange...")
      router.push('/dashboard') // Redirigir inmediatamente

    } catch (error) {
      console.error("Login failed:", error)
      setError(error as AuthError)
      setIsLoading(false) // Asegurarse de parar loading en error
      throw error // Re-lanzar para que el componente de login lo maneje
    }
    // No poner setIsLoading(false) aquí en caso de éxito,
    // dejar que onAuthStateChange lo haga cuando termine de cargar el perfil.
  }

  const signUp = async (email: string, password: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // La creación del perfil (cliente/operacional) probablemente
      // se maneje con Triggers/Functions en Supabase o en un paso posterior.
      // Aquí solo creamos el usuario en auth.users.
      // *NO* asignamos rol aquí, ya que depende de la creación del perfil.
      console.log(`Attempting signup for: ${email}`)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        // No incluimos 'role' en options.data aquí
      })
      console.log("Signup result:", { data, error })
      
      if (error) {
        throw error
      }
      
      // Después del signup exitoso, Supabase puede requerir verificación 
      // por correo. El usuario no tendrá rol hasta que se cree su perfil asociado.
      alert("Registro exitoso. Por favor, revisa tu correo para verificar tu cuenta si es necesario. Serás redirigido al login.")
      router.push('/login') 

    } catch (error) {
      console.error("Signup failed:", error)
      setError(error as AuthError)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    console.log("Attempting logout...")
    // No necesitamos setIsLoading(true) aquí, signOut es rápido
    // y onAuthStateChange manejará la limpieza del estado.
    try {
      const { error } = await supabase.auth.signOut()
      console.log("Logout signOut result:", { error })
      
      if (error) {
        throw error
      }
      // onAuthStateChange se encargará de poner session, role, userData a null.
      router.push('/login')
    } catch (error) {
      console.error('Error logging out:', error)
      // Quizás mostrar un error al usuario
    }
  }

  const reset = () => {
    // Esta función podría no ser necesaria si onAuthStateChange limpia todo.
    console.log("Resetting auth state manually (should be handled by onAuthStateChange)")
    setUserData(null)
    setSession(null)
    setRole(null)
    setError(null)
    setIsLoading(false)
  }

  // Valor proporcionado por el contexto
  const value = {
    user: userData,
    session,
    role,
    isLoading,
    login,
    signUp,
    logout,
    reset,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
} 