import Link from "next/link";
import { CalendarPlus, Cake, IdCard, MessageCircle, Pencil, Phone, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PatientStatusBadge, Pill } from "@/components/common/status-badges";
import { ageFrom } from "@/lib/dates";
import { fullName } from "@/lib/format";
import { formatPhone, whatsappLink } from "@/lib/whatsapp";
import type { PatientDetail } from "../queries";
import { documentLabel } from "../utils";
import { PatientAvatar } from "./patient-avatar";

export function PatientHeader({ patient, orgName }: { patient: PatientDetail; orgName: string }) {
  const name = fullName(patient);
  const age = ageFrom(patient.birthDate);
  const doc = documentLabel(patient);
  // Saludo genérico: nunca se envía información clínica por WhatsApp.
  const wa = whatsappLink(patient.phone, `Hola ${patient.firstName}, te saludamos de ${orgName}.`);

  return (
    <div className="rounded-xl border bg-card p-4 shadow-xs sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <PatientAvatar name={name} className="size-12 text-base sm:size-14 sm:text-lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight text-brand-navy-deep sm:text-2xl">{name}</h1>
              <PatientStatusBadge status={patient.status} />
              {age !== null && age < 18 ? <Pill tone="amber">Menor de edad</Pill> : null}
            </div>
            <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
              <Meta icon={Cake} label="Edad">
                {age !== null ? `${age} ${age === 1 ? "año" : "años"}` : "Edad no registrada"}
              </Meta>
              <Meta icon={IdCard} label="Documento">
                {doc ?? "Sin documento"}
              </Meta>
              <Meta icon={Phone} label="Celular">
                {patient.phone ? (
                  wa ? (
                    <a href={wa} target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline">
                      {formatPhone(patient.phone)}
                    </a>
                  ) : (
                    formatPhone(patient.phone)
                  )
                ) : (
                  "Sin celular"
                )}
              </Meta>
              <Meta icon={Stethoscope} label="Psicólogo tratante">
                {patient.professional ? (
                  <span className="font-medium text-brand-navy">{patient.professional.name}</span>
                ) : (
                  <span className="italic">Sin psicólogo asignado</span>
                )}
              </Meta>
            </dl>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:shrink-0 lg:justify-end">
          {wa ? (
            <Button
              variant="outline"
              className="h-9 border-brand-teal/40 text-success hover:bg-success-soft hover:text-success"
              asChild
            >
              <a href={wa} target="_blank" rel="noopener noreferrer">
                <MessageCircle /> WhatsApp
              </a>
            </Button>
          ) : null}
          <Button variant="outline" className="h-9" asChild>
            <Link href={`/app/pacientes/${patient.id}/editar`}>
              <Pencil /> Editar
            </Link>
          </Button>
          <Button className="h-9" asChild>
            <Link href={`/app/agenda?nuevaCita=1&paciente=${patient.id}`}>
              <CalendarPlus /> Nueva cita
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function Meta({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <dt className="sr-only">{label}</dt>
      <Icon className="size-4 shrink-0 text-brand-sky" aria-hidden />
      <dd>{children}</dd>
    </div>
  );
}
