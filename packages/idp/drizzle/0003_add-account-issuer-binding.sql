ALTER TABLE "account" RENAME COLUMN "account_id" TO "issuer";--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "provider_account_id" text;--> statement-breakpoint
-- This IdP only supports credential accounts. Abort instead of deriving an
-- incorrect issuer if an unexpected provider exists in an older database.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "account" WHERE "provider_id" <> 'credential') THEN
    RAISE EXCEPTION 'Cannot migrate non-credential accounts to the issuer-bound schema';
  END IF;
END
$$;--> statement-breakpoint
UPDATE "account"
SET
  "provider_account_id" = "issuer",
  "issuer" = 'local:credential';--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "provider_account_id" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "account_issuer_providerAccountId_idx" ON "account" USING btree ("issuer","provider_account_id");
