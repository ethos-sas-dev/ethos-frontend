'use client'

import { useAuth } from "../_lib/auth/AuthContext"
import { useState, useEffect } from "react"
import { UserRole } from "../_lib/types"
import { useRouter } from "next/navigation"
import StatCard from "../_components/ui/dashboard/StatCard"
import ActionCard from "../_components/ui/dashboard/ActionCard"
import { createClient } from '../../../lib/supabase/client'

import { 
  BuildingOffice2Icon,
  UserGroupIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  PlusCircleIcon,
  ArrowUpCircleIcon
} from "@heroicons/react/24/outline"

import { 
  BuildingOffice2Icon as BuildingOffice2Solid,
  UserGroupIcon as UserGroupSolid,
  DocumentTextIcon as DocumentTextSolid,
  ClipboardDocumentListIcon as ClipboardDocumentListSolid,
  CurrencyDollarIcon as CurrencyDollarSolid,
} from "@heroicons/react/24/solid"
import { motion } from "framer-motion"

const LoadingSpinner = () => (
  <div className="flex justify-center items-center p-4">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-600"></div>
  </div>
)

const JefeOperativoDashboard = () => {
  const [stats, setStats] = useState({ proyectos: 0, propietarios: 0, solicitudesNuevas: 0, facturasPendientes: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const { count: projectCount, error: projectError } = await supabase.from('proyectos').select('*' , { count: 'exact', head: true })
        const { count: clientCount, error: clientError } = await supabase.from('perfiles_cliente').select('*' , { count: 'exact', head: true })
        const { count: requestCount, error: requestError } = await supabase.from('tickets').select('*' , { count: 'exact', head: true }).eq('estado', 'abierto')
        const { count: invoiceCount, error: invoiceError } = await supabase.from('facturas').select('*' , { count: 'exact', head: true }).in('estado', ['PendienteValidacion', 'Aprobada', 'Enviada', 'Vencida'])
        
        if (projectError || clientError || requestError || invoiceError) {
          console.error('Supabase count errors:', { projectError, clientError, requestError, invoiceError })
          throw new Error('Error al cargar estadísticas del dashboard')
        }

        setStats({
          proyectos: projectCount ?? 0,
          propietarios: clientCount ?? 0,
          solicitudesNuevas: requestCount ?? 0,
          facturasPendientes: invoiceCount ?? 0
        })

      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [supabase])

  if (isLoading) return <LoadingSpinner />
  if (error) return <p className="text-red-500">Error: {error}</p>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Bienvenido, Jefe Operativo</h1>
        <p className="text-gray-500">Resumen de la actividad del sistema y estadísticas clave</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Proyectos activos" value={stats.proyectos} icon={BuildingOffice2Solid} iconColor="bg-emerald-600" href="/dashboard/proyectos" />
        <StatCard title="Propietarios / Clientes" value={stats.propietarios} icon={UserGroupSolid} iconColor="bg-blue-600" href="/dashboard/propietarios" />
        <StatCard title="Solicitudes Nuevas (Tickets)" value={stats.solicitudesNuevas} icon={ClipboardDocumentListSolid} iconColor="bg-amber-600" href="/dashboard/mesa-de-ayuda" />
        <StatCard title="Facturas Pendientes" value={stats.facturasPendientes} icon={CurrencyDollarSolid} iconColor="bg-purple-600" href="/dashboard/facturacion-cobranza" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
             <h2 className="text-xl font-semibold mb-4">Información Adicional</h2>
             <p className="text-gray-500">Aquí puedes añadir otros componentes o información relevante para el Jefe Operativo.</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Acciones rápidas</h2>
          <div className="space-y-4">
            <ActionCard title="Crear nuevo proyecto" description="Registra la información de un nuevo desarrollo inmobiliario" icon={BuildingOffice2Icon} bgColor="bg-emerald-50" href="/dashboard/proyectos/nuevo" />
            <ActionCard title="Registrar cliente" description="Añade un nuevo propietario o arrendatario al sistema" icon={UserGroupIcon} bgColor="bg-blue-50" href="/dashboard/propietarios/nuevo" />
            <ActionCard title="Generar reporte" description="Crea informes personalizados de gestión para la dirección" icon={DocumentTextIcon} bgColor="bg-amber-50" href="/dashboard/reportes" />
          </div>
        </div>
      </div>
    </div>
  )
}

const AdministradorDashboard = () => {
  const [stats, setStats] = useState({ proyectos: 0, usuarios: 0, solicitudesNuevas: 0, facturasPendientes: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const { count: projectCount, error: projectError } = await supabase.from('proyectos').select('*' , { count: 'exact', head: true })
        const { count: userCount, error: userError } = await supabase.from('users').select('*' , { count: 'exact', head: true })
        const { count: requestCount, error: requestError } = await supabase.from('tickets').select('*' , { count: 'exact', head: true }).eq('estado', 'abierto')
        const { count: invoiceCount, error: invoiceError } = await supabase.from('facturas').select('*' , { count: 'exact', head: true }).in('estado', ['Borrador'])
        
        if (projectError || userError || requestError || invoiceError) {
          console.error('Supabase count errors:', { projectError, userError, requestError, invoiceError })
          throw new Error('Error al cargar estadísticas del dashboard')
        }

        setStats({
          proyectos: projectCount ?? 0,
          usuarios: userCount ?? 0,
          solicitudesNuevas: requestCount ?? 0,
          facturasPendientes: invoiceCount ?? 0
        })

      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [supabase])

  if (isLoading) return <LoadingSpinner />
  if (error) return <p className="text-red-500">Error: {error}</p>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Panel de Administración</h1>
        <p className="text-gray-500">Gestión completa del sistema y operaciones</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Proyectos activos" value={stats.proyectos} icon={BuildingOffice2Solid} iconColor="bg-emerald-600" href="/dashboard/proyectos" />
        {/* <StatCard title="Usuarios totales" value={stats.usuarios} icon={UserGroupSolid} iconColor="bg-blue-600" href="/dashboard/usuarios" /> */}
        {/* <StatCard title="Solicitudes Nuevas (Tickets)" value={stats.solicitudesNuevas} icon={ClipboardDocumentListSolid} iconColor="bg-amber-600" href="/dashboard/mesa-de-ayuda" /> */}
        <StatCard title="Facturas Pendientes" value={stats.facturasPendientes} icon={CurrencyDollarSolid} iconColor="bg-purple-600" href="/dashboard/facturacion-cobranza" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
             <h2 className="text-xl font-semibold mb-4">Tareas Pendientes</h2>
             <p className="text-gray-500">Resumen de validaciones o aprobaciones pendientes.</p>
        </div>

        {/* <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-white">Acciones administrativas</h2>
          <div className="space-y-4">
             <ActionCard 
               title="Crear usuario" 
               description="Añadir nuevo usuario al sistema" 
               icon={PlusCircleIcon} 
               bgColor="bg-white/10" 
               textColor="text-white" 
               href="/dashboard/usuarios/nuevo" 
              />
             <ActionCard 
               title="Facturación masiva" 
               description="Generar facturas del periodo" 
               icon={ArrowUpCircleIcon} 
               bgColor="bg-white/10" 
               textColor="text-white" 
               href="/dashboard/facturacion/masiva" 
             />
             <ActionCard 
               title="Configuraciones" 
               description="Ajustar parámetros del sistema" 
               icon={DocumentTextIcon} 
               bgColor="bg-white/10" 
               textColor="text-white" 
               href="/dashboard/configuracion" 
             />
          </div>
        </div> */}
      </div>
    </div>
  )
}

const DirectorioDashboard = () => {
  const [stats, setStats] = useState({ proyectos: 0, clientes: 0, ingresos: '$0', egresos: '$0' })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const { count: projectCount, error: projectError } = await supabase.from('proyectos').select('*' , { count: 'exact', head: true })
        const { count: clientCount, error: clientError } = await supabase.from('perfiles_cliente').select('*' , { count: 'exact', head: true })
        const { data: paidInvoices, error: paidError } = await supabase.from('facturas').select('total').eq('estado', 'Pagada')
        
        if (projectError || clientError || paidError) {
          console.error('Supabase count/fetch errors:', { projectError, clientError, paidError })
          throw new Error('Error al cargar datos del dashboard')
        }

        const totalIngresos = paidInvoices?.reduce((sum, inv) => sum + (inv.total ?? 0), 0) ?? 0;
        const totalEgresos = 0;

        setStats({
          proyectos: projectCount ?? 0,
          clientes: clientCount ?? 0,
          ingresos: `$${totalIngresos.toLocaleString()}`,
          egresos: `$${totalEgresos.toLocaleString()}`
        })

      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [supabase])

  if (isLoading) return <LoadingSpinner />
  if (error) return <p className="text-red-500">Error: {error}</p>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Panel Directorio</h1>
        <p className="text-gray-500">Bienvenido al panel directorio de Ethos</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Proyectos activos" value={stats.proyectos} icon={BuildingOffice2Solid} iconColor="bg-emerald-600" href="/dashboard/proyectos" />
        <StatCard title="Clientes totales" value={stats.clientes} icon={UserGroupSolid} iconColor="bg-blue-600" href="/dashboard/propietarios" />
        <StatCard title="Ingresos (Mes)" value={stats.ingresos} icon={CurrencyDollarSolid} iconColor="bg-amber-600" href="/dashboard/facturacion-cobranza" />
        {/* <StatCard title="Egresos (Mes)" value={stats.egresos} icon={CurrencyDollarSolid} iconColor="bg-purple-600" href="/dashboard/facturacion-cobranza" /> */}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* <div className="bg-white rounded-xl shadow-sm p-6 lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Resumen financiero</h2>
          <div className="h-64 w-full bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Gráfico de ingresos y egresos (placeholder)</p>
          </div>
        </div> */}
        
        {/* <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Reportes ejecutivos</h2>
          <div className="space-y-4">
            <ActionCard title="Informe mensual" description="Resumen completo de operaciones y finanzas" icon={DocumentTextIcon} bgColor="bg-blue-50" href="/dashboard/reportes/mensual" />
            <ActionCard title="Estado de proyectos" description="Avance y estado de todos los proyectos activos" icon={BuildingOffice2Icon} bgColor="bg-emerald-50" href="/dashboard/reportes/proyectos" />
            <ActionCard title="Previsión financiera" description="Proyecciones de ingresos y egresos" icon={CurrencyDollarIcon} bgColor="bg-amber-50" href="/dashboard/reportes/prevision" />
          </div>
        </div> */}
      </div>
    </div>
  )
}

const PropietarioDashboard = () => {
  const { user, isLoading: isAuthLoading } = useAuth()
  const [stats, setStats] = useState({ propiedades: 0 })
  const [properties, setProperties] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const profileId = user?.profileId

  useEffect(() => {
    if (profileId !== null && profileId !== undefined) {
      console.log(`PropietarioDashboard: Fetching data for profileId: ${profileId}`);
      const fetchData = async () => {
        setError(null)
        try {
          const { count: propCount, error: propError } = await supabase
            .from('propiedades')
            .select('*' , { count: 'exact', head: true })
            .eq('propietario_id', profileId)
          
          const { data: recentProps, error: recentPropsError } = await supabase
            .from('propiedades')
            .select('*, proyectos(nombre)')
            .eq('propietario_id', profileId)
            .order('created_at', { ascending: false })
            .limit(2)
            
          if (propError || recentPropsError) {
            console.error('PropietarioDashboard Supabase errors:', { propError, recentPropsError })
            if (propError) throw new Error(`Error al contar propiedades: ${propError.message}`);
            if (recentPropsError) throw new Error(`Error al obtener propiedades recientes: ${recentPropsError.message}`);
            throw new Error('Error al cargar datos del dashboard')
          }
  
          setStats({ propiedades: propCount ?? 0 })
          setProperties(recentProps ?? [])
  
        } catch (err: any) {
          setError(err.message)
          console.error("Error caught in PropietarioDashboard fetchData:", err)
        } finally {
          setIsLoading(false)
        }
      }
      fetchData()
    } else {
        if (!isAuthLoading) { 
            console.log("PropietarioDashboard: profileId no disponible después de carga de Auth.")
            setError("No se pudo obtener el ID del perfil del propietario.");
            setIsLoading(false);
        }
    }
  }, [supabase, profileId, isAuthLoading])

  if (isAuthLoading) return <LoadingSpinner />
  if (!profileId && !isLoading) return <p className="text-red-500">Error: {error || "ID de perfil no encontrado."}</p>
  if (isLoading) return <LoadingSpinner />
  if (error) return <p className="text-red-500">Error: {error}</p>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Mi Dashboard (Propietario)</h1>
        <p className="text-gray-500">Gestión de tus propiedades y servicios</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Mis propiedades" value={stats.propiedades} icon={BuildingOffice2Solid} iconColor="bg-emerald-600" href="/dashboard/mis-propiedades" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Mis propiedades recientes</h2>
          <div className="space-y-4">
            {properties.length > 0 ? properties.map(prop => (
               <motion.div 
                 key={prop.id}
                 className="border border-gray-200 rounded-lg p-4 cursor-pointer relative overflow-hidden group"
                 whileHover={{ y: -2, boxShadow: '0 10px 30px -12px rgba(0, 0, 0, 0.1)' }}
               >
                 <div className="flex justify-between items-start">
                   <div>
                      <h3 className="font-medium">{prop.identificadores?.inferior ? `${prop.identificadores.inferior} ${prop.identificadores.idInferior}` : `Propiedad ID: ${prop.id}`}</h3>
                      <p className="text-sm text-gray-500">{prop.proyectos?.nombre || 'Proyecto no especificado'}</p>
                      <p className={`text-xs mt-2 ${prop.estado_uso === 'enUso' ? 'text-emerald-600' : 'text-gray-500'}`}>
                       Estado: {prop.estado_uso}
                     </p>
                   </div>
                   <BuildingOffice2Icon className="w-6 h-6 text-emerald-600" />
                 </div>
                 <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-emerald-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
               </motion.div>
            )) : <p className="text-gray-500">No tienes propiedades registradas.</p>}
            {stats.propiedades > properties.length && (
                 <ActionCard title="Ver todas" description={`Tienes ${stats.propiedades} propiedades en total`} icon={BuildingOffice2Icon} bgColor="bg-gray-50" href="/dashboard/mis-propiedades" />
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Acciones rápidas</h2>
          <div className="space-y-4">
            <ActionCard title="Crear Ticket (Mesa Ayuda)" description="Reporta un problema o haz una consulta" icon={ClipboardDocumentListIcon} bgColor="bg-emerald-50" href="/dashboard/mesa-de-ayuda" />
            <ActionCard title="Ver Documentos" description="Facturas, reglamentos y otros archivos" icon={DocumentTextIcon} bgColor="bg-blue-50" href="/dashboard/mis-documentos" />
          </div>
        </div>
      </div>
    </div>
  )
}

const ArrendatarioDashboard = () => {
  const { user, isLoading: isAuthLoading } = useAuth()
  const [stats, setStats] = useState({ alquileres: 0 })
  const [rentals, setRentals] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const profileId = user?.profileId

  useEffect(() => {
    if (profileId !== null && profileId !== undefined) {
      console.log(`ArrendatarioDashboard: Fetching data for profileId: ${profileId}`);
      const fetchData = async () => {
        setError(null)
        try {
          const { data: rentedProps, error: rentalError } = await supabase
            .from('propiedades')
            .select('*, proyectos(nombre)')
            .eq('ocupante_id', profileId)
            .limit(1)
          
          const { count: totalRentalsCount, error: totalRentalsError } = await supabase
            .from('propiedades')
            .select('*' , { count: 'exact', head: true })
            .eq('ocupante_id', profileId)
                   
          if (rentalError || totalRentalsError) {
            console.error('ArrendatarioDashboard Supabase errors:', { rentalError, totalRentalsError })
            if (rentalError) throw new Error(`Error al obtener alquiler reciente: ${rentalError.message}`);
            if (totalRentalsError) throw new Error(`Error al contar alquileres: ${totalRentalsError.message}`);
            throw new Error('Error al cargar datos del dashboard')
          }

          setStats({ alquileres: totalRentalsCount ?? 0 })
          setRentals(rentedProps ?? [])

        } catch (err: any) {
          setError(err.message)
          console.error("Error caught in ArrendatarioDashboard fetchData:", err)
        } finally {
          setIsLoading(false)
        }
      }
      fetchData()
    } else {
        if (!isAuthLoading) { 
             console.log("ArrendatarioDashboard: profileId no disponible después de carga de Auth.")
            setError("No se pudo obtener el ID del perfil del arrendatario.");
            setIsLoading(false);
        }
    }
  }, [supabase, profileId, isAuthLoading])

  if (isAuthLoading) return <LoadingSpinner />
  if (!profileId && !isLoading) return <p className="text-red-500">Error: {error || "ID de perfil no encontrado."}</p>
  if (isLoading) return <LoadingSpinner />
  if (error) return <p className="text-red-500">Error: {error}</p>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Mi Dashboard (Arrendatario)</h1>
        <p className="text-gray-500">Gestión de tu alquiler y servicios</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Mis alquileres" value={stats.alquileres} icon={BuildingOffice2Solid} iconColor="bg-emerald-600" href="/dashboard/mi-alquiler" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Mi alquiler actual</h2>
          <div className="space-y-4">
            {rentals.length > 0 ? rentals.map(prop => (
               <motion.div 
                 key={prop.id}
                 className="border border-gray-200 rounded-lg p-4 cursor-pointer relative overflow-hidden group"
                 whileHover={{ y: -2, boxShadow: '0 10px 30px -12px rgba(0, 0, 0, 0.1)' }}
               >
                 <div className="flex justify-between items-start">
                   <div>
                      <h3 className="font-medium">{prop.identificadores?.inferior ? `${prop.identificadores.inferior} ${prop.identificadores.idInferior}` : `Propiedad ID: ${prop.id}`}</h3>
                      <p className="text-sm text-gray-500">{prop.proyectos?.nombre || 'Proyecto no especificado'}</p>
                     <p className="text-xs text-emerald-600 mt-2">Estado: Contrato activo</p>
                   </div>
                   <BuildingOffice2Icon className="w-6 h-6 text-emerald-600" />
                 </div>
                 <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-emerald-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
               </motion.div>
            )) : <p className="text-gray-500">No tienes alquileres activos registrados.</p>}
             {stats.alquileres > rentals.length && (
                 <ActionCard title="Ver todos" description={`Tienes ${stats.alquileres} alquileres en total`} icon={BuildingOffice2Icon} bgColor="bg-gray-50" href="/dashboard/mi-alquiler" />
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Acciones rápidas</h2>
          <div className="space-y-4">
            <ActionCard title="Crear Ticket (Mesa Ayuda)" description="Reporta un problema o haz una consulta" icon={ClipboardDocumentListIcon} bgColor="bg-emerald-50" href="/dashboard/mesa-de-ayuda" />
            <ActionCard title="Ver Documentos" description="Facturas, reglamento y otros archivos" icon={DocumentTextIcon} bgColor="bg-blue-50" href="/dashboard/mis-documentos" />
          </div>
        </div>
      </div>
    </div>
  )
}

const dashboardContents: Record<UserRole, React.FC> = {
  'Jefe Operativo': JefeOperativoDashboard,
  'Administrador': AdministradorDashboard,
  'Directorio': DirectorioDashboard,
  'Propietario': PropietarioDashboard,
  'Arrendatario': ArrendatarioDashboard
}

export default function DashboardPage() {
  const { user, role, isLoading: isAuthLoading } = useAuth()
  const router = useRouter()
  
  // Redirigir automáticamente a proyectos para roles operativos
  useEffect(() => {
    if (!isAuthLoading && role && user) {
      if (role === 'Jefe Operativo' || role === 'Administrador' || role === 'Directorio') {
        router.replace('/dashboard/proyectos')
      } else if (role === 'Propietario' || role === 'Arrendatario') {
        router.replace('/dashboard/mis-propiedades')
      }
    }
  }, [role, user, isAuthLoading, router])
  
  if (isAuthLoading) {
    return <LoadingSpinner /> 
  }
  
  if (!role || !user) {
     return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <p className="text-gray-500">No se pudo determinar el rol del usuario o falta información.</p>
        </div>
      </div>
    ) 
  }
  
  // Mientras se hace la redirección, mostrar loading
  return <LoadingSpinner />
} 