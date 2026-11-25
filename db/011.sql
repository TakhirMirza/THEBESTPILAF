BEGIN;
ALTER TABLE customers ADD COLUMN email_verified_at timestamptz;
CREATE TABLE customer_action_tokens(token_hash text PRIMARY KEY,customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,purpose text NOT NULL CHECK(purpose IN ('verify','reset')),expires_at timestamptz NOT NULL, UNIQUE(customer_id,purpose));
CREATE TABLE email_outbox(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,dedupe_key text UNIQUE NOT NULL,recipient text NOT NULL,subject text NOT NULL,body text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),next_attempt timestamptz NOT NULL DEFAULT now(),attempts integer NOT NULL DEFAULT 0,sent_at timestamptz,failed_at timestamptz);
CREATE FUNCTION queue_order_email() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('paid','shipped') THEN
 INSERT INTO email_outbox(dedupe_key,recipient,subject,body) SELECT 'order:'||NEW.id||':'||NEW.status,email,CASE WHEN NEW.status='paid' THEN 'Order confirmation' ELSE 'Your order has shipped' END,'THE BEST PILAF — Order '||NEW.id||CASE WHEN NEW.status='shipped' THEN E'\nTracking: '||coalesce(NEW.shipping_service,'')||' '||coalesce(NEW.tracking_number,'') ELSE E'\nPayment received.' END FROM customers WHERE id=NEW.customer_id ON CONFLICT DO NOTHING;
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER queue_order_email AFTER UPDATE OF status ON orders FOR EACH ROW EXECUTE FUNCTION queue_order_email();
COMMIT;
