import Link from "next/link";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";

export default function CuentaNotFound() {
  return (
    <EmptyState
      icon={Building2}
      title="No encontramos esta cuenta"
      description="Puede que el enlace esté incompleto o que la cuenta ya no exista."
      action={
        <Button asChild variant="outline">
          <Link href="/admin/cuentas">Volver a cuentas</Link>
        </Button>
      }
    />
  );
}
