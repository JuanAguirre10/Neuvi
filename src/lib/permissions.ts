// Reglas de acceso por rol. Centralizadas aquí para que todas las pantallas apliquen lo mismo.
//
// | Recurso                    | ADMIN            | RECEPCION        | PSICOLOGO                 |
// |----------------------------|------------------|------------------|---------------------------|
// | Agenda                     | toda             | toda             | solo la suya              |
// | Pacientes (datos admin.)   | todos            | todos            | solo los suyos            |
// | Historia clínica / notas   | solo si es el tratante (isProfessional)  | solo sus pacientes |
// | Paquetes y pagos           | sí               | sí               | ver (sus pacientes)       |
// | Caja, reportes             | sí               | caja: sí         | no                        |
// | Equipo, configuración      | sí               | no               | no                        |
//
// Regla de oro: TODA consulta filtra por organizationId del usuario actual; nunca confiar
// en un organizationId que venga del cliente.
//
// Como el tratante ve toda la historia clínica, cambiar el tratante pasa por
// src/lib/domain/assignments.ts: nadie se asigna a sí mismo un paciente con historia de otro
// profesional, y cada cambio queda en la bitácora (PatientAssignment). Las citas se agendan
// solo con el tratante del paciente.
import type { Prisma } from "@prisma/client";
import type { CurrentUser } from "@/lib/auth";

type U = Pick<CurrentUser, "id" | "role" | "isProfessional" | "organizationId">;

/** El usuario ve solo lo suyo (psicólogo de un centro). */
export function isScopedToOwnPatients(user: U): boolean {
  return user.role === "PSICOLOGO";
}

/** Filtro de pacientes visibles para el usuario. */
export function patientScope(user: U): Prisma.PatientWhereInput {
  return {
    organizationId: user.organizationId,
    ...(isScopedToOwnPatients(user) ? { professionalId: user.id } : {}),
  };
}

/** Filtro de citas visibles para el usuario. */
export function appointmentScope(user: U): Prisma.AppointmentWhereInput {
  return {
    organizationId: user.organizationId,
    ...(isScopedToOwnPatients(user) ? { professionalId: user.id } : {}),
  };
}

/** Filtro de paquetes visibles para el usuario. */
export function packageScope(user: U): Prisma.PackageWhereInput {
  return {
    organizationId: user.organizationId,
    ...(isScopedToOwnPatients(user) ? { patient: { professionalId: user.id } } : {}),
  };
}

/** Historia clínica y notas de evolución: solo el psicólogo tratante. */
export function canViewClinical(user: U, patient: { professionalId: string | null }): boolean {
  return user.isProfessional && patient.professionalId === user.id;
}

/** Registrar paquetes y pagos. */
export function canManagePayments(user: U): boolean {
  return user.role === "ADMIN" || user.role === "RECEPCION";
}

/** Ver la caja consolidada. */
export function canViewCashbox(user: U): boolean {
  return user.role === "ADMIN" || user.role === "RECEPCION";
}

export function canViewReports(user: U): boolean {
  return user.role === "ADMIN";
}

export function canManageTeam(user: U): boolean {
  return user.role === "ADMIN";
}

export function canManageSettings(user: U): boolean {
  return user.role === "ADMIN";
}

/** Crear / editar / reprogramar citas de otros profesionales. */
export function canManageAllAppointments(user: U): boolean {
  return user.role === "ADMIN" || user.role === "RECEPCION";
}
