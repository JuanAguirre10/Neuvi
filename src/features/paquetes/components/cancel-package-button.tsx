"use client";

import { useTransition } from "react";
import { Ban, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cancelPackageAction } from "../actions";

/** "Cancelar paquete" con confirmación. Solo para paquetes ACTIVO (ADMIN / RECEPCION). */
export function CancelPackageButton({
  packageId,
  packageName,
  scheduledSessions,
}: {
  packageId: string;
  packageName: string;
  scheduledSessions: number;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-destructive hover:bg-danger-soft hover:text-destructive" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Ban />}
          Cancelar paquete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-danger-soft text-destructive">
            <Ban />
          </AlertDialogMedia>
          <AlertDialogTitle>¿Cancelar “{packageName}”?</AlertDialogTitle>
          <AlertDialogDescription>
            El paquete dejará de descontar sesiones.
            {scheduledSessions > 0
              ? ` Las ${scheduledSessions} cita(s) agendadas que descontaban de él quedarán sin paquete.`
              : ""}{" "}
            Los pagos registrados se conservan en el historial. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Volver</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() =>
              startTransition(async () => {
                const res = await cancelPackageAction(packageId);
                if (res.ok) toast.success(res.message ?? "Paquete cancelado.");
                else toast.error(res.message ?? "No se pudo cancelar el paquete.");
              })
            }
          >
            Sí, cancelar paquete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
