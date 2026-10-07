import { ArrowRight, History } from "lucide-react";
import { Pill } from "@/components/common/status-badges";
import { formatDateTime } from "@/lib/dates";
import type { AssignmentEntry } from "@/lib/domain/assignments";
import { Panel } from "./info";

function Name({ user }: { user: { name: string } | null }) {
  return user ? (
    <span className="font-medium break-words text-brand-navy-deep">{user.name}</span>
  ) : (
    <span className="text-muted-foreground italic">Sin asignar</span>
  );
}

/**
 * Bitácora de cambios de psicólogo tratante (más reciente primero).
 * Solo datos administrativos: la ve cualquiera que pueda abrir la ficha.
 */
export function AssignmentHistoryPanel({ entries }: { entries: AssignmentEntry[] }) {
  return (
    <Panel title="Psicólogo tratante" icon={History} bodyClassName="p-0">
      {entries.length ? (
        <ol className="divide-y">
          {entries.map((entry, i) => (
            <li key={entry.id} className="grid gap-1 px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm">
                <span className="sr-only">De</span>
                <Name user={entry.fromUser} />
                <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="sr-only">a</span>
                <Name user={entry.toUser} />
                {i === 0 ? <Pill tone="blue">Actual</Pill> : null}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(entry.createdAt)}
                {entry.changedBy ? ` · por ${entry.changedBy.name}` : ""}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="px-4 py-4 text-sm text-muted-foreground">Sin cambios registrados.</p>
      )}
      <p className="border-t bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
        Cada cambio queda registrado. Solo el psicólogo tratante accede a la historia clínica.
      </p>
    </Panel>
  );
}
