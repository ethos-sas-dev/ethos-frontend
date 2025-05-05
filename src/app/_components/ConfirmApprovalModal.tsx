import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/_components/ui/dialog";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/app/_components/ui/alert";
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (prefijo?: string, numeroInicial?: number) => void;
  isLoading: boolean;
  facturaCount: number;
}

export default function ConfirmApprovalModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  facturaCount,
}: ConfirmApprovalModalProps) {
  const [prefijo, setPrefijo] = useState<string>('003-001-'); // Valor por defecto
  const [numeroInicialStr, setNumeroInicialStr] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleConfirm = () => {
    setError('');
    const numeroInicial = parseInt(numeroInicialStr);

    // Validaciones actualizadas
    if (!/^\d{3}-\d{3}-$/.test(prefijo)) {
      setError('El formato del prefijo debe ser XXX-YYY- (ej. 001-002-)');
      return;
    }
    // Ahora numeroInicialStr es obligatorio
    if (!numeroInicialStr) {
      setError('Debes ingresar el número inicial de la secuencia.');
      return;
    }
    if (isNaN(numeroInicial) || numeroInicial <= 0) {
      setError('El número inicial debe ser un entero positivo.');
      return;
    }
    if (numeroInicialStr.length > 9) {
      setError('El número inicial no puede tener más de 9 dígitos.');
      return;
    }

    // Ya no se pasa undefined, siempre se pasa el número
    onConfirm(prefijo, numeroInicial);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      // Resetear estado al cerrar
      // setPrefijo('003-001-');
      // setNumeroInicialStr('');
      // setError('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center text-amber-600">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Confirmar aprobación
          </DialogTitle>
          <DialogDescription>
            Está a punto de aprobar <strong>{facturaCount}</strong> factura{facturaCount !== 1 ? "s" : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-gray-600">
            Ingresa la secuencia con la que deseas iniciar la numeración de estas facturas.
            Ejemplo: Si la última factura fue 003-001-000001406, ingresa el número <span className="font-mono font-semibold">1407</span>.
          </p>
          <div className="grid grid-cols-3 gap-4 items-end">
            <div className="col-span-2">
              <Label htmlFor="prefijo-secuencia">Prefijo (Formato: XXX-YYY-)</Label>
              <Input 
                id="prefijo-secuencia"
                value={prefijo}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrefijo(e.target.value)}
                placeholder="003-001-"
                maxLength={8} // XXX-YYY-
                disabled={isLoading}
              />
            </div>
            <div>
              <Label htmlFor="numero-inicial">Número Inicial</Label>
              <Input 
                id="numero-inicial"
                type="number"
                value={numeroInicialStr}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNumeroInicialStr(e.target.value.replace(/\D/g, '').slice(0, 9))}
                placeholder="Ej: 1407" // Placeholder actualizado
                disabled={isLoading}
                required // Marcar como requerido visualmente (aunque la validación real está en JS)
              />
            </div>
          </div>
          {error && (
            <Alert variant="destructive">
              <ExclamationTriangleIcon className="h-4 w-4" />
              <AlertTitle>Error de Validación</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <div className="py-4">
          <div className="rounded-md bg-amber-50 p-4 border border-amber-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">Importante</h3>
                <div className="mt-2 text-sm text-amber-700">
                  <p>
                    Al aprobar estas facturas:
                  </p>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    <li>Se emitirán en Contifico</li>
                    <li>Se enviarán al Servicio de Rentas Internas (SRI)</li>
                    <li>Se enviarán notificaciones a los clientes</li>
                  </ul>
                  <p className="mt-2 font-medium">
                    Esta acción no puede deshacerse una vez procesada.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="default"
            className="bg-amber-600 hover:bg-amber-700"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              "Confirmar y aprobar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 