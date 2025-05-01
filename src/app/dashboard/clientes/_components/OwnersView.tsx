'use client'

import { useState, useEffect, useMemo } from 'react';
import { createClient } from  '../../../../../lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "../../../_components/ui/card";
import { Skeleton } from "../../../_components/ui/skeleton";
import { Input } from "../../../_components/ui/input";
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import { useDebounce } from '@uidotdev/usehooks';
import Link from 'next/link';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/20/solid';
import { BuildingOfficeIcon } from '@heroicons/react/24/outline';

// --- Tipos --- 

type PersonaNatural = { razon_social: string | null, cedula: string | null, ruc: string | null };
type PersonaJuridica = { razon_social: string | null, ruc: string | null };

// Corregido: Relaciones uno-a-uno son objetos o null
type ClienteProfileFromSupabase = {
  id: number;
  tipo_persona: 'Natural' | 'Juridica';
  rol?: 'Propietario' | 'Arrendatario' | 'Externo' | null;
  personas_natural: PersonaNatural | null; 
  personas_juridica: PersonaJuridica | null;
};

// Corregido: proyecto es objeto o null
type OwnedPropertyFromSupabase = {
    id: number;
    proyecto_id: number;
    identificadores: any | null; 
    codigo_catastral?: string | null;
    proyecto: { nombre: string | null } | null; 
};

// Corregido: Tipos de persona son objetos o null
type OwnerWithProperties = {
    id: number;
    tipo_persona: 'Natural' | 'Juridica';
    rol?: 'Propietario' | 'Arrendatario' | 'Externo' | null;
    personas_natural: PersonaNatural | null;
    personas_juridica: PersonaJuridica | null;
    propiedades: { 
        id: number;
        proyecto_id: number;
        identificadores: any | null;
        codigo_catastral?: string | null;
        proyecto_nombre: string | null;
    }[];
};

// --- Helpers --- 

// Definir formatPropertyIdentifier localmente
const formatPropertyIdentifier = (propiedad: { identificadores: any | null, codigo_catastral?: string | null, id: number }): string => {
    const ids = propiedad.identificadores;
    const parts: string[] = [];
    if (ids?.superior && ids?.idSuperior) parts.push(`${ids.superior} ${ids.idSuperior}`);
    if (ids?.intermedio && ids?.idIntermedio) parts.push(`${ids.intermedio} ${ids.idIntermedio}`);
    if (ids?.inferior && ids?.idInferior) parts.push(`${ids.inferior} ${ids.idInferior}`);
    if (parts.length > 0) return parts.join(' - ');
    if (ids?.codigo) return ids.codigo;
    if (propiedad.codigo_catastral) return propiedad.codigo_catastral;
    return `ID: ${propiedad.id}`;
};

// getOwnerClientDetails adaptado para OwnerWithProperties
type OwnerClientDetails = {
    nombre: string;
    identificacion: {
        tipo: 'RUC' | 'Cédula' | 'N/A';
        valor: string;
    };
};

// Corregido: Acceder directamente a owner.personas_natural / owner.personas_juridica
const getOwnerClientDetails = (owner: OwnerWithProperties | null): OwnerClientDetails => {
    const defaultReturn = { nombre: 'N/A', identificacion: { tipo: 'N/A' as const, valor: 'N/A' } };
    if (!owner) return defaultReturn;

    let nombre = 'N/A';
    let identificacion: OwnerClientDetails['identificacion'] = { tipo: 'N/A', valor: 'N/A' };
    
    if (owner.tipo_persona === 'Natural' && owner.personas_natural) {
        nombre = owner.personas_natural.razon_social || 'Nombre no disponible';
        if (owner.personas_natural.ruc) {
            identificacion = { tipo: 'RUC', valor: owner.personas_natural.ruc };
        } else if (owner.personas_natural.cedula) {
            identificacion = { tipo: 'Cédula', valor: owner.personas_natural.cedula };
        }
    } else if (owner.tipo_persona === 'Juridica' && owner.personas_juridica) {
        nombre = owner.personas_juridica.razon_social || 'Razón Social no disponible';
        if (owner.personas_juridica.ruc) {
            identificacion = { tipo: 'RUC', valor: owner.personas_juridica.ruc };
        }
    } else if (!owner.personas_natural && !owner.personas_juridica) { // Verifica si AMBOS son null
        nombre = 'Datos de persona no encontrados'; // Mensaje más específico
    }
    return { nombre, identificacion };
};


// --- Componente --- 
export default function OwnersView() {
  const [ownersData, setOwnersData] = useState<OwnerWithProperties[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Tipo explícito para la respuesta de Supabase (CORREGIDO)
        type SupabaseOwnerResponse = (ClienteProfileFromSupabase & {
            // Propiedades sigue siendo un array
            propiedades: OwnedPropertyFromSupabase[] | null; 
        });

        const { data: owners, error: ownersError } = await supabase
          .from('perfiles_cliente')
          .select(`
            id,
            tipo_persona,
            rol,
            personas_natural (*), 
            personas_juridica (*),
            propiedades!propiedades_propietario_id_fkey (
                id,
                proyecto_id, 
                identificadores,
                codigo_catastral,
                proyecto: proyectos!inner (*) 
            )
          `)
          .eq('rol', 'Propietario')
          .returns<SupabaseOwnerResponse[]>(); 

        if (ownersError) throw ownersError;

        // Procesar datos CUIDADOSAMENTE para el estado local (CORREGIDO)
        const processedData: OwnerWithProperties[] = owners?.map(owner => {
            // Acceder directamente como objeto o null
            const persona_natural = owner.personas_natural || null;
            const persona_juridica = owner.personas_juridica || null;

            const propiedades = (owner.propiedades || []).map(prop => ({
                id: prop.id,
                proyecto_id: prop.proyecto_id,
                identificadores: prop.identificadores,
                codigo_catastral: prop.codigo_catastral,
                // Acceder directamente al nombre del proyecto (objeto o null)
                proyecto_nombre: prop.proyecto?.nombre || null 
            }));
            
            return {
                id: owner.id,
                tipo_persona: owner.tipo_persona,
                rol: owner.rol,
                // Asignar los objetos directamente
                personas_natural: persona_natural, 
                personas_juridica: persona_juridica,
                propiedades
            };
        }) || [];

        // Ordenar propietarios por nombre/razón social
        processedData.sort((a, b) => {
            const nameA = getOwnerClientDetails(a).nombre.toLowerCase();
            const nameB = getOwnerClientDetails(b).nombre.toLowerCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0;
        });

        setOwnersData(processedData);

      } catch (err: any) {
        console.error('Error fetching owners data:', err);
        setError(`Error al cargar propietarios: ${err.message}`);
        setOwnersData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [supabase]);

  // Filtrar datos basados en el término de búsqueda debounced
  const filteredOwnersData = useMemo(() => {
    const lowerCaseSearchTerm = debouncedSearchTerm.toLowerCase().trim();
    if (!lowerCaseSearchTerm) {
      return ownersData; // Devolver todos si no hay búsqueda
    }

    return ownersData.filter(owner => {
      const ownerDetails = getOwnerClientDetails(owner);
      return (
        ownerDetails.nombre.toLowerCase().includes(lowerCaseSearchTerm) ||
        (ownerDetails.identificacion.valor && ownerDetails.identificacion.valor.toLowerCase().includes(lowerCaseSearchTerm))
      );
    });
  }, [debouncedSearchTerm, ownersData]);

  return (
    <div className="space-y-4 mt-4">
      {/* Barra de búsqueda */}
      <div className="relative max-w-md mb-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
          <Input
              type="text"
              placeholder="Buscar por nombre, razón social o identificación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition duration-150 ease-in-out"
          />
      </div>

      {/* ... Loading Skeleton ... */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-52 w-full rounded-lg" />)}
        </div>
      )}
      {/* ... Error Message ... */}
      {error && <p className="text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}
      {/* ... No Data Message (Actualizado) ... */}
      {!loading && !error && filteredOwnersData.length === 0 && (
         <p className="text-gray-500 text-center py-10">
           {debouncedSearchTerm ? "No se encontraron propietarios que coincidan con la búsqueda." : "No se encontraron propietarios."}
         </p>
      )}
      {/* ... Owners Grid (Usa filteredOwnersData) ... */}
      {!loading && !error && filteredOwnersData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOwnersData.map((owner) => {
            const ownerDetails = getOwnerClientDetails(owner);
            return (
              <Card key={owner.id} className="overflow-hidden flex flex-col">
                <CardHeader className="bg-gray-50 border-b p-4">
                  <CardTitle className="text-base font-medium text-gray-800 truncate">{ownerDetails.nombre}</CardTitle>
                  <div className="flex items-center mt-1">
                     <span 
                       className={`px-2 py-0.5 rounded text-xs font-medium mr-2 border ${ownerDetails.identificacion.tipo === 'RUC' ? 'bg-blue-100 text-blue-800 border-blue-200' : ownerDetails.identificacion.tipo === 'Cédula' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}
                     >
                       {ownerDetails.identificacion.tipo}
                     </span>
                    <span className="text-sm text-gray-700 font-medium">{ownerDetails.identificacion.valor}</span>
                  </div>
                </CardHeader>
                <CardContent className="p-5 text-sm flex-grow bg-white">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Propiedades Asignadas</h4>
                  {owner.propiedades.length > 0 ? (
                    <ul className="space-y-2">
                      {owner.propiedades.map((prop) => {
                        const displayIdentifier = formatPropertyIdentifier(prop);
                        const href = `/dashboard/proyectos/${prop.proyecto_id}/propiedades/${prop.id}`;
                        return (
                            <li key={prop.id} className="text-sm">
                                <Link href={href} className="group flex items-center justify-between text-gray-700 hover:text-emerald-700 transition-colors duration-150 p-2 rounded-md hover:bg-emerald-50">
                                   <span className="flex items-center">
                                     <BuildingOfficeIcon className="w-3.5 h-3.5 mr-2 text-gray-400 group-hover:text-emerald-600 transition-colors duration-150" />
                                     <span>
                                        <span className="font-medium">{displayIdentifier}</span>
                                        {prop.proyecto_nombre && <span className="text-gray-500 text-xs ml-1">({prop.proyecto_nombre})</span>}
                                     </span>
                                   </span>
                                   {/* Podríamos añadir un icono extra o chevron a la derecha si quisiéramos */}
                                </Link>
                            </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500 italic text-center py-4">Sin propiedades asignadas.</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
} 