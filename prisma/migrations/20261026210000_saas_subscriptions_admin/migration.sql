-- Plataforma SaaS: catálogo de planes, suscripción por organización (antes Organization.plan /
-- trialEndsAt), historial, facturación de Neuvi, notas internas y equipo de Neuvi (/admin).

-- Enum de planes sin PRUEBA: la prueba pasa a ser un estado de la suscripción.
CREATE TYPE "Plan_new" AS ENUM ('INDIVIDUAL', 'CENTRO');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('PRUEBA', 'ACTIVA', 'SUSPENDIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MENSUAL', 'ANUAL');

-- CreateEnum
CREATE TYPE "SubscriptionEventType" AS ENUM ('ALTA', 'PRUEBA_EXTENDIDA', 'PLAN_ACTIVADO', 'PLAN_CAMBIADO', 'PRECIO_ACTUALIZADO', 'SUSPENDIDA', 'REACTIVADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('SUPERADMIN', 'FINANZAS', 'SOPORTE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastLoginAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "code" "Plan_new" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "listPriceCents" INTEGER,
    "perProfessional" BOOLEAN NOT NULL DEFAULT false,
    "maxProfessionals" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "planCode" "Plan_new" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PRUEBA',
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MENSUAL',
    "trialEndsAt" TIMESTAMP(3) NOT NULL,
    "priceCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionEvent" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "type" "SubscriptionEventType" NOT NULL,
    "fromPlan" "Plan_new",
    "toPlan" "Plan_new",
    "detail" TEXT,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionInvoice" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" DATE NOT NULL,
    "seats" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "voidedById" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPayment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference" TEXT,
    "notes" TEXT,
    "registeredById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountNote" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformAdmin" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "PlatformRole" NOT NULL DEFAULT 'SOPORTE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformAdmin_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- Datos: catálogo de planes (precio de lista por definir) y suscripciones de las
-- organizaciones existentes a partir de las columnas antiguas.
-- ---------------------------------------------------------------------------
INSERT INTO "SubscriptionPlan" ("code", "name", "description", "listPriceCents", "perProfessional", "maxProfessionals", "updatedAt") VALUES
  ('INDIVIDUAL', 'Plan Individual', 'Para psicólogos independientes: un profesional.', NULL, false, 1, timezone('UTC', now())),
  ('CENTRO', 'Plan Centro Psicológico', 'Para centros con varios psicólogos, consultorios y recepción. Se cobra por psicólogo activo.', NULL, true, NULL, timezone('UTC', now()));

INSERT INTO "Subscription" ("id", "organizationId", "planCode", "status", "trialEndsAt", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text,
       o."id",
       (CASE WHEN o."plan"::text = 'PRUEBA' THEN o."type"::text ELSE o."plan"::text END)::"Plan_new",
       (CASE WHEN o."plan"::text = 'PRUEBA' THEN 'PRUEBA' ELSE 'ACTIVA' END)::"SubscriptionStatus",
       o."trialEndsAt",
       o."createdAt",
       timezone('UTC', now())
FROM "Organization" o;

INSERT INTO "SubscriptionEvent" ("id", "subscriptionId", "type", "toPlan", "detail", "createdAt")
SELECT gen_random_uuid()::text, s."id", 'ALTA', s."planCode", 'Registro con prueba gratuita', s."createdAt"
FROM "Subscription" s;

INSERT INTO "SubscriptionEvent" ("id", "subscriptionId", "type", "toPlan", "detail", "createdAt")
SELECT gen_random_uuid()::text, s."id", 'PLAN_ACTIVADO', s."planCode", 'Migrado desde el plan anterior', timezone('UTC', now())
FROM "Subscription" s WHERE s."status" = 'ACTIVA';

ALTER TABLE "Organization" DROP COLUMN "plan",
DROP COLUMN "trialEndsAt";

DROP TYPE "Plan";
ALTER TYPE "Plan_new" RENAME TO "Plan";

-- ---------------------------------------------------------------------------
-- Reglas de integridad que Prisma no expresa (CHECK).
-- ---------------------------------------------------------------------------
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_renewalThreshold_check" CHECK ("renewalThreshold" >= 0),
  ADD CONSTRAINT "Organization_defaultSessionMinutes_check" CHECK ("defaultSessionMinutes" > 0);
ALTER TABLE "Package" ADD CONSTRAINT "Package_totalSessions_check" CHECK ("totalSessions" > 0),
  ADD CONSTRAINT "Package_priceCents_check" CHECK ("priceCents" >= 0);
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_amountCents_check" CHECK ("amountCents" > 0);
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_endsAt_check" CHECK ("endsAt" > "startsAt");
ALTER TABLE "SessionNote" ADD CONSTRAINT "SessionNote_sessionNumber_check" CHECK ("sessionNumber" IS NULL OR "sessionNumber" > 0);
ALTER TABLE "SubscriptionPlan" ADD CONSTRAINT "SubscriptionPlan_listPriceCents_check" CHECK ("listPriceCents" IS NULL OR "listPriceCents" >= 0),
  ADD CONSTRAINT "SubscriptionPlan_maxProfessionals_check" CHECK ("maxProfessionals" IS NULL OR "maxProfessionals" > 0);
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_priceCents_check" CHECK ("priceCents" IS NULL OR "priceCents" >= 0);
ALTER TABLE "SubscriptionInvoice" ADD CONSTRAINT "SubscriptionInvoice_seats_check" CHECK ("seats" > 0),
  ADD CONSTRAINT "SubscriptionInvoice_unitPriceCents_check" CHECK ("unitPriceCents" >= 0),
  ADD CONSTRAINT "SubscriptionInvoice_discountCents_check" CHECK ("discountCents" >= 0 AND "discountCents" <= "seats" * "unitPriceCents"),
  ADD CONSTRAINT "SubscriptionInvoice_period_check" CHECK ("periodEnd" >= "periodStart"),
  ADD CONSTRAINT "SubscriptionInvoice_dueDate_check" CHECK ("dueDate" >= "periodStart"),
  ADD CONSTRAINT "SubscriptionInvoice_void_check" CHECK (("voidedAt" IS NULL) = ("voidReason" IS NULL));
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_amountCents_check" CHECK ("amountCents" > 0);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_organizationId_key" ON "Subscription"("organizationId");

-- CreateIndex
CREATE INDEX "Subscription_planCode_status_idx" ON "Subscription"("planCode", "status");

-- CreateIndex
CREATE INDEX "Subscription_status_trialEndsAt_idx" ON "Subscription"("status", "trialEndsAt");

-- CreateIndex
CREATE INDEX "SubscriptionEvent_subscriptionId_createdAt_idx" ON "SubscriptionEvent"("subscriptionId", "createdAt");

-- CreateIndex
CREATE INDEX "SubscriptionEvent_createdAt_idx" ON "SubscriptionEvent"("createdAt");

-- CreateIndex
CREATE INDEX "SubscriptionEvent_actorId_idx" ON "SubscriptionEvent"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionInvoice_number_key" ON "SubscriptionInvoice"("number");

-- CreateIndex
CREATE INDEX "SubscriptionInvoice_dueDate_idx" ON "SubscriptionInvoice"("dueDate");

-- CreateIndex
CREATE INDEX "SubscriptionInvoice_issuedAt_idx" ON "SubscriptionInvoice"("issuedAt");

-- CreateIndex
CREATE INDEX "SubscriptionInvoice_createdById_idx" ON "SubscriptionInvoice"("createdById");

-- CreateIndex
CREATE INDEX "SubscriptionInvoice_subscriptionId_periodStart_idx" ON "SubscriptionInvoice"("subscriptionId", "periodStart");

-- Un periodo se factura una sola vez entre las facturas vigentes (las anuladas no cuentan).
CREATE UNIQUE INDEX "SubscriptionInvoice_active_period_key" ON "SubscriptionInvoice"("subscriptionId", "periodStart") WHERE "voidedAt" IS NULL;

-- CreateIndex
CREATE INDEX "SubscriptionInvoice_voidedById_idx" ON "SubscriptionInvoice"("voidedById");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_invoiceId_idx" ON "SubscriptionPayment"("invoiceId");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_paidAt_idx" ON "SubscriptionPayment"("paidAt");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_registeredById_idx" ON "SubscriptionPayment"("registeredById");

-- CreateIndex
CREATE INDEX "AccountNote_organizationId_createdAt_idx" ON "AccountNote"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AccountNote_authorId_idx" ON "AccountNote"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformAdmin_email_key" ON "PlatformAdmin"("email");

-- CreateIndex
CREATE INDEX "Appointment_packageId_idx" ON "Appointment"("packageId");

-- CreateIndex
CREATE INDEX "Organization_createdAt_idx" ON "Organization"("createdAt");

-- CreateIndex
CREATE INDEX "Payment_patientId_idx" ON "Payment"("patientId");

-- CreateIndex
CREATE INDEX "SessionNote_authorId_idx" ON "SessionNote"("authorId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planCode_fkey" FOREIGN KEY ("planCode") REFERENCES "SubscriptionPlan"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionEvent" ADD CONSTRAINT "SubscriptionEvent_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionEvent" ADD CONSTRAINT "SubscriptionEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "PlatformAdmin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionInvoice" ADD CONSTRAINT "SubscriptionInvoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionInvoice" ADD CONSTRAINT "SubscriptionInvoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "PlatformAdmin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionInvoice" ADD CONSTRAINT "SubscriptionInvoice_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "PlatformAdmin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "SubscriptionInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "PlatformAdmin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountNote" ADD CONSTRAINT "AccountNote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountNote" ADD CONSTRAINT "AccountNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "PlatformAdmin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

