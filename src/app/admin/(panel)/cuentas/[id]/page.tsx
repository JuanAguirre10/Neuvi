import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { History } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { requirePlatformAdmin } from "@/lib/platform-auth";
import { capabilitiesOf } from "@/lib/platform-auth/permissions";
import { BackLink } from "@/features/pacientes/components/back-link";
import { trialExtensionBase } from "@/features/admin/billing";
import { firstParam, type SearchParamValue } from "@/features/admin/filters";
import { getAccount, getAccountEvents, getPlanOptions } from "@/features/admin/queries";
import { AccountActions } from "@/features/admin/components/account-actions";
import { AccountHeader } from "@/features/admin/components/account-header";
import { AccountTabs, parseAccountTab } from "@/features/admin/components/account-tabs";
import { BillingTab } from "@/features/admin/components/billing-tab";
import { EventList } from "@/features/admin/components/event-list";
import { NotesTab } from "@/features/admin/components/notes-tab";
import { TeamTab } from "@/features/admin/components/team-tab";
import { UsageTab } from "@/features/admin/components/usage-tab";

export const metadata: Metadata = { title: "Cuenta" };

async function HistoryTab({ subscriptionId }: { subscriptionId: string }) {
  const events = await getAccountEvents(subscriptionId);
  if (events.length === 0) return <EmptyState icon={History} title="Sin movimientos" description="Aquí verás altas, cambios de plan y suspensiones." />;
  return (
    <div className="rounded-xl border bg-card p-4 shadow-xs sm:p-5">
      <EventList events={events} showAccount={false} />
    </div>
  );
}

export default async function CuentaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, SearchParamValue>>;
}) {
  const admin = await requirePlatformAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const tab = parseAccountTab(firstParam(sp.tab));

  const [account, plans] = await Promise.all([getAccount(id), getPlanOptions()]);
  if (!account) notFound();

  const can = capabilitiesOf(admin.role);
  const sub = account.subscription;

  return (
    <>
      <BackLink href="/admin/cuentas">Cuentas</BackLink>
      <AccountHeader
        account={account}
        actions={
          <AccountActions
            orgId={account.id}
            orgName={account.name}
            status={sub.status}
            planCode={sub.planCode}
            priceCents={sub.priceCents}
            billingCycle={sub.billingCycle}
            trialEndsAt={sub.trialEndsAt.toISOString()}
            trialExtensionBase={trialExtensionBase(sub.trialEndsAt).toISOString()}
            professionals={account.professionals}
            hasActivated={account.activatedAt !== null}
            plans={plans}
            can={can}
          />
        }
      />
      <AccountTabs orgId={account.id} active={tab} />

      {tab === "resumen" ? <UsageTab orgId={account.id} lastLoginAt={account.lastLoginAt} /> : null}
      {tab === "equipo" ? <TeamTab orgId={account.id} /> : null}
      {tab === "facturacion" ? (
        <BillingTab orgId={account.id} subscriptionId={sub.id} status={sub.status} canBill={can.billing} />
      ) : null}
      {tab === "historial" ? <HistoryTab subscriptionId={sub.id} /> : null}
      {tab === "notas" ? <NotesTab orgId={account.id} canAdd={can.notes} /> : null}
    </>
  );
}
