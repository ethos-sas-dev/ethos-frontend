"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";

export default function CobranzaPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Cobranza</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">
            Esta sección está en desarrollo. Pronto podrá gestionar los pagos y estados de facturas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 