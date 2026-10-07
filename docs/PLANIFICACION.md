# Neuvi — Planificación del MVP

> Sistema SaaS de gestión para consultorios y centros psicológicos · Start Up Venture Project · TECSUP 2026

## 1. Objetivo del MVP

Validar con psicólogos independientes y centros psicológicos reales que Neuvi **reemplaza el manejo manual** (WhatsApp + Excel + papel) en lo que más les duele:

| Dolor documentado | Cómo lo ataca el MVP |
|---|---|
| Cruces de horario (8–12 errores/mes sobre ~600 atenciones) | Agenda centralizada que **bloquea** cruces por profesional y por consultorio |
| Control de pagos disperso | Paquetes de sesiones con pagos, saldo y sesiones restantes por paciente |
| Pérdida de seguimiento / renovación | **Aviso automático de renovación** (diferenciador principal) |
| Historial clínico disperso y riesgo de confidencialidad | Historia clínica + notas de evolución visibles **solo para el psicólogo tratante** |
| Falta de reportes | Reportes de sesiones, ingresos y comportamiento de pacientes |

## 2. Alcance

### Incluido
1. Registro con **prueba gratuita de 3 meses** (90 días, `TRIAL_DAYS` en `src/features/configuracion/plans.ts`) (psicólogo independiente o centro).
2. Roles: Administrador, Psicólogo, Recepción (el independiente es Admin + Psicólogo).
3. Pacientes: ficha administrativa + **historia clínica** + **notas de evolución**.
4. Agenda por profesional y consultorio, con validación de cruces y estados de cita.
5. Paquetes de sesiones y registro de pagos (efectivo, Yape, Plin, transferencia, tarjeta).
6. Panel de **renovaciones** (paquetes con ≤ N sesiones restantes, configurable).
7. **Recordatorios por WhatsApp** mediante enlaces `wa.me` con mensaje prellenado (plantillas editables).
8. Caja consolidada (plan centro) y reportes básicos.
9. Landing pública con planes (sin precios: "Contáctanos por WhatsApp").

### Fuera del alcance
| Funcionalidad | Decisión |
|---|---|
| Red de alquiler de consultorios entre profesionales | **Eliminada del producto** (decisión del equipo). |
| Asistente automático fuera de horario | Fase 2 — requiere API de WhatsApp Business. |
| Envío automático de WhatsApp (sin clic) | Fase 2 — misma dependencia. En el MVP el personal envía con un clic. |
| Cobro de la suscripción en línea | Fase 2 — en el piloto se activa el plan manualmente vía WhatsApp. |
| Precios de los planes | **Pendiente de definir.** La UI muestra "Precio por definir / Contáctanos". |
| Portal del paciente / reservas online | Fase 2. |

**WhatsApp de contacto de Neuvi:** +51 972 540 056 (variable `NEXT_PUBLIC_NEUVI_WHATSAPP`).

## 3. Usuarios y permisos

| Recurso | Administrador | Recepción | Psicólogo (centro) |
|---|---|---|---|
| Agenda | Toda | Toda | Solo la suya |
| Pacientes (datos administrativos) | Todos | Todos | Solo los suyos |
| Historia clínica y notas | Solo si es el psicólogo tratante | ❌ | Solo sus pacientes |
| Paquetes y pagos | Gestiona | Gestiona | Ve los de sus pacientes |
| Caja | ✅ | ✅ | ❌ |
| Reportes | ✅ | ❌ | ❌ |
| Equipo y configuración | ✅ | ❌ | ❌ |

Implementado en `src/lib/permissions.ts`. **Toda consulta filtra por `organizationId` del usuario en sesión.**

## 4. Reglas de negocio clave

- **Paquete de sesiones** = núcleo del sistema. Una sesión suelta es un paquete de 1.
  - Sesiones usadas = citas del paquete en estado `ATENDIDA` (+ `NO_ASISTIO` si la organización lo configura).
  - Saldo = precio del paquete − pagos registrados.
  - **Necesita renovación** = paquete activo con restantes ≤ `renewalThreshold` (por defecto 1).
  - Al usar todas las sesiones el paquete pasa a `COMPLETADO` automáticamente.
- **Cita**: al crearla se asigna automáticamente el paquete activo del paciente con cupo disponible.
- **Cruces**: no se permiten dos citas activas (no canceladas) que se solapen para el mismo profesional ni para el mismo consultorio.
- **Horario**: todo se guarda en UTC y se muestra en hora de Lima (UTC−5, sin horario de verano).
- **Mensajes de WhatsApp**: nunca incluyen información clínica.
- **Cambio de psicólogo tratante**: nadie puede asignarse a sí mismo un paciente con historia clínica escrita por otro profesional (el traspaso lo hace otro administrador o recepción, y el nuevo tratante ve toda la historia). Cada cambio queda en una bitácora (quién, cuándo, de quién a quién) visible en el Resumen de la ficha.

## 5. Historia clínica (campos)

**Ficha de ingreso** (una por paciente):
motivo de consulta · historia del problema actual · antecedentes personales · tratamientos previos · antecedentes familiares · medicación actual · consumo de sustancias · examen mental · impresión diagnóstica · código CIE-10/DSM-5 (opcional) · objetivos terapéuticos · plan de intervención · nivel de riesgo (ninguno/bajo/moderado/alto) + notas de riesgo · consentimiento informado (sí/no + fecha).

**Nota de evolución** (una por sesión):
fecha · N.º de sesión · modalidad · estado emocional observado · temas abordados · desarrollo de la sesión (obligatorio) · técnicas/intervenciones · tareas asignadas · plan para la próxima sesión · nivel de riesgo.

**Datos del paciente**: nombres, apellidos, tipo y N.º de documento, fecha de nacimiento (edad calculada), sexo, celular (WhatsApp), correo, dirección, distrito, ocupación, estado civil, grado de instrucción, apoderado (menores), contacto de emergencia, cómo nos conoció, psicólogo tratante, estado (activo / en pausa / alta / abandono), notas administrativas.

## 6. Arquitectura

| Capa | Tecnología |
|---|---|
| Framework | **Next.js 16** (App Router, Server Components, Server Actions) + React 19 + TypeScript |
| UI | Tailwind CSS 4 + shadcn/ui (Radix) + lucide-react · paleta del logo Neuvi |
| Datos | **PostgreSQL** + **Prisma 6** |
| Autenticación | Propia: bcrypt + cookie JWT firmada (`jose`), verificación en `src/proxy.ts` y en cada página/acción |
| Validación | Zod 4 |
| Gráficos | Recharts (vía `components/ui/chart`) |
| Despliegue | **Vercel** + **Neon Postgres** (integración del Marketplace de Vercel) |

```
src/
  app/
    page.tsx                  Landing pública
    (auth)/                   Login, registro y sus server actions
    app/                      Panel (protegido): layout con sidebar
      page.tsx                Inicio / dashboard
      agenda/  pacientes/  renovaciones/  pagos/  reportes/  equipo/  configuracion/
  features/<modulo>/          Componentes, queries y actions de cada módulo
  components/ui/              shadcn/ui (no editar salvo necesidad)
  components/common/          PageHeader, EmptyState, Field, SubmitButton, useServerForm, badges
  components/shell/           Sidebar, menú de usuario, banner de prueba
  lib/                        db, auth, permissions, dates (Lima), format (S/, etiquetas), whatsapp, domain/packages
prisma/schema.prisma          Modelo de datos
prisma/seed.ts                Datos de demostración
```

## 7. Reparto del trabajo (3 subagentes en paralelo)

La base (tema, esquema, autenticación, layout, librerías comunes) la construye el agente coordinador antes de repartir.

| Agente | Módulos | Carpetas propias |
|---|---|---|
| **1 · Agenda y operación diaria** | Agenda semanal/diaria, crear/editar/reprogramar citas, validación de cruces, estados de cita, descuento de sesiones, recordatorios WhatsApp, consultorios (CRUD), dashboard de inicio | `src/app/app/page.tsx`, `src/app/app/agenda/**`, `src/app/app/configuracion/consultorios/**`, `src/features/{agenda,dashboard,consultorios}/**` |
| **2 · Pacientes** | Lista y ficha de pacientes, historia clínica, notas de evolución, paquetes y pagos del paciente, panel de renovaciones | `src/app/app/pacientes/**`, `src/app/app/renovaciones/**`, `src/features/{pacientes,historia,paquetes,renovaciones}/**` |
| **3 · Negocio y marca** | Landing, caja y pagos, reportes, equipo/roles, configuración (organización, plantillas, plan), mi perfil | `src/app/page.tsx`, `src/components/landing/**`, `src/app/app/{pagos,reportes,equipo,perfil}/**`, `src/app/app/configuracion/**` (excepto `consultorios/`), `src/features/{caja,reportes,equipo,configuracion,perfil}/**` |

**Contratos entre módulos**
- Crear cita desde otra pantalla: `/app/agenda?nuevaCita=1&paciente=<id>` (opcional `&fecha=YYYY-MM-DD&profesional=<id>`).
- Ver una cita en la agenda: `/app/agenda?fecha=YYYY-MM-DD`.
- Ficha del paciente: `/app/pacientes/<id>` (pestañas vía `?tab=resumen|historia|paquetes|citas`).
- Registrar nota de evolución de una cita atendida: `/app/pacientes/<id>?tab=historia&nota=<appointmentId>`.
- Renovar paquete: `/app/pacientes/<id>?tab=paquetes&renovar=1` · registrar pago: `/app/pacientes/<id>?tab=paquetes&pagar=<packageId>`.
- Plan / activar suscripción: `/app/configuracion/plan` · perfil y contraseña: `/app/perfil`.

## 8. Hitos

| # | Hito | Resultado |
|---|---|---|
| 1 | Base técnica | Proyecto, tema de marca, esquema, auth, layout ✅ |
| 2 | Módulos en paralelo | Agenda · Pacientes · Negocio y marca ✅ |
| 3 | Integración | Build limpio, seed de demo, prueba end-to-end (permisos, confidencialidad, cruces) ✅ |
| 4 | Despliegue | Vercel + Neon, dominio, datos demo |
| 5 | Piloto | 1 centro + 2–3 psicólogos independientes durante 2 semanas; medir errores de agenda y renovaciones logradas |

## 8.1 Estado al cerrar la sesión (01/10/2026)

**Listo:** los tres módulos están integrados. El proyecto pasa `typecheck`, `lint` y `build`. Se probaron en el navegador los permisos por rol, la confidencialidad clínica, el bloqueo de cruces de agenda y la creación de notas de evolución.

**Pendiente para la próxima sesión:**
1. Conectar **Neon**. Hay que pegar las URLs en `.env`: `DATABASE_URL` con `-pooler` y `DATABASE_URL_UNPOOLED` sin él. Luego `npm run db:deploy` y `npm run db:seed`. Hoy `.env` apunta a una base temporal local (puerto 5433) que se pierde al reiniciar.
2. Probar en el navegador los flujos que aún no se recorrieron: registro de cuenta nueva, registrar pago, crear paquete, agregar miembro del equipo, guardar configuración y plantillas.
3. Desplegar en **Vercel** (ver `README.md`).
4. Primer commit del repositorio `neuvi/`, cuando el equipo lo indique.

## 9. Métricas de validación del piloto

- Errores de asignación de citas por mes (meta: de 8–12 a 0–1).
- % de paquetes renovados tras el aviso.
- Tasa de inasistencia antes/después de los recordatorios.
- Tiempo administrativo semanal percibido (encuesta).

## 10. Pendientes

- Definir precios de Plan Individual y Plan Centro (por psicólogo activo).
- Política de privacidad y términos (Ley N.º 29733 — datos de salud son **datos sensibles**).
- Evaluar cifrado a nivel de campo para la historia clínica (Neon ya cifra en reposo).
- Proveedor de WhatsApp Business API para fase 2.
