"use client";

import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { adminLogoutAction } from "@/features/admin/auth-actions";
import { initials } from "@/lib/format";

export function AdminUserMenu({ name, email, roleLabel }: { name: string; email: string; roleLabel: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-lg p-1 pr-2 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50">
        <Avatar className="size-8">
          <AvatarFallback className="bg-brand-navy text-xs font-semibold text-white">{initials(name)}</AvatarFallback>
        </Avatar>
        <span className="hidden min-w-0 sm:block">
          <span className="block max-w-40 truncate text-sm font-medium text-brand-navy-deep">{name}</span>
          <span className="block text-xs text-muted-foreground">{roleLabel}</span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
          <p className="mt-1 text-xs text-primary">{roleLabel} · Equipo Neuvi</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <form action={adminLogoutAction}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <LogOut /> Cerrar sesión
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
