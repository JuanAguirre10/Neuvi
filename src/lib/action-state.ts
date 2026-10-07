// Contrato común para Server Actions usadas con useActionState.
import type { ZodError } from "zod";

export type ActionState = {
  ok?: boolean;
  /** Mensaje general (se muestra como toast o alerta). */
  message?: string;
  /** Errores por campo: { email: ["Correo inválido"] } */
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialActionState: ActionState = {};

export function fromZodError(error: ZodError): ActionState {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { ok: false, message: "Revisa los campos marcados.", fieldErrors };
}

/** FormData -> objeto plano; los strings vacíos se convierten en undefined. */
export function formToObject(formData: FormData): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string") continue;
    const v = value.trim();
    out[key] = v === "" ? undefined : v;
  }
  return out;
}
