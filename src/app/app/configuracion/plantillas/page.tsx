import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { requireRole } from "@/lib/auth";
import { TemplatesForm } from "@/features/configuracion/templates-form";

export const metadata: Metadata = { title: "Plantillas de WhatsApp" };

export default async function PlantillasPage() {
  const user = await requireRole("ADMIN");
  const org = user.organization;

  return (
    <>
      <PageHeader
        title="Plantillas de WhatsApp"
        description="Personaliza el texto de los recordatorios de cita y de los avisos de renovación."
      />
      <TemplatesForm
        orgName={org.name}
        reminderTemplate={org.reminderTemplate}
        renewalTemplate={org.renewalTemplate}
      />
    </>
  );
}
