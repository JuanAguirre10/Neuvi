import { BarChart3, CalendarDays, Lock, Plus, RefreshCcw, Users, Video, Wallet } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { WhatsAppIcon } from "./whatsapp-icon";

// Maqueta del producto hecha con HTML/CSS (sin imágenes externas): agenda semanal,
// aviso de renovación y medidor de sesiones del paquete. Todo es decorativo.

type Tone = "blue" | "teal" | "navy";

const TONE: Record<Tone, string> = {
  blue: "border-brand-blue bg-brand-blue/12 text-brand-navy-deep",
  teal: "border-brand-teal bg-brand-teal/14 text-brand-navy-deep",
  navy: "border-brand-navy bg-brand-navy/10 text-brand-navy-deep",
};

const DAYS = [
  { short: "Lun", day: 5 },
  { short: "Mar", day: 6 },
  { short: "Mié", day: 7 },
  { short: "Jue", day: 8 },
  { short: "Vie", day: 9 },
];

const HOURS = ["9:00", "10:00", "11:00", "12:00", "13:00"];
const ROW_H = 38; // px por hora

// [día, hora de inicio (9 = 9:00), duración en horas, paciente, tono, virtual]
const APPOINTMENTS: [number, number, number, string, Tone, boolean?][] = [
  [0, 9, 1, "M. Quispe", "blue"],
  [0, 11, 1, "R. Flores", "teal"],
  [1, 10, 1, "L. Rojas", "navy"],
  [1, 12, 1, "C. Díaz", "blue"],
  [2, 9, 1, "A. Torres", "teal"],
  [2, 11.5, 1, "J. Huamán", "blue", true],
  [3, 10, 1, "S. Vargas", "blue"],
  [3, 12, 1, "P. Castro", "teal", true],
  [4, 9, 1, "E. Ramos", "navy"],
  [4, 11, 1, "G. Mendoza", "teal"],
];

const SIDEBAR_ICONS = [CalendarDays, Users, RefreshCcw, Wallet, BarChart3];

export function ProductMockup() {
  return (
    <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
      <div
        aria-hidden
        className="absolute -inset-4 rounded-[2rem] bg-linear-to-tr from-brand-blue/25 via-brand-sky/10 to-brand-teal/25 blur-2xl sm:-inset-8"
      />

      <div
        role="img"
        aria-label="Vista previa de Neuvi: agenda semanal con citas por profesional, aviso de renovación de un paquete y medidor de sesiones usadas."
        className="relative"
      >
        {/* Marco del navegador */}
        <div aria-hidden className="overflow-hidden rounded-2xl border border-border bg-white shadow-2xl shadow-brand-navy/15">
          <div className="flex items-center gap-3 border-b bg-muted/70 px-4 py-2.5">
            <div className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-destructive/35" />
              <span className="size-2.5 rounded-full bg-warning/35" />
              <span className="size-2.5 rounded-full bg-success/35" />
            </div>
            <div className="mx-auto flex h-6 w-1/2 min-w-36 items-center justify-center gap-1.5 rounded-md bg-white text-[10px] text-muted-foreground ring-1 ring-border">
              <Lock className="size-3" />
              Neuvi · Agenda
            </div>
            <div className="w-10" />
          </div>

          <div className="flex">
            {/* Mini sidebar */}
            <div className="hidden w-12 shrink-0 flex-col items-center gap-3 border-r py-3 sm:flex">
              <Logo variant="mark" className="h-6" />
              <div className="mt-1 grid gap-2">
                {SIDEBAR_ICONS.map((Icon, i) => (
                  <span
                    key={i}
                    className={cn(
                      "flex size-7 items-center justify-center rounded-lg",
                      i === 0 ? "bg-secondary text-primary" : "text-muted-foreground/70",
                    )}
                  >
                    <Icon className="size-3.5" />
                  </span>
                ))}
              </div>
            </div>

            {/* Agenda semanal */}
            <div className="min-w-0 flex-1 p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground">Semana del 5 al 9 de octubre</p>
                  <p className="text-sm font-semibold text-brand-navy-deep">Agenda</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="hidden rounded-md bg-muted px-2 py-1 text-[10px] font-medium text-brand-navy sm:inline">
                    Todos los profesionales
                  </span>
                  <span className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[10px] font-semibold text-white">
                    <Plus className="size-3" /> Nueva cita
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-[1.9rem_repeat(5,minmax(0,1fr))] gap-x-1">
                <div />
                {DAYS.map((d, i) => (
                  <div key={d.short} className="pb-1.5 text-center">
                    <p className="text-[9px] font-medium text-muted-foreground uppercase">{d.short}</p>
                    <p
                      className={cn(
                        "mx-auto mt-0.5 flex size-5 items-center justify-center rounded-full text-[10px] font-semibold",
                        i === 2 ? "bg-primary text-white" : "text-brand-navy-deep",
                      )}
                    >
                      {d.day}
                    </p>
                  </div>
                ))}

                {/* Columna de horas */}
                <div className="relative" style={{ height: ROW_H * HOURS.length }}>
                  {HOURS.map((h, i) => (
                    <span
                      key={h}
                      className="absolute right-1 -translate-y-1/2 text-[8.5px] text-muted-foreground tabular-nums"
                      style={{ top: i * ROW_H + 1 }}
                    >
                      {h}
                    </span>
                  ))}
                </div>

                {DAYS.map((d, dayIndex) => (
                  <div
                    key={d.short}
                    className={cn("relative rounded-md", dayIndex === 2 ? "bg-secondary/50" : "bg-muted/35")}
                    style={{ height: ROW_H * HOURS.length }}
                  >
                    {HOURS.map((h, i) => (
                      <span key={h} className="absolute inset-x-0 border-t border-border/70" style={{ top: i * ROW_H }} />
                    ))}
                    {APPOINTMENTS.filter(([day]) => day === dayIndex).map(([, start, duration, name, tone, virtual]) => (
                      <div
                        key={name + start}
                        className={cn(
                          "absolute inset-x-0.5 overflow-hidden rounded-[5px] border-l-2 px-1 py-0.5",
                          TONE[tone],
                        )}
                        style={{ top: (start - 9) * ROW_H + 2, height: duration * ROW_H - 4 }}
                      >
                        <p className="truncate text-[8.5px] font-semibold leading-tight">{name}</p>
                        <p className="flex items-center gap-0.5 text-[7.5px] leading-tight text-muted-foreground">
                          {virtual ? <Video className="size-2" /> : null}
                          {formatHour(start)}
                        </p>
                      </div>
                    ))}
                    {dayIndex === 2 ? (
                      <div className="absolute inset-x-0 flex items-center" style={{ top: 1.35 * ROW_H }}>
                        <span className="size-1.5 -translate-x-0.5 rounded-full bg-primary" />
                        <span className="h-px flex-1 bg-primary" />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tarjeta: medidor de sesiones */}
        <div
          aria-hidden
          className="relative mt-3 rounded-xl border bg-white p-3.5 shadow-xl shadow-brand-navy/10 sm:absolute sm:-top-6 sm:-right-6 sm:mt-0 sm:w-56"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-brand-navy-deep">Paquete de 8 sesiones</p>
            <span className="rounded-full bg-success-soft px-1.5 py-0.5 text-[10px] font-semibold text-success">Pagado</span>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Andrea Torres</p>
          <div className="mt-2.5 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">6 de 8 sesiones</span>
            <span className="font-semibold text-success">2 restantes</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-brand-teal/15">
            <div className="h-full w-3/4 rounded-full bg-brand-teal" />
          </div>
        </div>

        {/* Tarjeta: renovación pendiente */}
        <div
          aria-hidden
          className="relative mt-3 rounded-xl border bg-white p-3.5 shadow-xl shadow-brand-navy/10 sm:absolute sm:-bottom-8 sm:-left-8 sm:mt-0 sm:w-64"
        >
          <div className="flex items-start gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning">
              <RefreshCcw className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-brand-navy-deep">Renovación pendiente</p>
              <p className="text-[11px] text-muted-foreground">Lucía Rojas · le queda 1 sesión de 4</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground">Mensaje listo para enviar</span>
            <span className="flex items-center gap-1 rounded-md bg-brand-teal-strong px-2 py-1 text-[10px] font-semibold text-white">
              <WhatsAppIcon className="size-3" /> Enviar aviso
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatHour(start: number) {
  const h = Math.floor(start);
  const m = Math.round((start - h) * 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}
