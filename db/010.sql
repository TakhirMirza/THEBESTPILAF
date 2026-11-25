BEGIN;
CREATE TABLE finished_lots (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 batch_id bigint NOT NULL REFERENCES production_batches(id),
 sku_id bigint NOT NULL REFERENCES skus(id),
 quantity integer NOT NULL CHECK(quantity>0),
 available integer NOT NULL CHECK(available BETWEEN 0 AND quantity),
 UNIQUE(batch_id,sku_id)
);
CREATE TABLE order_lot_allocations (
 order_id uuid NOT NULL, sku_id bigint NOT NULL,
 lot_id bigint NOT NULL REFERENCES finished_lots(id),
 quantity integer NOT NULL CHECK(quantity>0),
 released boolean NOT NULL DEFAULT false,
 PRIMARY KEY(order_id,sku_id,lot_id),
 FOREIGN KEY(order_id,sku_id) REFERENCES order_items(order_id,sku_id)
);
CREATE FUNCTION release_finished_lot(p_batch bigint,p_sku bigint,p_qty integer) RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE b production_batches%ROWTYPE; s skus%ROWTYPE; used bigint; result bigint;
BEGIN
 SELECT * INTO b FROM production_batches WHERE id=p_batch FOR UPDATE;
 IF NOT FOUND OR b.status <> 'reviewed' OR b.expires_on <= current_date OR p_qty<=0 THEN RAISE EXCEPTION 'Batch unavailable'; END IF;
 SELECT * INTO s FROM skus WHERE id=p_sku FOR UPDATE;
 IF NOT FOUND OR s.product_id <> (SELECT product_id FROM recipes WHERE id=b.recipe_id) THEN RAISE EXCEPTION 'SKU mismatch'; END IF;
 SELECT coalesce(sum(f.quantity::bigint*k.pack_size),0) INTO used FROM finished_lots f JOIN skus k ON k.id=f.sku_id WHERE f.batch_id=p_batch;
 IF used+p_qty::bigint*s.pack_size>b.units THEN RAISE EXCEPTION 'Batch capacity exceeded'; END IF;
 INSERT INTO finished_lots(batch_id,sku_id,quantity,available) VALUES(p_batch,p_sku,p_qty,p_qty) RETURNING id INTO result;
 UPDATE skus SET stock=stock+p_qty WHERE id=p_sku;
 RETURN result;
END $$;
CREATE FUNCTION allocate_finished_lots() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE l record; needed integer:=NEW.quantity; take integer;
BEGIN
 FOR l IN SELECT f.id,f.available FROM finished_lots f JOIN production_batches b ON b.id=f.batch_id WHERE f.sku_id=NEW.sku_id AND f.available>0 AND b.status='reviewed' AND b.expires_on>current_date ORDER BY b.expires_on,f.id FOR UPDATE OF f,b LOOP
 take:=least(needed,l.available);
 UPDATE finished_lots SET available=available-take WHERE id=l.id;
 INSERT INTO order_lot_allocations(order_id,sku_id,lot_id,quantity) VALUES(NEW.order_id,NEW.sku_id,l.id,take);
 needed:=needed-take; EXIT WHEN needed=0;
 END LOOP;
 IF needed>0 THEN RAISE EXCEPTION 'Insufficient eligible lot inventory'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER allocate_order_lots AFTER INSERT ON order_items FOR EACH ROW EXECUTE FUNCTION allocate_finished_lots();
CREATE FUNCTION guard_lot_shipment() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.status='shipped' AND OLD.status<>'shipped' THEN
 PERFORM b.id FROM production_batches b JOIN finished_lots f ON f.batch_id=b.id JOIN order_lot_allocations a ON a.lot_id=f.id WHERE a.order_id=NEW.id ORDER BY b.id FOR UPDATE OF b;
 IF NOT EXISTS(SELECT 1 FROM order_items WHERE order_id=NEW.id) OR EXISTS(SELECT 1 FROM order_items i WHERE i.order_id=NEW.id AND i.quantity<>(SELECT coalesce(sum(a.quantity),0) FROM order_lot_allocations a JOIN finished_lots f ON f.id=a.lot_id JOIN production_batches b ON b.id=f.batch_id WHERE a.order_id=i.order_id AND a.sku_id=i.sku_id AND NOT a.released AND b.status='reviewed' AND b.expires_on>current_date)) THEN RAISE EXCEPTION 'Shipment contains untraceable or ineligible stock'; END IF;
 END IF;
 IF NEW.status='cancelled' AND OLD.status='pending' THEN
 UPDATE finished_lots f SET available=f.available+a.quantity FROM order_lot_allocations a WHERE a.order_id=NEW.id AND a.lot_id=f.id AND NOT a.released;
 UPDATE order_lot_allocations SET released=true WHERE order_id=NEW.id;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_order_lots BEFORE UPDATE OF status ON orders FOR EACH ROW EXECUTE FUNCTION guard_lot_shipment();
CREATE VIEW recall_affected_orders AS SELECT DISTINCT b.id AS batch_id,b.lot_code,o.id AS order_id,o.status,o.customer_id FROM production_batches b JOIN finished_lots f ON f.batch_id=b.id JOIN order_lot_allocations a ON a.lot_id=f.id JOIN orders o ON o.id=a.order_id WHERE b.status='recalled' AND NOT a.released;
COMMIT;
