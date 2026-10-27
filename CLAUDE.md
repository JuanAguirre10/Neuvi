# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Neuvi MVP — SaaS for psychology practices in Peru. Product scope, business rules, permissions matrix and module ownership live in `docs/PLANIFICACION.md` (Spanish). All user-facing text is **Spanish (Peru)**.

## Commands

```bash
npm run dev          # http://localhost:3000
npm run typecheck    # tsc --noEmit (no incremental)
npm run lint         # eslint
npm run build        # prisma generate && next build
npm run db:push      # sync prisma/schema.prisma to the DB (dev)
npm run db:migrate   # create a migration (dev)
npm run db:deploy    # apply migrations (prod / Vercel)
npm run db:seed      # demo data (prisma/seed.ts)
```

There is no test suite; verify with `typecheck`, `lint`, `build` and by driving the app.

## Stack gotchas

- **Next.js 16**: `src/proxy.ts` replaces `middleware.ts`. `params` / `searchParams` are Promises — type them explicitly (`{ params: Promise<{ id: string }> }`), don't rely on generated `PageProps`. Bundled docs: `node_modules/next/dist/docs/`.
- **Prisma is pinned to 6.x** (classic `prisma-client-js`, import from `@prisma/client`). Don't upgrade to 7/8.
- **Zod 4**: use `{ error: "..." }` for messages, `z.email()` for emails.
- **shadcn/ui** uses the `radix-nova` style; `cn` comes from the `cn` package via `@/lib/utils`. Buttons default to `h-8`.
- **React 19 forms**: `<form action={fn}>` resets fields even on validation errors. Use `useServerForm(action)` from `@/components/common/form` with `<form method="post" onSubmit={onSubmit}>` (the `method` keeps a pre-hydration submit from putting passwords/DNI in the URL), and pass `pending` to `SubmitButton`.

## Architecture rules

- **Multi-tenant**: every Prisma query must filter by the session user's `organizationId`. Use the scope helpers in `src/lib/permissions.ts` (`patientScope`, `appointmentScope`, `packageScope`) and never trust ids from the client without re-checking ownership.
- **Auth**: `requireUser()` / `requireRole()` from `@/lib/auth` at the top of every page **and** every server action. `src/proxy.ts` is only an optimistic redirect (it checks the JWT signature, not the DB). When the cookie belongs to a deleted/deactivated user, `requireUser()` sends to `/salir` (route handler that deletes the cookie) to avoid a `/app` ↔ `/login` redirect loop.
- **Clinical confidentiality**: `ClinicalRecord` and `SessionNote` are readable/writable only when `canViewClinical(user, patient)` (treating psychologist). Never put clinical data in WhatsApp messages, lists visible to reception, or reports. Because the treating psychologist gets the whole history, any code that changes `patient.professionalId` must call `canAssignTreating` (nobody self-assigns a patient with another professional's clinical data) and `logAssignment` in the same transaction (`src/lib/domain/assignments.ts`; the log is shown in the patient's Resumen tab).
- **Money** is stored as integer cents (`priceCents`, `amountCents`); use `formatPEN` / `parseAmountToCents` from `@/lib/format`.
- **Dates** are stored in UTC and shown in America/Lima (fixed UTC−5). Use `@/lib/dates` (`fromLimaLocal`, `limaDateKey`, `formatTime`…). `birthDate` is `@db.Date` → `dateOnlyFromKey` / `dateOnlyToKey`.
- **Session packages** (`src/lib/domain/packages.ts`) are the core: used sessions, remaining, balance and `needsRenewal` come from `getPackageSummaries`; call `syncPackageStatus` after changing an appointment's status.
- **Enum labels** in Spanish live in `@/lib/format` (`APPOINTMENT_STATUS_LABEL`, …); status pills in `@/components/common/status-badges`.
- Server actions return `ActionState` (`@/lib/action-state`) and call `revalidatePath` for affected routes.
- **Subscription (normalized)**: the plan and trial live in `Subscription` (1:1 with `Organization`: `planCode`, `status` PRUEBA/ACTIVA/SUSPENDIDA/CANCELADA, `trialEndsAt`, negotiated `priceCents`), not on `Organization`. The catalog is `SubscriptionPlan` (`listPriceCents` null = "Precio por definir"). History goes in `SubscriptionEvent` and billing in `SubscriptionInvoice` + `SubscriptionPayment`. Derived states (trial expired, overdue, invoice paid/overdue) are computed, never stored. A SUSPENDIDA/CANCELADA subscription blocks tenant login (`subscriptionAllowsAccess` in `@/lib/auth`). Changing the plan must also update `Organization.type`, because tenant features depend on it.
- **Platform admin (`/admin`)**: the Neuvi team (`PlatformAdmin`, roles SUPERADMIN/FINANZAS/SOPORTE) has its own cookie and auth (`@/lib/platform-auth`), separate from tenant `User`s, but there is a single login screen: `/login` (`loginAction`) checks both tables and opens the matching session (`/admin` or `/app`); `/admin/login` only redirects there. An email may exist in only one of the two tables, so check `emailInUse` (`@/lib/accounts`) before creating or changing any email. It sees only aggregates. Never query patient personal fields, `ClinicalRecord`, `SessionNote` or patient payments from admin code.
- **DB integrity**: the migration `*_saas_subscriptions_admin` adds CHECK constraints (positive amounts, `endsAt > startsAt`, invoice discount ≤ subtotal...). Prisma doesn't model them, so keep them when writing raw SQL or new migrations. Generate migrations with `prisma migrate diff` and review the order: Prisma emitted enum changes before the tables existed.

## UI conventions

- Every panel page starts with `<PageHeader title description actions />`; empty lists use `<EmptyState />`; form fields use `<Field>`.
- Brand tokens (from the logo): `primary` #2F6DB5 (buttons), `brand-blue` #4C8DD7, `brand-teal` #39B6AF, `brand-sky` #7AADE6, `brand-navy` #344E6D, `brand-navy-deep` #1F334D (headings); semantic `success`/`warning`/`info-soft`/`danger-soft`; utilities `bg-sky-wash` (soft blue→teal wash for highlighted panels) and `bg-brand-gradient` (navy→blue→teal, white text) in `globals.css`. Don't hard-code other palettes.
- Logo: `<Logo />` from `@/components/brand/logo` (`variant="mark"` for the isotype, `tone="white"` on dark backgrounds). Assets in `public/brand/`.
- The layout must work on mobile: independent psychologists use Neuvi from their phones.

## Deploy (Vercel)

Production: https://neuvi-livid.vercel.app (GitHub `JuanAguirre10/Neuvi`, branch `main`; every push redeploys and applies migrations to production). The database is Neon `neuvi-db`, connected through the Vercel integration (`DATABASE_URL` pooled, `DATABASE_URL_UNPOOLED` direct). Required env vars: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `SESSION_SECRET` and `NEXT_PUBLIC_NEUVI_WHATSAPP`. `npm run db:seed` wipes everything and its demo accounts have a public password: never run it against production once real customers exist. Vercel runs the `vercel-build` script (`prisma generate && prisma migrate deploy && next build`), so migrations apply on every deploy with no Build Command override.
