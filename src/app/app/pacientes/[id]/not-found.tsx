import Link from "next/link";
import { UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";

export default function PacienteNotFound() {
  return (
    <EmptyState
      icon={UserX}
      title="Paciente no encontrado"
      description="El paciente no existe o no tienes acceso a su ficha."
      action={
        <Button asChild>
          <Link href="/app/pacientes">Volver a pacientes</Link>
        </Button>
      }
      className="mt-6"
    />
  );
}
