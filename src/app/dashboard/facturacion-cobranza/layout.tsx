import React from "react";

export default function FacturacionCobranzaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Facturación</h1>
        <p className="text-gray-500 mt-1">Gestión de facturación de alícuotas y servicios</p>
      </div>
      
      {children}
    </div>
  );
} 