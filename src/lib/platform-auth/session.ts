// Cookie de sesión del equipo de Neuvi (/admin). Separada de la sesión de los consultorios:
// otro nombre de cookie, otro payload ({ adminId, scope: "platform" }) y otra audiencia en el JWT,
// así una cookie de un consultorio nunca pasa como sesión de admin (ni al revés).
// Sin acceso a BD para poder usarse desde src/proxy.ts.
import { SignJWT, jwtVerify } from "jose";

export const ADMIN_SESSION_COOKIE = "neuvi_admin_session";
export const ADMIN_SCOPE = "platform";
const ADMIN_AUDIENCE = "neuvi:platform";
const SESSION_HOURS = 12;

export type AdminSessionPayload = { adminId: string };

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET no está configurado (mínimo 32 caracteres).");
  }
  return new TextEncoder().encode(secret);
}

export async function encryptAdminSession({ adminId }: AdminSessionPayload): Promise<string> {
  return new SignJWT({ adminId, scope: ADMIN_SCOPE })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(ADMIN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secretKey());
}

export async function decryptAdminSession(token: string | undefined): Promise<AdminSessionPayload | null> {
  if (!token) return null;
  try {
    // Sin la audiencia de plataforma (p. ej. un token de consultorio) jwtVerify falla.
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"], audience: ADMIN_AUDIENCE });
    if (payload.scope !== ADMIN_SCOPE || typeof payload.adminId !== "string" || !payload.adminId) return null;
    return { adminId: payload.adminId };
  } catch {
    return null;
  }
}

/** La cookie solo viaja a /admin: el panel de los consultorios nunca la recibe. */
export const adminCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/admin",
  maxAge: SESSION_HOURS * 60 * 60,
};
