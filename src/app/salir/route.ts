// Limpia una cookie de sesión que ya no corresponde a un usuario activo (usuario desactivado o
// eliminado) y manda al login. Sin esto, /app -> /login -> /app entraría en un bucle de redirecciones,
// porque el proxy solo verifica la firma del JWT, no la base de datos.
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";

export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
