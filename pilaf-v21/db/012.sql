BEGIN;
CREATE FUNCTION queue_recall_email() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.status='recalled' AND OLD.status IS DISTINCT FROM NEW.status THEN
 INSERT INTO email_outbox(dedupe_key,recipient,subject,body)
 SELECT 'recall:'||NEW.id||':'||c.id,c.email,'Important product recall notice',
 'THE BEST PILAF: Your order history includes affected product lot '||NEW.lot_code||'. Do not consume this product. Retain the lot code and contact the seller for further instructions.'
 FROM customers c WHERE EXISTS (SELECT 1 FROM recall_affected_orders a WHERE a.batch_id=NEW.id AND a.customer_id=c.id AND a.status IN ('paid','shipped','refunded'))
 ON CONFLICT(dedupe_key) DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER queue_recall_email AFTER UPDATE OF status ON production_batches FOR EACH ROW EXECUTE FUNCTION queue_recall_email();
CREATE INDEX email_outbox_pending_idx ON email_outbox(next_attempt,id) WHERE sent_at IS NULL AND failed_at IS NULL;
COMMIT;
