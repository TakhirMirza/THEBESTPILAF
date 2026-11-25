BEGIN;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_service text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_mode boolean NOT NULL DEFAULT false;
COMMIT;
