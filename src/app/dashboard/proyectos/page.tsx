"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/_lib/auth/AuthContext";
import { createClient } from '../../../../lib/supabase/client'; // Asegúrate que la ruta es correcta
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button"; // Asumiendo que usas ShadCN UI
import { PlusIcon, BuildingStorefrontIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";

// --- Types (ajustar según necesidad) ---
type Project = {
  id: number;
  nombre: string;
  descripcion?: string | null;
  ubicacion: string;
  foto_proyecto?: { // Relación con archivos
    external_url?: string | null;
  } | null;
  imagen?: { // Relación con archivos
    external_url?: string | null;
  } | null;
  // Otros campos que necesites mostrar
};

// --- Loading Skeleton ---
const SkeletonProjectCard = () => (
  <div className="bg-white rounded-xl overflow-hidden border border-gray-200 animate-pulse">
    <div className="relative h-48 bg-gray-200"></div>
    <div className="p-6 space-y-3">
      <div className="h-4 bg-gray-300 rounded w-3/4"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      <div className="space-y-2 pt-2">
          <div className="h-3 bg-gray-200 rounded w-full"></div>
          <div className="h-3 bg-gray-200 rounded w-5/6"></div>
      </div>
    </div>
  </div>
);

const SkeletonProjectList = ({ count = 3 }: { count?: number }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[...Array(count)].map((_, i) => <SkeletonProjectCard key={i} />)}
  </div>
);

// --- Project Card Component ---
const ProjectCard = ({ project }: { project: Project }) => {
  const router = useRouter();
  const imageUrl = project.foto_proyecto?.external_url;
  console.log(imageUrl);
  return (
    <motion.div
      key={project.id}
      className="bg-white rounded-xl overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow duration-200 cursor-pointer group"
      onClick={() => router.push(`/dashboard/proyectos/${project.id}`)}
      whileHover={{ y: -3 }}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="relative h-48 overflow-hidden">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={project.nombre}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300 ease-in-out"
          />
        ) : (
          <div className="h-full bg-gray-100 flex items-center justify-center">
            <BuildingStorefrontIcon className="w-16 h-16 text-gray-300" />
          </div>
        )}
        {/* Podrías añadir un badge aquí si tuvieras info relevante como unidad de negocio */}
      </div>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 truncate" title={project.nombre}>
          {project.nombre}
        </h3>
        {project.ubicacion && (
          <p className="text-sm text-gray-500 mt-1 truncate" title={project.ubicacion}>
            {project.ubicacion}
          </p>
        )}
        {project.descripcion && (
          <p className="mt-3 text-sm text-gray-600 line-clamp-3">
            {project.descripcion}
          </p>
        )}
      </div>
    </motion.div>
  );
};

// --- Main Page Component ---
export default function ProyectosPage() {
  const { user, role, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Define roles permitidos y verificar acceso
  const allowedRoles = ['Jefe Operativo', 'Administrador', 'Directorio'];
  const canCreate = role === 'Administrador' || role === 'Directorio';
  const isDirectorio = role === 'Directorio';
  const profileId = user?.profileId; // ID del perfil operacional

  useEffect(() => {
    // Redirigir si el rol no está permitido una vez que la autenticación haya cargado
    if (!isAuthLoading && role && !allowedRoles.includes(role)) {
      router.push("/dashboard");
    }
  }, [role, isAuthLoading, router]);

  // Fetching de datos
  useEffect(() => {
    // Solo proceder si el rol es válido y el perfil está disponible (si es necesario)
    if (!role || !allowedRoles.includes(role) || (role !== 'Directorio' && !profileId)) {
      // Si el rol es inválido pero aún no se ha redirigido, o falta profileId, detener la carga
      if (role && !allowedRoles.includes(role)) {
          // Ya se maneja con el primer useEffect, pero evitamos fetch innecesario
      } else if (!isAuthLoading) {
        // Si la autenticación terminó pero falta role o profileId (y es requerido), detenemos
        setIsLoading(false);
      }
      return;
    }

    const fetchProjects = async () => {
      setIsLoading(true);
      setError(null);
      let fetchedProjects: Project[] = [];

      try {
        if (isDirectorio) {
          // Directorio: Obtener todos los proyectos
          const { data, error: dbError } = await supabase
            .from('proyectos')
            .select(`
              id,
              nombre,
              descripcion,
              ubicacion,
              foto_proyecto:archivos!foto_proyecto_id ( external_url )
            `);
          if (dbError) throw dbError;
          // Transformar datos antes de setear el estado
          const transformedData = (data || []).map(proj => ({
            ...proj,
            // Use type assertion to bypass incorrect TS inference
            foto_proyecto: (proj.foto_proyecto as any) ?? null
          }));
          fetchedProjects = transformedData;

        } else {
          // Jefe Operativo / Administrador: Obtener proyectos asignados
          // Paso 1: Obtener los IDs de los proyectos asignados
          const { data: links, error: linkError } = await supabase
            .from('proyecto_perfil_operacional_links')
            .select('proyecto_id')
            .eq('perfil_operacional_id', profileId);

          if (linkError) throw linkError;

          if (links && links.length > 0) {
            // Especificar tipo para 'link'
            const projectIds = links.map((link: { proyecto_id: number }) => link.proyecto_id);
            // Paso 2: Obtener los detalles de esos proyectos
            const { data: projectsData, error: projectError } = await supabase
              .from('proyectos')
              .select(`
                id,
                nombre,
                descripcion,
                ubicacion,
                foto_proyecto:archivos!foto_proyecto_id ( external_url )
              `)
              .in('id', projectIds);

            if (projectError) throw projectError;
            // Transformar datos antes de setear el estado
            const transformedProjectsData = (projectsData || []).map(proj => ({
                ...proj,
                // Use type assertion to bypass incorrect TS inference
                 foto_proyecto: (proj.foto_proyecto as any) ?? null
            }));
            fetchedProjects = transformedProjectsData;
          } else {
            // No hay proyectos asignados
             fetchedProjects = []; // Fix syntax error
          }
        }
        setProjects(fetchedProjects);
      } catch (err: any) {
        console.error("Error al cargar proyectos:", err);
        setError(`No se pudieron cargar los proyectos: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();

  }, [role, profileId, supabase, isDirectorio, isAuthLoading]); // Dependencias clave

  // Renderizado condicional mientras carga o si no tiene permiso
  if (isLoading || isAuthLoading || (role && !allowedRoles.includes(role))) {
    // Mostrar Skeleton mientras carga o antes de redirigir
    const initialSkeletonCount = projects.length > 0 ? projects.length : 3; // Placeholder count
    return (
      <div className="space-y-6">
         <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">
            {isDirectorio ? 'Todos los Proyectos' : 'Proyectos Asignados'}
          </h1>
          {canCreate && (
            <Button variant="default" disabled className="bg-gray-300 cursor-not-allowed flex items-center gap-2">
              <PlusIcon className="w-4 h-4" />
              Nuevo Proyecto
            </Button>
          )}
        </div>
        <SkeletonProjectList count={initialSkeletonCount} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">
          {isDirectorio ? 'Todos los Proyectos' : 'Proyectos Asignados'}
        </h1>
        {canCreate && (
          <Button variant="default" className="bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2" onClick={() => router.push('/dashboard/proyectos/nuevo')}>
            <PlusIcon className="w-4 h-4" />
            Nuevo Proyecto
          </Button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="w-full p-4 text-center text-red-700 bg-red-100 border border-red-300 rounded-lg flex items-center justify-center gap-2">
          <ExclamationTriangleIcon className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Content: List or Empty State */}
      {!error && projects.length === 0 && (
        <div className="w-full p-10 text-center text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
          <BuildingStorefrontIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <h3 className="text-lg font-medium text-gray-800">No se encontraron proyectos</h3>
          <p className="text-sm mt-1">
            {!isDirectorio ? 'No tienes proyectos asignados actualmente.' : 'No hay proyectos registrados en el sistema.'}
          </p>
          {canCreate && (
             <Button variant="outline" className="mt-4" onClick={() => router.push('/dashboard/proyectos/nuevo')}>
               Crear primer proyecto
            </Button>
          )}
        </div>
      )}

      {!error && projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
} 