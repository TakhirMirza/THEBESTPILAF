BEGIN;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS password_hash text;
CREATE TABLE IF NOT EXISTS customer_sessions(token_hash text PRIMARY KEY, customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS customer_addresses(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),customer_id uuid NOT NULL REFERENCES customers(id), recipient text NOT NULL, street text NOT NULL, city text NOT NULL, state text NOT NULL, zip text NOT NULL);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS reservation_expires_at timestamptz;
COMMIT;
