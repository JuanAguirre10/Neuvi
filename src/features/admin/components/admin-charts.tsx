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

// Gráficos del resumen de /admin (misma guía que /app/reportes):
//  - Tipo de cuenta = identidad: Individual --chart-3 (aqua), Centro --primary (azul). Par validado con
//    el script de la guía (CVD ΔE 27, visión normal ΔE 27). El aqua queda bajo 3:1 de contraste con la
//    tarjeta, por eso hay leyenda y tabla equivalente en cada gráfico.
//  - Una sola serie => --chart-1. Barras de máx. 24 px, extremo de datos redondeado 4 px, 2 px de
//    separación color superficie entre segmentos, cuadrícula hairline y un solo eje.

const SURFACE = "var(--card)";
const BAR_MAX = 24;

const penCompact = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  notation: "compact",
  maximumFractionDigits: 1,
});
const pen = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });

const typeConfig = {
  individual: { label: "Individual", color: "var(--chart-3)" },
  centro: { label: "Centro", color: "var(--primary)" },
} satisfies ChartConfig;

// ---------------------------------------------------------------------------
// Altas por mes (columnas apiladas por tipo de cuenta)
// ---------------------------------------------------------------------------

export type SignupDatum = { label: string; month: string; individual: number; centro: number };

export function SignupsChart({ data }: { data: SignupDatum[] }) {
  return (
    <ChartContainer config={typeConfig} className="aspect-auto h-72 w-full">
      <BarChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} strokeWidth={1} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" minTickGap={8} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
        <ChartTooltip
          cursor={{ fillOpacity: 0.6 }}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => (payload?.[0]?.payload as SignupDatum | undefined)?.month ?? ""}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="individual" stackId="t" fill="var(--color-individual)" stroke={SURFACE} strokeWidth={2} maxBarSize={BAR_MAX} />
        <Bar
          dataKey="centro"
          stackId="t"
          fill="var(--color-centro)"
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
// Cobrado por mes (una serie; se rotula solo el mes actual)
// ---------------------------------------------------------------------------

const collectedConfig = { cobrado: { label: "Cobrado", color: "var(--chart-1)" } } satisfies ChartConfig;

export type CollectedDatum = { label: string; month: string; cobrado: number; tag: string };

export function CollectedChart({ data }: { data: CollectedDatum[] }) {
  return (
    <ChartContainer config={collectedConfig} className="aspect-auto h-72 w-full">
      <BarChart data={data} margin={{ top: 24, right: 8, left: 4, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} strokeWidth={1} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" minTickGap={8} />
        <YAxis tickLine={false} axisLine={false} width={64} tickFormatter={(v) => penCompact.format(Number(v) / 100)} />
        <ChartTooltip
          cursor={{ fillOpacity: 0.6 }}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => (payload?.[0]?.payload as CollectedDatum | undefined)?.month ?? ""}
              formatter={(value, _name, item) => (
                <div className="flex w-full items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                    Cobrado
                  </span>
                  <span className="font-medium text-foreground tabular-nums">{pen.format(Number(value) / 100)}</span>
                </div>
              )}
            />
          }
        />
        <Bar dataKey="cobrado" fill="var(--color-cobrado)" maxBarSize={BAR_MAX} radius={[4, 4, 0, 0]}>
          <LabelList dataKey="tag" position="top" offset={6} className="fill-muted-foreground" fontSize={11} />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

// ---------------------------------------------------------------------------
// Cuentas por estado (barras horizontales apiladas por plan; total al final)
// ---------------------------------------------------------------------------

export type StateDatum = { name: string; individual: number; centro: number; total: number };

export function AccountsByStateChart({ data }: { data: StateDatum[] }) {
  const height = Math.max(160, data.length * 44 + 48);
  return (
    <ChartContainer config={typeConfig} className="aspect-auto w-full" style={{ height }}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 36, left: 0, bottom: 0 }}>
        <CartesianGrid horizontal={false} strokeWidth={1} />
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={112} />
        <ChartTooltip cursor={{ fillOpacity: 0.6 }} content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="individual" stackId="p" fill="var(--color-individual)" stroke={SURFACE} strokeWidth={2} maxBarSize={BAR_MAX} />
        <Bar
          dataKey="centro"
          stackId="p"
          fill="var(--color-centro)"
          stroke={SURFACE}
          strokeWidth={2}
          maxBarSize={BAR_MAX}
          radius={[0, 4, 4, 0]}
        >
          <LabelList dataKey="total" position="right" offset={8} className="fill-foreground" fontSize={12} />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
