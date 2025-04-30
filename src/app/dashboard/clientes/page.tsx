'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../_components/ui/tabs";

// TODO: Crear e importar estos componentes
import PropertiesView from './_components/PropertiesView';
import OwnersView from './_components/OwnersView';
import AllClientsView from './_components/AllClientsView';

export default function ClientesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">Gestión de Clientes</h1>
      
      <Tabs defaultValue="por-propiedad" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="por-propiedad">Por Propiedad</TabsTrigger>
          <TabsTrigger value="por-propietario">Por Propietario</TabsTrigger>
          <TabsTrigger value="todos">Todos los Clientes</TabsTrigger>
        </TabsList>
        <TabsContent value="por-propiedad">
          {/* <p className="text-gray-600 p-4 border rounded-md bg-white mt-4">Vista por Propiedad - Aquí se mostrarán las propiedades agrupadas por proyecto con detalles de propietario y ocupante.</p> */}
          <PropertiesView />
        </TabsContent>
        <TabsContent value="por-propietario">
          {/* Contenido de la vista por propietario */}
          <OwnersView />
        </TabsContent>
        <TabsContent value="todos">
          {/* Contenido de la vista de todos los clientes */}
          <AllClientsView />
        </TabsContent>
      </Tabs>
    </div>
  );
} 