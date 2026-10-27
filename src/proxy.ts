// Chequeo optimista de sesión (Next.js 16: "proxy" reemplaza a "middleware").
// La autorización real se hace en cada página / server action con requireUser() o requirePlatformAdmin().
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, decryptSession } from "@/lib/auth/session";
import { ADMIN_SESSION_COOKIE, decryptAdminSession } from "@/lib/platform-auth/session";

// Rutas de /admin que no exigen sesión de admin (/admin/login solo redirige al ingreso único /login).
const ADMIN_PUBLIC = new Set(["/admin/login", "/admin/salir"]);

async function adminProxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const admin = await decryptAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);

  if (!ADMIN_PUBLIC.has(pathname) && !admin) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (pathname === "/admin/login" && admin) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }
  return NextResponse.next();
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Panel del equipo de Neuvi: cookie propia, independiente de la de los consultorios.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return adminProxy(request);

  const session = await decryptSession(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname.startsWith("/app") && !session) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  if ((pathname === "/login" || pathname === "/registro") && session) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/login", "/registro", "/admin/:path*"],
};
