"use client"; // Add use client directive

import { memo } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { BuildingOffice2Icon, UserIcon } from "@heroicons/react/24/outline";
// import { formatNumber } from "../../../../_lib/utils"; // Adjust path or remove if not used yet
// import type { Property } from '../../../../types'; // Use Property type from parent page or define locally

// Define Property type locally or import from a shared location
type PersonaNatural = {
    razon_social?: string | null;
};

type PersonaJuridica = {
    razon_social?: string | null;
    nombre_comercial?: string | null;
};

type PerfilClienteDetails = {
    id: number;
    rol?: string | null;
    persona_natural?: PersonaNatural | null;
    persona_juridica?: PersonaJuridica | null;
};

type Property = {
    id: number;
    identificadores: any;
    actividad?: string | null;
    estado_uso: string;
    monto_alicuota_ordinaria?: number | null;
    area_total?: number | null; // Added area_total
    imagen?: {
        external_url?: string | null;
    } | null;
    proyecto_id: number;
    propietario_id?: number | null;
    ocupante_id?: number | null;
    ocupante_externo?: boolean | null;
    propietario?: PerfilClienteDetails | null;
    ocupante?: PerfilClienteDetails | null;
};

interface PropertyCardProps {
  property: Property;
  projectId: string;
  // projectImage prop is likely not needed if image comes from property itself
}

// Helper function (consider moving to utils)
const formatNumber = (num: number | null | undefined, decimals = false): string => {
  if (num === null || num === undefined) return '-';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  });
};

const getRazonSocial = (perfil: PerfilClienteDetails | null | undefined): string | null => {
    if (!perfil) return null;
    return perfil.persona_natural?.razon_social || perfil.persona_juridica?.razon_social || perfil.persona_juridica?.nombre_comercial || null;
}

const PropertyCard = memo(function PropertyCard({ property, projectId }: PropertyCardProps) {

  // Determine Occupancy Status and Name
  let occupancyStatus: string;
  let displayName: string | null = null;
  let statusColorClasses: string;

  if (property.ocupante_id && property.ocupante?.rol === 'Arrendatario') {
      occupancyStatus = "Uso Arrendatario";
      displayName = getRazonSocial(property.ocupante);
      statusColorClasses = "border border-orange-500 text-orange-700 bg-orange-50";
  } else if (property.ocupante_externo) { // Check for ocupante_externo if no Arrendatario ocupante
       occupancyStatus = "Uso Externo";
       displayName = "Ocupante Externo"; // Or potentially leave null if no specific name available
       statusColorClasses = "border border-sky-500 text-sky-700 bg-sky-50"; // Example color
  } else {
      occupancyStatus = "Uso Propietario";
      displayName = getRazonSocial(property.propietario);
       statusColorClasses = "border border-purple-500 text-purple-700 bg-purple-50";
  }

  const getIdentificador = (tipo: 'superior' | 'idSuperior' | 'inferior' | 'idInferior' | 'intermedio' | 'idIntermedio') => {
    return property.identificadores?.[tipo] || '';
  };

  const imageUrl = property.imagen?.external_url || "/bodega.png"; // Default image

  return (
    // Use Link wrapping the motion.div for better semantics
    <Link
      href={`/dashboard/proyectos/${projectId}/propiedades/${property.id}`} // Adjusted link
      className="block h-full" // Ensure link takes full height
    >
      <motion.div
        className="bg-white rounded-xl border overflow-hidden group cursor-pointer hover:shadow-md transition-shadow duration-200 h-full flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="relative h-40 bg-gray-100 flex-shrink-0"> {/* Reduced height */}
          <Image
              src={imageUrl}
              alt={`${getIdentificador('inferior')} ${getIdentificador('idInferior')}`}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover"
          />
          {/* Area Badge */}
          {property.area_total !== null && property.area_total !== undefined && (
             <div className="absolute top-2 left-2 z-10">
                <div className="bg-white/80 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-medium shadow-sm">
                {formatNumber(property.area_total)} m²
                </div>
            </div>
          )}
           {/* Occupancy Status Badge */}
           <div className="absolute top-2 right-2 z-10">
                <span className={`px-2 py-1 rounded-md text-xs font-medium shadow-sm ${statusColorClasses}`}>
                    {occupancyStatus}
                </span>
            </div>
        </div>
        <div className="p-3 flex-grow flex flex-col"> {/* Reduced padding */}
          {/* Header con identificadores */}
          <div className="mb-1.5">
             <h3 className="font-semibold text-sm text-gray-900 group-hover:text-emerald-700 transition-colors truncate" title={`${getIdentificador('inferior')} ${getIdentificador('idInferior')}`}>
              {getIdentificador('inferior')} {getIdentificador('idInferior')}
              </h3>
              <p className="text-xs text-gray-500 truncate" title={`${getIdentificador('superior')} ${getIdentificador('idSuperior')} / ${getIdentificador('intermedio')} ${getIdentificador('idIntermedio')}`}>
                 {getIdentificador('superior')} {getIdentificador('idSuperior')}
                 {getIdentificador('intermedio') && ` / ${getIdentificador('intermedio')} ${getIdentificador('idIntermedio')}`}
              </p>
          </div>

          {/* Display Name (Owner/Occupant) */}
          <div className="flex-grow mt-1">
             {displayName ? (
                <div className="flex items-start text-xs text-gray-600" title={displayName}>
                    <UserIcon className="w-3 h-3 mr-1 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2">
                        {displayName}
                    </span>
                </div>
             ) : (
                <div className="h-8"></div> // Placeholder height if no name
             )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
});

export default PropertyCard; 