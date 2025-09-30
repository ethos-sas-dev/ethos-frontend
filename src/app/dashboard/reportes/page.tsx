"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { createClient } from '../../../../lib/supabase/client';
import { 
  BuildingOffice2Icon, 
  MagnifyingGlassIcon, 
  ArrowPathIcon,
  DocumentArrowDownIcon,
  FunnelIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from "@heroicons/react/24/outline";
import { Input } from "@/app/_components/ui/input";
import { Button } from "@/app/_components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/app/_components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/_components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/_components/ui/table";
import { useAuth } from "@/app/_lib/auth/AuthContext";
import Link from "next/link";
import * as XLSX from 'xlsx';

// Tipos más flexibles para manejar datos de Supabase
type Archivo = {
  id: number;
  external_url?: string | null;
  filename?: string | null;
};

type PersonaNatural = {
  id: number;
  razon_social?: string | null;
  cedula?: string | null;
  ruc?: string | null;
  aplica_ruc?: boolean | null;
  cedula_pdf_id?: number | null;
  ruc_pdf_id?: number | null;
  [key: string]: any; // Permitir propiedades adicionales
};

type EmpresaRepresentada = {
  id: number;
  nombre_comercial?: string | null;
  cedula_representante_legal?: string | null;
  ruc_empresa?: string | null;
  cedula_representante_legal_pdf_id?: number | null;
  ruc_empresa_pdf_id?: number | null;
  autorizacion_representacion_pdf_id?: number | null;
  [key: string]: any; // Permitir propiedades adicionales
};

type PersonaJuridica = {
  id: number;
  razon_social?: string | null;
  nombre_comercial?: string | null;
  ruc?: string | null;
  representante_legal_es_empresa?: boolean | null;
  cedula_representante_legal?: string | null;
  cedula_representante_legal_pdf_id?: number | null;
  nombramiento_representante_legal_pdf_id?: number | null;
  ruc_pdf_id?: number | null;
  empresa_representante_legal_id?: number | null;
  empresa_representante_legal?: EmpresaRepresentada | null;
  [key: string]: any; // Permitir propiedades adicionales
};

type PerfilCliente = {
  id: number;
  tipo_persona: 'Natural' | 'Juridica';
  rol?: string | null;
  persona_natural?: PersonaNatural | null;
  persona_juridica?: PersonaJuridica | null;
  [key: string]: any; // Permitir propiedades adicionales
};

// Tipo modificado para ser compatible con datos de Supabase
type Propiedad = {
  id: number;
  proyecto_id: number;
  codigo_catastral?: string | null;
  estado_entrega?: string;
  estado_uso?: string;
  actividad?: string | null;
  identificadores?: {
    superior?: string;
    idSuperior?: string;
    inferior?: string;
    idInferior?: string;
    [key: string]: any;
  } | null;
  propietario_id?: number | null;
  ocupante_id?: number | null;
  escritura_pdf_id?: number | null;
  acta_entrega_pdf_id?: number | null;
  contrato_arrendamiento_pdf_id?: number | null;
  propietario?: PerfilCliente | null | any;
  ocupante?: PerfilCliente | null | any;
  proyecto?: {
    id: number;
    nombre: string;
    [key: string]: any;
  } | null;
  [key: string]: any; // Permitir propiedades adicionales de Supabase
};

// Componente para la tabla de esqueleto mientras carga
const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-3">
    <div className="h-8 bg-gray-200 rounded animate-pulse w-full max-w-xs"></div>
    <div className="space-y-2">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
      ))}
    </div>
  </div>
);

// Componente para cada fila de la tabla
const PropertyRow = ({ propiedad, calcularPorcentajeDocumentacion, getPropietarioNombre, getOcupanteNombre }: {
  propiedad: Propiedad;
  calcularPorcentajeDocumentacion: (propiedad: Propiedad) => { requeridos: number; completados: number; porcentaje: number };
  getPropietarioNombre: (propiedad: Propiedad) => string;
  getOcupanteNombre: (propiedad: Propiedad) => string;
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const docStatus = calcularPorcentajeDocumentacion(propiedad);
  const identSuperior = propiedad.identificadores?.superior || '';
  const idSuperior = propiedad.identificadores?.idSuperior || '';
  const identInferior = propiedad.identificadores?.inferior || '';
  const idInferior = propiedad.identificadores?.idInferior || '';

  return (
    <>
      <TableRow 
        className="cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <TableCell>
          <div className="flex items-center space-x-2">
            {isExpanded ? 
              <ChevronDownIcon className="h-4 w-4 text-gray-500" /> : 
              <ChevronRightIcon className="h-4 w-4 text-gray-500" />
            }
            <span className="font-medium">{propiedad.proyecto?.nombre || 'N/A'}</span>
          </div>
        </TableCell>
        <TableCell>
          <div className="space-y-1">
            <div>{identSuperior} {idSuperior}</div>
            <div className="text-xs text-gray-500">{identInferior} {idInferior}</div>
          </div>
        </TableCell>
        <TableCell>{getPropietarioNombre(propiedad)}</TableCell>
        <TableCell>{getOcupanteNombre(propiedad)}</TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <div className="w-24 bg-gray-200 rounded-full h-2.5">
              <div 
                className={`h-2.5 rounded-full ${
                  docStatus.porcentaje === 100 
                    ? 'bg-green-600' 
                    : docStatus.porcentaje >= 50 
                    ? 'bg-yellow-500' 
                    : 'bg-red-600'
                }`} 
                style={{width: `${docStatus.porcentaje}%`}}
              ></div>
            </div>
            <span className="text-sm font-medium">{docStatus.porcentaje}%</span>
            <span className="text-xs text-gray-500">
              ({docStatus.completados}/{docStatus.requeridos})
            </span>
          </div>
        </TableCell>
        <TableCell>
          {propiedad.escritura_pdf_id ? (
            <CheckCircleIcon className="h-5 w-5 text-green-600" />
          ) : (
            <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
          )}
        </TableCell>
        <TableCell>
          {propiedad.acta_entrega_pdf_id ? (
            <CheckCircleIcon className="h-5 w-5 text-green-600" />
          ) : (
            <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
          )}
        </TableCell>
        <TableCell>
          {propiedad.ocupante?.rol === 'Arrendatario' ? (
            propiedad.contrato_arrendamiento_pdf_id ? (
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
            ) : (
              <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
            )
          ) : (
            <span className="text-xs text-gray-400">N/A</span>
          )}
        </TableCell>
        <TableCell className="text-right">
          <Link 
            href={`/dashboard/proyectos/${propiedad.proyecto_id}/propiedades/${propiedad.id}`}
            className="text-emerald-600 hover:text-emerald-800 text-sm font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            Ver detalles
          </Link>
        </TableCell>
      </TableRow>
      
      {/* Fila expandida con detalles de documentos del cliente */}
      {isExpanded && (
        <TableRow className="bg-gray-50">
          <TableCell colSpan={9} className="p-0">
            <div className="px-8 py-4 space-y-4">
              {/* Documentos del propietario */}
              {propiedad.propietario && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Documentos del Propietario</h4>
                  <div className="bg-white rounded border p-3 space-y-2 text-sm">
                    {propiedad.propietario.tipo_persona === 'Natural' ? (
                      // Documentos para persona natural
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span>Cédula</span>
                          {propiedad.propietario.persona_natural?.cedula_pdf_id ? (
                            <span className="flex items-center text-green-600">
                              <CheckCircleIcon className="h-4 w-4 mr-1" /> Completo
                            </span>
                          ) : (
                            <span className="flex items-center text-red-500">
                              <ExclamationCircleIcon className="h-4 w-4 mr-1" /> Pendiente
                            </span>
                          )}
                        </div>
                        
                        {propiedad.propietario.persona_natural?.aplica_ruc && (
                          <div className="flex items-center justify-between">
                            <span>RUC</span>
                            {propiedad.propietario.persona_natural?.ruc_pdf_id ? (
                              <span className="flex items-center text-green-600">
                                <CheckCircleIcon className="h-4 w-4 mr-1" /> Completo
                              </span>
                            ) : (
                              <span className="flex items-center text-red-500">
                                <ExclamationCircleIcon className="h-4 w-4 mr-1" /> Pendiente
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      // Documentos para persona jurídica
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span>RUC</span>
                          {propiedad.propietario.persona_juridica?.ruc_pdf_id ? (
                            <span className="flex items-center text-green-600">
                              <CheckCircleIcon className="h-4 w-4 mr-1" /> Completo
                            </span>
                          ) : (
                            <span className="flex items-center text-red-500">
                              <ExclamationCircleIcon className="h-4 w-4 mr-1" /> Pendiente
                            </span>
                          )}
                        </div>
                        
                        {!propiedad.propietario.persona_juridica?.representante_legal_es_empresa ? (
                          // Si NO tiene empresa representante legal
                          <>
                            <div className="flex items-center justify-between">
                              <span>Cédula del Representante Legal</span>
                              {propiedad.propietario.persona_juridica?.cedula_representante_legal_pdf_id ? (
                                <span className="flex items-center text-green-600">
                                  <CheckCircleIcon className="h-4 w-4 mr-1" /> Completo
                                </span>
                              ) : (
                                <span className="flex items-center text-red-500">
                                  <ExclamationCircleIcon className="h-4 w-4 mr-1" /> Pendiente
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span>Nombramiento del Representante Legal</span>
                              {propiedad.propietario.persona_juridica?.nombramiento_representante_legal_pdf_id ? (
                                <span className="flex items-center text-green-600">
                                  <CheckCircleIcon className="h-4 w-4 mr-1" /> Completo
                                </span>
                              ) : (
                                <span className="flex items-center text-red-500">
                                  <ExclamationCircleIcon className="h-4 w-4 mr-1" /> Pendiente
                                </span>
                              )}
                            </div>
                          </>
                        ) : (
                          // Si tiene empresa representante legal
                          <>
                            <div className="flex items-center justify-between">
                              <span>RUC de Empresa Representante</span>
                              {propiedad.propietario.persona_juridica?.empresa_representante_legal?.ruc_empresa_pdf_id ? (
                                <span className="flex items-center text-green-600">
                                  <CheckCircleIcon className="h-4 w-4 mr-1" /> Completo
                                </span>
                              ) : (
                                <span className="flex items-center text-red-500">
                                  <ExclamationCircleIcon className="h-4 w-4 mr-1" /> Pendiente
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span>Autorización de Representación</span>
                              {propiedad.propietario.persona_juridica?.empresa_representante_legal?.autorizacion_representacion_pdf_id ? (
                                <span className="flex items-center text-green-600">
                                  <CheckCircleIcon className="h-4 w-4 mr-1" /> Completo
                                </span>
                              ) : (
                                <span className="flex items-center text-red-500">
                                  <ExclamationCircleIcon className="h-4 w-4 mr-1" /> Pendiente
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span>Cédula del Representante Legal</span>
                              {propiedad.propietario.persona_juridica?.empresa_representante_legal?.cedula_representante_legal_pdf_id ? (
                                <span className="flex items-center text-green-600">
                                  <CheckCircleIcon className="h-4 w-4 mr-1" /> Completo
                                </span>
                              ) : (
                                <span className="flex items-center text-red-500">
                                  <ExclamationCircleIcon className="h-4 w-4 mr-1" /> Pendiente
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Documentos del ocupante (solo si es arrendatario) */}
              {propiedad.ocupante?.rol === 'Arrendatario' && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Documentos del Arrendatario</h4>
                  <div className="bg-white rounded border p-3 space-y-2 text-sm">
                    {propiedad.ocupante.tipo_persona === 'Natural' ? (
                      // Documentos para persona natural
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span>Cédula</span>
                          {propiedad.ocupante.persona_natural?.cedula_pdf_id ? (
                            <span className="flex items-center text-green-600">
                              <CheckCircleIcon className="h-4 w-4 mr-1" /> Completo
                            </span>
                          ) : (
                            <span className="flex items-center text-red-500">
                              <ExclamationCircleIcon className="h-4 w-4 mr-1" /> Pendiente
                            </span>
                          )}
                        </div>
                        
                        {propiedad.ocupante.persona_natural?.aplica_ruc && (
                          <div className="flex items-center justify-between">
                            <span>RUC</span>
                            {propiedad.ocupante.persona_natural?.ruc_pdf_id ? (
                              <span className="flex items-center text-green-600">
                                <CheckCircleIcon className="h-4 w-4 mr-1" /> Completo
                              </span>
                            ) : (
                              <span className="flex items-center text-red-500">
                                <ExclamationCircleIcon className="h-4 w-4 mr-1" /> Pendiente
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      // Documentos para persona jurídica
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span>RUC</span>
                          {propiedad.ocupante.persona_juridica?.ruc_pdf_id ? (
                            <span className="flex items-center text-green-600">
                              <CheckCircleIcon className="h-4 w-4 mr-1" /> Completo
                            </span>
                          ) : (
                            <span className="flex items-center text-red-500">
                              <ExclamationCircleIcon className="h-4 w-4 mr-1" /> Pendiente
                            </span>
                          )}
                        </div>
                        
                        {!propiedad.ocupante.persona_juridica?.representante_legal_es_empresa ? (
                          // Si NO tiene empresa representante legal
                          <>
                            <div className="flex items-center justify-between">
                              <span>Cédula del Representante Legal</span>
                              {propiedad.ocupante.persona_juridica?.cedula_representante_legal_pdf_id ? (
                                <span className="flex items-center text-green-600">
                                  <CheckCircleIcon className="h-4 w-4 mr-1" /> Completo
                                </span>
                              ) : (
                                <span className="flex items-center text-red-500">
                                  <ExclamationCircleIcon className="h-4 w-4 mr-1" /> Pendiente
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span>Nombramiento del Representante Legal</span>
                              {propiedad.ocupante.persona_juridica?.nombramiento_representante_legal_pdf_id ? (
                                <span className="flex items-center text-green-600">
                                  <CheckCircleIcon className="h-4 w-4 mr-1" /> Completo
                                </span>
                              ) : (
                                <span className="flex items-center text-red-500">
                                  <ExclamationCircleIcon className="h-4 w-4 mr-1" /> Pendiente
                                </span>
                              )}
                            </div>
                          </>
                        ) : (
                          // Si tiene empresa representante legal
                          <>
                            <div className="flex items-center justify-between">
                              <span>RUC de Empresa Representante</span>
                              {propiedad.ocupante.persona_juridica?.empresa_representante_legal?.ruc_empresa_pdf_id ? (
                                <span className="flex items-center text-green-600">
                                  <CheckCircleIcon className="h-4 w-4 mr-1" /> Completo
                                </span>
                              ) : (
                                <span className="flex items-center text-red-500">
                                  <ExclamationCircleIcon className="h-4 w-4 mr-1" /> Pendiente
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span>Autorización de Representación</span>
                              {propiedad.ocupante.persona_juridica?.empresa_representante_legal?.autorizacion_representacion_pdf_id ? (
                                <span className="flex items-center text-green-600">
                                  <CheckCircleIcon className="h-4 w-4 mr-1" /> Completo
                                </span>
                              ) : (
                                <span className="flex items-center text-red-500">
                                  <ExclamationCircleIcon className="h-4 w-4 mr-1" /> Pendiente
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span>Cédula del Representante Legal</span>
                              {propiedad.ocupante.persona_juridica?.empresa_representante_legal?.cedula_representante_legal_pdf_id ? (
                                <span className="flex items-center text-green-600">
                                  <CheckCircleIcon className="h-4 w-4 mr-1" /> Completo
                                </span>
                              ) : (
                                <span className="flex items-center text-red-500">
                                  <ExclamationCircleIcon className="h-4 w-4 mr-1" /> Pendiente
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

export default function ReportesPage() {
  const supabase = createClient();
  const { role } = useAuth();
  
  // Estados
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);
  const [proyectos, setProyectos] = useState<{id: number; nombre: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("documentacion");
  
  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [proyectoFiltro, setProyectoFiltro] = useState<string>("todos");
  const [estadoDocumentacionFiltro, setEstadoDocumentacionFiltro] = useState<string>("todos");

  // Función para cargar datos
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Cargar proyectos
      const { data: proyectosData, error: proyectosError } = await supabase
        .from('proyectos')
        .select('id, nombre')
        .order('nombre');

      if (proyectosError) throw new Error(`Error al cargar proyectos: ${proyectosError.message}`);
      setProyectos(proyectosData || []);

      // 2. Cargar propiedades con sus relaciones
      const { data: propiedadesData, error: propiedadesError } = await supabase
        .from('propiedades')
        .select(`
          id, 
          proyecto_id, 
          area_total,
          codigo_catastral, 
          estado_entrega, 
          estado_uso,
          actividad,
          monto_alicuota_ordinaria,
          monto_fondo_inicial,
          escritura_pdf_id, 
          acta_entrega_pdf_id, 
          contrato_arrendamiento_pdf_id,
          propietario_id,
          ocupante_id,
          identificadores,
          proyecto:proyectos(id, nombre),
          propietario:perfiles_cliente!propietario_id(
            id, 
            tipo_persona,
            rol,
            persona_natural:personas_natural(
              id, 
              razon_social, 
              cedula, 
              ruc, 
              aplica_ruc,
              cedula_pdf_id, 
              ruc_pdf_id
            ),
            persona_juridica:personas_juridica(
              id, 
              razon_social, 
              nombre_comercial,
              ruc,
              representante_legal_es_empresa,
              cedula_representante_legal,
              cedula_representante_legal_pdf_id,
              nombramiento_representante_legal_pdf_id,
              ruc_pdf_id,
              empresa_representante_legal_id,
              empresa_representante_legal:empresas_representada(
                id,
                nombre_comercial,
                cedula_representante_legal,
                ruc_empresa,
                cedula_representante_legal_pdf_id,
                ruc_empresa_pdf_id,
                autorizacion_representacion_pdf_id
              )
            )
          ),
          ocupante:perfiles_cliente!ocupante_id(
            id, 
            tipo_persona,
            rol,
            persona_natural:personas_natural(
              id, 
              razon_social, 
              cedula, 
              ruc, 
              aplica_ruc,
              cedula_pdf_id, 
              ruc_pdf_id
            ),
            persona_juridica:personas_juridica(
              id, 
              razon_social, 
              nombre_comercial,
              ruc,
              representante_legal_es_empresa,
              cedula_representante_legal,
              cedula_representante_legal_pdf_id,
              nombramiento_representante_legal_pdf_id,
              ruc_pdf_id,
              empresa_representante_legal_id,
              empresa_representante_legal:empresas_representada(
                id,
                nombre_comercial,
                cedula_representante_legal,
                ruc_empresa,
                cedula_representante_legal_pdf_id,
                ruc_empresa_pdf_id,
                autorizacion_representacion_pdf_id
              )
            )
          )
        `);

      if (propiedadesError) throw new Error(`Error al cargar propiedades: ${propiedadesError.message}`);
      setPropiedades((propiedadesData || []) as unknown as Propiedad[]);

    } catch (error: any) {
      setError(error.message);
      console.error('Error cargando datos:', error);
    } finally {
      setIsLoading(false);
      setIsRefetching(false);
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    fetchData();
  }, []);

  // Calcular documentación requerida y completada para una propiedad y su cliente
  const calcularPorcentajeDocumentacion = (propiedad: Propiedad) => {
    let documentosRequeridos = 0;
    let documentosCompletados = 0;

    // 1. Documentos de propiedad
    documentosRequeridos += 2; // escritura y acta de entrega
    if (propiedad.escritura_pdf_id) documentosCompletados++;
    if (propiedad.acta_entrega_pdf_id) documentosCompletados++;

    // Contrato de arrendamiento (solo si hay arrendatario)
    if (propiedad.ocupante?.rol === 'Arrendatario') {
      documentosRequeridos++;
      if (propiedad.contrato_arrendamiento_pdf_id) documentosCompletados++;
    }

    // 2. Documentos del propietario
    if (propiedad.propietario) {
      if (propiedad.propietario.tipo_persona === 'Natural') {
        const personaNatural = propiedad.propietario.persona_natural;
        if (personaNatural) {
          // Cédula siempre requerida
          documentosRequeridos++;
          if (personaNatural.cedula_pdf_id) documentosCompletados++;

          // RUC solo si aplica
          if (personaNatural.aplica_ruc) {
            documentosRequeridos++;
            if (personaNatural.ruc_pdf_id) documentosCompletados++;
          }
        }
      } else if (propiedad.propietario.tipo_persona === 'Juridica') {
        const personaJuridica = propiedad.propietario.persona_juridica;
        if (personaJuridica) {
          // RUC siempre requerido
          documentosRequeridos++;
          if (personaJuridica.ruc_pdf_id) documentosCompletados++;

          if (!personaJuridica.representante_legal_es_empresa) {
            // Cédula y nombramiento del representante legal
            documentosRequeridos += 2;
            if (personaJuridica.cedula_representante_legal_pdf_id) documentosCompletados++;
            if (personaJuridica.nombramiento_representante_legal_pdf_id) documentosCompletados++;
          } else if (personaJuridica.empresa_representante_legal) {
            // Empresa como representante legal
            documentosRequeridos += 3;
            if (personaJuridica.empresa_representante_legal.ruc_empresa_pdf_id) documentosCompletados++;
            if (personaJuridica.empresa_representante_legal.autorizacion_representacion_pdf_id) documentosCompletados++;
            if (personaJuridica.empresa_representante_legal.cedula_representante_legal_pdf_id) documentosCompletados++;
          }
        }
      }
    }

    return {
      requeridos: documentosRequeridos,
      completados: documentosCompletados,
      porcentaje: documentosRequeridos > 0 ? Math.round((documentosCompletados / documentosRequeridos) * 100) : 0
    };
  };

  // Función para obtener nombre de propietario
  const getPropietarioNombre = (propiedad: Propiedad) => {
    if (!propiedad.propietario) return 'Sin propietario';
    
    if (propiedad.propietario.tipo_persona === 'Natural') {
      return propiedad.propietario.persona_natural?.razon_social || 'Sin nombre';
    } else {
      return propiedad.propietario.persona_juridica?.razon_social || 
             propiedad.propietario.persona_juridica?.nombre_comercial || 
             'Sin nombre';
    }
  };

  // Función para obtener nombre de ocupante
  const getOcupanteNombre = (propiedad: Propiedad) => {
    if (!propiedad.ocupante) return 'Sin ocupante';
    
    if (propiedad.ocupante.tipo_persona === 'Natural') {
      return propiedad.ocupante.persona_natural?.razon_social || 'Sin nombre';
    } else {
      return propiedad.ocupante.persona_juridica?.razon_social || 
             propiedad.ocupante.persona_juridica?.nombre_comercial || 
             'Sin nombre';
    }
  };

  // Identificación (RUC o cédula) de propietario
  const getPropietarioIdentificacion = (propiedad: Propiedad) => {
    if (!propiedad.propietario) return '';
    if (propiedad.propietario.tipo_persona === 'Natural') {
      const pn = propiedad.propietario.persona_natural;
      return pn?.ruc || pn?.cedula || '';
    } else {
      const pj = propiedad.propietario.persona_juridica;
      return pj?.ruc || '';
    }
  };

  // Identificación (RUC o cédula) de ocupante
  const getOcupanteIdentificacion = (propiedad: Propiedad) => {
    if (!propiedad.ocupante) return '';
    if (propiedad.ocupante.tipo_persona === 'Natural') {
      const pn = propiedad.ocupante.persona_natural;
      return pn?.ruc || pn?.cedula || '';
    } else {
      const pj = propiedad.ocupante.persona_juridica;
      return pj?.ruc || '';
    }
  };

  // Propiedades filtradas
  const filteredPropiedades = useMemo(() => {
    return propiedades.filter(propiedad => {
      // Filtro por proyecto
      if (proyectoFiltro !== "todos" && propiedad.proyecto_id.toString() !== proyectoFiltro) {
        return false;
      }

      // Filtro por estado de documentación
      if (estadoDocumentacionFiltro !== "todos") {
        const docStatus = calcularPorcentajeDocumentacion(propiedad);
        if (estadoDocumentacionFiltro === "completos" && docStatus.porcentaje !== 100) {
          return false;
        }
        if (estadoDocumentacionFiltro === "incompletos" && docStatus.porcentaje === 100) {
          return false;
        }
      }

      // Filtro por búsqueda de texto
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const identificadorSearch = `${propiedad.identificadores?.superior || ''} ${propiedad.identificadores?.idSuperior || ''} ${propiedad.identificadores?.inferior || ''} ${propiedad.identificadores?.idInferior || ''}`.toLowerCase();
        const propietarioNombre = getPropietarioNombre(propiedad).toLowerCase();
        const ocupanteNombre = getOcupanteNombre(propiedad).toLowerCase();
        const proyectoNombre = (propiedad.proyecto?.nombre || '').toLowerCase();
        
        return (
          identificadorSearch.includes(searchLower) ||
          propietarioNombre.includes(searchLower) ||
          ocupanteNombre.includes(searchLower) ||
          proyectoNombre.includes(searchLower)
        );
      }

      return true;
    });
  }, [propiedades, searchQuery, proyectoFiltro, estadoDocumentacionFiltro]);

  // Función para exportar a Excel
  const exportarExcel = () => {
    const dataForExcel = filteredPropiedades.map(prop => {
      const docStatus = calcularPorcentajeDocumentacion(prop);
      const identSuperior = prop.identificadores?.superior || '';
      const idSuperior = prop.identificadores?.idSuperior || '';
      const identInferior = prop.identificadores?.inferior || '';
      const idInferior = prop.identificadores?.idInferior || '';
      
      // Datos básicos de la propiedad
      const propData = {
        'Proyecto': prop.proyecto?.nombre || 'N/A',
        'Identificador Superior': `${identSuperior} ${idSuperior}`,
        'Identificador Inferior': `${identInferior} ${idInferior}`,
        'Propietario': getPropietarioNombre(prop),
        'Ocupante': getOcupanteNombre(prop),
        'Documentos Completos': `${docStatus.completados}/${docStatus.requeridos}`,
        'Porcentaje Completado': `${docStatus.porcentaje}%`,
        'Estado Uso': prop.estado_uso,
        
        // Documentos de la propiedad
        'Escritura': prop.escritura_pdf_id ? 'Sí' : 'No',
        'Acta Entrega': prop.acta_entrega_pdf_id ? 'Sí' : 'No',
        'Contrato Arrendamiento': prop.ocupante?.rol === 'Arrendatario' 
          ? (prop.contrato_arrendamiento_pdf_id ? 'Sí' : 'No') 
          : 'N/A'
      };

      // Documentos del propietario
      const propietarioData: Record<string, string> = {};
      
      if (prop.propietario) {
        if (prop.propietario.tipo_persona === 'Natural') {
          propietarioData['Propietario Tipo'] = 'Persona Natural';
          propietarioData['Propietario Cédula PDF'] = prop.propietario.persona_natural?.cedula_pdf_id ? 'Sí' : 'No';
          
          if (prop.propietario.persona_natural?.aplica_ruc) {
            propietarioData['Propietario RUC Aplica'] = 'Sí';
            propietarioData['Propietario RUC PDF'] = prop.propietario.persona_natural?.ruc_pdf_id ? 'Sí' : 'No';
          } else {
            propietarioData['Propietario RUC Aplica'] = 'No';
            propietarioData['Propietario RUC PDF'] = 'N/A';
          }
        } else {
          propietarioData['Propietario Tipo'] = 'Persona Jurídica';
          propietarioData['Propietario RUC PDF'] = prop.propietario.persona_juridica?.ruc_pdf_id ? 'Sí' : 'No';
          
          if (!prop.propietario.persona_juridica?.representante_legal_es_empresa) {
            propietarioData['Propietario Rep. Legal Tipo'] = 'Persona Natural';
            propietarioData['Propietario Cédula Rep. Legal PDF'] = prop.propietario.persona_juridica?.cedula_representante_legal_pdf_id ? 'Sí' : 'No';
            propietarioData['Propietario Nombramiento Rep. Legal PDF'] = prop.propietario.persona_juridica?.nombramiento_representante_legal_pdf_id ? 'Sí' : 'No';
            propietarioData['Propietario RUC Empresa Rep. Legal PDF'] = 'N/A';
            propietarioData['Propietario Autorización Rep. PDF'] = 'N/A';
          } else {
            propietarioData['Propietario Rep. Legal Tipo'] = 'Empresa';
            propietarioData['Propietario RUC Empresa Rep. Legal PDF'] = prop.propietario.persona_juridica?.empresa_representante_legal?.ruc_empresa_pdf_id ? 'Sí' : 'No';
            propietarioData['Propietario Autorización Rep. PDF'] = prop.propietario.persona_juridica?.empresa_representante_legal?.autorizacion_representacion_pdf_id ? 'Sí' : 'No';
            propietarioData['Propietario Cédula Rep. Legal PDF'] = prop.propietario.persona_juridica?.empresa_representante_legal?.cedula_representante_legal_pdf_id ? 'Sí' : 'No';
          }
        }
      } else {
        propietarioData['Propietario Tipo'] = 'Sin Propietario';
      }
      
      // Documentos del ocupante
      const ocupanteData: Record<string, string> = {
        'Ocupante Tipo': 'Sin Ocupante'
      };
      
      if (prop.ocupante) {
        if (prop.ocupante.rol === 'Arrendatario') {
          if (prop.ocupante.tipo_persona === 'Natural') {
            ocupanteData['Ocupante Tipo'] = 'Persona Natural';
            ocupanteData['Ocupante Cédula PDF'] = prop.ocupante.persona_natural?.cedula_pdf_id ? 'Sí' : 'No';
            
            if (prop.ocupante.persona_natural?.aplica_ruc) {
              ocupanteData['Ocupante RUC Aplica'] = 'Sí';
              ocupanteData['Ocupante RUC PDF'] = prop.ocupante.persona_natural?.ruc_pdf_id ? 'Sí' : 'No';
            } else {
              ocupanteData['Ocupante RUC Aplica'] = 'No';
              ocupanteData['Ocupante RUC PDF'] = 'N/A';
            }
          } else {
            ocupanteData['Ocupante Tipo'] = 'Persona Jurídica';
            ocupanteData['Ocupante RUC PDF'] = prop.ocupante.persona_juridica?.ruc_pdf_id ? 'Sí' : 'No';
            
            if (!prop.ocupante.persona_juridica?.representante_legal_es_empresa) {
              ocupanteData['Ocupante Rep. Legal Tipo'] = 'Persona Natural';
              ocupanteData['Ocupante Cédula Rep. Legal PDF'] = prop.ocupante.persona_juridica?.cedula_representante_legal_pdf_id ? 'Sí' : 'No';
              ocupanteData['Ocupante Nombramiento Rep. Legal PDF'] = prop.ocupante.persona_juridica?.nombramiento_representante_legal_pdf_id ? 'Sí' : 'No';
              ocupanteData['Ocupante RUC Empresa Rep. Legal PDF'] = 'N/A';
              ocupanteData['Ocupante Autorización Rep. PDF'] = 'N/A';
            } else {
              ocupanteData['Ocupante Rep. Legal Tipo'] = 'Empresa';
              ocupanteData['Ocupante RUC Empresa Rep. Legal PDF'] = prop.ocupante.persona_juridica?.empresa_representante_legal?.ruc_empresa_pdf_id ? 'Sí' : 'No';
              ocupanteData['Ocupante Autorización Rep. PDF'] = prop.ocupante.persona_juridica?.empresa_representante_legal?.autorizacion_representacion_pdf_id ? 'Sí' : 'No';
              ocupanteData['Ocupante Cédula Rep. Legal PDF'] = prop.ocupante.persona_juridica?.empresa_representante_legal?.cedula_representante_legal_pdf_id ? 'Sí' : 'No';
            }
          }
        } else {
          ocupanteData['Ocupante Tipo'] = `${prop.ocupante.rol || 'Ocupante'} (Docs. No Requeridos)`;
        }
      }

      // Combinar todos los datos
      return {
        ...propData,
        ...propietarioData,
        ...ocupanteData
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataForExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte Documentación");
    
    // Guardar el archivo
    XLSX.writeFile(wb, `reporte_documentacion_ethos_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // Si no es admin o directorio, mostrar mensaje de acceso denegado
  if (role !== 'Administrador' && role !== 'Directorio') {
    return (
      <div className="p-8 text-center">
        <BuildingOffice2Icon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso Restringido</h1>
        <p className="text-gray-600 mb-4">
          No tienes permisos para acceder a la sección de reportes.
        </p>
        <Link href="/dashboard" className="text-emerald-600 hover:text-emerald-800 font-medium">
          Volver al dashboard
        </Link>
      </div>
    );
  }

  // Generar Excel para "Facturación"
  const exportarExcelFacturacion = () => {
    const data = propiedades
      .filter(p => proyectoFiltro === "todos" || p.proyecto_id.toString() === proyectoFiltro)
      .map(p => {
        const proyectoNombre = p.proyecto?.nombre || '';
        const esAlmaxCenter = proyectoNombre.toLowerCase().includes('almax center');
        const valorAlicuota = esAlmaxCenter ? 'N/A (especial)' : (p.monto_alicuota_ordinaria ?? '0');
        const valorFondoInicial = esAlmaxCenter ? 'N/A (especial)' : (p.monto_fondo_inicial ?? '0');
        const identSuperior = p.identificadores?.superior || '';
        const idSuperior = p.identificadores?.idSuperior || '';
        const identInferior = p.identificadores?.inferior || '';
        const idInferior = p.identificadores?.idInferior || '';
        return {
          'Proyecto': proyectoNombre,
          'Identificador Superior': `${identSuperior} ${idSuperior}`.trim(),
          'Identificador Inferior': `${identInferior} ${idInferior}`.trim(),
          'Área Total (m²)': p.area_total ?? 0,
          'Propietario': getPropietarioNombre(p as any),
          'Propietario Identificación': getPropietarioIdentificacion(p as any),
          'Ocupante': getOcupanteNombre(p as any),
          'Ocupante Identificación': getOcupanteIdentificacion(p as any),
          'Monto Alícuota Ordinaria': valorAlicuota,
          'Monto Fondo Inicial': valorFondoInicial,
        };
      });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Facturación");
    XLSX.writeFile(wb, `datos_generales_ethos_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container mx-auto px-4 py-8"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <p className="text-gray-600">Documentación y datos de facturación por proyecto</p>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="documentacion">Documentación</TabsTrigger>
            <TabsTrigger value="facturacion">Datos Generales y Facturación</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
            </div>
            <Input
              type="text"
              placeholder="Buscar por identificador, propietario o proyecto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
            />
          </div>

          <div>
            <Select
              value={proyectoFiltro}
              onValueChange={setProyectoFiltro}
            >
              <SelectTrigger className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500">
                <SelectValue placeholder="Filtrar por Proyecto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los Proyectos</SelectItem>
                {proyectos.map(proyecto => (
                  <SelectItem key={proyecto.id} value={proyecto.id.toString()}>
                    {proyecto.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select
              value={estadoDocumentacionFiltro}
              onValueChange={setEstadoDocumentacionFiltro}
            >
              <SelectTrigger className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500">
                <SelectValue placeholder="Filtrar por Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los Estados</SelectItem>
                <SelectItem value="completos">Documentación Completa</SelectItem>
                <SelectItem value="incompletos">Documentación Incompleta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsContent value="documentacion">
          {/* Estadísticas por Proyecto */}
          {!isLoading && proyectos.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
              {proyectos.map(proyecto => {
                const propiedadesProyecto = propiedades.filter(p => p.proyecto_id === proyecto.id);
                const totalPropiedades = propiedadesProyecto.length;
                
                if (totalPropiedades === 0) return null;
                
                const documentacionCompleta = propiedadesProyecto.filter(p => {
                  const docStatus = calcularPorcentajeDocumentacion(p);
                  return docStatus.porcentaje === 100;
                }).length;
                
                const porcentajeProyecto = Math.round((documentacionCompleta / totalPropiedades) * 100);
                
                return (
                  <div key={proyecto.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-300">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-emerald-100 rounded-xl">
                        <BuildingOffice2Icon className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">
                          {porcentajeProyecto}%
                        </p>
                        <div className="w-8 h-1 bg-emerald-400 rounded-full ml-auto mt-1"></div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide truncate">
                        {proyecto.nombre}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {documentacionCompleta}/{totalPropiedades} propiedades completas
                      </p>
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              porcentajeProyecto === 100 
                                ? 'bg-green-500' 
                                : porcentajeProyecto >= 75 
                                ? 'bg-emerald-500' 
                                : porcentajeProyecto >= 50 
                                ? 'bg-yellow-500' 
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${porcentajeProyecto}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            {!isLoading && (
              <div className="text-sm text-gray-600">
                {filteredPropiedades.length} {filteredPropiedades.length === 1 ? 'propiedad encontrada' : 'propiedades encontradas'}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => { setIsRefetching(true); fetchData(); }}
                disabled={isLoading || isRefetching}
                className="flex items-center gap-2"
              >
                <ArrowPathIcon className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
              <Button
                onClick={exportarExcel}
                disabled={isLoading || filteredPropiedades.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
              >
                <DocumentArrowDownIcon className="h-4 w-4" />
                Exportar Excel
              </Button>
            </div>
          </div>
          {isLoading ? (
            <TableSkeleton rows={10} />
          ) : error ? (
            <div className="bg-red-50 text-red-700 p-4 rounded-md border border-red-200 text-center">
              <p className="font-medium">Error al cargar datos</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          ) : filteredPropiedades.length === 0 ? (
            <div className="bg-gray-50 border rounded-lg p-8 text-center">
              <BuildingOffice2Icon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No se encontraron propiedades
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Intenta con otros filtros o refresca la página.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Proyecto</TableHead>
                    <TableHead>Identificador</TableHead>
                    <TableHead>Propietario</TableHead>
                    <TableHead>Ocupante</TableHead>
                    <TableHead>Documentación</TableHead>
                    <TableHead>Escritura</TableHead>
                    <TableHead>Acta Entrega</TableHead>
                    <TableHead>Contrato</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPropiedades.map((propiedad) => (
                    <PropertyRow 
                      key={propiedad.id}
                      propiedad={propiedad}
                      calcularPorcentajeDocumentacion={calcularPorcentajeDocumentacion}
                      getPropietarioNombre={getPropietarioNombre}
                      getOcupanteNombre={getOcupanteNombre}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="facturacion">
          <div className="flex items-center justify-end mb-4 gap-2">
            <Button
              variant="outline"
              onClick={() => { setIsRefetching(true); fetchData(); }}
              disabled={isLoading || isRefetching}
              className="flex items-center gap-2"
            >
              <ArrowPathIcon className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button
              onClick={exportarExcelFacturacion}
              disabled={isLoading || propiedades.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
            >
              <DocumentArrowDownIcon className="h-4 w-4" />
              Exportar Excel Facturación
            </Button>
          </div>
          <div className="bg-gray-50 border rounded-lg p-6 text-sm text-gray-700">
            Descarga un Excel con datos por proyecto: identificadores, área total, propietarios, ocupantes y valores base a facturar.
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
