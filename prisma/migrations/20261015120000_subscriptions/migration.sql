-- A workspace's paid or comped plan. Additive: no row changes, and an agent with no row
-- is on Free.

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('PRO');

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "teamId" TEXT,
    "stakeholderId" TEXT,
    "plan" "Plan" NOT NULL,
    "seats" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "managedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id"),
    -- A workspace is a team or an agent on no team, never both and never neither.
    CONSTRAINT "Subscription_one_workspace" CHECK (("teamId" IS NULL) <> ("stakeholderId" IS NULL)),
    CONSTRAINT "Subscription_seats_positive" CHECK ("seats" > 0)
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_teamId_key" ON "Subscription"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stakeholderId_key" ON "Subscription"("stakeholderId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeCustomerId_key" ON "Subscription"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_stakeholderId_fkey" FOREIGN KEY ("stakeholderId") REFERENCES "Stakeholder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_managedById_fkey" FOREIGN KEY ("managedById") REFERENCES "Stakeholder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
