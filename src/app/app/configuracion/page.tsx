import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { GeneralSettingsForm } from "@/features/configuracion/general-form";

export const metadata: Metadata = { title: "Configuración" };

export default async function ConfiguracionGeneralPage() {
  const user = await requireRole("ADMIN");
  const org = await db.organization.findUniqueOrThrow({
    where: { id: user.organizationId },
    select: {
      name: true,
      type: true,
      phone: true,
      email: true,
      address: true,
      ruc: true,
      defaultSessionMinutes: true,
      renewalThreshold: true,
      noShowConsumesSession: true,
    },
  });

  return (
    <>
      <PageHeader
        title="General"
        description={`Datos de ${org.type === "CENTRO" ? "tu centro" : "tu consultorio"} y reglas de agenda y paquetes.`}
      />
      <div className="max-w-3xl">
        <GeneralSettingsForm org={org} />
      </div>
    </>
  );
}
