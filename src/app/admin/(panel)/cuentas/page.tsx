import type { Metadata } from "next";
import Link from "next/link";
import { Building2, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { requirePlatformAdmin } from "@/lib/platform-auth";
import { formatDate } from "@/lib/dates";
import { BILLING_CYCLE_LABEL, ORG_TYPE_LABEL, formatPEN } from "@/lib/format";
import { LinkRow } from "@/features/pacientes/components/link-row";
import { SimplePagination } from "@/features/pacientes/components/pagination";
import { ACCOUNT_STATUS_FILTER_LABEL } from "@/features/admin/billing";
import {
  ACCOUNT_SORT_LABEL,
  ACCOUNT_STATUS_FILTERS,
  parseAccountFilters,
  type SearchParamValue,
} from "@/features/admin/filters";
import { lastAccessLabel } from "@/features/admin/format";
import { ACCOUNTS_PAGE_SIZE, listAccounts, type AccountRow } from "@/features/admin/queries";
import { AccountStatusPills } from "@/features/admin/components/badges";
import { ListFilters } from "@/features/admin/components/list-filters";

export const metadata: Metadata = { title: "Cuentas" };

const int = new Intl.NumberFormat("es-PE");

export default async function CuentasPage({ searchParams }: { searchParams: Promise<Record<string, SearchParamValue>> }) {
  await requirePlatformAdmin();
  const filters = parseAccountFilters(await searchParams);
  const result = await listAccounts(filters);
  const hasFilters = Boolean(filters.q || filters.estado || filters.plan || filters.tipo);
  const params = { q: filters.q, estado: filters.estado, plan: filters.plan, tipo: filters.tipo, orden: filters.orden === "recientes" ? undefined : filters.orden };

  return (
    <>
      <PageHeader
        title="Cuentas"
        description="Psicólogos independientes y centros suscritos a Neuvi. Solo métricas de uso: sin datos de pacientes."
      />

      <ListFilters
        basePath="/admin/cuentas"
        current={params}
        defaults={{ orden: "recientes" }}
        search={{ placeholder: "Buscar por nombre, RUC o correo", label: "Buscar cuentas" }}
        selects={[
          {
            name: "estado",
            label: "Estado",
            allLabel: "Todos los estados",
            options: ACCOUNT_STATUS_FILTERS.map((s) => ({ value: s, label: ACCOUNT_STATUS_FILTER_LABEL[s] })),
          },
          {
            name: "plan",
            label: "Plan",
            allLabel: "Todos los planes",
            options: [
              { value: "INDIVIDUAL", label: "Plan Individual" },
              { value: "CENTRO", label: "Plan Centro" },
            ],
            className: "sm:w-40",
          },
          {
            name: "tipo",
            label: "Tipo de cuenta",
            allLabel: "Todos los tipos",
            options: [
              { value: "INDIVIDUAL", label: ORG_TYPE_LABEL.INDIVIDUAL },
              { value: "CENTRO", label: ORG_TYPE_LABEL.CENTRO },
            ],
            className: "sm:w-48",
          },
          {
            name: "orden",
            label: "Ordenar por",
            options: Object.entries(ACCOUNT_SORT_LABEL).map(([value, label]) => ({ value, label })),
            className: "col-span-2 sm:w-52",
          },
        ]}
      />

      {result.rows.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={SearchX}
            title="Sin resultados"
            description="Ninguna cuenta coincide con esos filtros."
            action={
              <Button variant="outline" asChild>
                <Link href="/admin/cuentas">Limpiar filtros</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState icon={Building2} title="Aún no hay cuentas" description="Las cuentas aparecen aquí cuando un psicólogo o centro se registra." />
        )
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
          {/* Escritorio */}
          <div className="hidden lg:block">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4 text-xs font-semibold text-muted-foreground uppercase">Cuenta</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase">Plan</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase">Estado</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase">Prof.</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase">Pacientes</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase">Último acceso</TableHead>
                  <TableHead className="hidden text-xs font-semibold text-muted-foreground uppercase xl:table-cell">Alta</TableHead>
                  <TableHead className="pr-4 text-right text-xs font-semibold text-muted-foreground uppercase">MRR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.map((r) => (
                  <AccountTableRow key={r.id} row={r} />
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Móvil / tablet */}
          <ul className="divide-y lg:hidden">
            {result.rows.map((r) => (
              <AccountCard key={r.id} row={r} />
            ))}
          </ul>
        </div>
      )}

      <SimplePagination
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
        pageSize={ACCOUNTS_PAGE_SIZE}
        basePath="/admin/cuentas"
        params={params}
        noun={result.total === 1 ? "cuenta" : "cuentas"}
      />
    </>
  );
}

function AccountTableRow({ row: r }: { row: AccountRow }) {
  const href = `/admin/cuentas/${r.id}`;
  return (
    <LinkRow href={href}>
      <TableCell className="py-3 pl-4">
        <Link href={href} className="block max-w-72 truncate font-medium text-brand-navy-deep hover:text-primary">
          {r.name}
        </Link>
        <p className="max-w-72 truncate text-xs text-muted-foreground">
          {ORG_TYPE_LABEL[r.type]}
          {r.ruc ? ` · RUC ${r.ruc}` : ""}
          {r.email ? ` · ${r.email}` : ""}
        </p>
      </TableCell>
      <TableCell>
        <p className="text-brand-navy">{r.planName}</p>
        <p className="text-xs text-muted-foreground">{BILLING_CYCLE_LABEL[r.billingCycle]}</p>
      </TableCell>
      <TableCell>
        <AccountStatusPills status={r.status} health={r.health} />
      </TableCell>
      <TableCell className="text-right text-brand-navy tabular-nums">{int.format(r.professionals)}</TableCell>
      <TableCell className="text-right text-brand-navy tabular-nums">{int.format(r.patients)}</TableCell>
      <TableCell className="text-muted-foreground">{lastAccessLabel(r.lastLoginAt)}</TableCell>
      <TableCell className="hidden text-muted-foreground xl:table-cell">{formatDate(r.createdAt)}</TableCell>
      <TableCell className="pr-4 text-right font-medium text-brand-navy-deep tabular-nums">
        {r.mrrCents > 0 ? formatPEN(r.mrrCents) : <span className="text-muted-foreground">—</span>}
      </TableCell>
    </LinkRow>
  );
}

function AccountCard({ row: r }: { row: AccountRow }) {
  return (
    <li>
      <Link href={`/admin/cuentas/${r.id}`} className="grid gap-2 p-4 transition-colors hover:bg-muted/50">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium text-brand-navy-deep">{r.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {r.planName} · {BILLING_CYCLE_LABEL[r.billingCycle]}
              {r.ruc ? ` · RUC ${r.ruc}` : ""}
            </p>
          </div>
          <span className="shrink-0 text-sm font-semibold text-brand-navy-deep tabular-nums">
            {r.mrrCents > 0 ? formatPEN(r.mrrCents) : "—"}
          </span>
        </div>
        <AccountStatusPills status={r.status} health={r.health} />
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{int.format(r.professionals)} prof.</span>
          <span>{int.format(r.patients)} pacientes</span>
          <span>Acceso: {lastAccessLabel(r.lastLoginAt)}</span>
          <span>Alta: {formatDate(r.createdAt)}</span>
        </p>
      </Link>
    </li>
  );
}
