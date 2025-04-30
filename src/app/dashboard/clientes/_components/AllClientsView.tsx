'use client'

import { useState, useEffect } from 'react';
import { createClient } from  '../../../../../lib/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../_components/ui/table";
import { Button } from "../../../_components/ui/button";
import { Skeleton } from "../../../_components/ui/skeleton";
import { PencilSquareIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation'; // Para navegación futura
import { Card } from '@/app/_components/ui/card';

// --- Tipos --- 
// Reutilizar tipos definidos en otros componentes si es posible
type PersonaNatural = { razon_social: string | null, cedula: string | null, ruc: string | null };
type PersonaJuridica = { razon_social: string | null, ruc: string | null };

type ClienteListing = {
  id: number;
  tipo_persona: 'Natural' | 'Juridica';
  rol: 'Propietario' | 'Arrendatario' | 'Externo' | null;
  // Datos de persona directamente en el objeto
  personas_natural: PersonaNatural | null; 
  personas_juridica: PersonaJuridica | null;
};

// --- Helpers --- 

// Reutilizar/Adaptar getClientDetails de PropertiesView si incluye rol
type ClientDetails = {
    nombre: string;
    identificacion: {
        tipo: 'RUC' | 'Cédula' | 'N/A';
        valor: string;
    };
    rol: string | null;
};

const getClientDetails = (client: ClienteListing | null): ClientDetails => {
    const defaultReturn: ClientDetails = { 
      nombre: 'N/A', 
      identificacion: { tipo: 'N/A', valor: 'N/A' }, 
      rol: null 
    };
    if (!client) return defaultReturn;

    let nombre = 'N/A';
    let identificacion: ClientDetails['identificacion'] = { tipo: 'N/A', valor: 'N/A' }; 
    const rol = client.rol || 'Desconocido'; // Usar 'Desconocido' si es null
    
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
    } else if (!client.personas_natural && !client.personas_juridica) {
        nombre = 'Datos de persona no encontrados';
    }

    return { nombre, identificacion, rol };
};

// --- Componente --- 
export default function AllClientsView() {
  const [clients, setClients] = useState<ClienteListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter(); // Hook para navegación

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch all clients
        const { data, error: fetchError } = await supabase
          .from('perfiles_cliente')
          .select(`
            id,
            tipo_persona,
            rol,
            personas_natural (*), 
            personas_juridica (*)
          `)
          // Opcional: ordenar por nombre/rol
          .order('id', { ascending: true }) // Ordenar por ID por ahora
          .returns<ClienteListing[]>(); // Esperamos array de ClienteListing

        if (fetchError) throw fetchError;

        // Asumiendo que Supabase devuelve las relaciones correctamente como objetos
        setClients(data || []);

      } catch (err: any) {
        console.error('Error fetching all clients:', err);
        setError(`Error al cargar clientes: ${err.message}`);
        setClients([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [supabase]);

  const handleEdit = (clientId: number) => {
    console.log("Editar cliente con ID:", clientId);
    // TODO: Navegar a la página de edición cuando exista
    // router.push(`/dashboard/clientes/${clientId}/editar`);
    alert(`Funcionalidad de editar cliente ${clientId} pendiente.`);
  };

  // Helper para color del rol (similar a PropertiesView)
  const getRolTextColorClass = (rol: string | null): string => {
      switch (rol) {
          case 'Propietario': return 'text-emerald-700';
          case 'Arrendatario': return 'text-blue-700';
          case 'Externo': return 'text-gray-600';
          default: return 'text-gray-500'; // Ligeramente diferente para desconocido/null
      }
  };

  return (
    <div className="mt-4">
      {loading && (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}
      {error && <p className="text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}
      {!loading && !error && (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 text-xs uppercase tracking-wider">
                <TableHead className="px-4 py-3">Nombre / Razón Social</TableHead>
                <TableHead className="px-4 py-3">Tipo ID</TableHead>
                <TableHead className="px-4 py-3">Identificación</TableHead>
                <TableHead className="px-4 py-3">Rol</TableHead>
                <TableHead className="text-right px-4 py-3">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500 py-10 px-4">
                    No se encontraron clientes.
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client) => {
                  const details = getClientDetails(client);
                  return (
                    <TableRow key={client.id} className="text-sm hover:bg-gray-50">
                      <TableCell className="font-medium px-4 py-3">{details.nombre}</TableCell>
                      <TableCell className="px-4 py-3">
                        <span 
                          className={`px-2 py-0.5 rounded text-xs font-medium border ${details.identificacion.tipo === 'RUC' ? 'bg-blue-100 text-blue-800 border-blue-200' : details.identificacion.tipo === 'Cédula' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}
                        >
                          {details.identificacion.tipo}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3">{details.identificacion.valor}</TableCell>
                      <TableCell className="px-4 py-3">
                        <span className={`font-medium ${getRolTextColorClass(details.rol)}`}>
                           {details.rol}
                         </span>
                      </TableCell>
                      <TableCell className="text-right px-4 py-3">
                        <Button 
                          variant="outline" 
                          onClick={() => handleEdit(client.id)}
                          title="Editar Cliente"
                          className="border-gray-300 hover:bg-gray-100"
                        >
                          <PencilSquareIcon className="h-4 w-4 text-gray-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
} 