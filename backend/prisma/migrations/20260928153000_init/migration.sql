-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('ADMIN', 'MANAGER', 'STAFF');

-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "public"."EntityStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "public"."ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DORMANT');

-- CreateEnum
CREATE TYPE "public"."ClientType" AS ENUM ('INDIVIDUAL', 'BUSINESS', 'DISTRIBUTOR', 'WHOLESALER', 'RETAILER', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."SupplierType" AS ENUM ('INDIVIDUAL', 'BUSINESS', 'FARMER', 'DISTRIBUTOR', 'MANUFACTURER', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ProductCategory" AS ENUM ('FINISHED_PRODUCT', 'RAW_MATERIAL', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ProductUnit" AS ENUM ('KG', 'TONNE', 'PIECE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."TransactionType" AS ENUM ('CLIENT_PURCHASE', 'SUPPLIER_SUPPLY');

-- CreateEnum
CREATE TYPE "public"."TransactionStatus" AS ENUM ('RECORDED', 'REVERSED');

-- CreateEnum
CREATE TYPE "public"."AuditAction" AS ENUM ('LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DEACTIVATE', 'REACTIVATE', 'ROLE_CHANGE', 'PASSWORD_CHANGE', 'REPORT_EXPORT');

-- CreateTable
CREATE TABLE "public"."roles" (
    "id" UUID NOT NULL,
    "name" "public"."UserRole" NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."permissions" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role_id" UUID NOT NULL,
    "status" "public"."UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_login_at" TIMESTAMP(3),
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "user_agent" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."locations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "district" TEXT,
    "region" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "distance_km" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."clients" (
    "id" UUID NOT NULL,
    "client_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact_person" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "location_id" UUID,
    "distance_km" DECIMAL(10,2),
    "client_type" "public"."ClientType" NOT NULL DEFAULT 'BUSINESS',
    "status" "public"."ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."suppliers" (
    "id" UUID NOT NULL,
    "supplier_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact_person" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "location_id" UUID,
    "distance_km" DECIMAL(10,2),
    "supplier_type" "public"."SupplierType" NOT NULL DEFAULT 'BUSINESS',
    "status" "public"."EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."products" (
    "id" UUID NOT NULL,
    "product_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "public"."ProductCategory" NOT NULL,
    "description" TEXT,
    "unit" "public"."ProductUnit" NOT NULL DEFAULT 'KG',
    "status" "public"."EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."transactions" (
    "id" UUID NOT NULL,
    "transaction_code" TEXT NOT NULL,
    "transaction_type" "public"."TransactionType" NOT NULL,
    "client_id" UUID,
    "supplier_id" UUID,
    "product_id" UUID NOT NULL,
    "quantity_kg" DECIMAL(14,3),
    "input_quantity" DECIMAL(14,3) NOT NULL,
    "input_unit" "public"."ProductUnit" NOT NULL,
    "transaction_date" DATE NOT NULL,
    "reference_number" TEXT,
    "notes" TEXT,
    "recorded_by_id" UUID NOT NULL,
    "status" "public"."TransactionStatus" NOT NULL DEFAULT 'RECORDED',
    "reverses_transaction_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "action" "public"."AuditAction" NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "details" TEXT,
    "old_value" JSONB,
    "new_value" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "public"."code_sequences" (
    "id" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "next_value" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "code_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "public"."roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "public"."permissions"("key");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_role_id_idx" ON "public"."users"("role_id");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "public"."users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "public"."refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "public"."refresh_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "public"."password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "public"."password_reset_tokens"("user_id");

-- CreateIndex
CREATE INDEX "locations_name_idx" ON "public"."locations"("name");

-- CreateIndex
CREATE UNIQUE INDEX "clients_client_code_key" ON "public"."clients"("client_code");

-- CreateIndex
CREATE INDEX "clients_name_idx" ON "public"."clients"("name");

-- CreateIndex
CREATE INDEX "clients_phone_idx" ON "public"."clients"("phone");

-- CreateIndex
CREATE INDEX "clients_location_id_idx" ON "public"."clients"("location_id");

-- CreateIndex
CREATE INDEX "clients_status_idx" ON "public"."clients"("status");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_supplier_code_key" ON "public"."suppliers"("supplier_code");

-- CreateIndex
CREATE INDEX "suppliers_name_idx" ON "public"."suppliers"("name");

-- CreateIndex
CREATE INDEX "suppliers_phone_idx" ON "public"."suppliers"("phone");

-- CreateIndex
CREATE INDEX "suppliers_location_id_idx" ON "public"."suppliers"("location_id");

-- CreateIndex
CREATE INDEX "suppliers_status_idx" ON "public"."suppliers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "products_product_code_key" ON "public"."products"("product_code");

-- CreateIndex
CREATE INDEX "products_name_idx" ON "public"."products"("name");

-- CreateIndex
CREATE INDEX "products_category_idx" ON "public"."products"("category");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "public"."products"("status");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_transaction_code_key" ON "public"."transactions"("transaction_code");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_reverses_transaction_id_key" ON "public"."transactions"("reverses_transaction_id");

-- CreateIndex
CREATE INDEX "transactions_client_id_idx" ON "public"."transactions"("client_id");

-- CreateIndex
CREATE INDEX "transactions_supplier_id_idx" ON "public"."transactions"("supplier_id");

-- CreateIndex
CREATE INDEX "transactions_product_id_idx" ON "public"."transactions"("product_id");

-- CreateIndex
CREATE INDEX "transactions_recorded_by_id_idx" ON "public"."transactions"("recorded_by_id");

-- CreateIndex
CREATE INDEX "transactions_transaction_type_idx" ON "public"."transactions"("transaction_type");

-- CreateIndex
CREATE INDEX "transactions_transaction_date_idx" ON "public"."transactions"("transaction_date");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "public"."audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "public"."audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entity_idx" ON "public"."audit_logs"("entity");

-- CreateIndex
CREATE INDEX "audit_logs_entity_id_idx" ON "public"."audit_logs"("entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "public"."audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "public"."role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."clients" ADD CONSTRAINT "clients_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."suppliers" ADD CONSTRAINT "suppliers_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_reverses_transaction_id_fkey" FOREIGN KEY ("reverses_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_party_check" CHECK (
  ("transaction_type" = 'CLIENT_PURCHASE' AND "client_id" IS NOT NULL AND "supplier_id" IS NULL)
  OR
  ("transaction_type" = 'SUPPLIER_SUPPLY' AND "supplier_id" IS NOT NULL AND "client_id" IS NULL)
);
