import { redirect } from "next/navigation";

// El ingreso es único para todos en /login; esta ruta se mantiene para enlaces antiguos.
export default async function AdminLoginRedirect({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  redirect(`/login?next=${encodeURIComponent(next?.startsWith("/admin") ? next : "/admin")}`);
}
