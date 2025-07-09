"use client";

import React, { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "../../_components/ui/tabs";
import { usePathname, useRouter } from "next/navigation";

export default function FacturacionCobranzaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<string>("facturacion");
  
  // Determinar pestaña activa basada en la ruta
  useEffect(() => {
    if (pathname.includes("/cobranza")) {
      setActiveTab("cobranza");
    } else {
      setActiveTab("facturacion");
    }
  }, [pathname]);
  
  // Manejar cambio de pestaña
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === "cobranza") {
      router.push("/dashboard/facturacion-cobranza/cobranza");
    } else {
      router.push("/dashboard/facturacion-cobranza");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Facturación y Cobranza</h1>
        <p className="text-gray-500 mt-1">Gestión de facturación y cobranza de alícuotas y servicios</p>
      </div>
      
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="facturacion">Facturación</TabsTrigger>
          {/* <TabsTrigger value="cobranza">Cobranza</TabsTrigger> */}
        </TabsList>
      </Tabs>
      
      {children}
    </div>
  );
} 