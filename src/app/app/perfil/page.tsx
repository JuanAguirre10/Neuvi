import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { Pill } from "@/components/common/status-badges";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LABEL, initials } from "@/lib/format";
import { ProfileForm } from "@/features/perfil/profile-form";
import { PasswordForm } from "@/features/perfil/password-form";

export const metadata: Metadata = { title: "Mi perfil" };

export default async function PerfilPage() {
  const user = await requireUser();
  const me = await db.user.findFirstOrThrow({
    where: { id: user.id, organizationId: user.organizationId },
    select: {
      name: true,
      email: true,
      phone: true,
      specialty: true,
      licenseNumber: true,
      calendarColor: true,
      isProfessional: true,
      role: true,
    },
  });
  const roleLabel =
    me.role === "ADMIN" && me.isProfessional
      ? user.organization.type === "INDIVIDUAL"
        ? "Psicólogo(a)"
        : "Administrador · Atiende pacientes"
      : ROLE_LABEL[me.role];

  return (
    <>
      <PageHeader title="Mi perfil" description="Tus datos personales y tu contraseña de acceso." />

      <div className="grid max-w-3xl gap-6">
        <Card size="sm">
          <CardContent className="flex items-center gap-4">
            <span
              aria-hidden
              className="relative flex size-12 shrink-0 items-center justify-center rounded-full bg-secondary text-base font-semibold text-primary"
            >
              {initials(me.name)}
              {me.isProfessional ? (
                <span
                  className="absolute -right-0.5 -bottom-0.5 size-3.5 rounded-full ring-2 ring-card"
                  style={{ backgroundColor: me.calendarColor }}
                />
              ) : null}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-brand-navy-deep">{me.name}</p>
              <p className="truncate text-sm text-muted-foreground">{me.email}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <Pill tone="blue">{roleLabel}</Pill>
                <Pill tone="gray">{user.organization.name}</Pill>
              </div>
            </div>
          </CardContent>
        </Card>

        <ProfileForm profile={me} />
        <PasswordForm />
      </div>
    </>
  );
}
