"use client";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

// Gráficos de /app/reportes. Reglas de la guía de visualización aplicadas a la marca:
//  - Colores: tokens --chart-1..5 de globals.css. Una sola serie => --chart-1 (azul de marca).
//    Sesiones por estado (3 series) => --chart-1 / --chart-5 / --chart-2, combinación validada
//    (separación CVD y visión normal OK; ámbar y turquesa están bajo 3:1 de contraste, por eso cada
//    gráfico tiene leyenda + tabla equivalente).
//  - Barras de máx. 24 px, extremo de datos redondeado 4 px, 2 px de separación color superficie,
//    cuadrícula hairline sólida y recesiva, un solo eje Y.

const SURFACE = "var(--card)";
const BAR_MAX = 24;

const pen = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });
const penCompact = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  notation: "compact",
  maximumFractionDigits: 1,
});
const int = new Intl.NumberFormat("es-PE");

export type ValueFormat = "number" | "money";

function fmt(value: unknown, format: ValueFormat, compact = false): string {
  const n = Number(value ?? 0);
  if (format === "money") return (compact ? penCompact : pen).format(n / 100);
  return int.format(n);
}

function truncate(label: unknown, max = 18): string {
  const s = String(label ?? "");
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function TooltipRow({ color, label, value }: { color?: string; label: React.ReactNode; value: string }) {
  return (
    <div className="flex w-full items-center justify-between gap-4">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </span>
      <span className="font-medium text-foreground tabular-nums">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sesiones por semana (columnas apiladas: atendidas / no asistió / canceladas)
// ---------------------------------------------------------------------------

const sessionsConfig = {
  atendidas: { label: "Atendidas", color: "var(--chart-1)" },
  noAsistio: { label: "No asistió", color: "var(--chart-5)" },
  canceladas: { label: "Canceladas", color: "var(--chart-2)" },
} satisfies ChartConfig;

export type SessionsWeekDatum = {
  label: string;
  range: string;
  atendidas: number;
  noAsistio: number;
  canceladas: number;
};

export function SessionsByWeekChart({ data }: { data: SessionsWeekDatum[] }) {
  return (
    <ChartContainer config={sessionsConfig} className="aspect-auto h-72 w-full">
      <BarChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} strokeWidth={1} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
        <ChartTooltip
          cursor={{ fillOpacity: 0.6 }}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => (payload?.[0]?.payload as SessionsWeekDatum | undefined)?.range ?? ""}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="atendidas" stackId="s" fill="var(--color-atendidas)" stroke={SURFACE} strokeWidth={2} maxBarSize={BAR_MAX} />
        <Bar dataKey="noAsistio" stackId="s" fill="var(--color-noAsistio)" stroke={SURFACE} strokeWidth={2} maxBarSize={BAR_MAX} />
        <Bar
          dataKey="canceladas"
          stackId="s"
          fill="var(--color-canceladas)"
          stroke={SURFACE}
          strokeWidth={2}
          maxBarSize={BAR_MAX}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}

// ---------------------------------------------------------------------------
// Ingresos por semana (una serie)
// ---------------------------------------------------------------------------

const revenueConfig = {
  ingresos: { label: "Ingresos", color: "var(--chart-1)" },
} satisfies ChartConfig;

export type RevenueWeekDatum = { label: string; range: string; ingresos: number };

export function RevenueByWeekChart({ data }: { data: RevenueWeekDatum[] }) {
  return (
    <ChartContainer config={revenueConfig} className="aspect-auto h-72 w-full">
      <BarChart data={data} margin={{ top: 24, right: 4, left: 4, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} strokeWidth={1} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={64}
          tickFormatter={(v) => fmt(v, "money", true)}
        />
        <ChartTooltip
          cursor={{ fillOpacity: 0.6 }}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => (payload?.[0]?.payload as RevenueWeekDatum | undefined)?.range ?? ""}
              formatter={(value, _name, item) => (
                <TooltipRow color={item.color} label="Ingresos" value={fmt(value, "money")} />
              )}
            />
          }
        />
        <Bar dataKey="ingresos" fill="var(--color-ingresos)" maxBarSize={BAR_MAX} radius={[4, 4, 0, 0]}>
          <LabelList
            dataKey="ingresos"
            position="top"
            offset={6}
            className="fill-muted-foreground"
            fontSize={11}
            formatter={(v) => (Number(v) > 0 ? fmt(v, "money", true) : "")}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

// ---------------------------------------------------------------------------
// Barras horizontales de una serie (por profesional, por método, por estado)
// ---------------------------------------------------------------------------

export type CategoryDatum = { name: string; value: number };

export function CategoryBarChart({
  data,
  seriesLabel,
  format = "number",
}: {
  data: CategoryDatum[];
  seriesLabel: string;
  format?: ValueFormat;
}) {
  const config = { value: { label: seriesLabel, color: "var(--chart-1)" } } satisfies ChartConfig;
  const height = Math.max(140, data.length * 44 + 16);

  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: format === "money" ? 72 : 36, left: 0, bottom: 0 }}>
        <CartesianGrid horizontal={false} strokeWidth={1} />
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="name"
          tickLine={false}
          axisLine={false}
          width={128}
          tickFormatter={(v) => truncate(v)}
        />
        <ChartTooltip
          cursor={{ fillOpacity: 0.6 }}
          content={
            <ChartTooltipContent
              formatter={(value, _name, item) => (
                <TooltipRow color={item.color} label={seriesLabel} value={fmt(value, format)} />
              )}
            />
          }
        />
        <Bar dataKey="value" fill="var(--color-value)" maxBarSize={BAR_MAX} radius={[0, 4, 4, 0]}>
          <LabelList
            dataKey="value"
            position="right"
            offset={8}
            className="fill-foreground"
            fontSize={12}
            formatter={(v) => fmt(v, format)}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
