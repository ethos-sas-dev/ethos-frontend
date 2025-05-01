"use client";

import { BuildingOffice2Icon } from "@heroicons/react/24/outline";

export default function ReportesPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-6 max-w-lg">
        <BuildingOffice2Icon className="h-24 w-24 mx-auto text-emerald-600" />
        <h1 className="text-2xl font-bold text-gray-900">
          Estamos mejorando los reportes
        </h1>
        <p className="text-md text-gray-600">
          Trabajamos para brindarte una mejor experiencia con los reportes de Ethos. Pronto tendrás acceso a informes más detallados y personalizables.
        </p>
      </div>
    </div>
  );
}
