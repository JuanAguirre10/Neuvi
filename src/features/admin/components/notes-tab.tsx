import { NotebookText } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { formatDateTime } from "@/lib/dates";
import { initials } from "@/lib/format";
import { getAccountNotes } from "../queries";
import { NoteForm } from "./note-form";

export async function NotesTab({ orgId, canAdd }: { orgId: string; canAdd: boolean }) {
  const notes = await getAccountNotes(orgId);
  return (
    <div className="grid gap-4">
      {canAdd ? <NoteForm orgId={orgId} /> : null}
      {notes.length === 0 ? (
        <EmptyState icon={NotebookText} title="Sin notas" description="Registra acuerdos, llamadas o pedidos de la cuenta para el resto del equipo." />
      ) : (
        <ul className="grid gap-3">
          {notes.map((n) => (
            <li key={n.id} className="flex gap-3 rounded-xl border bg-card p-4 shadow-xs">
              <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-navy text-xs font-semibold text-white">
                {initials(n.author?.name ?? "Neuvi")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-brand-navy">{n.author?.name ?? "Miembro eliminado"}</span> · {formatDateTime(n.createdAt)}
                </p>
                <p className="mt-1 text-sm whitespace-pre-line break-words text-brand-navy-deep">{n.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
