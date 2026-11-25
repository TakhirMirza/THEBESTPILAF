BEGIN;
CREATE TABLE IF NOT EXISTS carts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS cart_items(cart_id uuid REFERENCES carts(id) ON DELETE CASCADE, sku_id bigint REFERENCES skus(id), quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 99), PRIMARY KEY(cart_id,sku_id));
COMMIT;
