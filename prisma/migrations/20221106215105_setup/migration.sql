-- CreateTable
CREATE TABLE "abbreviations" (
    "id" TEXT NOT NULL,
    "target_url" TEXT,
    "original_url" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "redirectings" INTEGER NOT NULL DEFAULT 0,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "latest_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "abbreviations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abbreviation_definitions" (
    "id" TEXT NOT NULL,
    "abbreviation_id" TEXT NOT NULL,
    "tracking_at" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "abbreviation_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ip_address" (
    "id" TEXT NOT NULL,
    "ip" VARCHAR(1024) NOT NULL,
    "ip_type" VARCHAR(1024) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ip_address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics" (
    "id" TEXT NOT NULL,
    "ip_address_id" TEXT NOT NULL,
    "abbreviation_id" TEXT NOT NULL,
    "hostname" TEXT,
    "company" JSONB NOT NULL,
    "connection" JSONB NOT NULL,
    "location" JSONB NOT NULL,
    "time_zone" JSONB NOT NULL,
    "browser_name" TEXT,
    "browser_version" TEXT,
    "engine_name" TEXT,
    "engine_version" TEXT,
    "os_name" TEXT,
    "os_version" TEXT,
    "device_type" TEXT,
    "device_model" TEXT,
    "device_vendor" TEXT,
    "cpu_architecture" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "abbreviations_hash_key" ON "abbreviations"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "abbreviation_definitions_abbreviation_id_key" ON "abbreviation_definitions"("abbreviation_id");

-- AddForeignKey
ALTER TABLE "abbreviation_definitions" ADD CONSTRAINT "abbreviation_definitions_abbreviation_id_fkey" FOREIGN KEY ("abbreviation_id") REFERENCES "abbreviations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics" ADD CONSTRAINT "analytics_ip_address_id_fkey" FOREIGN KEY ("ip_address_id") REFERENCES "ip_address"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics" ADD CONSTRAINT "analytics_abbreviation_id_fkey" FOREIGN KEY ("abbreviation_id") REFERENCES "abbreviations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
