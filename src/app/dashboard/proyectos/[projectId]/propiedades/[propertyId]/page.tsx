"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "../../../../../../components/ui/button"; // Corrected path
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "../../../../../_components/ui/dropdown-menu"; // Reverted to original path, maybe it exists
import { formatNumber } from "../../../../../../lib/utils"; // Corrected path
import {
    ArrowLeftIcon,
    UserPlusIcon,
    UserGroupIcon,
    ArrowsRightLeftIcon,
    DocumentTextIcon,
    PencilSquareIcon,
    XCircleIcon,
    CircleStackIcon,
    CurrencyDollarIcon,
    ExclamationTriangleIcon,
    UserCircleIcon,
    EllipsisVerticalIcon,
    DocumentIcon, // Added icon
    ArrowUpCircleIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "../../../../../_lib/auth/AuthContext"; // Corrected path
import { createClient } from '../../../../../../../lib/supabase/client';
import { UploadButton } from "@uploadthing/react"; // Added UploadButton import
import type { OurFileRouter } from "../../../../../api/uploadthing/core"; // Corrected path

// --- Types Definition ---

// Based on SCHEMA.md
type Archivo = {
    id: number;
    external_storage_key: string;
    external_url?: string | null;
    filename?: string | null;
    created_at: string;
    updated_at: string;
};

// Type for the document map state
type DocumentMap = Record<number, Archivo>;

type PersonaNatural = {
    id: number;
    aplica_ruc?: boolean | null;
    razon_social?: string | null; // This is likely the full name for natural persons
    ruc?: string | null;
    cedula?: string | null;
    ruc_pdf_id?: number | null;
    cedula_pdf_id?: number | null;
    // Removed relation types temporarily
};

type PersonaJuridica = {
    id: number;
    razon_social?: string | null;
    nombre_comercial?: string | null;
    razon_social_representante_legal?: string | null;
    representante_legal_es_empresa?: boolean | null;
    cedula_representante_legal?: string | null;
    ruc?: string | null;
    ruc_pdf_id?: number | null;
    cedula_representante_legal_pdf_id?: number | null;
    nombramiento_representante_legal_pdf_id?: number | null;
    empresa_representante_legal_id?: number | null; // Link to empresas_representada
    // We might need to fetch empresa_representada separately if its document IDs are needed
    // For now, assume we only need the documents directly linked to persona_juridica
    // Removed relation types temporarily
};

// Generic Contact Type (can be refined)
type Contacto = {
    nombre?: string | null;
    email?: string | null;
    telefono?: string | null;
    cedula?: string | null; // Added based on schema examples, may vary per contact type
    // Add other fields if present in JSONB
} | null; // JSONB can be null

type PerfilClienteDetails = {
    id: number;
    usuario_id?: string | null; // UUID from auth.users
    tipo_persona: 'Natural' | 'Juridica'; // NOT NULL in schema
    contacto_gerente?: Contacto;
    contacto_administrativo?: Contacto;
    contacto_proveedores?: Contacto;
    contacto_accesos?: Contacto;
    contratos_arrendamiento?: any | null; // JSONB - define structure if needed
    rol?: 'Propietario' | 'Arrendatario' | 'Externo' | null; // perfil_cliente_rol
    persona_natural_id?: number | null;
    persona_juridica_id?: number | null;
    persona_natural?: any | null; // Temporarily set to any for debugging
    persona_juridica?: any | null; // Temporarily set to any for debugging
};

// AreaDesglosada based on JSONB structure (assuming keys)
type AreaDesglosada = {
    id: string | number; // Assuming an ID exists within the JSON object array
    area: number;
    tipo_area: string; // e.g., 'util', 'parqueadero', 'bodega' - adjust based on actual usage
    nombre_adicional?: string | null;
    // Add any other relevant fields from the JSONB structure
};

// Main Property Type - Aligned with SCHEMA.md
type Property = {
    id: number;
    proyecto_id: number;
    codigo_catastral?: string | null;
    estado_entrega: 'entregado' | 'noEntregado'; // propiedad_estado_entrega NOT NULL
    estado_uso: 'enUso' | 'disponible'; // propiedad_estado_uso NOT NULL
    area_total?: number | null; // NUMERIC(10, 2)
    historico_tasas?: any | null; // JSONB
    modo_incognito?: boolean | null; // DEFAULT TRUE
    escritura_pdf_id?: number | null;
    acta_entrega_pdf_id?: number | null;
    contrato_arrendamiento_pdf_id?: number | null;
    ocupante_externo?: boolean | null;
    propietario_id?: number | null;
    ocupante_id?: number | null;
    encargado_pago?: 'Propietario' | 'Arrendatario' | 'Externo' | null;
    historico_ocupantes?: any | null; // JSONB
    identificadores?: any | null; // JSONB - Define structure if possible
    estado_de_construccion?: 'enPlanos' | 'terreno' | 'enConstruccion' | 'obraGris' | 'acabados' | 'finalizada' | 'remodelacion' | 'demolicion' | 'abandonada' | 'paralizada' | null; // propiedad_estado_construccion
    monto_fondo_inicial?: number | null; // NUMERIC(12, 2)
    actividad?: string | null; // propiedad_actividad ENUM
    monto_alicuota_ordinaria?: number | null; // NUMERIC(12, 2)
    areas_desglosadas?: AreaDesglosada[] | null; // JSONB
    pagos?: any | null; // JSONB
    imagen?: string | null;
    created_at: string;
    updated_at: string;

    // Relations loaded via Supabase join
    propietario?: PerfilClienteDetails | null; // Joined from perfiles_cliente using propietario_id
    ocupante?: PerfilClienteDetails | null; // Joined from perfiles_cliente using ocupante_id
    proyecto?: {
        id: number;
        nombre: string; // NOT NULL in schema
        // Include other proyecto fields if needed (e.g., tasa_base_alicuota_ordinaria)
    } | null; // Joined from proyectos using proyecto_id

    // Document relations (potentially loaded separately or via specific joins)
    escritura_pdf?: Archivo | null;
    acta_entrega_pdf?: Archivo | null;
    contrato_arrendamiento_pdf?: Archivo | null;

};


// --- Helper Component ---
type UploadResponseFile = {
    name: string;
    size: number;
    key: string;
    url: string;
    ufsUrl: string;
    customId: string | null;
};

type DocumentDisplayProps = {
  docId: number | null | undefined;
  docName: string;
  documentMap: DocumentMap;
  isMissing: boolean;
  // Context for upload and update
  docType: string; // e.g., 'escritura_pdf_id', 'cedula_pdf_id'
  targetTable: string; // e.g., 'propiedades', 'personas_natural'
  targetId: number; // ID of the record to update (property ID, persona ID)
  // Callback function to handle DB operations after upload
  // Receives details needed to create Archivo and link it
  onUploadComplete: (fileDetails: { name: string, url: string, key: string }, docType: string, targetTable: string, targetId: number) => Promise<void>;
};

const DocumentDisplay: React.FC<DocumentDisplayProps> = ({
    docId,
    docName,
    documentMap,
    isMissing,
    docType,
    targetTable,
    targetId,
    onUploadComplete
}) => {
  const document = docId ? documentMap[docId] : null;
  const [isUploading, setIsUploading] = useState(false);

  return (
    <div className="flex justify-between items-center text-sm py-1 border-b border-gray-100 last:border-b-0 min-h-[36px]">
      <span className="text-gray-600 mr-2">{docName}:</span>
      {document?.external_url ? (
        // Display link to existing document
        <a
          href={document.external_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-600 hover:text-emerald-800 font-medium flex items-center space-x-1 truncate"
          title={document.filename || docName}
        >
          <DocumentTextIcon className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{document.filename || 'Ver Documento'}</span>
        </a>
      ) : isMissing ? (
         // Display UploadButton if document is missing
         isUploading ? (
            <span className="text-gray-500 text-xs italic animate-pulse">Subiendo...</span>
         ) : (
             // Using UploadButton with specific endpoint type argument
             <UploadButton<OurFileRouter, "propertyDocument">
                endpoint="propertyDocument"
                onClientUploadComplete={async (res) => {
                    setIsUploading(true);
                    if (res && res.length > 0) {
                         // Assuming res[0] matches UploadResponseFile type implicitly
                         const uploadedFile: UploadResponseFile = res[0];
                         console.log("Client Upload successful:", uploadedFile);

                         // Prepare details for the callback
                         const fileDetails = {
                            name: uploadedFile.name,
                            url: uploadedFile.ufsUrl,
                            key: uploadedFile.key
                         };

                         // Call the parent handler to manage DB operations
                         try {
                             await onUploadComplete(fileDetails, docType, targetTable, targetId);
                         } catch (error) {
                             console.error("Error during upload completion handling:", error);
                             // Error should be handled within onUploadComplete (e.g., toast)
                             // alert("Error al procesar la subida del documento."); // Avoid double alerts
                         } finally {
                             setIsUploading(false);
                         }
                    } else {
                        console.error("Upload failed or returned empty result");
                        alert("Error durante la subida del archivo.");
                        setIsUploading(false);
                    }
                }}
                onUploadError={(error: Error) => {
                    setIsUploading(false);
                    console.error(`Upload Error: ${error.message}`);
                    alert(`Error al subir: ${error.message}`);
                }}
                appearance={{
                    button: `border border-gray-300 text-gray-700 hover:bg-gray-50 !text-[#008A4B] text-xs font-medium px-4 py-1 rounded-md transition-all flex items-center gap-2 ${
                      isUploading ? 'opacity-50 cursor-not-allowed' : ''
                    }`,
                    allowedContent: "hidden"
                  }}
                  content={{
                    button({ ready }) {
                      if (isUploading) {
                        return (
                          <>
                            {/* Podrías añadir un spinner aquí si quieres */}
                            <span>Procesando...</span>
                          </>
                        );
                      }
                      if (!ready) return 'Cargando...';
                      return (
                        <>
                          <ArrowUpCircleIcon className="w-5 h-5" />
                          <span>Subir documento</span>
                        </>
                      );
                    }
                  }}
             />
         )
      ) : (
         // Display N/A if not applicable
         <span className="text-gray-400 text-xs italic">N/A</span>
      )}
    </div>
  );
};


// --- Component ---

export default function PropertyDetailPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams(); // To get 'from' param if needed
    // Correct useAuth destructuring based on AuthContext.tsx
    const { user, role, isLoading: authLoading } = useAuth();
    const supabase = createClient();

    const [property, setProperty] = useState<Property | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [documentMap, setDocumentMap] = useState<DocumentMap>({}); // State for fetched documents
    const [showImageModal, setShowImageModal] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [updatingOccupancy, setUpdatingOccupancy] = useState(false); // State for occupancy updates
    const [missingOwnerDocs, setMissingOwnerDocs] = useState(0);
    const [missingTenantDocs, setMissingTenantDocs] = useState(0);

    const projectId = params.projectId as string;
    const propertyId = params.propertyId as string;
    const from = searchParams.get("from");

    // Derive profileId from the user object provided by AuthContext
    const profileId = user?.profileId;

    const isAdmin = role === 'Administrador';
    const isDirectorio = role === 'Directorio'; // Added check for Directorio
    // Use the derived profileId for checks
    const isOwner = role === 'Propietario' && property?.propietario_id === profileId;
    const isTenant = role === 'Arrendatario' && property?.ocupante_id === profileId;


    // --- Data Fetching ---
    const fetchPropertyDetails = useCallback(async () => {
        if (!propertyId || !supabase) return;
        setLoading(true);
        setError(null);

        try {
            // Step 1: Fetch property data including document IDs
            const selectString = `
                id, proyecto_id, codigo_catastral, estado_entrega, estado_uso, area_total, historico_tasas, modo_incognito, escritura_pdf_id, acta_entrega_pdf_id, contrato_arrendamiento_pdf_id, ocupante_externo, propietario_id, ocupante_id, historico_ocupantes, identificadores, estado_de_construccion, monto_fondo_inicial, actividad, monto_alicuota_ordinaria, areas_desglosadas, pagos, created_at, updated_at,
                encargado_pago,
                imagen,
                proyecto:proyectos!inner (id, nombre),
                propietario:perfiles_cliente!propietario_id (
                    id, usuario_id, tipo_persona, contacto_gerente, contacto_administrativo, contacto_proveedores, contacto_accesos, contratos_arrendamiento, rol, persona_natural_id, persona_juridica_id,
                    persona_natural:personas_natural!persona_natural_id (id, aplica_ruc, razon_social, ruc, cedula, ruc_pdf_id, cedula_pdf_id),
                    persona_juridica:personas_juridica!persona_juridica_id (
                        id, razon_social, nombre_comercial, cedula_representante_legal_pdf_id, nombramiento_representante_legal_pdf_id, razon_social_representante_legal, representante_legal_es_empresa, cedula_representante_legal, ruc, ruc_pdf_id, empresa_representante_legal_id,
                        empresa_representante_legal:empresas_representada!empresa_representante_legal_id (
                            id, cedula_representante_legal_pdf_id, ruc_empresa_pdf_id, autorizacion_representacion_pdf_id
                        )
                    )
                ),
                ocupante:perfiles_cliente!ocupante_id (
                    id, usuario_id, tipo_persona, contacto_gerente, contacto_administrativo, contacto_proveedores, contacto_accesos, contratos_arrendamiento, rol, persona_natural_id, persona_juridica_id,
                    persona_natural:personas_natural!persona_natural_id (id, aplica_ruc, razon_social, ruc, cedula, ruc_pdf_id, cedula_pdf_id),
                    persona_juridica:personas_juridica!persona_juridica_id (
                        id, razon_social, nombre_comercial, cedula_representante_legal_pdf_id, nombramiento_representante_legal_pdf_id, razon_social_representante_legal, representante_legal_es_empresa, cedula_representante_legal, ruc, ruc_pdf_id, empresa_representante_legal_id,
                        empresa_representante_legal:empresas_representada!empresa_representante_legal_id (
                            id, cedula_representante_legal_pdf_id, ruc_empresa_pdf_id, autorizacion_representacion_pdf_id
                        )
                    )
                )
            `;

            const { data: propertyData, error: dbError } = await supabase
                .from('propiedades')
                .select(selectString)
                .eq('id', propertyId)
                .maybeSingle();

            if (dbError) throw dbError;

            if (propertyData) {
                // Transform top-level relations
                 const transformedData = {
                    ...propertyData,
                    imagen: Array.isArray(propertyData.imagen) ? propertyData.imagen[0] ?? null : propertyData.imagen,
                    proyecto: Array.isArray(propertyData.proyecto) ? propertyData.proyecto[0] ?? null : propertyData.proyecto,
                    propietario: Array.isArray(propertyData.propietario) ? propertyData.propietario[0] ?? null : propertyData.propietario,
                    ocupante: Array.isArray(propertyData.ocupante) ? propertyData.ocupante[0] ?? null : propertyData.ocupante,
                 };

                 console.log("Datos transformados (top level):", JSON.stringify(transformedData, null, 2));

                 // Step 2: Collect all document IDs
                 const docIds = new Set<number>();

                 // Property level docs
                 if (transformedData.escritura_pdf_id) docIds.add(transformedData.escritura_pdf_id);
                 if (transformedData.acta_entrega_pdf_id) docIds.add(transformedData.acta_entrega_pdf_id);
                 if (transformedData.contrato_arrendamiento_pdf_id) docIds.add(transformedData.contrato_arrendamiento_pdf_id);

                 const addProfileDocs = (perfil: PerfilClienteDetails | null | undefined) => {
                     if (!perfil) return;

                     if (perfil.tipo_persona === 'Natural') {
                         const personaN = Array.isArray(perfil.persona_natural) ? perfil.persona_natural[0] : perfil.persona_natural;
                         if (personaN?.cedula_pdf_id) docIds.add(personaN.cedula_pdf_id);
                         if (personaN?.ruc_pdf_id) docIds.add(personaN.ruc_pdf_id);
                     } else if (perfil.tipo_persona === 'Juridica') {
                         const personaJ = Array.isArray(perfil.persona_juridica) ? perfil.persona_juridica[0] : perfil.persona_juridica;
                         if (personaJ) {
                             if (personaJ.ruc_pdf_id) docIds.add(personaJ.ruc_pdf_id);
                             if (personaJ.cedula_representante_legal_pdf_id) docIds.add(personaJ.cedula_representante_legal_pdf_id);
                             if (personaJ.nombramiento_representante_legal_pdf_id) docIds.add(personaJ.nombramiento_representante_legal_pdf_id);

                             // Check for nested representative company docs
                             const empresaRep = Array.isArray(personaJ.empresa_representante_legal) ? personaJ.empresa_representante_legal[0] : personaJ.empresa_representante_legal;
                             if (personaJ.representante_legal_es_empresa && empresaRep) {
                                if (empresaRep.ruc_empresa_pdf_id) docIds.add(empresaRep.ruc_empresa_pdf_id);
                                if (empresaRep.autorizacion_representacion_pdf_id) docIds.add(empresaRep.autorizacion_representacion_pdf_id);
                                // Decide if cedula_representante_legal_pdf_id is needed/different
                                // requiredDocs.push({ id: empresaRep.cedula_representante_legal_pdf_id, required: true });
                             }
                         }
                     }
                 };

                 // Add owner and tenant docs
                 addProfileDocs(transformedData.propietario);
                 addProfileDocs(transformedData.ocupante);

                 // Step 3: Fetch documents from 'archivos' table
                 const uniqueDocIds = Array.from(docIds);
                 if (uniqueDocIds.length > 0) {
                     console.log("Fetching details for document IDs:", uniqueDocIds);
                     const { data: archivosData, error: archivosError } = await supabase
                         .from('archivos')
                         .select('id, external_storage_key, external_url, filename, created_at, updated_at')
                         .in('id', uniqueDocIds);

                     if (archivosError) {
                         console.error("Error fetching document details:", archivosError);
                     } else if (archivosData) {
                         console.log("Fetched document details:", archivosData);
                         const newDocMap = archivosData.reduce((map, doc) => {
                             map[doc.id] = doc as Archivo;
                             return map;
                         }, {} as DocumentMap);
                         setDocumentMap(newDocMap);
                     }
                 }

                 // Set state after all data fetching and transformations
                 setProperty(transformedData as any);

            } else {
                setError("Propiedad no encontrada.");
            }

        } catch (err: any) {
            console.error("Error fetching property:", err);
            setError(err.message || "Error al cargar la propiedad.");
        } finally {
            setLoading(false);
        }
    }, [propertyId, supabase]);

    useEffect(() => {
        // Use authLoading (isLoading from context) and check user object
        if (!authLoading && user) { // Check if loading is done and user exists
             fetchPropertyDetails();
        } else if (!authLoading && !user) {
            // Handle case where loading is done but there's no user (optional)
            console.warn("No user authenticated for property details page.");
            // Decide how to handle this - maybe show an error or allow limited view?
            // For now, we could prevent fetching or let fetch proceed and rely on UI logic/RLS
            // setLoading(false); // Stop loading indicator if not fetching
            // setError("Usuario no autenticado.");
        }
        // If loading is still true, do nothing and wait for next render
    }, [propertyId, authLoading, user, fetchPropertyDetails]); // Dependencies: trigger fetch when these change

    // --- Upload Handler ---
    const handleUploadComplete = async (
        fileDetails: { name: string, url: string, key: string },
        docType: string,
        targetTable: string,
        targetId: number
    ) => {
        console.log("handleUploadComplete called with fileDetails:", { fileDetails, docType, targetTable, targetId });

        try {
            // --- Call backend to create Archivo and link it --- 
            // OPTION 1: Using a Next.js API Route (e.g., /api/finalize-upload)
            const response = await fetch('/api/finalize-upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fileDetails,
                    docType,
                    targetTable,
                    targetId,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to finalize upload: ${response.statusText}`);
            }

            const { newArchivo } = await response.json() as { newArchivo: Archivo };
            // --- End API Route Call --- 

            // OPTION 2: Using a Supabase Edge Function would look different
            // e.g., const { data, error } = await supabase.functions.invoke('finalize-upload', { ... });

            if (!newArchivo || !newArchivo.id) {
                console.error("Invalid newArchivo data received from backend.");
                throw new Error("No se recibió información válida del archivo creado.");
            }

            console.log(`Backend successfully created archivo ${newArchivo.id} and updated ${targetTable} record ${targetId}`);

            // Update local state to reflect the change immediately
            // 1. Update the documentMap
            setDocumentMap(prevMap => ({
                ...prevMap,
                [newArchivo.id]: newArchivo
            }));

            // 2. Update the property state (logic remains the same as before)
            setProperty(prevProperty => {
                if (!prevProperty) return null;
                let updatedProperty = { ...prevProperty };
                if (targetTable === 'propiedades') {
                    updatedProperty = { ...updatedProperty, [docType]: newArchivo.id };
                } else if (targetTable === 'personas_natural') {
                    if (prevProperty.propietario?.persona_natural_id === targetId) {
                       // Ensure nested objects exist before updating
                        updatedProperty.propietario = {
                            ...(prevProperty.propietario ?? {}),
                            persona_natural: { ...(prevProperty.propietario?.persona_natural ?? {}), [docType]: newArchivo.id }
                        };
                    } else if (prevProperty.ocupante?.persona_natural_id === targetId) {
                        updatedProperty.ocupante = {
                            ...(prevProperty.ocupante ?? {}),
                            persona_natural: { ...(prevProperty.ocupante?.persona_natural ?? {}), [docType]: newArchivo.id }
                        };
                    }
                } else if (targetTable === 'personas_juridica') {
                    if (prevProperty.propietario?.persona_juridica_id === targetId) {
                        updatedProperty.propietario = {
                            ...(prevProperty.propietario ?? {}),
                            persona_juridica: { ...(prevProperty.propietario?.persona_juridica ?? {}), [docType]: newArchivo.id }
                        };
                    } else if (prevProperty.ocupante?.persona_juridica_id === targetId) {
                        updatedProperty.ocupante = {
                            ...(prevProperty.ocupante ?? {}),
                            persona_juridica: { ...(prevProperty.ocupante?.persona_juridica ?? {}), [docType]: newArchivo.id }
                        };
                    }
                } else if (targetTable === 'empresas_representada') {
                   const updateNestedEmpresaRep = (perfil: PerfilClienteDetails | null | undefined) => {
                       if (!perfil?.persona_juridica || !perfil.persona_juridica.empresa_representante_legal) return perfil;
                       const empresaRep = Array.isArray(perfil.persona_juridica.empresa_representante_legal) ? perfil.persona_juridica.empresa_representante_legal[0] : perfil.persona_juridica.empresa_representante_legal;
                       if (empresaRep?.id === targetId) {
                            return {
                               ...perfil,
                               persona_juridica: {
                                   ...perfil.persona_juridica,
                                   empresa_representante_legal: { ...empresaRep, [docType]: newArchivo.id }
                               }
                            };
                        } 
                        return perfil;
                   };
                   updatedProperty.propietario = updateNestedEmpresaRep(updatedProperty.propietario);
                   updatedProperty.ocupante = updateNestedEmpresaRep(updatedProperty.ocupante);
                }
                return updatedProperty;
            });

            console.log("Local state updated successfully.");

        } catch (error: any) {
            console.error("Error in handleUploadComplete:", error);
            alert(`Error al finalizar la subida: ${error.message}`);
        }
    };

    // --- Occupancy Management Functions ---
    const handleSetOccupancy = async (updates: Partial<Property>) => {
        if (!property || !supabase) return;
        setUpdatingOccupancy(true);
        setError(null);

        try {
            // Ensure we don't accidentally update ocupante_externo unless intended
            const finalUpdates = { ...updates };
            if (!('ocupante_externo' in finalUpdates)) {
                 // If not explicitly setting externo, ensure it's false when ID is set/removed
                 if (finalUpdates.ocupante_id !== undefined) {
                    finalUpdates.ocupante_externo = false;
                 }
            }


            const { error: updateError } = await supabase
                .from('propiedades')
                .update(finalUpdates) // Use finalUpdates
                .eq('id', property.id);

            if (updateError) throw updateError;

            console.log("Occupancy updated successfully:", finalUpdates);
            // Refresh data to show changes
            await fetchPropertyDetails();

        } catch (err: any) {
            console.error("Error updating occupancy:", err);
            setError(err.message || "Error al actualizar la ocupación.");
        } finally {
            setUpdatingOccupancy(false);
        }
    };

    const handleRemoveOccupant = () => {
         handleSetOccupancy({ ocupante_id: null, ocupante_externo: false }); // Set ID to null and externo to false
    };

    // New function to set the current owner as the occupant
    const handleSetOwnerAsOccupant = () => {
        if (property?.propietario_id) {
             handleSetOccupancy({ ocupante_id: property.propietario_id, ocupante_externo: false });
        } else {
            setError("No hay propietario asignado a esta propiedad para establecer como ocupante.");
        }
    };

    // --- Helper Functions ---
    const getIdentificador = (tipo: 'superior' | 'idSuperior' | 'inferior' | 'idInferior' | 'intermedio' | 'idIntermedio') => {
        // Ensure identificadores is accessed safely
        const identificadores = property?.identificadores as Record<string, string> | undefined;
        return identificadores?.[tipo] || '';
    };

    const getRazonSocial = (perfil: PerfilClienteDetails | null | undefined): string => {
        if (!perfil) return '-';
        // Use 'razon_social' for PersonaNatural based on schema's likely intent
        // Added check for rol 'Externo'
        if (perfil.rol === 'Externo') return 'Ocupante Externo';
        return perfil.persona_natural?.razon_social || perfil.persona_juridica?.razon_social || perfil.persona_juridica?.nombre_comercial || 'N/A';
    }

    const getEffectiveOccupancyStatus = (): { status: string; name: string; colorClasses: string; } => {
        const ocupanteProfile = property?.ocupante;

        if (ocupanteProfile) {
            // Check the role directly from the joined ocupante profile
            if (ocupanteProfile.rol === 'Arrendatario') {
                 return {
                    status: "Uso Arrendatario",
                    name: getRazonSocial(ocupanteProfile),
                    colorClasses: "bg-orange-100 text-orange-800"
                 };
            } else if (ocupanteProfile.rol === 'Propietario') {
                 return {
                     status: "Uso Propietario",
                     name: getRazonSocial(ocupanteProfile),
                     colorClasses: "bg-purple-100 text-purple-800"
                 };
            } else if (ocupanteProfile.rol === 'Externo') {
                // Handle the 'Externo' role
                return {
                    status: "Uso Externo",
                    name: "Ocupante Externo", // Display generic name
                    colorClasses: "bg-sky-100 text-sky-800"
                };
            }
            // Handle potential other roles if needed
        }
        // Removed ocupante_externo check - logic now depends entirely on ocupante_id and its role.

        // Default: Property is unassigned
        return {
            status: "Sin Asignar",
            name: "-",
            colorClasses: "bg-gray-100 text-gray-800"
        };
    };

    // Function to calculate missing documents for a profile
    const calculateMissingDocs = (
        perfil: PerfilClienteDetails | null | undefined,
        docMap: DocumentMap
    ): number => {
        if (!perfil) return 0;
        let missingCount = 0;
        const requiredDocs: { id: number | null | undefined, required: boolean }[] = [];

        if (perfil.tipo_persona === 'Natural') {
            const personaN = Array.isArray(perfil.persona_natural) ? perfil.persona_natural[0] : perfil.persona_natural;
            requiredDocs.push({ id: personaN?.cedula_pdf_id, required: true });
            requiredDocs.push({ id: personaN?.ruc_pdf_id, required: !!personaN?.aplica_ruc }); // Required only if aplica_ruc is true
        } else if (perfil.tipo_persona === 'Juridica') {
            const personaJ = Array.isArray(perfil.persona_juridica) ? perfil.persona_juridica[0] : perfil.persona_juridica;
            if (personaJ) {
                 requiredDocs.push({ id: personaJ.ruc_pdf_id, required: true });
                 requiredDocs.push({ id: personaJ.cedula_representante_legal_pdf_id, required: true });
                 requiredDocs.push({ id: personaJ.nombramiento_representante_legal_pdf_id, required: true });

                 const empresaRep = Array.isArray(personaJ.empresa_representante_legal) ? personaJ.empresa_representante_legal[0] : personaJ.empresa_representante_legal;
                 if (personaJ.representante_legal_es_empresa && empresaRep) {
                     requiredDocs.push({ id: empresaRep.ruc_empresa_pdf_id, required: true });
                     requiredDocs.push({ id: empresaRep.autorizacion_representacion_pdf_id, required: true });
                     // Decide if this cedula is required in addition to the one in persona_juridica
                     // requiredDocs.push({ id: empresaRep.cedula_representante_legal_pdf_id, required: true });
                 }
            }
        }

        requiredDocs.forEach(doc => {
            // A document is missing if it's required AND (its ID is null/undefined OR it's not in the documentMap)
            if (doc.required && (!doc.id || !docMap[doc.id])) {
                missingCount++;
            }
        });

        return missingCount;
    };

     // Update missing docs count whenever property or documentMap changes
     useEffect(() => {
        if (property && Object.keys(documentMap).length > 0) {
            setMissingOwnerDocs(calculateMissingDocs(property.propietario, documentMap));
            setMissingTenantDocs(calculateMissingDocs(property.ocupante, documentMap));
        }
     }, [property, documentMap]);


    // --- Render Logic ---
    if (loading || authLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto p-4 text-center text-red-600">
                <ExclamationTriangleIcon className="h-12 w-12 mx-auto text-red-400 mb-4" />
                <h2 className="text-xl font-semibold mb-2">Error al Cargar</h2>
                <p>{error}</p>
                <Button onClick={() => fetchPropertyDetails()} className="mt-4">
                    Reintentar
                </Button>
                 <Button variant="outline" onClick={() => router.back()} className="mt-4 ml-2">
                    Volver
                </Button>
            </div>
        );
    }

    if (!property) {
         return (
            <div className="container mx-auto p-4 text-center text-gray-600">
                 <XCircleIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h2 className="text-xl font-semibold mb-2">Propiedad no encontrada</h2>
                <p>No se pudo encontrar la propiedad solicitada.</p>
                 <Button variant="outline" onClick={() => router.back()} className="mt-4">
                    Volver
                </Button>
            </div>
        );
    }

     const imageUrl = property.imagen || "/bodega.png"; // Use joined imagen data
     const { status: occupancyStatus, name: occupantDisplayName, colorClasses: occupancyColor } = getEffectiveOccupancyStatus();

    // --- Helper function to render documents for a profile ---
    const renderProfileDocuments = (
        perfil: PerfilClienteDetails | null | undefined,
        profileType: 'Propietario' | 'Ocupante'
    ) => {
        if (!perfil) return <p className="text-xs text-gray-500 italic">No hay {profileType.toLowerCase()} asignado.</p>;

        const profileLabel = profileType; // e.g., "Propietario"
        const missingCount = profileType === 'Propietario' ? missingOwnerDocs : missingTenantDocs;

         // Get the correct nested person object
        const personaN = perfil.tipo_persona === 'Natural' ? (Array.isArray(perfil.persona_natural) ? perfil.persona_natural[0] : perfil.persona_natural) : null;
        const personaJ = perfil.tipo_persona === 'Juridica' ? (Array.isArray(perfil.persona_juridica) ? perfil.persona_juridica[0] : perfil.persona_juridica) : null;
        const empresaRep = personaJ?.representante_legal_es_empresa ? (Array.isArray(personaJ.empresa_representante_legal) ? personaJ.empresa_representante_legal[0] : personaJ.empresa_representante_legal) : null;


        // --- Determine which documents are applicable and if they are missing ---
        const getDocStatus = (docId: number | null | undefined, isRequired: boolean) => {
             return {
                 id: docId,
                 missing: isRequired && (!docId || !documentMap[docId])
             };
        };

        let cedulaStatus, rucPersonaStatus, rucJuridicaStatus, cedulaRlStatus, nombramientoRlStatus;
        let rucEmpresaRepStatus, autorizacionEmpresaRepStatus, cedulaRlEmpresaRepStatus;

        if (perfil.tipo_persona === 'Natural') {
            cedulaStatus = getDocStatus(personaN?.cedula_pdf_id, true);
            rucPersonaStatus = getDocStatus(personaN?.ruc_pdf_id, !!personaN?.aplica_ruc);
        } else if (perfil.tipo_persona === 'Juridica' && personaJ) {
            rucJuridicaStatus = getDocStatus(personaJ.ruc_pdf_id, true);
            cedulaRlStatus = getDocStatus(personaJ.cedula_representante_legal_pdf_id, true);
            nombramientoRlStatus = getDocStatus(personaJ.nombramiento_representante_legal_pdf_id, true);
             if (personaJ.representante_legal_es_empresa && empresaRep) {
                rucEmpresaRepStatus = getDocStatus(empresaRep.ruc_empresa_pdf_id, true);
                autorizacionEmpresaRepStatus = getDocStatus(empresaRep.autorizacion_representacion_pdf_id, true);
                // Decide if cedula_representante_legal_pdf_id from empresa_representada is needed/different
                 // cedulaRlEmpresaRepStatus = getDocStatus(empresaRep.cedula_representante_legal_pdf_id, true);
             }
        }


        return (
            <div className="space-y-1">
                 <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-semibold">Documentos {profileLabel}</h3>
                     {missingCount > 0 && (
                        <span className="text-xs font-medium text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">
                            {missingCount} Faltante{missingCount > 1 ? 's' : ''}
                        </span>
                     )}
                 </div>

                {perfil.tipo_persona === 'Natural' && personaN && (
                    <>
                         <DocumentDisplay docId={cedulaStatus?.id} docName="Cédula" documentMap={documentMap} isMissing={cedulaStatus?.missing ?? false} docType="cedula_pdf_id" targetTable="personas_natural" targetId={personaN.id} onUploadComplete={handleUploadComplete} />
                         <DocumentDisplay docId={rucPersonaStatus?.id} docName="RUC" documentMap={documentMap} isMissing={rucPersonaStatus?.missing ?? false} docType="ruc_pdf_id" targetTable="personas_natural" targetId={personaN.id} onUploadComplete={handleUploadComplete} />
                    </>
                 )}

                {perfil.tipo_persona === 'Juridica' && personaJ && (
                     <>
                        <DocumentDisplay docId={rucJuridicaStatus?.id} docName="RUC Empresa" documentMap={documentMap} isMissing={rucJuridicaStatus?.missing ?? false} docType="ruc_pdf_id" targetTable="personas_juridica" targetId={personaJ.id} onUploadComplete={handleUploadComplete} />
                        <DocumentDisplay docId={cedulaRlStatus?.id} docName="Cédula Rep. Legal" documentMap={documentMap} isMissing={cedulaRlStatus?.missing ?? false} docType="cedula_representante_legal_pdf_id" targetTable="personas_juridica" targetId={personaJ.id} onUploadComplete={handleUploadComplete} />
                        <DocumentDisplay docId={nombramientoRlStatus?.id} docName="Nombramiento Rep. Legal" documentMap={documentMap} isMissing={nombramientoRlStatus?.missing ?? false} docType="nombramiento_representante_legal_pdf_id" targetTable="personas_juridica" targetId={personaJ.id} onUploadComplete={handleUploadComplete} />

                        {personaJ.representante_legal_es_empresa && empresaRep && (
                            <div className="pt-2 mt-2 border-t">
                                <p className="text-xs font-medium text-gray-500 mb-1">Rep. Legal (Empresa)</p>
                                 <DocumentDisplay docId={rucEmpresaRepStatus?.id} docName="RUC Empresa Rep." documentMap={documentMap} isMissing={rucEmpresaRepStatus?.missing ?? false} docType="ruc_empresa_pdf_id" targetTable="empresas_representada" targetId={empresaRep.id} onUploadComplete={handleUploadComplete} />
                                 <DocumentDisplay docId={autorizacionEmpresaRepStatus?.id} docName="Autorización Rep." documentMap={documentMap} isMissing={autorizacionEmpresaRepStatus?.missing ?? false} docType="autorizacion_representacion_pdf_id" targetTable="empresas_representada" targetId={empresaRep.id} onUploadComplete={handleUploadComplete} />
                                 {/* Optional: <DocumentDisplay docId={cedulaRlEmpresaRepStatus?.id} docName="Cédula Rep. Legal (Empresa)" documentMap={documentMap} isMissing={cedulaRlEmpresaRepStatus?.missing ?? false} /> */}
                             </div>
                         )}
                     </>
                 )}

                {!personaN && !personaJ && (
                     <p className="text-xs text-gray-400 italic">Datos de persona no disponibles.</p>
                )}
            </div>
        );
    };

    // --- Helper function to render contact info ---
    const renderContactInfo = (label: string, contacto: Contacto | undefined | null) => {
        if (!contacto) {
            return null; // Don't render if contact object is null/undefined
        }

        const nombre = contacto.nombre || '-';
        const email = contacto.email || '-';
        const telefono = contacto.telefono || '-';

        // Don't render if all fields are empty/default
        if (nombre === '-' && email === '-' && telefono === '-') {
            return null;
        }

        return (
            <div className="grid grid-cols-4 gap-1 items-center">
                <span className="font-medium text-gray-600 col-span-1">{label}:</span>
                <span className="text-gray-800 col-span-3 truncate" title={nombre}>{nombre}</span>
                <span className="col-span-1"></span> {/* Spacer */}
                <span className="text-gray-500 col-span-3 truncate" title={email}>{email}</span>
                <span className="col-span-1"></span> {/* Spacer */}
                <span className="text-gray-500 col-span-3 truncate" title={telefono}>{telefono}</span>
            </div>
        );
    };

    // --- JSX ---
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="container mx-auto p-4 md:p-6 space-y-6"
        >
            {/* Header Section */}
            <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
                <div className="relative h-64 w-full">
                    {/* Back Button */}
                     <Link
                        href={from === "propietarios" ? `/dashboard/mis-propiedades` : `/dashboard/proyectos/${projectId}`}
                        className="absolute top-4 left-4 z-20 bg-white/80 hover:bg-white backdrop-blur-sm p-2 rounded-full transition-colors shadow-md"
                        aria-label="Volver"
                    >
                        <ArrowLeftIcon className="h-5 w-5 text-gray-700" />
                    </Link>

                     {/* Edit/Options Button */}
                     {(isAdmin || isDirectorio) && (
                         <div className="absolute top-4 right-4 z-20">
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        className="bg-white/80 hover:bg-white backdrop-blur-sm shadow-md rounded-full h-8 w-8"
                                    >
                                         <EllipsisVerticalIcon className="h-5 w-5 text-gray-700" />
                                         <span className="sr-only">Opciones</span> {/* Accessibility */} 
                                    </Button>
                                 </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem asChild>
                                         <Link href={`/dashboard/proyectos/${projectId}/propiedades/${propertyId}/editar`}>
                                            <PencilSquareIcon className="h-4 w-4 mr-2" />
                                             Editar Propiedad
                                         </Link>
                                     </DropdownMenuItem>
                                     {/* Add other options here if needed */}
                                 </DropdownMenuContent>
                             </DropdownMenu>
                         </div>
                     )}

                    {/* Image */}
                    <div className="relative h-full w-full">
                         <Image
                            src={imageUrl}
                            alt={`Imagen de propiedad ${getIdentificador('inferior')} ${getIdentificador('idInferior')}`}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            className="object-cover"
                            priority // Load image faster
                        />
                         <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" /> {/* Gradient Overlay */}
                    </div>


                    {/* Title and Area Info */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 text-white z-10">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2">
                             <div>
                                <h1 className="text-2xl md:text-3xl font-semibold leading-tight">
                                    {getIdentificador('inferior')} {getIdentificador('idInferior')}
                                </h1>
                                 <p className="text-sm md:text-base text-white/90 mt-1">
                                    {getIdentificador('superior')} {getIdentificador('idSuperior')}
                                    {getIdentificador('intermedio') && ` / ${getIdentificador('intermedio')} ${getIdentificador('idIntermedio')}`}
                                 </p>
                            </div>
                             <div className="flex gap-2 mt-2 sm:mt-0">
                                {/* Occupancy Status Badge */}
                                 <span className={`px-3 py-1 rounded-full text-xs font-medium ${occupancyColor} backdrop-blur-sm shadow-sm border border-white/20`}>
                                    {occupancyStatus}
                                </span>
                                {/* Area Badge */}
                                {property.area_total != null && (
                                     <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/20 backdrop-blur-sm shadow-sm border border-white/20">
                                        {formatNumber(property.area_total ?? 0, true)} m²
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                 {/* Basic Info Bar (Optional - can be merged below) */}
                 {/* <div className="p-4 border-t border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm"> ... </div> */}

            </div>

             {/* Main Content Grid */}
             <div className="grid grid-cols-1 md:grid-cols-5 gap-6">

                 {/* Left Column (Property Info) */}
                 <div className="md:col-span-3 space-y-6">

                     {/* Información Básica & Estados */}
                     <div className="bg-white rounded-xl border p-4 md:p-6 shadow-sm">
                         <h2 className="text-lg font-semibold mb-4">Información General</h2>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                             <div>
                                 <p className="text-gray-500">Código Catastral</p>
                                 <p className="font-medium mt-0.5">{property.codigo_catastral || '-'}</p>
                             </div>
                              <div>
                                 <p className="text-gray-500">Actividad Principal</p>
                                 <p className="font-medium mt-0.5">{property.actividad || '-'}</p>
                             </div>
                             <div>
                                 <p className="text-gray-500">Estado Construcción</p>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-0.5 ${
                                     property.estado_de_construccion === 'finalizada' ? 'bg-green-100 text-green-800' :
                                     property.estado_de_construccion === 'enConstruccion' ? 'bg-yellow-100 text-yellow-800' :
                                     'bg-gray-100 text-gray-800'
                                 }`}>
                                     {/* Format enum value nicely */}
                                     {property.estado_de_construccion?.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()) || '-'}
                                </span>
                             </div>
                             <div>
                                <p className="text-gray-500">Estado Entrega</p>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-0.5 ${
                                     property.estado_entrega === 'entregado' ? 'bg-blue-100 text-blue-800' :
                                     'bg-gray-100 text-gray-800'
                                 }`}>
                                     {property.estado_entrega === 'entregado' ? 'Entregado' : 'No Entregado'}
                                </span>
                             </div>
                         </div>
                     </div>

                    {/* Áreas */}
                     <div className="bg-white rounded-xl border p-4 md:p-6 shadow-sm">
                         <h2 className="text-lg font-semibold mb-4">Distribución de Áreas</h2>
                        {/* Display Total Area and Breakdown */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                                <span className="text-sm font-medium text-gray-600">Área Total</span>
                                <span className="text-base font-semibold">{formatNumber(property.area_total ?? 0)} m²</span>
                            </div>
                            {property.areas_desglosadas?.map((area, index) => (
                                <div key={area.id || index} className="flex justify-between items-center text-sm pl-3">
                                    <span className="text-gray-500">
                                        Área {area.tipo_area} {area.nombre_adicional ? `(${area.nombre_adicional})` : ''}
                                    </span>
                                    <span className="font-medium">{formatNumber(area.area)} m²</span>
                                </div>
                            ))}
                            {(!property.areas_desglosadas || property.areas_desglosadas.length === 0) && property.area_total && (
                                 <p className="text-xs text-gray-400 text-center pt-2">No hay áreas desglosadas registradas.</p>
                             )}
                        </div>
                     </div>

                    {/* Montos */}
                    <div className="bg-white rounded-xl border p-4 md:p-6 shadow-sm">
                         <h2 className="text-lg font-semibold mb-4">Valores Asociados</h2>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <div className="bg-gray-50 rounded-lg p-3">
                                 <p className="text-xs text-gray-500 mb-0.5">Fondo Inicial</p>
                                 <p className="text-lg font-semibold">${formatNumber(property.monto_fondo_inicial ?? 0, true)}</p>
                             </div>
                             <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-xs text-gray-500 mb-0.5">Alícuota Ordinaria (Ref.)</p>
                                <p className="text-lg font-semibold">${formatNumber(property.monto_alicuota_ordinaria ?? 0, true)}</p>
                             </div>
                             {/* Add other payment info if needed */}
                             <div className="sm:col-span-2 border-t pt-4 mt-4">
                                 <p className="text-sm text-gray-500 flex items-center">
                                     <CurrencyDollarIcon className="h-4 w-4 mr-1.5 text-gray-400" />
                                     Responsable de Pago:
                                     <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ 
                                        property.encargado_pago === 'Propietario' ? 'bg-purple-100 text-purple-800' : 
                                        property.encargado_pago === 'Arrendatario' ? 'bg-orange-100 text-orange-800' :
                                        property.encargado_pago === 'Externo' ? 'bg-sky-100 text-sky-800' :
                                        'bg-gray-100 text-gray-800' 
                                    }`}>
                                         {property.encargado_pago || 'No definido'}
                                     </span>
                                 </p>
                            </div>
                         </div>
                    </div>

                     {/* Documentos Propiedad */}
                     <div className="bg-white rounded-xl border p-4 md:p-6 shadow-sm">
                         <h2 className="text-lg font-semibold mb-4">Documentos de la Propiedad</h2>
                         <div className="space-y-1">
                             {/* Map through required/uploaded property docs */}
                            <DocumentDisplay
                                docId={property.escritura_pdf_id}
                                docName="Escritura"
                                documentMap={documentMap}
                                isMissing={!property.escritura_pdf_id || !documentMap[property.escritura_pdf_id]}
                                docType="escritura_pdf_id"
                                targetTable="propiedades"
                                targetId={property.id}
                                onUploadComplete={handleUploadComplete}
                            />
                             <DocumentDisplay
                                docId={property.acta_entrega_pdf_id}
                                docName="Acta de Entrega"
                                documentMap={documentMap}
                                isMissing={!property.acta_entrega_pdf_id || !documentMap[property.acta_entrega_pdf_id]}
                                docType="acta_entrega_pdf_id"
                                targetTable="propiedades"
                                targetId={property.id}
                                onUploadComplete={handleUploadComplete}
                            />
                             <DocumentDisplay
                                docId={property.contrato_arrendamiento_pdf_id}
                                docName="Contrato Arrendamiento"
                                documentMap={documentMap}
                                // Only consider missing if the occupant is an Arrendatario AND the doc doesn't exist
                                isMissing={property.ocupante?.rol === 'Arrendatario' && (!property.contrato_arrendamiento_pdf_id || !documentMap[property.contrato_arrendamiento_pdf_id])}
                                docType="contrato_arrendamiento_pdf_id"
                                targetTable="propiedades"
                                targetId={property.id}
                                onUploadComplete={handleUploadComplete}
                             />
                         </div>
                     </div>

                 </div>

                  {/* Right Column (Owner/Occupant Info) */}
                 <div className="md:col-span-2 space-y-6">

                     {/* Propietario Info */}
                     <div className="bg-white rounded-xl border p-4 md:p-6 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                             <h2 className="text-lg font-semibold">Propietario</h2>
                             {/* Dropdown para gestionar propietario (solo Admins/Directorio) */}
                             {(isAdmin || isDirectorio) && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                        >
                                            <PencilSquareIcon className="h-4 w-4 mr-1" />
                                            Gestionar
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem asChild>
                                            <Link href={`/dashboard/proyectos/${projectId}/propiedades/${propertyId}/asignar-cliente?assignRole=Propietario`}>
                                                <UserPlusIcon className="h-4 w-4 mr-2" />
                                                Asignar/Cambiar Propietario
                                            </Link>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                             )}
                         </div>

                         {property.propietario ? (
                            <div className="space-y-3 text-sm">
                                {/* Display Owner Details */}
                                 <div>
                                    <p className="text-xs text-gray-500">{property.propietario.tipo_persona === 'Juridica' ? 'Razón Social' : 'Nombre Completo'}</p>
                                     <p className="font-medium">{getRazonSocial(property.propietario)}</p>
                                 </div>
                                  <div>
                                     <p className="text-xs text-gray-500">{property.propietario.tipo_persona === 'Juridica' ? 'RUC' : 'Cédula'}</p>
                                     <p className="font-medium">{(property.propietario.tipo_persona === 'Juridica' ? property.propietario.persona_juridica?.ruc : property.propietario.persona_natural?.cedula) || '-'}</p>
                                 </div>
                                 {/* Add RL details if Juridica */}
                                 {property.propietario.tipo_persona === 'Juridica' && property.propietario.persona_juridica && (
                                     <>
                                         <div className="pt-2 border-t mt-2">
                                            <p className="text-xs text-gray-500">Rep. Legal</p>
                                            <p className="font-medium">{property.propietario.persona_juridica.razon_social_representante_legal || '-'}</p>
                                         </div>
                                          <div>
                                             <p className="text-xs text-gray-500">Cédula Rep. Legal</p>
                                             <p className="font-medium">{property.propietario.persona_juridica.cedula_representante_legal || '-'}</p>
                                         </div>
                                     </>
                                 )}

                                 {/* Owner Documents */}
                                 <div className="pt-3 border-t mt-3">
                                      {renderProfileDocuments(property.propietario, 'Propietario')}
                                 </div>

                                 {/* Contact Info */}
                                 <div className="pt-3 border-t mt-3">
                                     <h3 className="text-sm font-semibold mb-2">Contactos Propietario</h3>
                                     <div className="space-y-2 text-xs">
                                         {renderContactInfo('Gerente', property.propietario.contacto_gerente)}
                                         {renderContactInfo('Admin.', property.propietario.contacto_administrativo)}
                                         {renderContactInfo('Proveedores', property.propietario.contacto_proveedores)}
                                         {renderContactInfo('Accesos', property.propietario.contacto_accesos)}
                                     </div>
                                 </div>
                             </div>
                         ) : (
                             <div className="text-center py-6">
                                 <UserCircleIcon className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                                 <p className="text-sm text-gray-500 mb-4">No hay propietario asignado.</p>
                                 {isAdmin && (
                                    <Button
                                        className="bg-[#007F44] hover:bg-[#007F44]/80"
                                        size="sm"
                                        onClick={() => router.push(`/dashboard/proyectos/${projectId}/propiedades/${propertyId}/asignar-cliente?assignRole=Propietario`)}
                                    >
                                        <UserPlusIcon className="h-4 w-4 mr-1" /> Asignar Propietario
                                    </Button>
                                 )}
                             </div>
                         )}
                     </div>

                      {/* Ocupante Info (Conditionally Rendered based on status) */}
                      <div className="bg-white rounded-xl border p-4 md:p-6 shadow-sm">
                          <div className="flex justify-between items-center mb-4">
                              <h2 className="text-lg font-semibold">Ocupante</h2>
                               {/* Dropdown para gestionar ocupante (solo Admins) */}
                               {(isAdmin || isDirectorio) && (
                                   <DropdownMenu>
                                       <DropdownMenuTrigger asChild>
                                           <Button
                                               size="sm"
                                               variant="outline"
                                               disabled={updatingOccupancy} // Disable while updating
                                           >
                                                <PencilSquareIcon className="h-4 w-4 mr-1" />
                                               Gestionar
                                               {updatingOccupancy && <span className="ml-2 h-3 w-3 animate-spin rounded-full border-b-2 border-current"></span>}
                                           </Button>
                                       </DropdownMenuTrigger>
                                       <DropdownMenuContent align="end">
                                           <DropdownMenuItem asChild>
                                                <Link href={`/dashboard/proyectos/${projectId}/propiedades/${propertyId}/asignar-cliente?assignRole=Ocupante`}>
                                                    <UserPlusIcon className="h-4 w-4 mr-2" />
                                                    Asignar Ocupante (Arr./Ext.)
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={handleSetOwnerAsOccupant} disabled={updatingOccupancy || !property.propietario_id || property.ocupante_id === property.propietario_id}>
                                               <UserCircleIcon className="h-4 w-4 mr-2" />
                                               Establecer Propietario como Ocupante
                                           </DropdownMenuItem>
                                           <DropdownMenuItem onClick={handleRemoveOccupant} disabled={updatingOccupancy || !property.ocupante_id} className="text-red-600 focus:text-red-700 focus:bg-red-50">
                                               <XCircleIcon className="h-4 w-4 mr-2" />
                                               Quitar Ocupante
                                           </DropdownMenuItem>
                                       </DropdownMenuContent>
                                   </DropdownMenu>
                               )}
                           </div>

                           {/* Content based on occupancy status */}
                           {occupancyStatus === 'Uso Arrendatario' && property.ocupante ? (
                               // Display Tenant Details and Documents
                               <div className="space-y-3 text-sm">
                                    {/* Display Tenant Details */}
                                    <div>
                                       <p className="text-xs text-gray-500">{property.ocupante.tipo_persona === 'Juridica' ? 'Razón Social' : 'Nombre Completo'}</p>
                                        <p className="font-medium">{getRazonSocial(property.ocupante)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">{property.ocupante.tipo_persona === 'Juridica' ? 'RUC' : 'Cédula'}</p>
                                        <p className="font-medium">{(property.ocupante.tipo_persona === 'Juridica' ? property.ocupante.persona_juridica?.ruc : property.ocupante.persona_natural?.cedula) || '-'}</p>
                                    </div>
                                     {/* Add RL details if Juridica */}
                                     {property.ocupante.tipo_persona === 'Juridica' && property.ocupante.persona_juridica && (
                                        <>
                                            <div className="pt-2 border-t mt-2">
                                               <p className="text-xs text-gray-500">Rep. Legal</p>
                                               <p className="font-medium">{property.ocupante.persona_juridica.razon_social_representante_legal || '-'}</p>
                                            </div>
                                             <div>
                                                <p className="text-xs text-gray-500">Cédula Rep. Legal</p>
                                                <p className="font-medium">{property.ocupante.persona_juridica.cedula_representante_legal || '-'}</p>
                                            </div>
                                        </>
                                    )}

                                    {/* Occupant Documents */}
                                    <div className="pt-3 border-t mt-3">
                                        {renderProfileDocuments(property.ocupante, 'Ocupante')}
                                    </div>

                                     {/* Contact Info */}
                                    <div className="pt-3 border-t mt-3">
                                        <h3 className="text-sm font-semibold mb-2">Contactos Ocupante</h3>
                                         <div className="space-y-2 text-xs">
                                             {renderContactInfo('Gerente', property.ocupante.contacto_gerente)}
                                             {renderContactInfo('Admin.', property.ocupante.contacto_administrativo)}
                                             {renderContactInfo('Proveedores', property.ocupante.contacto_proveedores)}
                                             {renderContactInfo('Accesos', property.ocupante.contacto_accesos)}
                                         </div>
                                    </div>
                               </div>
                            ) : occupancyStatus === 'Uso Externo' ? (
                               // Display External Occupant Message
                                <div className="text-center py-6">
                                    <UserGroupIcon className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                                    <p className="text-sm text-gray-500">Ocupante Externo registrado.</p>
                                    {/* We might still want to show minimal info if available in profile */}
                                    {/* e.g., <p>Nombre: {getRazonSocial(property.ocupante)}</p> */}
                                    <p className="text-xs text-gray-400 italic mt-2">Documentos no aplicables para este tipo de rol.</p>
                                </div>
                            ) : occupancyStatus === 'Uso Propietario' ? (
                               // Display Owner is Occupant Message
                               <div className="text-center py-6">
                                   <p className="text-sm text-gray-600">El ocupante de esta propiedad es el propietario.</p>
                                </div>
                            ) : occupancyStatus === 'Sin Asignar' ? (
                                // Message if no occupant assigned yet
                                <div className="text-center py-6">
                                    <ExclamationTriangleIcon className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                                    <p className="text-sm text-gray-500">Propiedad sin ocupante asignado.</p>
                                    {/* El botón para asignar está en el dropdown de arriba ahora */}
                                </div>
                            ): null /* Fallback, shouldn't happen */ }
                         </div>
 
                 </div>

             </div>

            {/* Modals (e.g., Image Upload) */}
            {/* <Dialog open={showImageModal} onOpenChange={setShowImageModal}> ... </Dialog> */}

        </motion.div>
    );
} 