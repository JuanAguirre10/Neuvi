import { CalendarCheck2, CalendarX2, Clock, DoorOpen, HeartPulse, Stethoscope, UserRoundCheck, Users } from "lucide-react";
import { formatLongDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { getAccountUsage } from "../queries";
import { daysSince, formatRate, lastAccessLabel } from "../format";

const int = new Intl.NumberFormat("es-PE");

function UsageTile({
  icon: Icon,
  label,
  value,
  hint,
  warn,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  hint?: string;
  warn?: boolean;
}) {
  return (
    <div className={cn("rounded-xl border bg-card p-4 shadow-xs", warn && "border-warning/40")}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className={cn("size-4 shrink-0", warn ? "text-warning" : "text-primary")} aria-hidden />
      </div>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-brand-navy-deep">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Uso de la cuenta. Solo conteos: el equipo de Neuvi no ve pacientes ni historias. */
export async function UsageTab({ orgId, lastLoginAt }: { orgId: string; lastLoginAt: Date | null }) {
  const u = await getAccountUsage(orgId);
  const highNoShow = u.noShowRate != null && u.noShowRate >= 0.25;
  const staleAccess = daysSince(lastLoginAt) > 14;

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
        <UsageTile icon={Stethoscope} label="Profesionales activos" value={int.format(u.professionals)} hint={`${int.format(u.activeUsers)} usuarios activos en total`} />
        <UsageTile icon={UserRoundCheck} label="Recepción" value={int.format(u.reception)} hint="Usuarios de recepción activos" />
        <UsageTile icon={Users} label="Pacientes activos" value={int.format(u.activePatients)} hint={`${int.format(u.totalPatients)} registrados en total`} />
        <UsageTile icon={DoorOpen} label="Consultorios" value={int.format(u.rooms)} hint="Ambientes activos" />
        <UsageTile icon={CalendarCheck2} label="Citas (30 días)" value={int.format(u.appointments30)} hint={`${int.format(u.canceled30)} canceladas`} />
        <UsageTile icon={HeartPulse} label="Sesiones atendidas" value={int.format(u.attended30)} hint="Últimos 30 días" />
        <UsageTile
          icon={CalendarX2}
          label="Tasa de inasistencia"
          value={formatRate(u.noShowRate)}
          hint={`${int.format(u.noShow30)} no asistió de ${int.format(u.attended30 + u.noShow30)} citas cerradas`}
          warn={highNoShow}
        />
        <UsageTile
          icon={Clock}
          label="Último acceso"
          value={lastAccessLabel(lastLoginAt)}
          hint={lastLoginAt ? formatLongDate(lastLoginAt) : "Nadie del equipo ingresó aún"}
          warn={staleAccess}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Las métricas son conteos agregados. Neuvi no accede a datos personales ni clínicos de los pacientes de la cuenta.
      </p>
    </div>
  );
}
