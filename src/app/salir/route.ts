// Limpia una cookie de sesión que ya no corresponde a un usuario activo (usuario desactivado o
// eliminado) y manda al login. Sin esto, /app -> /login -> /app entraría en un bucle de redirecciones,
// porque el proxy solo verifica la firma del JWT, no la base de datos.
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";

export function GET(request: NextRequest) {
  const url = new URL("/login", request.url);
  if (request.nextUrl.searchParams.get("motivo") === "suspendida") url.searchParams.set("motivo", "suspendida");
  const response = NextResponse.redirect(url);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
