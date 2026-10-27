import type { Metadata } from "next";
import { requirePlatformAdmin } from "@/lib/platform-auth";
import { PLATFORM_ROLE_LABEL } from "@/lib/format";
import { AdminBrand, PrivacyNote } from "@/components/admin-shell/admin-brand";
import { AdminSidebarNav } from "@/components/admin-shell/admin-sidebar-nav";
import { AdminMobileNav } from "@/components/admin-shell/admin-mobile-nav";
import { AdminUserMenu } from "@/components/admin-shell/admin-user-menu";
import { adminNavFor } from "@/components/admin-shell/nav";

export const metadata: Metadata = {
  title: { template: "%s · Admin Neuvi", default: "Admin Neuvi" },
  robots: { index: false, follow: false },
};

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requirePlatformAdmin();
  const items = adminNavFor(admin.role);

  return (
    <div className="flex min-h-screen flex-1">
      {/* Sidebar escritorio */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-sidebar lg:flex">
        <div className="px-5 pt-5 pb-4">
          <AdminBrand priority />
        </div>
        <div className="mx-3 mb-4 rounded-xl border border-brand-sky/40 bg-sky-wash px-3 py-2.5">
          <p className="text-sm font-semibold text-brand-navy-deep">Suscripciones</p>
          <p className="text-xs text-muted-foreground">Cuentas de psicólogos y centros</p>
        </div>
        <div className="flex-1 overflow-y-auto px-3">
          <AdminSidebarNav items={items} />
        </div>
        <PrivacyNote className="border-t px-5 py-3" />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur sm:px-6">
          <AdminMobileNav items={items} />
          <AdminBrand className="lg:hidden" />
          <div className="flex-1" />
          <AdminUserMenu name={admin.name} email={admin.email} roleLabel={PLATFORM_ROLE_LABEL[admin.role]} />
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
        <PrivacyNote className="justify-center border-t px-4 py-3 lg:hidden" />
      </div>
    </div>
  );
}
