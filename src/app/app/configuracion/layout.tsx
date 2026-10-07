import { requireUser } from "@/lib/auth";
import { canManageSettings } from "@/lib/permissions";
import { SettingsTabs } from "@/features/configuracion/settings-tabs";

// Layout compacto de Configuración: solo una etiqueta de sección + pestañas. Cada página
// (General, Consultorios, Plantillas, Plan) pinta su propio <PageHeader>, así no se duplican títulos.
// La autorización por rol la hace cada página: General / Consultorios / Plantillas exigen ADMIN;
// Plan es visible para cualquier usuario (el banner de prueba enlaza ahí), pero solo el ADMIN lo activa.
export default async function ConfiguracionLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const isAdmin = canManageSettings(user);

  return (
    <div className="grid gap-6">
      {isAdmin ? (
        <div className="grid gap-2">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Configuración</p>
          <SettingsTabs isAdmin={isAdmin} />
        </div>
      ) : null}
      <div>{children}</div>
    </div>
  );
}
