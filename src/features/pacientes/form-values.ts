// Valores del formulario de paciente. Vive fuera del componente cliente para que las páginas
// (server components) puedan usar EMPTY_PATIENT_VALUES y toPatientFormValues.
import type { Patient } from "@prisma/client";
import { dateOnlyToKey } from "@/lib/dates";
import { NONE } from "./options";

export type PatientFormValues = {
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  birthDate: string;
  sex: string;
  maritalStatus: string;
  educationLevel: string;
  occupation: string;
  phone: string;
  email: string;
  address: string;
  district: string;
  guardianName: string;
  guardianRelationship: string;
  guardianPhone: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  referralSource: string;
  professionalId: string;
  status: string;
  adminNotes: string;
};

export const EMPTY_PATIENT_VALUES: PatientFormValues = {
  firstName: "",
  lastName: "",
  documentType: "DNI",
  documentNumber: "",
  birthDate: "",
  sex: NONE,
  maritalStatus: NONE,
  educationLevel: NONE,
  occupation: "",
  phone: "",
  email: "",
  address: "",
  district: "",
  guardianName: "",
  guardianRelationship: "",
  guardianPhone: "",
  emergencyContactName: "",
  emergencyContactRelationship: "",
  emergencyContactPhone: "",
  referralSource: "",
  professionalId: NONE,
  status: "ACTIVO",
  adminNotes: "",
};

/** Paciente de la BD -> valores iniciales del formulario de edición. */
export function toPatientFormValues(p: Patient): PatientFormValues {
  return {
    firstName: p.firstName,
    lastName: p.lastName,
    documentType: p.documentType,
    documentNumber: p.documentNumber ?? "",
    birthDate: dateOnlyToKey(p.birthDate),
    sex: p.sex ?? NONE,
    maritalStatus: p.maritalStatus ?? NONE,
    educationLevel: p.educationLevel ?? NONE,
    occupation: p.occupation ?? "",
    phone: p.phone ?? "",
    email: p.email ?? "",
    address: p.address ?? "",
    district: p.district ?? "",
    guardianName: p.guardianName ?? "",
    guardianRelationship: p.guardianRelationship ?? "",
    guardianPhone: p.guardianPhone ?? "",
    emergencyContactName: p.emergencyContactName ?? "",
    emergencyContactRelationship: p.emergencyContactRelationship ?? "",
    emergencyContactPhone: p.emergencyContactPhone ?? "",
    referralSource: p.referralSource ?? "",
    professionalId: p.professionalId ?? NONE,
    status: p.status,
    adminNotes: p.adminNotes ?? "",
  };
}
