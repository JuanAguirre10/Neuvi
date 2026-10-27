"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AdminSidebarNav } from "./admin-sidebar-nav";
import { AdminBrand, PrivacyNote } from "./admin-brand";
import type { AdminNavItem } from "./nav";

export function AdminMobileNav({ items }: { items: AdminNavItem[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menú">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-72 flex-col p-0">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="sr-only">Menú del panel</SheetTitle>
          <AdminBrand />
        </SheetHeader>
        <div className="flex-1 p-3">
          <AdminSidebarNav items={items} onNavigate={() => setOpen(false)} />
        </div>
        <PrivacyNote className="border-t px-5 py-3" />
      </SheetContent>
    </Sheet>
  );
}
