import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { isScopedToOwnPatients } from "@/lib/permissions";
import { todayKey } from "@/lib/dates";
import { AgendaBoard } from "@/features/agenda/components/agenda-board";
import { loadAgenda } from "@/features/agenda/queries";
import { parseDateKey, type AgendaQuery } from "@/features/agenda/lib";

export const metadata: Metadata = { title: "Agenda" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AgendaPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const sp = await searchParams;

  const fecha = parseDateKey(first(sp.fecha)) ?? todayKey();
  const vista = first(sp.vista) === "dia" ? "dia" : "semana";
  const requestedProfessional = first(sp.profesional) ?? "todos";

  const data = await loadAgenda(user, { fecha, profesional: requestedProfessional });

  const query: AgendaQuery = {
    fecha,
    vista,
    profesional: data.professionalFilter ?? "todos",
    canceladas: first(sp.canceladas) === "1",
  };

  // Contrato con otros módulos: /app/agenda?nuevaCita=1&paciente=<id>[&profesional=<id>&fecha=YYYY-MM-DD]
  const patientParam = first(sp.paciente);
  const professionalParam = first(sp.profesional);
  const initialCreate =
    first(sp.nuevaCita) === "1"
      ? {
          patientId: patientParam && data.patients.some((p) => p.id === patientParam) ? patientParam : undefined,
          professionalId:
            professionalParam && data.professionals.some((p) => p.id === professionalParam) ? professionalParam : undefined,
          date: fecha < data.today ? data.today : fecha,
        }
      : null;

  const citaParam = first(sp.cita);
  const initialSelectedId = citaParam && data.appointments.some((a) => a.id === citaParam) ? citaParam : null;

  return (
    <AgendaBoard
      query={query}
      today={data.today}
      nowMinutes={data.nowMinutes}
      weekLabel={data.weekLabel}
      days={data.days}
      appointments={data.appointments}
      professionals={data.professionals}
      rooms={data.rooms}
      patients={data.patients}
      professionalFilter={data.professionalFilter}
      canManageAll={data.canManageAll}
      isScoped={isScopedToOwnPatients(user)}
      isAdmin={user.role === "ADMIN"}
      currentUserId={user.id}
      defaultDuration={user.organization.defaultSessionMinutes}
      suggestedTime={data.suggestedTime}
      pendingReminders={data.pendingReminders}
      initialCreate={initialCreate}
      initialSelectedId={initialSelectedId}
    />
  );
}
