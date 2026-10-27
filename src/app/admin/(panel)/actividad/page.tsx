import type { Metadata } from "next";
import Link from "next/link";
import { History, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { requirePlatformAdmin } from "@/lib/platform-auth";
import { SUBSCRIPTION_EVENT_LABEL } from "@/lib/format";
import { SimplePagination } from "@/features/pacientes/components/pagination";
import { EVENT_TYPES, SYSTEM_ACTOR, monthOptions, parseEventFilters, type SearchParamValue } from "@/features/admin/filters";
import { EVENTS_PAGE_SIZE, listEvents } from "@/features/admin/queries";
import { EventList } from "@/features/admin/components/event-list";
import { ListFilters } from "@/features/admin/components/list-filters";

export const metadata: Metadata = { title: "Actividad" };

export default async function ActividadPage({ searchParams }: { searchParams: Promise<Record<string, SearchParamValue>> }) {
  await requirePlatformAdmin();
  const filters = parseEventFilters(await searchParams);
  const result = await listEvents(filters);
  const params = { q: filters.q, tipo: filters.tipo, actor: filters.actor, mes: filters.mes };
  const hasFilters = Boolean(filters.q || filters.tipo || filters.actor || filters.mes);

  return (
    <>
      <PageHeader
        title="Actividad"
        description="Historial de todas las suscripciones: altas, activaciones, cambios de plan, pruebas extendidas y suspensiones."
      />

      <ListFilters
        basePath="/admin/actividad"
        current={params}
        search={{ placeholder: "Buscar por cuenta", label: "Buscar por cuenta" }}
        selects={[
          {
            name: "tipo",
            label: "Tipo de movimiento",
            allLabel: "Todos los movimientos",
            options: EVENT_TYPES.map((t) => ({ value: t, label: SUBSCRIPTION_EVENT_LABEL[t] })),
            className: "sm:w-52",
          },
          {
            name: "actor",
            label: "Responsable",
            allLabel: "Todo el equipo",
            options: [
              { value: SYSTEM_ACTOR, label: "Cliente / sistema" },
              ...result.actors.map((a) => ({ value: a.id, label: a.name })),
            ],
            className: "sm:w-48",
          },
          { name: "mes", label: "Mes", allLabel: "Todos los meses", options: monthOptions(), className: "col-span-2 sm:w-48" },
        ]}
      />

      {result.rows.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={SearchX}
            title="Sin resultados"
            description="No hay movimientos con esos filtros."
            action={
              <Button variant="outline" asChild>
                <Link href="/admin/actividad">Limpiar filtros</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState icon={History} title="Aún no hay movimientos" />
        )
      ) : (
        <div className="rounded-xl border bg-card p-4 shadow-xs sm:p-5">
          <EventList events={result.rows} />
        </div>
      )}

      <SimplePagination
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
        pageSize={EVENTS_PAGE_SIZE}
        basePath="/admin/actividad"
        params={params}
        noun={result.total === 1 ? "movimiento" : "movimientos"}
      />
    </>
  );
}
