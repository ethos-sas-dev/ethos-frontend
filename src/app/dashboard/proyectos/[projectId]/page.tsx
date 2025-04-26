"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/app/_lib/auth/AuthContext";
import { createClient } from '../../../../../lib/supabase/client';
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    ArrowLeftIcon,
    BuildingOffice2Icon,
    PlusIcon,
    ExclamationTriangleIcon,
    MapPinIcon,
    EllipsisVerticalIcon,
    PencilSquareIcon
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import PropertyCard from "./_components/PropertyCard";

// --- Types ---
type ProjectDetails = {
    id: number;
    nombre: string;
    descripcion?: string | null;
    ubicacion: string;
    foto_proyecto?: {
        external_url?: string | null;
    } | null;
    // Otros campos del proyecto que necesites
};

// Define more detailed nested types for clarity
type PersonaNatural = {
    razon_social?: string | null;
};

type PersonaJuridica = {
    razon_social?: string | null;
    nombre_comercial?: string | null;
};

type PerfilClienteDetails = {
    id: number;
    rol?: string | null; // perfil_cliente_rol
    persona_natural?: PersonaNatural | null;
    persona_juridica?: PersonaJuridica | null;
};

type Property = {
    id: number;
    identificadores: any;
    actividad?: string | null;
    estado_uso: string;
    monto_alicuota_ordinaria?: number | null;
    area_total?: number | null;
    imagen?: {
        external_url?: string | null;
    } | null;
    proyecto_id: number; // Include for consistency
    propietario_id?: number | null;
    ocupante_id?: number | null;
    ocupante_externo?: boolean | null;
    propietario?: PerfilClienteDetails | null; // Nested propietario details
    ocupante?: PerfilClienteDetails | null;    // Nested ocupante details
};

const PROPERTIES_PER_PAGE = 12; // Número de propiedades a cargar por página

// --- Loading/Skeleton Components ---
const LoadingSpinner = ({ size = 'h-16 w-16', message }: { size?: string, message?: string }) => (
    <div className="flex flex-col justify-center items-center p-10 text-center">
        <div className={`animate-spin rounded-full ${size} border-t-4 border-b-4 border-emerald-600 mb-4`}></div>
        {message && <p className="text-gray-600">{message}</p>}
    </div>
);

const SkeletonPropertyCard = () => (
    <div className="bg-white rounded-xl overflow-hidden border border-gray-200 animate-pulse">
        <div className="relative h-48 bg-gray-200"></div>
        <div className="p-4 space-y-3">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            <div className="h-3 bg-gray-200 rounded w-full"></div>
            <div className="pt-2 flex justify-between items-center">
                 <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                 <div className="h-4 bg-gray-300 rounded w-1/3"></div>
            </div>
        </div>
    </div>
);

// --- Main Page Component ---
export default function ProjectDetailPage() {
    const { user, role, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const projectId = params.projectId as string;

    const [project, setProject] = useState<ProjectDetails | null>(null);
    const [properties, setProperties] = useState<Property[]>([]);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingProject, setIsLoadingProject] = useState(true);
    const [isLoadingProperties, setIsLoadingProperties] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [menuOpen, setMenuOpen] = useState(false); // State for project options menu

    const supabase = createClient();

    // Roles permitted
    const allowedRoles = ['Jefe Operativo', 'Administrador', 'Directorio'];
    const canManageProject = role === 'Administrador' || role === 'Directorio';

    // Fetch Project Details
    useEffect(() => {
        if (!projectId || !role || !allowedRoles.includes(role)) {
            if (!isAuthLoading && role && !allowedRoles.includes(role)) {
                router.push("/dashboard/proyectos"); // Redirect if role not allowed
            }
             if (!isAuthLoading && !isLoadingProject) setIsLoadingProject(false); // Stop loading if role not loaded/not allowed
            return;
        }

        const fetchProjectDetails = async () => {
            setIsLoadingProject(true);
            setError(null);
            try {
                const { data, error: dbError } = await supabase
                    .from('proyectos')
                    .select(`
                        id,
                        nombre,
                        descripcion,
                        ubicacion,
                        foto_proyecto:archivos!foto_proyecto_id ( external_url )
                    `)
                    .eq('id', projectId)
                    .single();

                if (dbError) {
                     if (dbError.code === 'PGRST116') throw new Error("Proyecto no encontrado.");
                    throw dbError;
                }
                 // Transform data slightly to match ProjectDetails type for photo
                const transformedData = {
                    ...data,
                    foto_proyecto: Array.isArray(data.foto_proyecto) && data.foto_proyecto.length > 0
                                    ? data.foto_proyecto[0]
                                    : null
                };
                setProject(transformedData);
            } catch (err: any) {
                console.error("Error fetching project details:", err);
                setError(`Error al cargar el proyecto: ${err.message}`);
            } finally {
                setIsLoadingProject(false);
            }
        };

        fetchProjectDetails();
    }, [projectId, supabase, role, isAuthLoading, router]);

    // Fetch Properties (Paginated)
    const fetchProperties = useCallback(async (pageNum: number) => {
        if (!projectId) return;
        setIsLoadingProperties(true);
        // setError(null); // Keep previous errors potentially visible while loading more

        const rangeFrom = pageNum * PROPERTIES_PER_PAGE;
        const rangeTo = rangeFrom + PROPERTIES_PER_PAGE - 1;

        try {
            const { data, error: dbError } = await supabase
                .from('propiedades')
                .select(`
                    id,
                    identificadores,
                    actividad,
                    estado_uso,
                    monto_alicuota_ordinaria,
                    area_total,
                    proyecto_id,
                    propietario_id,
                    ocupante_id,
                    ocupante_externo,
                    imagen:archivos!imagen_id ( external_url ),
                    propietario:perfiles_cliente!propietario_id (
                        id,
                        rol,
                        persona_natural:personas_natural!persona_natural_id(razon_social),
                        persona_juridica:personas_juridica!persona_juridica_id(razon_social, nombre_comercial)
                    ),
                    ocupante:perfiles_cliente!ocupante_id (
                        id,
                        rol,
                        persona_natural:personas_natural!persona_natural_id(razon_social),
                        persona_juridica:personas_juridica!persona_juridica_id(razon_social, nombre_comercial)
                    )
                `)
                .eq('proyecto_id', projectId)
                .order('id', { ascending: true })
                .range(rangeFrom, rangeTo);

            if (dbError) throw dbError;

            // Transform data: handle nested arrays from Supabase joins
            const transformedData = (data || []).map(prop => {
                const propietario = Array.isArray(prop.propietario) ? prop.propietario[0] ?? null : prop.propietario;
                const ocupante = Array.isArray(prop.ocupante) ? prop.ocupante[0] ?? null : prop.ocupante;

                return {
                    ...prop,
                    imagen: Array.isArray(prop.imagen) && prop.imagen.length > 0
                              ? prop.imagen[0]
                              : null,
                    propietario: propietario ? {
                        ...propietario,
                        persona_natural: Array.isArray(propietario.persona_natural) ? propietario.persona_natural[0] ?? null : propietario.persona_natural,
                        persona_juridica: Array.isArray(propietario.persona_juridica) ? propietario.persona_juridica[0] ?? null : propietario.persona_juridica,
                    } : null,
                    ocupante: ocupante ? {
                        ...ocupante,
                        persona_natural: Array.isArray(ocupante.persona_natural) ? ocupante.persona_natural[0] ?? null : ocupante.persona_natural,
                        persona_juridica: Array.isArray(ocupante.persona_juridica) ? ocupante.persona_juridica[0] ?? null : ocupante.persona_juridica,
                    } : null,
                };
            });

            setProperties(prev => pageNum === 0 ? transformedData : [...prev, ...transformedData]);
            setPage(pageNum + 1);
            setHasMore(transformedData.length === PROPERTIES_PER_PAGE);

        } catch (err: any) {
            console.error("Error fetching properties:", err);
            setError(`Error al cargar propiedades: ${err.message}`);
            setHasMore(false);
        } finally {
            setIsLoadingProperties(false);
        }
    }, [projectId, supabase]);

    // Initial property fetch
    useEffect(() => {
        if (project && properties.length === 0) { // Fetch only if project loaded and properties are empty
             fetchProperties(0); // Fetch page 0
        }
    }, [project, fetchProperties, properties.length]);

    // Render loading state for project
    if (isLoadingProject || isAuthLoading) {
        return <LoadingSpinner message="Cargando detalles del proyecto..." />;
    }

    // Render error state
    if (error && !project) { // Show full page error if project failed to load
        return (
            <div className="w-full p-6 text-center text-red-600 bg-red-50 rounded-lg border border-red-200">
                <ExclamationTriangleIcon className="w-12 h-12 mx-auto text-red-400 mb-3" />
                <h2 className="text-xl font-semibold mb-2">Error</h2>
                <p>{error}</p>
                <Link href="/dashboard/proyectos" className="mt-4 inline-block text-emerald-600 hover:underline">
                    Volver a Proyectos
                </Link>
            </div>
        );
    }

    // Render project not found
    if (!project) {
         return (
            <div className="w-full p-6 text-center text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                <BuildingOffice2Icon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <h2 className="text-xl font-semibold mb-2">Proyecto no encontrado</h2>
                <Link href="/dashboard/proyectos" className="mt-4 inline-block text-emerald-600 hover:underline">
                    Volver a Proyectos
                </Link>
            </div>
        );
    }

    // --- Render Page Content ---
    const projectImageUrl = project.foto_proyecto?.external_url;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            {/* Project Header Card - Reverted to previous style */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="relative h-64"> {/* Height remains h-64 */}
                     {/* Back Button - Moved inside image container */}
                     <Link href="/dashboard/proyectos"
                           className="absolute top-6 left-6 z-10 rounded-full p-2 bg-black/20 backdrop-blur-sm text-white hover:bg-black/40 transition-colors"
                           aria-label="Volver a Proyectos">
                        <ArrowLeftIcon className="w-5 h-5" />
                    </Link>

                    {projectImageUrl ? (
                        <Image
                            src={projectImageUrl}
                            alt={project.nombre}
                            fill
                            className="object-cover"
                            priority
                        />
                    ) : (
                        <div className="h-full bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
                             <BuildingOffice2Icon className="w-24 h-24 text-emerald-200" />
                        </div>
                    )}
                     {/* Title and Location Overlay - Adjusted font sizes */}
                     <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6">
                        {/* Adjusted font size for title (e.g., text-3xl) */}
                        <h1 className="text-3xl font-semibold text-white mb-1 shadow-sm">
                            {project.nombre}
                        </h1>
                         {/* Adjusted font size for location (e.g., text-base or text-lg) */}
                        <p className="text-base text-white/90 flex items-center">
                            <MapPinIcon className="w-4 h-4 mr-1.5 flex-shrink-0" />
                            {project.ubicacion}
                        </p>
                    </div>
                     {/* Options Menu Button */}
                    {canManageProject && (
                        <div className="absolute top-4 right-4 z-10">
                            <button
                            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                            className="relative p-2 bg-white/80 rounded-full text-gray-700 hover:bg-white hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all shadow-md"
                            aria-label="Opciones del proyecto"
                            >
                                <EllipsisVerticalIcon className="w-5 h-5" />
                            </button>
                            {/* Options Menu Dropdown */}
                            {menuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.1 }}
                                    className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-20"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Link
                                        href={`/dashboard/proyectos/${projectId}/editar`}
                                        className="w-full px-4 py-3 text-left text-sm items-center flex text-gray-700 hover:bg-gray-50 transition-colors"
                                        onClick={() => setMenuOpen(false)}
                                    >
                                        <PencilSquareIcon className="w-4 h-4 mr-2" /> Editar Proyecto
                                    </Link>
                                    <Link
                                        href={`/dashboard/proyectos/${projectId}/propiedades/crear`}
                                        className="w-full px-4 py-3 text-left text-sm items-center flex text-gray-700 hover:bg-gray-50 transition-colors"
                                        onClick={() => setMenuOpen(false)}
                                    >
                                        <PlusIcon className="w-4 h-4 mr-2" /> Nueva Propiedad
                                    </Link>
                                </motion.div>
                            )}
                        </div>
                     )}
                </div>
                 {/* Description below the image */}
                 {project.descripcion && (
                     <div className="p-6 border-t border-gray-100">
                         <h2 className="text-lg font-semibold text-gray-800 mb-2">Descripción</h2>
                         <p className="text-gray-600 text-sm">{project.descripcion}</p>
                     </div>
                 )}
            </div>

            {/* Properties Section */}
            <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Propiedades del Proyecto</h2>

                 {/* Error loading properties */}
                 {error && properties.length > 0 && (
                    <div className="w-full p-4 text-center text-red-700 bg-red-100 border border-red-300 rounded-lg flex items-center justify-center gap-2">
                        <ExclamationTriangleIcon className="w-5 h-5" />
                        {error}
                    </div>
                 )}

                {/* Properties Grid - Use the new Card */}
                {properties.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {properties.map((prop) => (
                            <PropertyCard key={prop.id} property={prop} projectId={projectId} />
                        ))}
                         {/* Skeleton cards while loading more */}
                         {isLoadingProperties &&
                            [...Array(4)].map((_, i) => <SkeletonPropertyCard key={`skel-${i}`} />)
                         }
                    </div>
                ) : (
                    !isLoadingProperties && (
                        <div className="w-full p-10 text-center text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                            <BuildingOffice2Icon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                            <h3 className="text-lg font-medium text-gray-800">No hay propiedades</h3>
                            <p className="text-sm mt-1">Aún no se han añadido propiedades a este proyecto.</p>
                            {canManageProject && (
                                <Button variant="outline" className="mt-4" onClick={() => router.push(`/dashboard/proyectos/${projectId}/nueva-propiedad`)}>
                                    <PlusIcon className="w-4 h-4 mr-2" /> Añadir Propiedad
                                </Button>
                            )}
                        </div>
                    )
                )}

                {/* Load More Button / Loading indicator */}
                <div className="flex justify-center pt-4">
                    {isLoadingProperties && properties.length > 0 && (
                         <LoadingSpinner size="h-8 w-8" message="Cargando más propiedades..."/>
                    )}
                    {!isLoadingProperties && hasMore && properties.length > 0 && (
                        <Button
                            variant="outline"
                            onClick={() => fetchProperties(page)}
                            disabled={isLoadingProperties}
                        >
                            Cargar más
                        </Button>
                    )}
                    {!hasMore && properties.length > 0 && (
                         <p className="text-sm text-gray-500">No hay más propiedades para cargar.</p>
                    )}
                </div>
            </div>

        </motion.div>
    );
} 