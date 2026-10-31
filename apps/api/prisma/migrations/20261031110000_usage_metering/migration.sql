CREATE TYPE "SubscriptionStatus" AS ENUM ('DRAFT', 'PENDING', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'SUSPENDED', 'CANCELLED', 'EXPIRED');
CREATE TYPE "UsagePricingModel" AS ENUM ('FLAT', 'TIERED', 'VOLUME', 'STAIR_STEP', 'PACKAGE');
CREATE TYPE "UsageAggregationGrain" AS ENUM ('HOURLY', 'DAILY', 'BILLING_PERIOD');

CREATE TABLE "tenant_api_keys" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "key_hash" CHAR(64) NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "expires_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tenant_api_keys_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "email" VARCHAR(320),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'DRAFT',
    "billing_period_start" TIMESTAMPTZ(3),
    "billing_period_end" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "usage_meters" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "unit" VARCHAR(64) NOT NULL,
    "pricing_model" "UsagePricingModel" NOT NULL,
    "unit_price_minor" BIGINT NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "tiers" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "usage_meters_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "usage_events" (
    "id" UUID NOT NULL,
    "event_id" VARCHAR(255) NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "meter_id" UUID NOT NULL,
    "idempotency_key" VARCHAR(255) NOT NULL,
    "quantity" DECIMAL(24,8) NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "source" VARCHAR(120) NOT NULL,
    "metadata" JSONB,
    "received_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "usage_aggregates" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "meter_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "grain" "UsageAggregationGrain" NOT NULL,
    "period_start" TIMESTAMPTZ(3) NOT NULL,
    "period_end" TIMESTAMPTZ(3) NOT NULL,
    "quantity" DECIMAL(28,8) NOT NULL,
    "event_count" BIGINT NOT NULL,
    "computed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "usage_aggregates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_api_keys_key_hash_key" ON "tenant_api_keys"("key_hash");
CREATE INDEX "tenant_api_keys_tenant_id_revoked_at_idx" ON "tenant_api_keys"("tenant_id", "revoked_at");
CREATE INDEX "customers_tenant_id_email_idx" ON "customers"("tenant_id", "email");
CREATE UNIQUE INDEX "customers_tenant_id_id_key" ON "customers"("tenant_id", "id");
CREATE INDEX "subscriptions_tenant_id_customer_id_status_idx" ON "subscriptions"("tenant_id", "customer_id", "status");
CREATE UNIQUE INDEX "subscriptions_tenant_id_id_key" ON "subscriptions"("tenant_id", "id");
CREATE UNIQUE INDEX "usage_meters_tenant_id_id_key" ON "usage_meters"("tenant_id", "id");
CREATE UNIQUE INDEX "usage_meters_tenant_id_code_key" ON "usage_meters"("tenant_id", "code");
CREATE UNIQUE INDEX "usage_events_event_id_key" ON "usage_events"("event_id");
CREATE UNIQUE INDEX "usage_events_tenant_id_idempotency_key_key" ON "usage_events"("tenant_id", "idempotency_key");
CREATE INDEX "usage_events_tenant_id_meter_id_occurred_at_idx" ON "usage_events"("tenant_id", "meter_id", "occurred_at");
CREATE INDEX "usage_events_tenant_id_subscription_id_occurred_at_idx" ON "usage_events"("tenant_id", "subscription_id", "occurred_at");
CREATE UNIQUE INDEX "usage_aggregates_tenant_id_meter_id_subscription_id_grain_p_key" ON "usage_aggregates"("tenant_id", "meter_id", "subscription_id", "grain", "period_start");
CREATE INDEX "usage_aggregates_tenant_id_subscription_id_period_start_idx" ON "usage_aggregates"("tenant_id", "subscription_id", "period_start");

ALTER TABLE "usage_meters" ADD CONSTRAINT "usage_meters_unit_price_nonnegative" CHECK ("unit_price_minor" >= 0);
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "usage_aggregates" ADD CONSTRAINT "usage_aggregates_valid_period" CHECK ("period_end" > "period_start" AND "quantity" >= 0 AND "event_count" >= 0);

ALTER TABLE "tenant_api_keys" ADD CONSTRAINT "tenant_api_keys_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_customer_id_fkey" FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "customers"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "usage_meters" ADD CONSTRAINT "usage_meters_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_tenant_id_customer_id_fkey" FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "customers"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_tenant_id_subscription_id_fkey" FOREIGN KEY ("tenant_id", "subscription_id") REFERENCES "subscriptions"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_tenant_id_meter_id_fkey" FOREIGN KEY ("tenant_id", "meter_id") REFERENCES "usage_meters"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "usage_aggregates" ADD CONSTRAINT "usage_aggregates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "usage_aggregates" ADD CONSTRAINT "usage_aggregates_tenant_id_meter_id_fkey" FOREIGN KEY ("tenant_id", "meter_id") REFERENCES "usage_meters"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "usage_aggregates" ADD CONSTRAINT "usage_aggregates_tenant_id_subscription_id_fkey" FOREIGN KEY ("tenant_id", "subscription_id") REFERENCES "subscriptions"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION reject_usage_event_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'usage_events is append-only; write an adjustment event instead' USING ERRCODE = '55000';
END;
$$;
CREATE TRIGGER usage_events_immutable BEFORE UPDATE OR DELETE ON "usage_events"
FOR EACH ROW EXECUTE FUNCTION reject_usage_event_mutation();

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['customers', 'subscriptions', 'usage_meters', 'usage_events', 'usage_aggregates'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid)',
      table_name
    );
  END LOOP;
END $$;
