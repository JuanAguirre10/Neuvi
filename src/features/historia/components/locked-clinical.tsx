import Link from "next/link";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Estado bloqueado de la historia clínica para quien no es el psicólogo tratante
 * (recepción, administradores que no atienden al paciente, otros psicólogos).
 */
export function LockedClinical({
  patientId,
  professionalName,
  isTreatingButNotProfessional,
  canReassign,
}: {
  patientId: string;
  professionalName: string | null;
  /** El usuario figura como tratante pero su cuenta no está marcada como profesional que atiende. */
  isTreatingButNotProfessional: boolean;
  /** ADMIN / RECEPCION pueden cambiar el psicólogo tratante desde "Editar". */
  canReassign: boolean;
}) {
  let reason: React.ReactNode;
  if (isTreatingButNotProfessional) {
    reason = (
      <>
        Figuras como psicólogo tratante, pero tu usuario no está marcado como profesional que atiende pacientes. Pide al
        administrador que lo active en <strong>Equipo</strong>.
      </>
    );
  } else if (!professionalName) {
    reason = (
      <>
        Este paciente aún no tiene psicólogo tratante. Cuando se le asigne uno, solo esa persona podrá ver y registrar
        la historia clínica.
      </>
    );
  } else {
    reason = (
      <>
        Solo <strong className="text-brand-navy-deep">{professionalName}</strong>, psicólogo(a) tratante, puede ver y
        registrar la ficha de ingreso y las notas de evolución de este paciente.
      </>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center rounded-xl border bg-card px-6 py-12 text-center shadow-xs">
      <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-secondary text-primary ring-8 ring-secondary/40">
        <LockKeyhole className="size-6" />
      </span>
      <h2 className="text-lg font-semibold text-brand-navy-deep">Historia clínica protegida</h2>
      <p className="mt-2 max-w-lg text-sm text-muted-foreground">{reason}</p>
      <div className="mt-5 flex max-w-lg items-start gap-2.5 rounded-lg bg-muted/60 px-4 py-3 text-left text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
        <p>
          Los datos de salud mental son datos sensibles (Ley N.º 29733). El personal administrativo trabaja con la ficha
          administrativa, las citas y los pagos; la información clínica nunca se muestra en listas, reportes ni mensajes
          de WhatsApp.
        </p>
      </div>
      {canReassign && !isTreatingButNotProfessional ? (
        <Button variant="outline" size="sm" className="mt-5" asChild>
          <Link href={`/app/pacientes/${patientId}/editar`}>
            {professionalName ? "Cambiar psicólogo tratante" : "Asignar psicólogo tratante"}
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
