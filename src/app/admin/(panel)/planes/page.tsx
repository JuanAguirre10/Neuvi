import type { Metadata } from "next";
import { Check, Layers, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Pill } from "@/components/common/status-badges";
import { requirePlatformAdmin } from "@/lib/platform-auth";
import { can } from "@/lib/platform-auth/permissions";
import { formatPEN } from "@/lib/format";
import { listPlans } from "@/features/admin/queries";
import { PlanDialog } from "@/features/admin/components/plan-dialog";

export const metadata: Metadata = { title: "Planes" };

export default async function PlanesPage() {
  const admin = await requirePlatformAdmin();
  const plans = await listPlans();
  const canEdit = can(admin.role, "plans");

  return (
    <>
      <PageHeader
        title="Planes"
        description={
          canEdit
            ? "Catálogo de planes de Neuvi. Mientras el precio de lista esté por definir, cada cuenta se cobra con su precio pactado."
            : "Catálogo de planes de Neuvi. Solo un superadmin puede modificarlo."
        }
      />

      {plans.length === 0 ? (
        <EmptyState icon={Layers} title="Sin planes" description="El catálogo se crea con las migraciones de la base de datos." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {plans.map((p) => (
            <Card key={p.code} className="gap-0">
              <CardContent className="flex h-full flex-col">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold tracking-wide text-primary uppercase">{p.code === "CENTRO" ? "Centros" : "Independientes"}</p>
                    <h2 className="mt-0.5 text-lg font-bold text-brand-navy-deep">{p.name}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.active ? <Pill tone="teal">Disponible</Pill> : <Pill tone="gray">No disponible</Pill>}
                    {canEdit ? (
                      <PlanDialog
                        plan={{
                          code: p.code,
                          name: p.name,
                          description: p.description,
                          listPriceCents: p.listPriceCents,
                          perProfessional: p.perProfessional,
                          maxProfessionals: p.maxProfessionals,
                          active: p.active,
                        }}
                      />
                    ) : null}
                  </div>
                </div>
                {p.description ? <p className="mt-1.5 text-sm text-muted-foreground">{p.description}</p> : null}

                <div className="mt-4 rounded-xl bg-sky-wash px-4 py-3">
                  <p className="text-xl font-bold text-brand-navy-deep">
                    {p.listPriceCents == null ? "Por definir" : formatPEN(p.listPriceCents)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.listPriceCents == null ? "Precio de lista · se pacta por cuenta" : `al mes${p.perProfessional ? " por psicólogo activo" : ""}`}
                  </p>
                </div>

                <dl className="mt-4 grid gap-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Cobro por psicólogo activo</dt>
                    <dd>
                      {p.perProfessional ? (
                        <Check className="size-4 text-success" aria-label="Sí" />
                      ) : (
                        <Minus className="size-4 text-muted-foreground" aria-label="No" />
                      )}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Máximo de profesionales</dt>
                    <dd className="font-medium text-brand-navy-deep">{p.maxProfessionals ?? "Sin límite"}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t pt-2">
                    <dt className="text-muted-foreground">Cuentas con este plan</dt>
                    <dd className="font-medium text-brand-navy-deep tabular-nums">
                      {p.accounts}
                      <span className="ml-1 font-normal text-muted-foreground">
                        ({p.activeAccounts} activas · {p.trialAccounts} en prueba)
                      </span>
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
