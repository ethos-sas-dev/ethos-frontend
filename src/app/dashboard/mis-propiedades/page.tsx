"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/app/_lib/auth/AuthContext";
import { createClient } from '../../../../lib/supabase/client'
import { ArrowRightIcon, BuildingOffice2Icon } from "@heroicons/react/24/outline";
// import RoleProtectedRoute from "@/app/_components/auth/RoleProtectedRoute"; // Asegúrate que la ruta es correcta

const LoadingSpinner = () => (
  <div className="flex justify-center items-center p-4">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
  </div>
);

const PropertyCard = ({ propiedad }: { propiedad: any }) => {
  // Accede a la URL a través de la relación 'imagen' y usa external_url
  const imageUrl = propiedad.imagen?.external_url || "/bodega.png";
  const identificadorInferior = propiedad.identificadores?.inferior || '';
  const idInferior = propiedad.identificadores?.idInferior || '';
  const identificadorIntermedio = propiedad.identificadores?.intermedio || '';
  const idIntermedio = propiedad.identificadores?.idIntermedio || '';
  const identificadorSuperior = propiedad.identificadores?.superior || '';
  const idSuperior = propiedad.identificadores?.idSuperior || '';
  const alicuota = propiedad.monto_alicuota_ordinaria || 0;

  return (
    <motion.div
      key={propiedad.id}
      className="bg-white rounded-xl overflow-hidden border group hover:shadow-lg transition-all duration-200"
      whileHover={{ y: -4 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="relative h-48">
        <Image
          src={imageUrl}
          alt={`${identificadorInferior} ${idInferior}`}
          fill
          className="object-cover"
        />
        <span
          className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium ${
            propiedad.estado_uso === 'enUso'
              ? "bg-emerald-100 text-emerald-800"
              : "bg-blue-100 text-blue-800"
          }`}
        >
          {propiedad.estado_uso === 'enUso' ? "En uso" : "Disponible"}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-medium text-lg">{`${identificadorSuperior} ${idSuperior}`}</h3>
        <p className="text-gray-500 text-sm mb-1">{`${identificadorIntermedio} ${idIntermedio} ${identificadorInferior} ${idInferior} `}</p>
        <p className="text-gray-500 text-sm">{propiedad.actividad || ""}</p>
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Alícuota:</span>
            <span className="font-medium text-gray-900">
              ${alicuota.toFixed(2)}
            </span>
          </div>
        </div>
        <Link
          href={`/dashboard/mis-propiedades/${propiedad.id}`}
          className="mt-4 inline-flex items-center text-emerald-600 hover:text-emerald-800 text-sm font-medium"
        >
          Ver detalles
          <ArrowRightIcon className="w-4 h-4 ml-1" />
        </Link>
      </div>
    </motion.div>
  );
};

function MisPropiedadesContent() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [propiedades, setPropiedades] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const profileId = user?.profileId;

  useEffect(() => {
    if (!isAuthLoading && !profileId) {
      setError("No se pudo obtener el ID del perfil del propietario.");
      setIsLoading(false);
      return;
    }

    if (profileId) {
      const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const { data, error: dbError } = await supabase
            .from('propiedades')
            .select(`
              id,
              propietario_id,
              identificadores,
              actividad,
              estado_uso,
              monto_alicuota_ordinaria,
              imagen:archivos!imagen_id ( external_url ) 
            `)
            .eq('propietario_id', profileId);

          if (dbError) {
            console.error('Error fetching properties:', dbError);
            throw new Error(`Error al cargar propiedades: ${dbError.message}`);
          }

          setPropiedades(data || []);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    }
  }, [supabase, profileId, isAuthLoading]);

  if (isLoading || isAuthLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="w-full p-4 text-center text-red-600">
        Error: {error}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto"
    >
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900">Mis Propiedades</h1>
        <p className="mt-1 text-gray-500">Administra las propiedades de las que eres propietario.</p>
      </div>

      {propiedades.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6 text-center py-12 border">
           <BuildingOffice2Icon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No tienes propiedades registradas
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Parece que aún no tienes propiedades asociadas a tu perfil.
          </p>
          {/* Podrías añadir un botón para contactar soporte o similar si aplica */}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {propiedades.map((propiedad) => (
            <PropertyCard key={propiedad.id} propiedad={propiedad} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default function MisPropiedadesPage() {
  const { role } = useAuth();

  // Simple check for role, redirect or show message if not Propietario
  // Consider using a more robust solution like RoleProtectedRoute if available
  if (role !== 'Propietario') {
    // Optional: Add a redirect or a proper access denied component
    // import { useRouter } from 'next/navigation';
    // const router = useRouter();
    // useEffect(() => { router.push('/dashboard'); }, [router]);
    return (
      <div className="p-4 text-center text-red-500">
        Acceso denegado. Debes ser Propietario para ver esta página.
      </div>
    );
  }

  return (
    <MisPropiedadesContent />
  );
} 