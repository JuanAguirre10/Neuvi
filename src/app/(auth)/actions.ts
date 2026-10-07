"use server";

import { redirect } from "next/navigation";
import { compare, hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";
import { type ActionState, formToObject, fromZodError } from "@/lib/action-state";

const TRIAL_DAYS = 7;

const loginSchema = z.object({
  email: z.email({ error: "Ingresa un correo válido." }).transform((v) => v.toLowerCase()),
  password: z.string({ error: "Ingresa tu contraseña." }).min(1, { error: "Ingresa tu contraseña." }),
});

/** Solo permite redirecciones internas del panel. */
function safeNext(value: FormDataEntryValue | null): string {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/app") ? v : "/app";
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  const valid = user && user.active && (await compare(parsed.data.password, user.passwordHash));
  if (!valid) return { ok: false, message: "Correo o contraseña incorrectos." };

  await createSession(user);
  redirect(safeNext(formData.get("next")));
}

const registerSchema = z.object({
  orgType: z.enum(["INDIVIDUAL", "CENTRO"], { error: "Elige el tipo de cuenta." }),
  orgName: z
    .string({ error: "Ingresa el nombre de tu consultorio o centro." })
    .min(2, { error: "Ingresa el nombre de tu consultorio o centro." })
    .max(120),
  name: z.string({ error: "Ingresa tu nombre completo." }).min(3, { error: "Ingresa tu nombre completo." }).max(120),
  email: z.email({ error: "Ingresa un correo válido." }).transform((v) => v.toLowerCase()),
  phone: z
    .string({ error: "Ingresa tu celular." })
    .regex(/^\+?[\d\s-]{9,15}$/, { error: "Ingresa un celular válido (9 dígitos)." }),
  password: z.string({ error: "Crea una contraseña." }).min(8, { error: "Mínimo 8 caracteres." }),
  attends: z.string().optional(),
  consent: z.literal("on", { error: "Debes aceptar el tratamiento de datos para continuar." }),
});

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const data = parsed.data;

  const exists = await db.user.findUnique({ where: { email: data.email }, select: { id: true } });
  if (exists) {
    return { ok: false, message: "Ya existe una cuenta con ese correo.", fieldErrors: { email: ["Este correo ya está registrado."] } };
  }

  const passwordHash = await hash(data.password, 10);
  const isProfessional = data.orgType === "INDIVIDUAL" || data.attends === "on";

  const user = await db.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: data.orgName,
        type: data.orgType,
        plan: "PRUEBA",
        trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
        phone: data.phone,
        email: data.email,
      },
    });
    return tx.user.create({
      data: {
        organizationId: org.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        passwordHash,
        role: "ADMIN",
        isProfessional,
      },
    });
  });

  await createSession(user);
  redirect("/app?bienvenida=1");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
