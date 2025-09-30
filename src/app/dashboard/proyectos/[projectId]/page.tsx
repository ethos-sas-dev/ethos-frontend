"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/app/_lib/auth/AuthContext";
import { createClient } from '../../../../../lib/supabase/client';
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";
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
import { useDebounce } from '@uidotdev/usehooks';
import { Input } from "../../../_components/ui/input";
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
    imagen?: string | null;
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
    const [isSearching, setIsSearching] = useState(false); // Added state for search loading indication
    const [error, setError] = useState<string | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    
    // Estados para estadísticas del proyecto
    const [projectStats, setProjectStats] = useState<{
        totalProperties: number;
        servicios: Array<{
            codigo: string;
            nombre: string;
            precio_base: number;
        }>;
    } | null>(null);

    // Search State
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

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
                    // Use type assertion to bypass potential incorrect TS inference
                    foto_proyecto: (data.foto_proyecto as any) ?? null
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

    // Fetch Project Stats and Services
    useEffect(() => {
        if (!project || !supabase) return;
        
        const fetchProjectStats = async () => {
            try {
                // Contar propiedades del proyecto
                const { count: totalProperties } = await supabase
                    .from('propiedades')
                    .select('*', { count: 'exact', head: true })
                    .eq('proyecto_id', projectId);

                // Determinar servicios según nombre del proyecto
                let serviciosCodigos: string[] = [];
                const nombreProyecto = project.nombre.toLowerCase();
                
                if (nombreProyecto.includes('almax 3')) {
                    serviciosCodigos = ['AOA3'];
                } else if (nombreProyecto.includes('almax 2')) {
                    serviciosCodigos = ['CMA2', 'APA2'];
                } else if (nombreProyecto.includes('center')) {
                    serviciosCodigos = ['AOACL', 'AOACO', 'APAC'];
                }

                // Obtener datos de servicios
                const { data: servicios, error: serviciosError } = await supabase
                    .from('servicios')
                    .select('codigo, nombre, precio_base')
                    .in('codigo', serviciosCodigos);

                if (serviciosError) throw serviciosError;

                setProjectStats({
                    totalProperties: totalProperties || 0,
                    servicios: servicios || []
                });

            } catch (err: any) {
                console.error("Error fetching project stats:", err);
            }
        };
        
        fetchProjectStats();
    }, [project, projectId, supabase]);

    // Fetch Properties (Paginated and Searchable using RPC)
    const fetchProperties = useCallback(async (pageNum: number, currentSearchTerm: string) => {
        if (!projectId) return;
        setIsLoadingProperties(true);
        if (pageNum === 0) {
            setIsSearching(true); 
            setError(null); 
        }

        // Parameters for the RPC call
        const rpcParams = {
            p_id: parseInt(projectId, 10), // Ensure projectId is an integer
            search_pattern: currentSearchTerm ? `%${currentSearchTerm.trim().replace(/\s+/g, '%')}%` : '%', // Pass the pattern or '%' if empty
            page_limit: PROPERTIES_PER_PAGE,
            page_offset: pageNum * PROPERTIES_PER_PAGE
        };

        try {
            console.log("Calling RPC buscar_propiedades_proyecto with params:", rpcParams);
            // Call the database function instead of building the query manually
            const { data, error: rpcError } = await supabase
                .rpc('buscar_propiedades_proyecto', rpcParams);

            if (rpcError) throw rpcError;

            // Assuming the RPC function returns data in the same structure as the previous select
            // If the RPC function returns a count, use that for pagination, otherwise estimate.
            const propertiesData = data || []; // RPC might return null on no results

             // Transform data (if needed, depends on RPC return structure)
             const transformedData = propertiesData.map((prop: any) => {
                 // Add any necessary transformations here if the RPC function doesn't return nested objects directly
                 // This might need adjustment based on your actual RPC function output
                 return {
                     ...prop,
                     // Example: Re-nest if RPC returns flat structure
                     // propietario: prop.propietario_id ? { id: prop.propietario_id, ... } : null,
                     // ocupante: prop.ocupante_id ? { id: prop.ocupante_id, ... } : null,
                 };
             });

            setProperties(prev => pageNum === 0 ? transformedData : [...prev, ...transformedData]);
            setPage(pageNum + 1);
            // Pagination logic might need adjustment if count isn't returned by RPC
            // For simplicity, we assume more might exist if we received a full page
            setHasMore(transformedData.length === PROPERTIES_PER_PAGE);

        } catch (err: any) {
            console.error("Error calling RPC buscar_propiedades_proyecto:", err);
            setError(`Error al cargar propiedades: ${err.message}`);
            setHasMore(false);
        } finally {
            setIsLoadingProperties(false);
            setIsSearching(false); 
        }
    }, [projectId, supabase]);

    // Effect to handle debounced search term changes
    useEffect(() => {
        // Trigger search only when project details are loaded and debounced term changes
        if (project) {
            console.log(`Searching for: "${debouncedSearchTerm}"`);
            setProperties([]); // Clear existing properties
            setPage(0);       // Reset page number
            setHasMore(true);  // Assume there might be results initially
            fetchProperties(0, debouncedSearchTerm);
        }
    }, [debouncedSearchTerm, project, fetchProperties]);

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
                        <div className="flex items-end justify-between">
                            <div>
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
                            {/* {canManageProject && (
                                <Link 
                                    href={`/dashboard/proyectos/${projectId}/editar`}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-white/20 backdrop-blur-sm rounded-lg text-white text-sm font-medium hover:bg-white/30 transition-colors"
                                >
                                    <PencilSquareIcon className="w-4 h-4" />
                                    Editar Proyecto
                                </Link>
                            )} */}
                        </div>
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

            {/* Project Statistics Cards */}
            {projectStats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Total Properties Card */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-300">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-emerald-100 rounded-xl">
                                <BuildingOffice2Icon className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-bold text-gray-900">
                                    {projectStats.totalProperties}
                                </p>
                                <div className="w-8 h-1 bg-emerald-400 rounded-full ml-auto mt-1"></div>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                                Total Propiedades
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">En este proyecto</p>
                        </div>
                    </div>

                    {/* Services Cards */}
                    {projectStats.servicios.map((servicio) => {
                        // Limpiar nombre del servicio removiendo el nombre del proyecto
                        let nombreLimpio = servicio.nombre;
                        const nombreProyecto = project.nombre;
                        
                        // Remover variaciones del nombre del proyecto
                        const variaciones = [
                            nombreProyecto,
                            'Almax 3',
                            'Almax 2', 
                            'Almax Center',
                            'Almax Center -',
                            'Almax Center - '
                        ];
                        
                        variaciones.forEach(variacion => {
                            nombreLimpio = nombreLimpio.replace(new RegExp(variacion, 'gi'), '').trim();
                        });
                        
                        // Limpiar guiones y espacios extra
                        nombreLimpio = nombreLimpio.replace(/^[-\s]+|[-\s]+$/g, '').trim();
                        
                        return (
                        <div key={servicio.codigo} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-300">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-2 bg-emerald-100 rounded-xl">
                                    <span className="text-sm font-bold text-emerald-600">
                                        {servicio.codigo}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-gray-900">
                                        ${servicio.precio_base.toFixed(2)}
                                    </p>
                                    <div className="w-8 h-1 bg-emerald-400 rounded-full ml-auto mt-1"></div>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                                    {nombreLimpio}
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">Tasa base por m²</p>
                            </div>
                        </div>
                        );
                    })}
                </div>
            )}

            {/* Properties Section */}
            <div className="space-y-6">
                 {/* Search Bar - Improved Styling */}
                 <div className="relative max-w-md"> {/* Adjusted max-width */}
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                         <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                     <Input
                        type="text"
                        placeholder="Buscar por identificador (inferior → intermedio → superior)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                         className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition duration-150 ease-in-out"
                        disabled={isLoadingProperties} // Keep disabled state
                    />
                </div>

                <h2 className="text-xl font-semibold text-gray-900">Propiedades del Proyecto</h2>

                 {/* Error loading properties */}
                 {error && properties.length > 0 && (
                    <div className="w-full p-4 text-center text-red-700 bg-red-100 border border-red-300 rounded-lg flex items-center justify-center gap-2">
                        <ExclamationTriangleIcon className="w-5 h-5" />
                        {error}
                    </div>
                 )}

                {/* Properties Grid / Loading / No Results */}
                {(isLoadingProperties && page === 0) || isSearching ? (
                     // Show skeleton grid when loading initial page or actively searching
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                         {[...Array(PROPERTIES_PER_PAGE)].map((_, i) => <SkeletonPropertyCard key={`skel-load-${i}`} />)}
                     </div>
                 ) : properties.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {properties.map((prop) => (
                            <PropertyCard key={prop.id} property={prop} projectId={projectId} />
                        ))}
                         {/* Skeleton cards while loading MORE properties */}
                         {isLoadingProperties && page > 0 &&
                            [...Array(4)].map((_, i) => <SkeletonPropertyCard key={`skel-more-${i}`} />)
                         }
                    </div>
                 ) : (
                     // No properties found (either initially or after search)
                     <div className="w-full p-10 text-center text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                        <MagnifyingGlassIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                        <h3 className="text-lg font-medium text-gray-800">
                             {debouncedSearchTerm ? "No se encontraron propiedades" : "No hay propiedades"}
                        </h3>
                        <p className="text-sm mt-1">
                             {debouncedSearchTerm
                                 ? `Intenta con otro término de búsqueda.`
                                 : "Aún no se han añadido propiedades a este proyecto."
                             }
                        </p>
                         {canManageProject && !debouncedSearchTerm && (
                            <Button variant="outline" className="mt-4" onClick={() => router.push(`/dashboard/proyectos/${projectId}/propiedades/crear`)}>
                                <PlusIcon className="w-4 h-4 mr-2" /> Añadir Propiedad
                            </Button>
                        )}
                     </div>
                )}

                {/* Load More Button / Loading indicator */}
                <div className="flex justify-center pt-4">
                    {isLoadingProperties && page > 0 && (
                         <LoadingSpinner size="h-8 w-8" message="Cargando más propiedades..."/>
                    )}
                    {!isLoadingProperties && hasMore && properties.length > 0 && (
                        <Button
                            variant="outline"
                            onClick={() => fetchProperties(page, debouncedSearchTerm)} // Pass debounced term
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