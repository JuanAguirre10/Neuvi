import Link from "next/link";
import { formatDateTime } from "@/lib/dates";
import { SUBSCRIPTION_EVENT_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EventItem } from "../queries";
import { EventIcon } from "./badges";

const PLAN_SHORT = { INDIVIDUAL: "Individual", CENTRO: "Centro" } as const;

function planChange(e: Pick<EventItem, "type" | "fromPlan" | "toPlan">): string | null {
  if (e.type === "PLAN_CAMBIADO" && e.fromPlan && e.toPlan) return `${PLAN_SHORT[e.fromPlan]} → ${PLAN_SHORT[e.toPlan]}`;
  if ((e.type === "PLAN_ACTIVADO" || e.type === "ALTA") && e.toPlan) return `Plan ${PLAN_SHORT[e.toPlan]}`;
  return null;
}

/** Línea de tiempo de eventos de suscripción (resumen, actividad global e historial de una cuenta). */
export function EventList({
  events,
  showAccount = true,
  className,
}: {
  events: EventItem[];
  /** En el historial de una cuenta no hace falta repetir su nombre. */
  showAccount?: boolean;
  className?: string;
}) {
  return (
    <ol className={cn("grid", className)}>
      {events.map((e, i) => {
        const plan = planChange(e);
        const org = e.subscription.organization;
        return (
          <li key={e.id} className="relative flex gap-3 pb-5 last:pb-0">
            {i < events.length - 1 ? (
              <span aria-hidden className="absolute top-9 bottom-1 left-4 w-px -translate-x-1/2 bg-border" />
            ) : null}
            <EventIcon type={e.type} />
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm text-brand-navy-deep">
                <span className="font-medium">{SUBSCRIPTION_EVENT_LABEL[e.type]}</span>
                {showAccount ? (
                  <>
                    {" · "}
                    <Link href={`/admin/cuentas/${org.id}`} className="font-medium text-primary hover:underline">
                      {org.name}
                    </Link>
                  </>
                ) : null}
              </p>
              {plan || e.detail ? (
                <p className="mt-0.5 text-sm break-words text-muted-foreground">{[plan, e.detail].filter(Boolean).join(" · ")}</p>
              ) : null}
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatDateTime(e.createdAt)} · {e.actor?.name ?? "Registro del cliente / sistema"}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
