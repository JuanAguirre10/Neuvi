"use server";

import { redirect } from "next/navigation";
import { destroyAdminSession } from "@/lib/platform-auth";

// El ingreso del equipo de Neuvi es el mismo de los consultorios (loginAction en src/app/(auth)/actions.ts).
export async function adminLogoutAction() {
  await destroyAdminSession();
  redirect("/login");
}
