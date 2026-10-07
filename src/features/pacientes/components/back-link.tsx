import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
    >
      <ChevronLeft className="size-4" />
      {children}
    </Link>
  );
}
