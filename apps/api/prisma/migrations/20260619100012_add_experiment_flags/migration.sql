-- CreateTable
CREATE TABLE "experiment_assignments" (
    "id" TEXT NOT NULL,
    "experiment_name" TEXT NOT NULL,
    "user_id" TEXT,
    "anonymous_id" TEXT,
    "variant" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experiment_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "experiment_name" TEXT,
    "variant" TEXT,
    "user_id" TEXT,
    "anonymous_id" TEXT,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "experiment_assignments_experiment_name_user_id_key" ON "experiment_assignments"("experiment_name", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "experiment_assignments_experiment_name_anonymous_id_key" ON "experiment_assignments"("experiment_name", "anonymous_id");

-- CreateIndex
CREATE INDEX "events_experiment_name_variant_type_idx" ON "events"("experiment_name", "variant", "type");
