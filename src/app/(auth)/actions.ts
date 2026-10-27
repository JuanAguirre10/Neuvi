"use server";

import { redirect } from "next/navigation";
import { compare, hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession, subscriptionAllowsAccess } from "@/lib/auth";
import { createAdminSession } from "@/lib/platform-auth";
import { emailInUse } from "@/lib/accounts";
import { type ActionState, formToObject, fromZodError } from "@/lib/action-state";
import { SUSPENDED_MESSAGE, TRIAL_DAYS } from "@/features/configuracion/plans";

const loginSchema = z.object({
  email: z.email({ error: "Ingresa un correo válido." }).transform((v) => v.toLowerCase()),
  password: z.string({ error: "Ingresa tu contraseña." }).min(1, { error: "Ingresa tu contraseña." }),
});

// Hash fijo para comparar aunque el correo no exista (mismo tiempo de respuesta).
const DUMMY_HASH = "$2b$10$B3MoQ34375jMs8YE3nJDKuzZWZmThEsiresYaW/XyypcKc4sVY2fW";
const INVALID: ActionState = { ok: false, message: "Correo o contraseña incorrectos." };

/** Solo redirecciones internas del área que corresponde a la cuenta. */
function safeNext(value: FormDataEntryValue | null, area: "/app" | "/admin"): string {
  const v = typeof value === "string" ? value : "";
  if (area === "/admin") {
    const ok = v === "/admin" || (v.startsWith("/admin/") && !v.startsWith("/admin/login") && !v.startsWith("/admin/salir"));
    return ok ? v : "/admin";
  }
  return v.startsWith("/app") ? v : "/app";
}

/**
 * Ingreso único. El correo puede ser del personal de un consultorio (User -> /app) o del equipo
 * de Neuvi (PlatformAdmin -> /admin); cada uno conserva su propia cookie de sesión.
 * Un correo no puede estar en ambas tablas (ver emailInUse en @/lib/accounts).
 */
export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const { email, password } = parsed.data;

  const [admin, user] = await Promise.all([
    db.platformAdmin.findUnique({ where: { email }, select: { id: true, active: true, passwordHash: true } }),
    db.user.findUnique({
      where: { email },
      include: { organization: { select: { subscription: { select: { status: true } } } } },
    }),
  ]);
  const matches = await compare(password, (admin ?? user)?.passwordHash ?? DUMMY_HASH);

  if (admin) {
    if (!admin.active || !matches) return INVALID;
    await db.platformAdmin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
    await createAdminSession(admin.id);
    redirect(safeNext(formData.get("next"), "/admin"));
  }

  if (!user || !user.active || !matches) return INVALID;
  if (!subscriptionAllowsAccess(user.organization.subscription?.status)) return { ok: false, message: SUSPENDED_MESSAGE };

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user);
  redirect(safeNext(formData.get("next"), "/app"));
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

  if (await emailInUse(data.email)) {
    return { ok: false, message: "Ya existe una cuenta con ese correo.", fieldErrors: { email: ["Este correo ya está registrado."] } };
  }

  const passwordHash = await hash(data.password, 10);
  const isProfessional = data.orgType === "INDIVIDUAL" || data.attends === "on";

  const user = await db.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: data.orgName,
        type: data.orgType,
        phone: data.phone,
        email: data.email,
        subscription: {
          create: {
            planCode: data.orgType,
            status: "PRUEBA",
            trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
            events: { create: { type: "ALTA", toPlan: data.orgType, detail: "Registro con prueba gratuita" } },
          },
        },
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
        lastLoginAt: new Date(),
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
