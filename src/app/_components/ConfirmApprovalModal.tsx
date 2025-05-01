import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/_components/ui/dialog";
import { Button } from "@/app/_components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
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
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
            onClick={onConfirm}
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