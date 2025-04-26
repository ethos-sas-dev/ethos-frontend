"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { DocumentArrowUpIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { UploadButton } from "@/utils/uploadthing";
import { gql, useMutation } from "@apollo/client";

const CREATE_ARCHIVO = gql`
  mutation CreateArchivo($data: ArchivoInput!) {
    createArchivo(data: $data) {
      documentId
      nombre
      url
      tipoArchivo
    }
  }
`;

interface DocumentUploaderProps {
  onDocumentChange: (documentId: string | null, url: string | null, name: string | null) => void;
  currentDocument?: {
    documentId?: string;
    url?: string;
    nombre?: string;
  };
  label?: string;
  fieldName: string;
}

export function DocumentUploader({
  onDocumentChange,
  currentDocument,
  label = "documento",
  fieldName
}: DocumentUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [createArchivo] = useMutation(CREATE_ARCHIVO);

  const handleUploadComplete = async (res: { url: string; name: string }[]) => {
    try {
      setIsUploading(true);
      
      // Crear el archivo en la base de datos para obtener el documentId
      const { data: archivoData } = await createArchivo({
        variables: {
          data: {
            nombre: res[0].name,
            url: res[0].url,
            tipoArchivo: "pdf",
            fechaSubida: new Date().toISOString()
          }
        }
      });

      console.log(`Archivo creado para ${fieldName}:`, archivoData);
      
      // Notificar al componente padre sobre el cambio
      onDocumentChange(
        archivoData.createArchivo.documentId,
        res[0].url,
        res[0].name
      );
    } catch (error) {
      console.error(`Error al crear archivo para ${fieldName}:`, error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveDocument = () => {
    // Solo notificamos al componente padre que el documento ha sido eliminado
    onDocumentChange(null, null, null);
  };

  return (
    <div className="border border-gray-300 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow bg-white">
      <h3 className="font-medium mb-4 text-gray-800">{label}</h3>
      <div className="flex items-center gap-4">
        {currentDocument?.url ? (
          <div className="border rounded-lg p-3 flex items-center gap-2 bg-blue-50 border-blue-200 flex-1">
            <DocumentArrowUpIcon className="w-5 h-5 text-blue-600" />
            <span className="text-sm truncate text-gray-700">{currentDocument.nombre}</span>
            <div className="ml-auto flex items-center gap-2">
              <a 
                href={currentDocument.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                Ver
              </a>
              <button
                type="button"
                onClick={handleRemoveDocument}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded-full"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-3 font-medium">
              Suba el {label.toLowerCase()} en formato PDF
            </p>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
              <UploadButton
                endpoint="propertyDocument"
                onUploadBegin={() => {
                  setIsUploading(true);
                }}
                onClientUploadComplete={handleUploadComplete}
                onUploadError={(error: Error) => {
                  console.error(`Error al subir ${fieldName}:`, error);
                  setIsUploading(false);
                }}
                className="ut-button:bg-blue-600 ut-button:text-white ut-button:border ut-button:border-blue-700 ut-button:hover:bg-blue-700 ut-button:shadow-sm ut-button:ut-readying:bg-blue-500 ut-button:ut-uploading:bg-blue-500 ut-container:w-full ut-button:w-full ut-button:py-2"
                content={{
                  button({ ready }) {
                    if (!ready) return 'Cargando...';
                    if (isUploading) {
                      return (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                          <span className="ml-2 text-white font-medium">Subiendo...</span>
                        </>
                      );
                    }
                    return (
                      <>
                        <DocumentArrowUpIcon className="w-5 h-5 text-white" />
                        <span className="ml-2 text-white font-medium">Subir {label.toLowerCase()}</span>
                      </>
                    );
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 