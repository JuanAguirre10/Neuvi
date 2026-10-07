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

## UI conventions

- Every panel page starts with `<PageHeader title description actions />`; empty lists use `<EmptyState />`; form fields use `<Field>`.
- Brand tokens (from the logo): `primary` #2F6DB5 (buttons), `brand-blue` #4C8DD7, `brand-teal` #39B6AF, `brand-sky` #7AADE6, `brand-navy` #344E6D, `brand-navy-deep` #1F334D (headings); semantic `success`/`warning`/`info-soft`/`danger-soft`. Don't hard-code other palettes.
- Logo: `<Logo />` from `@/components/brand/logo` (`variant="mark"` for the isotype, `tone="white"` on dark backgrounds). Assets in `public/brand/`.
- The layout must work on mobile: independent psychologists use Neuvi from their phones.

## Deploy (Vercel)

Production: https://neuvi-livid.vercel.app (GitHub `JuanAguirre10/Neuvi`, branch `main`; every push redeploys). Add the Neon integration from the Vercel Marketplace (it sets `DATABASE_URL` and `DATABASE_URL_UNPOOLED`) and set `SESSION_SECRET` and `NEXT_PUBLIC_NEUVI_WHATSAPP`. Vercel runs the `vercel-build` script (`prisma generate && prisma migrate deploy && next build`), so migrations apply on every deploy with no Build Command override.
