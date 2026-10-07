// Datos serializables que el servidor entrega a los componentes cliente de la agenda.
// Las etiquetas de fecha se calculan en el servidor para evitar diferencias de ICU
// entre Node y el navegador (errores de hidratación).
import type { AppointmentStatus, Modality } from "@prisma/client";

export type AgendaProfessional = {
  id: string;
  name: string;
  color: string;
  specialty: string | null;
};

export type AgendaRoom = { id: string; name: string };

export type AgendaPatientOption = {
  id: string;
  name: string;
  documentNumber: string | null;
  /** Psicólogo tratante: las citas del paciente se agendan con él. */
  professionalId: string | null;
  professionalName: string | null;
  status: "ACTIVO" | "EN_PAUSA";
  /** Paquete activo con sesiones libres del que se descontaría una nueva cita. */
  freePackage: { name: string; free: number } | null;
};

export type AgendaAppointment = {
  id: string;
  /** Día en Lima "YYYY-MM-DD". */
  dateKey: string;
  /** "lunes, 5 de octubre" */
  dateLabel: string;
  start: string;
  end: string;
  startMin: number;
  endMin: number;
  durationMin: number;
  status: AppointmentStatus;
  modality: Modality;
  notes: string | null;
  cancelReason: string | null;
  /** "5 oct. 14:32" si ya se envió el recordatorio. */
  reminderSentLabel: string | null;
  patient: {
    id: string;
    name: string;
    phoneLabel: string | null;
    /** Psicólogo tratante actual (puede no ser el profesional de la cita si el paciente se reasignó). */
    treatingId: string | null;
  };
  professional: { id: string; name: string; color: string };
  room: AgendaRoom | null;
  package: { id: string; name: string; used: number; total: number; remaining: number } | null;
  /** El usuario puede abrir la ficha del paciente (el psicólogo solo ve la de sus pacientes). */
  canOpenPatient: boolean;
  /** Enlace wa.me con el recordatorio prellenado (null si no aplica o no hay celular válido). */
  whatsappUrl: string | null;
  hasValidPhone: boolean;
  /** El usuario es el psicólogo tratante (puede registrar la nota de evolución). */
  canWriteNote: boolean;
  hasNote: boolean;
  canDelete: boolean;
  /** La cita es de un día posterior a hoy (no se puede marcar como atendida). */
  isFutureDay: boolean;
};

export type AgendaDay = {
  key: string;
  /** "lun" */
  weekdayShort: string;
  /** "28" */
  dayNumber: string;
  /** "lunes, 28 de setiembre" */
  longLabel: string;
  isToday: boolean;
};

export type ReminderItem = {
  id: string;
  start: string;
  end: string;
  status: AppointmentStatus;
  patient: { id: string; name: string; phoneLabel: string | null };
  professional: { name: string; color: string };
  room: string | null;
  whatsappUrl: string | null;
  reminderSentLabel: string | null;
};

export type ReminderGroup = {
  key: string;
  title: string;
  subtitle: string;
  items: ReminderItem[];
};
