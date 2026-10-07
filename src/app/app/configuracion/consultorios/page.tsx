import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { requireRole } from "@/lib/auth";
import { loadRooms } from "@/features/consultorios/queries";
import { RoomsManager } from "@/features/consultorios/components/rooms-manager";
import { RoomFormDialog } from "@/features/consultorios/components/room-form-dialog";

export const metadata: Metadata = { title: "Consultorios" };

export default async function ConsultoriosPage() {
  const user = await requireRole("ADMIN");
  const rooms = await loadRooms(user);
  const activeCount = rooms.filter((r) => r.active).length;

  return (
    <>
      <PageHeader
        title="Consultorios"
        description={
          rooms.length === 0
            ? "Ambientes físicos donde se atiende a los pacientes."
            : `${activeCount} activo(s) de ${rooms.length} registrado(s).`
        }
        actions={rooms.length > 0 ? <RoomFormDialog /> : undefined}
      />

      <div className="mb-6 flex gap-3 rounded-xl border border-primary/15 bg-info-soft px-4 py-3 text-sm text-secondary-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
        <p>
          Registrar tus consultorios permite que Neuvi <strong>impida agendar dos citas en el mismo ambiente a la
          misma hora</strong>, además de validar la agenda de cada profesional. Si atiendes solo de forma virtual o en
          un único ambiente, puedes dejar esta sección vacía.
        </p>
      </div>

      <RoomsManager rooms={rooms} />
    </>
  );
}
