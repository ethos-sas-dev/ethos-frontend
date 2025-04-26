"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/app/_lib/auth/AuthContext";
import { createClient } from '../../../../../lib/supabase/client'
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeftIcon,
  BuildingOffice2Icon,
  DocumentTextIcon,
  UserIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilSquareIcon,
  InformationCircleIcon,
  CheckCircleIcon, // For status indicators
  XCircleIcon, // For status indicators
  ClockIcon // For status indicators
} from "@heroicons/react/24/outline";

const LoadingSpinner = () => (
  <div className="flex justify-center items-center p-10">
    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-emerald-600"></div>
  </div>
);

const StatusBadge = ({ text, color, icon: Icon }: { text: string; color: string; icon: React.ElementType }) => (
  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-${color}-100 text-${color}-800`}>
    <Icon className="w-4 h-4 mr-1.5" />
    {text}
  </span>
);

export default function PropertyDetailPage() {
  const { user, role } = useAuth();
  const router = useRouter();
  const params = useParams();
  const documentId = params.id as string;

  const [property, setProperty] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [updatingIncognito, setUpdatingIncognito] = useState(false);

  const supabase = createClient();

  // --- Data Fetching ---
  useEffect(() => {
    if (role && role !== "Propietario") {
      router.push("/dashboard");
      return;
    }

    if (documentId && role === "Propietario") {
      const fetchProperty = async () => {
        setIsLoading(true);
        setError(null);
        try {
          if (!user?.profileId) {
            console.log("Waiting for profileId...");
            return;
          }

          const { data, error: dbError } = await supabase
            .from('propiedades')
            .select(`
              *,
              imagen:archivos!imagen_id ( external_url, filename ),
              escritura_pdf:archivos!escritura_pdf_id ( external_url, filename ),
              acta_entrega_pdf:archivos!acta_entrega_pdf_id ( external_url, filename ),
              contrato_arrendamiento_pdf:archivos!contrato_arrendamiento_pdf_id ( external_url, filename )
            `)
            .eq('id', documentId)
            .eq('propietario_id', user.profileId)
            .single();

          if (dbError) {
            console.error("Error fetching property details:", dbError);
            if (dbError.code === 'PGRST116') {
                 throw new Error("Propiedad no encontrada o no tienes permiso para verla.");
            } else {
                 throw new Error(`Error al cargar detalles: ${dbError.message}`);
            }
          }

          setProperty(data);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      };

      fetchProperty();

    } else if (role) {
        setIsLoading(false);
        if (role !== "Propietario") {
            // Error state already handled by redirect, but could set an error here too
            // setError("Acceso denegado.");
        }
    }

  }, [documentId, supabase, role, user?.profileId, router]);

  // --- Incognito Mode Mutation ---
  const toggleIncognitoMode = async () => {
    if (!property) return;
    setUpdatingIncognito(true);
    setMenuOpen(false);
    try {
      const { error: updateError } = await supabase
        .from('propiedades')
        .update({ modo_incognito: !property.modo_incognito })
        .eq('id', documentId);

      if (updateError) {
        console.error("Error updating incognito mode:", updateError);
        throw new Error("Error al actualizar modo incógnito.");
      }
      setProperty({ ...property, modo_incognito: !property.modo_incognito });
    } catch (err: any) {
      console.error("Failed to toggle incognito mode:", err);
      alert(err.message || "No se pudo cambiar el modo incógnito.");
    } finally {
      setUpdatingIncognito(false);
    }
  };

  // --- Render Logic ---
  if (isLoading || !role) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="w-full p-6 text-center text-red-600 bg-red-50 rounded-lg border border-red-200">
        <XCircleIcon className="w-12 h-12 mx-auto text-red-400 mb-3"/>
        <h2 className="text-xl font-semibold mb-2">Error al cargar propiedad</h2>
        <p>{error}</p>
        <Link href="/dashboard/mis-propiedades" className="mt-4 inline-block text-emerald-600 hover:underline">
          Volver a Mis Propiedades
        </Link>
      </div>
    );
  }

  if (!property) {
    return (
       <div className="w-full p-6 text-center text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
         <BuildingOffice2Icon className="w-12 h-12 mx-auto text-gray-400 mb-3"/>
        <h2 className="text-xl font-semibold mb-2">Propiedad no encontrada</h2>
        <p>No pudimos encontrar los detalles para esta propiedad.</p>
        <Link href="/dashboard/mis-propiedades" className="mt-4 inline-block text-emerald-600 hover:underline">
          Volver a Mis Propiedades
        </Link>
      </div>
    );
  }

  // --- Formatters & Helpers ---
  const formatIdentifier = (obj: any, level: string) => {
      const prefix = obj?.[level] || '';
      const id = obj?.[`id${level.charAt(0).toUpperCase() + level.slice(1)}`] || '';
      const combined = `${prefix} ${id}`.trim();
      return combined || null;
  }
  const formattedSuperior = formatIdentifier(property.identificadores, 'superior');
  const formattedIntermedio = formatIdentifier(property.identificadores, 'intermedio');
  const formattedInferior = formatIdentifier(property.identificadores, 'inferior');

  const propertyImage = property.imagen?.external_url || '/bodega.png';
  const propertyArea = property.area_total || 0;

  const getStatusInfo = (status: string | null | undefined) => {
    switch (status) {
      case 'enUso': return { text: 'En Uso', color: 'blue', icon: UserIcon };
      case 'disponible': return { text: 'Disponible', color: 'green', icon: CheckCircleIcon };
      case 'entregado': return { text: 'Entregado', color: 'green', icon: CheckCircleIcon };
      case 'noEntregado': return { text: 'No Entregado', color: 'yellow', icon: ClockIcon };
      default: return { text: status ? status.charAt(0).toUpperCase() + status.slice(1) : 'No definido', color: 'gray', icon: InformationCircleIcon };
    }
  };

  const estadoUsoInfo = getStatusInfo(property.estado_uso);
  const estadoEntregaInfo = getStatusInfo(property.estado_entrega);
  const estadoConstruccionInfo = getStatusInfo(property.estado_de_construccion);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="mb-6">
        <Link
          href="/dashboard/mis-propiedades"
          className="inline-flex items-center text-gray-600 hover:text-emerald-700 transition-colors text-sm"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Volver a mis propiedades
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
        {/* Header with Image */}
        <div className="relative h-64 md:h-80">
          <Image
            src={propertyImage}
            alt={`Propiedad ${formattedInferior || 'Imagen'}`}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end">
            <div className="p-6 text-white">
              <h1 className="text-3xl md:text-4xl font-bold mb-1">
                {formattedInferior || 'Propiedad sin Identificador Inferior'}
              </h1>
              <p className="text-lg text-white/80 flex items-center">
                <MapPinIcon className="w-5 h-5 mr-2 flex-shrink-0" />
                {formattedSuperior || 'Ubicación no disponible'} {formattedIntermedio ? `/ ${formattedIntermedio}` : ''}
              </p>
            </div>
          </div>

          {/* Options Menu Button */}
          <div className="absolute top-4 right-4">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="relative p-2 bg-white/80 rounded-full text-gray-700 hover:bg-white hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all"
              aria-label="Opciones de propiedad"
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
                className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-20"
              >
                <button
                  onClick={toggleIncognitoMode}
                  className="w-full px-4 py-3 text-left flex items-center text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  disabled={updatingIncognito}
                >
                  {property.modo_incognito ? (
                    <><EyeIcon className="w-5 h-5 mr-3 text-gray-500" /> Desactivar modo incógnito</>
                  ) : (
                    <><EyeSlashIcon className="w-5 h-5 mr-3 text-gray-500" /> Activar modo incógnito</>
                  )}
                  {updatingIncognito && <span className="ml-auto text-xs text-gray-400">Actualizando...</span>}
                </button>
                <Link
                  href={`/dashboard/solicitudes/nuevo?propiedad=${documentId}`}
                  className="w-full px-4 py-3 text-left flex items-center text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  <PencilSquareIcon className="w-5 h-5 mr-3 text-gray-500" />
                  Crear solicitud
                </Link>
              </motion.div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-6 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Left Column */}
            <div className="lg:col-span-2 space-y-8">

               {/* Property Details Card */}
                <section aria-labelledby="property-details-heading">
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h2 id="property-details-heading" className="text-xl font-semibold mb-5 flex items-center text-gray-800">
                      <BuildingOffice2Icon className="w-6 h-6 mr-2 text-emerald-600" />
                      Detalles de la Propiedad
                    </h2>
                    <dl className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-gray-100 pb-4">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Identificador Superior</dt>
                          <dd className="mt-1 text-gray-900">{formattedSuperior || "-"}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Identificador Intermedio</dt>
                          <dd className="mt-1 text-gray-900">{formattedIntermedio || "-"}</dd>
                        </div>
                         <div>
                          <dt className="text-sm font-medium text-gray-500">Identificador Inferior</dt>
                          <dd className="mt-1 text-gray-900">{formattedInferior || "-"}</dd>
                        </div>
                         <div>
                          <dt className="text-sm font-medium text-gray-500">Código Catastral</dt>
                          <dd className="mt-1 text-gray-900">{property.codigo_catastral || "No especificado"}</dd>
                         </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-gray-100 pb-4">
                         <div>
                            <dt className="text-sm font-medium text-gray-500">Actividad Principal</dt>
                            <dd className="mt-1 text-gray-900">{property.actividad || "No especificada"}</dd>
                         </div>
                         <div>
                          <dt className="text-sm font-medium text-gray-500">Área Total</dt>
                          <dd className="mt-1 text-gray-900">{propertyArea ? `${propertyArea} m²` : "No especificada"}</dd>
                        </div>
                      </div>

                      {property.areas_desglosadas && Array.isArray(property.areas_desglosadas) && property.areas_desglosadas.length > 0 && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500 mb-2">Áreas Desglosadas</dt>
                          <dd className="mt-1 text-gray-900">
                            <ul className="space-y-2 border border-gray-100 rounded-md p-3 bg-gray-50/50">
                              {property.areas_desglosadas.map((area: { tipoDeArea: string; area: number }, index: number) => (
                                <li key={index} className="flex justify-between text-sm">
                                  <span className="text-gray-600">{area.tipoDeArea}</span>
                                  <span className="font-medium text-gray-800">{area.area} m²</span>
                                </li>
                              ))}
                            </ul>
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </section>

              {/* Property Status Card */}
              <section aria-labelledby="property-status-heading">
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h2 id="property-status-heading" className="text-xl font-semibold mb-5 flex items-center text-gray-800">
                      <UserIcon className="w-6 h-6 mr-2 text-emerald-600" />
                      Estado de la Propiedad
                    </h2>
                    <dl className="space-y-4">
                      <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                          <dt className="text-sm font-medium text-gray-500">Estado de Uso</dt>
                          <dd><StatusBadge {...estadoUsoInfo} /></dd>
                      </div>
                      <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                          <dt className="text-sm font-medium text-gray-500">Estado de Entrega</dt>
                          <dd><StatusBadge {...estadoEntregaInfo} /></dd>
                      </div>
                      <div className="flex justify-between items-center">
                          <dt className="text-sm font-medium text-gray-500">Estado de Construcción</dt>
                          <dd><StatusBadge {...estadoConstruccionInfo} /></dd>
                      </div>
                    </dl>
                </div>
              </section>

            </div>

            {/* Right Column */}
            <div className="lg:col-span-1 space-y-8">

              {/* Financial Information Card */}
               <section aria-labelledby="financial-info-heading">
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <h2 id="financial-info-heading" className="text-xl font-semibold mb-5 flex items-center text-gray-800">
                        <CurrencyDollarIcon className="w-6 h-6 mr-2 text-emerald-600" />
                        Información Financiera
                        </h2>
                        <dl className="space-y-4">
                        <div className="border-b border-gray-100 pb-3">
                            <dt className="text-sm font-medium text-gray-500 mb-1">Monto Fondo Inicial</dt>
                            <dd className="font-medium text-lg text-gray-900">${property.monto_fondo_inicial?.toFixed(2) || '0.00'}</dd>
                        </div>
                        <div className="border-b border-gray-100 pb-3">
                            <dt className="text-sm font-medium text-gray-500 mb-1">Monto Alícuota Ordinaria</dt>
                            <dd className="font-medium text-lg text-gray-900">${property.monto_alicuota_ordinaria?.toFixed(2) || '0.00'}</dd>
                        </div>
                        {property.pagos && typeof property.pagos === 'object' && Object.keys(property.pagos).length > 0 && (
                            <>
                                {property.pagos.encargadoDePago && (
                                    <div className="border-b border-gray-100 pb-3">
                                        <dt className="text-sm font-medium text-gray-500">Encargado de Pago (Info. Histórica)</dt>
                                        <dd className="mt-1 text-gray-900">{property.pagos.encargadoDePago}</dd>
                                    </div>
                                )}
                                {property.pagos.fechaExpiracionEncargadoDePago && (
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Fecha Expiración (Info. Histórica)</dt>
                                        <dd className="mt-1 text-gray-900">{new Date(property.pagos.fechaExpiracionEncargadoDePago).toLocaleDateString('es-ES')}</dd>
                                    </div>
                                )}
                            </>
                        )}
                        </dl>
                    </div>
               </section>

              {/* Documents Card */}
              <section aria-labelledby="documents-heading">
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h2 id="documents-heading" className="text-xl font-semibold mb-4 text-gray-800">
                    Documentos
                  </h2>
                  <div className="space-y-3">
                    {[property.escritura_pdf, property.acta_entrega_pdf, property.contrato_arrendamiento_pdf].map((doc, index) => {
                      const docType = ['Escritura', 'Acta de Entrega', 'Contrato Arrendamiento'][index];
                      if (index === 2 && !doc?.external_url) return null;

                      if (doc?.external_url) {
                        return (
                          <a
                            key={index}
                            href={doc.external_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                            download={doc.filename || true}
                          >
                            <div>
                                <span className="font-medium text-sm text-gray-800">{docType}</span>
                                {doc.filename && <p className="text-xs text-gray-500 mt-0.5">{doc.filename}</p>}
                            </div>
                            <span className="text-emerald-600 text-sm hover:text-emerald-800">Ver</span>
                          </a>
                        );
                      } else {
                        return (
                          <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg text-gray-400 border border-gray-200">
                            <span className="font-medium text-sm">{docType}</span>
                            <span className="text-xs">No disponible</span>
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>
              </section>

              {/* Incognito Mode Card */}
              {/* <section aria-labelledby="incognito-mode-heading">
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-3">
                        <h2 id="incognito-mode-heading" className="text-xl font-semibold flex items-center text-gray-800">
                         Modo Incógnito
                          <div className="relative ml-2 group">
                            <InformationCircleIcon className="w-5 h-5 text-gray-400 cursor-help"/>
                            <div className="absolute hidden group-hover:block z-10 w-72 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg -translate-x-1/2 left-1/2 bottom-full mb-2 tooltip">
                              <p>Al desactivar modo incógnito, otros propietarios podrían ver información básica de tu propiedad en directorios (si aplica). Actívalo si prefieres mantenerla privada.</p>
                            </div>
                         </div>
                        </h2>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${property.modo_incognito ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                           {property.modo_incognito ? <EyeSlashIcon className="w-3 h-3 mr-1" /> : <EyeIcon className="w-3 h-3 mr-1" />}
                           {property.modo_incognito ? 'Activado' : 'Desactivado'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mb-4">
                          {property.modo_incognito
                          ? "Tu propiedad está actualmente oculta en directorios."
                          : "Tu propiedad podría ser visible en directorios."
                          }
                      </p>
                      <button
                          onClick={toggleIncognitoMode}
                          disabled={updatingIncognito}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                      >
                          {updatingIncognito ? (
                            <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Actualizando...
                            </span>
                          ) : property.modo_incognito ? (
                            <><EyeIcon className="w-4 h-4 mr-2" /> Desactivar Modo Incógnito</>
                          ) : (
                            <><EyeSlashIcon className="w-4 h-4 mr-2" /> Activar Modo Incógnito</>
                          )}
                      </button>
                  </div>
              </section> */}

            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
} 