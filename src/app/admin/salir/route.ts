// Borra una cookie de admin que ya no corresponde a un miembro activo del equipo (desactivado o
// eliminado) y manda al ingreso único. Sin esto, /admin -> /login -> /admin entraría en un bucle,
// porque el proxy solo verifica la firma del JWT.
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, adminCookieOptions } from "@/lib/platform-auth/session";

export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.delete({ name: ADMIN_SESSION_COOKIE, path: adminCookieOptions.path });
  return response;
}
