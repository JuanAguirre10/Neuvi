import type { ClinicalRecord } from "@prisma/client";
import { CheckCircle2, CircleAlert, FileSignature, NotebookPen, ShieldAlert } from "lucide-react";
import { RiskBadge } from "@/components/common/status-badges";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { RECORD_SECTIONS } from "../fields";

function Block({ label, value, className }: { label: string; value: string | null; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-1 text-sm leading-relaxed break-words whitespace-pre-wrap",
          value ? "text-brand-navy-deep" : "text-muted-foreground/70 italic",
        )}
      >
        {value || "Sin registrar"}
      </dd>
    </div>
  );
}

/** Vista de la ficha de ingreso, organizada por secciones. Solo se renderiza para el psicólogo tratante. */
export function ClinicalRecordView({ record }: { record: ClinicalRecord | null }) {
  if (!record) {
    return (
      <div className="flex flex-col items-center px-6 py-10 text-center">
        <span className="mb-3 flex size-11 items-center justify-center rounded-full bg-secondary text-primary">
          <NotebookPen className="size-5" />
        </span>
        <p className="font-semibold text-brand-navy-deep">Ficha de ingreso pendiente</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Registra el motivo de consulta, antecedentes, examen mental, impresión diagnóstica, plan terapéutico, nivel de
          riesgo y el consentimiento informado.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {RECORD_SECTIONS.map((section) => {
        const Icon = section.icon;
        return (
          <div key={section.id} className="grid gap-3 px-4 py-4 sm:px-5 lg:grid-cols-[200px_1fr] lg:gap-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
              <Icon className="size-4 text-brand-blue" />
              {section.title}
            </h3>
            <dl className={cn("grid gap-4", section.fields.length > 2 && "md:grid-cols-2")}>
              {section.fields.map((f) => (
                <Block key={f.name} label={f.label} value={record[f.name]} />
              ))}
            </dl>
          </div>
        );
      })}

      <div
        className={cn(
          "grid gap-3 px-4 py-4 sm:px-5 lg:grid-cols-[200px_1fr] lg:gap-6",
          record.riskLevel === "ALTO" && "bg-danger-soft/50",
        )}
      >
        <h3 className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
          <ShieldAlert className={cn("size-4", record.riskLevel === "ALTO" ? "text-destructive" : "text-brand-blue")} />
          Riesgo
        </h3>
        <div className="grid gap-2">
          <div>
            <RiskBadge level={record.riskLevel} />
          </div>
          {record.riskNotes ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-brand-navy-deep">{record.riskNotes}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 px-4 py-4 sm:px-5 lg:grid-cols-[200px_1fr] lg:gap-6">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
          <FileSignature className="size-4 text-brand-blue" />
          Consentimiento informado
        </h3>
        {record.informedConsent ? (
          <p className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
            <CheckCircle2 className="size-4" />
            Firmado{record.informedConsentDate ? ` el ${formatDate(record.informedConsentDate)}` : ""}
          </p>
        ) : (
          <p className="inline-flex items-center gap-1.5 text-sm font-medium text-warning">
            <CircleAlert className="size-4" />
            Pendiente de firma
          </p>
        )}
      </div>
    </div>
  );
}
