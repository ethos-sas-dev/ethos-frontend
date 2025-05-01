'use client'

import { useState, useEffect, useMemo } from 'react';
import { createClient } from  '../../../../../lib/supabase/client'; // Ruta corregida basada en page.tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../_components/ui/table"; 
import { Card, CardContent, CardHeader, CardTitle } from "../../../_components/ui/card";
import { Skeleton } from "../../../_components/ui/skeleton";
import { Input } from "../../../_components/ui/input";
import { MagnifyingGlassIcon, ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/20/solid";
import { useDebounce } from '@uidotdev/usehooks';
// import { supabase } from '../../../../../lib/supabaseClient'; // Eliminar si createClient funciona

// Tipos para los datos (simplificado, ajustar según necesidad)
type PersonaNatural = { razon_social: string | null, cedula: string | null, ruc: string | null };
type PersonaJuridica = { razon_social: string | null, ruc: string | null };

type ClienteProfile = {
  id: number;
  tipo_persona: 'Natural' | 'Juridica';
  personas_natural: PersonaNatural | null;
  personas_juridica: PersonaJuridica | null;
  rol?: 'Propietario' | 'Arrendatario' | 'Externo' | null;
};

// Tipo para el JSONB identificadores (basado en page.tsx)
type IdentificadoresPropiedad = {
    codigo?: string | null; // Incluir código si existe
    superior?: string | null;
    idSuperior?: string | null;
    intermedio?: string | null;
    idIntermedio?: string | null;
    inferior?: string | null;
    idInferior?: string | null;
} | null;

type PropiedadData = {
  id: number;
  identificadores: IdentificadoresPropiedad; // Usar el tipo específico
  codigo_catastral?: string | null;
  propietario: ClienteProfile | null;
  ocupante: ClienteProfile | null;
};

// Tipo intermedio para los datos de Supabase antes del procesamiento
type ProyectoDataFromSupabase = {
    id: number;
    nombre: string;
    propiedades: PropiedadData[] | null; // Supabase puede devolver null aquí
};

// Tipo final para el estado
type Proyecto = {
  id: number;
  nombre: string;
  propiedades: PropiedadData[]; // Asegurado como array
};

// Helper modificado para obtener detalles del cliente
type ClientDetails = {
    nombre: string;
    identificacion: {
        tipo: 'RUC' | 'Cédula' | 'N/A';
        valor: string;
    };
    rol: string | null;
};

const getClientDetails = (client: ClienteProfile | null): ClientDetails => {
  const defaultReturn: ClientDetails = { 
    nombre: 'N/A', 
    identificacion: { tipo: 'N/A', valor: 'N/A' }, 
    rol: null 
  };
  if (!client) return defaultReturn;
  
  let nombre = 'N/A';
  let identificacion: ClientDetails['identificacion'] = { tipo: 'N/A', valor: 'N/A' };
  const rol = client.rol || null;
  
  if (client.tipo_persona === 'Natural' && client.personas_natural) {
    nombre = client.personas_natural.razon_social || 'Nombre no disponible';
    if (client.personas_natural.ruc) {
      identificacion = { tipo: 'RUC', valor: client.personas_natural.ruc };
    } else if (client.personas_natural.cedula) {
      identificacion = { tipo: 'Cédula', valor: client.personas_natural.cedula };
    }
  } else if (client.tipo_persona === 'Juridica' && client.personas_juridica) {
    nombre = client.personas_juridica.razon_social || 'Razón Social no disponible';
    if (client.personas_juridica.ruc) {
       identificacion = { tipo: 'RUC', valor: client.personas_juridica.ruc };
    }
  } else if (nombre === 'N/A') {
      nombre = 'Datos incompletos';
  }

  return { nombre, identificacion, rol };
};

// Helper para formatear identificadores (CORREGIDO)
const formatPropertyIdentifier = (propiedad: PropiedadData): string => {
    const ids = propiedad.identificadores;
    const parts: string[] = [];

    if (ids?.superior && ids?.idSuperior) {
        parts.push(`${ids.superior} ${ids.idSuperior}`);
    }
    if (ids?.intermedio && ids?.idIntermedio) {
        parts.push(`${ids.intermedio} ${ids.idIntermedio}`);
    }
    if (ids?.inferior && ids?.idInferior) {
        parts.push(`${ids.inferior} ${ids.idInferior}`);
    }

    // Si hay partes de identificadores, unirlas
    if (parts.length > 0) {
        return parts.join(' - ');
    }

    // Fallback si no hay identificadores específicos
    if (ids?.codigo) {
        return ids.codigo;
    }
    if (propiedad.codigo_catastral) {
        return propiedad.codigo_catastral;
    }
    return `ID: ${propiedad.id}`; // Último recurso
};

export default function PropertiesView() {
  const [projectsData, setProjectsData] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true); // Reactivar loading inicial
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(""); // Estado para la búsqueda
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // Debounce para la búsqueda
  const [expandedProjects, setExpandedProjects] = useState<Record<number, boolean>>({}); // Estado para controlar qué proyectos están expandidos
  const supabase = createClient(); // Usar cliente inicializado

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('proyectos')
        .select(`
          id,
          nombre,
          propiedades (
            id,
            identificadores,
            codigo_catastral,
            propietario: perfiles_cliente!propiedades_propietario_id_fkey (
              id,
              tipo_persona,
              rol,
              personas_natural (
                razon_social,
                cedula,
                ruc
              ),
              personas_juridica (
                razon_social,
                ruc
              )
            ),
            ocupante: perfiles_cliente!propiedades_ocupante_id_fkey (
              id,
              tipo_persona,
              rol,
              personas_natural (
                razon_social,
                cedula,
                ruc
              ),
              personas_juridica (
                razon_social,
                ruc
              )
            )
          )
        `)
        .order('nombre', { ascending: true })
        .returns<ProyectoDataFromSupabase[]>();

      if (fetchError) {
        console.error('Error fetching data:', fetchError);
        setError(`Error al cargar datos: ${fetchError.message}`);
        setProjectsData([]);
      } else {
        const processedData: Proyecto[] = data?.map((p: ProyectoDataFromSupabase) => ({ 
          ...p, 
          propiedades: p.propiedades || []
        })) || [];
        setProjectsData(processedData);
        // Por defecto, todos los proyectos empiezan expandidos
        setExpandedProjects(processedData.reduce((acc, p) => {
            acc[p.id] = true;
            return acc;
        }, {} as Record<number, boolean>));
      }
      setLoading(false);
    };

    fetchData();

  }, [supabase]); // Añadir supabase como dependencia

  // Función para alternar la expansión de un proyecto
  const toggleProjectExpansion = (projectId: number) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  // Filtrar datos basados en el término de búsqueda debounced
  const filteredProjectsData = useMemo(() => {
    if (!debouncedSearchTerm) {
      return projectsData; // Si no hay búsqueda, devolver todos los datos
    }
    const lowerCaseSearchTerm = debouncedSearchTerm.toLowerCase().trim();
    if (!lowerCaseSearchTerm) return projectsData;

    return projectsData.map(project => {
      const filteredProperties = project.propiedades.filter(prop => {
        const propietarioDetails = getClientDetails(prop.propietario);
        const ocupanteDetails = getClientDetails(prop.ocupante);
        const propiedadIdentifier = formatPropertyIdentifier(prop);

        return (
          propiedadIdentifier.toLowerCase().includes(lowerCaseSearchTerm) ||
          propietarioDetails.nombre.toLowerCase().includes(lowerCaseSearchTerm) ||
          (propietarioDetails.identificacion.valor && propietarioDetails.identificacion.valor.toLowerCase().includes(lowerCaseSearchTerm)) ||
          ocupanteDetails.nombre.toLowerCase().includes(lowerCaseSearchTerm) ||
          (ocupanteDetails.identificacion.valor && ocupanteDetails.identificacion.valor.toLowerCase().includes(lowerCaseSearchTerm))
        );
      });

      // Devolver el proyecto solo si tiene propiedades que coinciden o si el nombre del proyecto coincide
      if (filteredProperties.length > 0 || project.nombre.toLowerCase().includes(lowerCaseSearchTerm)) {
          return { ...project, propiedades: filteredProperties };
      }
      return null; // Si no hay coincidencias en este proyecto, se excluye
    }).filter((project): project is Proyecto => project !== null); // Filtrar los proyectos nulos
  }, [debouncedSearchTerm, projectsData]);

  return (
    <div className="space-y-4 mt-4">
      {/* Barra de búsqueda */}
      <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
          <Input
              type="text"
              placeholder="Buscar por proyecto, propiedad, propietario u ocupante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition duration-150 ease-in-out"
          />
      </div>

      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/4" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-10 w-1/3 mt-6" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}
      {error && <p className="text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}
      {!loading && !error && filteredProjectsData.length === 0 && (
        <p className="text-gray-500">
          {debouncedSearchTerm ? "No se encontraron resultados para tu búsqueda." : "No se encontraron proyectos o propiedades."}
        </p>
      )}
      {!loading && !error && filteredProjectsData.map((proyecto) => (
        <Card key={proyecto.id} className="overflow-hidden">
          {/* Hacer el header clickeable para colapsar/expandir */}
          <CardHeader
            className="bg-gray-50 border-b cursor-pointer hover:bg-gray-100 transition-colors flex flex-row justify-between items-center px-4 py-3"
            onClick={() => toggleProjectExpansion(proyecto.id)}
            aria-expanded={expandedProjects[proyecto.id] ?? true} // Default a true si no está en el estado
          >
            <CardTitle className="text-lg font-medium text-gray-700">{proyecto.nombre}</CardTitle>
            {/* Icono de flecha para indicar estado */}
            {expandedProjects[proyecto.id] ? (
                 <ChevronUpIcon className="w-5 h-5 text-gray-500" />
             ) : (
                 <ChevronDownIcon className="w-5 h-5 text-gray-500" />
             )}
          </CardHeader>
          {/* Renderizar el contenido solo si está expandido */}
          {(expandedProjects[proyecto.id] ?? true) && ( // Default a true si no está en el estado
          <CardContent className="p-0">
              {/* Mostrar propiedades filtradas */}
            {proyecto.propiedades.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 text-xs uppercase tracking-wider">
                    <TableHead className="w-[150px] px-4 py-3">Propiedad</TableHead>
                    <TableHead className="px-4 py-3">Propietario</TableHead>
                    <TableHead className="px-4 py-3">Tipo ID</TableHead>
                    <TableHead className="px-4 py-3">Identificación Prop.</TableHead>
                    <TableHead className="px-4 py-3">Ocupante</TableHead>
                    <TableHead className="px-4 py-3">Tipo ID</TableHead>
                    <TableHead className="px-4 py-3">Identificación Ocup.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proyecto.propiedades.map((propiedad) => {
                    const propietarioDetails = getClientDetails(propiedad.propietario);
                    const ocupanteDetails = getClientDetails(propiedad.ocupante);
                    // Usar la nueva función helper para formatear el identificador
                    const propiedadIdentifier = formatPropertyIdentifier(propiedad); 

                    // Helper para obtener la clase de color del texto del rol (ACTUALIZADO)
                    const getRolTextColorClass = (rol: string | null): string => {
                        switch (rol) {
                            case 'Propietario': return 'text-emerald-700'; // Verde
                            case 'Arrendatario': return 'text-blue-700';    // Azul
                            case 'Externo': return 'text-gray-600';      // Gris
                            default: return 'text-gray-600';          // Gris (por defecto)
                        }
                    };

                    return (
                      <TableRow key={propiedad.id} className="text-sm">
                        <TableCell className="font-medium whitespace-nowrap px-4 py-3">{propiedadIdentifier}</TableCell>
                        <TableCell className="px-4 py-3">{propietarioDetails.nombre}</TableCell>
                        <TableCell className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${propietarioDetails.identificacion.tipo === 'RUC' ? 'bg-blue-100 text-blue-800' : propietarioDetails.identificacion.tipo === 'Cédula' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                {propietarioDetails.identificacion.tipo}
                            </span>
                        </TableCell>
                        <TableCell className="px-4 py-3">{propietarioDetails.identificacion.valor}</TableCell>
                        <TableCell className="px-4 py-3">
                            <div>{ocupanteDetails.nombre}</div>
                            {ocupanteDetails.rol && (
                                <p className={`text-xs font-medium mt-0.5 ${getRolTextColorClass(ocupanteDetails.rol)}`}>
                                    {ocupanteDetails.rol}
                                </p>
                            )}
                        </TableCell>
                         <TableCell className="px-4 py-3">
                             <span className={`px-2 py-0.5 rounded text-xs font-medium ${ocupanteDetails.identificacion.tipo === 'RUC' ? 'bg-blue-100 text-blue-800' : ocupanteDetails.identificacion.tipo === 'Cédula' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                 {ocupanteDetails.identificacion.tipo}
                             </span>
                         </TableCell>
                        <TableCell className="px-4 py-3">{ocupanteDetails.identificacion.valor}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              ) : debouncedSearchTerm ? (
                   <p className="p-4 text-sm text-gray-500">No se encontraron propiedades que coincidan con la búsqueda en este proyecto.</p>
            ) : (
              <p className="p-4 text-sm text-gray-500">Este proyecto no tiene propiedades registradas.</p>
            )}
          </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
} 