import { requireRole } from "@/lib/auth";
import { formatDate, formatTime } from "@/lib/dates";
import { PAYMENT_METHOD_LABEL, fullName } from "@/lib/format";
import { resolvePeriod } from "@/features/caja/period";
import { getPayments } from "@/features/caja/queries";

// Exporta a CSV los pagos del periodo (mismos filtros que /app/pagos). Solo ADMIN / RECEPCION.

function csvCell(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  // Evita inyección de fórmulas al abrir en Excel.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export async function GET(request: Request) {
  const user = await requireRole("ADMIN", "RECEPCION");
  const url = new URL(request.url);
  const period = resolvePeriod({
    periodo: url.searchParams.get("periodo") ?? undefined,
    desde: url.searchParams.get("desde") ?? undefined,
    hasta: url.searchParams.get("hasta") ?? undefined,
  });

  const payments = await getPayments(user.organizationId, period.start, period.end);

  const header = ["Fecha", "Hora", "Paciente", "Paquete", "Método", "Monto (S/)", "N.º operación", "Registrado por", "Notas"];
  const rows = payments.map((p) => [
    formatDate(p.paidAt),
    formatTime(p.paidAt),
    fullName(p.patient),
    p.package.name,
    PAYMENT_METHOD_LABEL[p.method],
    (p.amountCents / 100).toFixed(2),
    p.reference,
    p.registeredBy.name,
    p.notes,
  ]);
  const total = payments.reduce((s, p) => s + p.amountCents, 0);
  rows.push(["", "", "", "", "Total", (total / 100).toFixed(2), "", "", ""]);

  const body = "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  const filename = `caja-neuvi_${period.from}_${period.to}.csv`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
