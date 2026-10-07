import { requireUser } from "@/lib/auth";
import { Logo } from "@/components/brand/logo";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { MobileNav } from "@/components/shell/mobile-nav";
import { UserMenu } from "@/components/shell/user-menu";
import { TrialBanner } from "@/components/shell/trial-banner";
import { navFor } from "@/components/shell/nav";
import { ORG_TYPE_LABEL, PLAN_LABEL, ROLE_LABEL } from "@/lib/format";
import { canManageSettings } from "@/lib/permissions";
import { countPendingRenewals } from "@/features/renovaciones/queries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const org = user.organization;
  const items = navFor(user.role, org.type);
  const pendingRenewals = await countPendingRenewals(user);
  const badges = pendingRenewals > 0 ? { "/app/renovaciones": pendingRenewals } : undefined;
  const roleLabel = user.isProfessional && user.role === "ADMIN" && org.type === "INDIVIDUAL" ? "Psicólogo(a)" : ROLE_LABEL[user.role];

  return (
    <div className="flex min-h-screen flex-col">
      {org.plan === "PRUEBA" ? <TrialBanner trialEndsAt={org.trialEndsAt} /> : null}
      <div className="flex flex-1">
        {/* Sidebar escritorio */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-sidebar lg:flex">
          <div className="px-5 pt-5 pb-4">
            <Logo className="h-8" priority />
          </div>
          <div className="mx-3 mb-4 rounded-lg border bg-muted/50 px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-brand-navy-deep">{org.name}</p>
            <p className="text-xs text-muted-foreground">
              {ORG_TYPE_LABEL[org.type]} · {PLAN_LABEL[org.plan]}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto px-3">
            <SidebarNav items={items} badges={badges} />
          </div>
          <div className="border-t px-5 py-3 text-[11px] text-muted-foreground">
            Datos clínicos protegidos · Ley N.º 29733
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur sm:px-6">
            <MobileNav items={items} badges={badges} orgName={org.name} />
            <div className="lg:hidden">
              <Logo variant="mark" className="h-7" />
            </div>
            <div className="flex-1" />
            <UserMenu name={user.name} email={user.email} roleLabel={roleLabel} canSettings={canManageSettings(user)} />
          </header>
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
